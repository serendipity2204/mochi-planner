// Mochi Planner push server (Cloudflare Worker, free plan).
// Sends Web Push notifications (iPhone home-screen app / browsers) for friend messages and class reminders.
// Setup: paste this file into a Cloudflare Worker and add ONE secret named VAPID_PRIVATE.
// Class / assignment reminders for iPhone also need: a KV namespace bound as REMINDERS and a Cron Trigger "* * * * *".
const FIREBASE_PROJECT = 'mochi-planner-f9a9c';
const VAPID_X = 'up6wfmGcoFTuvVAKiBdMECN6mY7_FLeLPjzeXm9CzBQ';
const VAPID_Y = '3JP8nh_PgcBEMO5axM1qEPybwd8ZfCcj_CcZa3FQkd8';
const VAPID_PUBLIC = 'BLqesH5hnKBU7r1QCogXTBAjepmO_xS3iz483l5vQswU3JP8nh_PgcBEMO5axM1qEPybwd8ZfCcj_CcZa3FQkd8';
const VAPID_SUBJECT = 'mailto:noreply@mochi-planner.app';

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const concat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

// ---------- Firebase ID token check (only signed-in app users may send) ----------
let jwks = null, jwksAt = 0;
async function verifyIdToken(token) {
  const [h, p, s] = String(token || '').split('.');
  if (!s) throw new Error('bad token');
  const header = JSON.parse(new TextDecoder().decode(unb64u(h)));
  const payload = JSON.parse(new TextDecoder().decode(unb64u(p)));
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT || payload.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT || payload.exp < now || !payload.sub) throw new Error('bad claims');
  if (!jwks || Date.now() - jwksAt > 3600e3) {
    jwks = (await (await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')).json()).keys;
    jwksAt = Date.now();
  }
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64u(s), enc.encode(h + '.' + p));
  if (!ok) throw new Error('bad signature');
  return payload.sub;
}

// ---------- VAPID (RFC 8292) ----------
let vapidKey = null;
async function vapidAuth(endpoint, env) {
  if (!vapidKey) vapidKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: VAPID_X, y: VAPID_Y, d: env.VAPID_PRIVATE, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapidKey, enc.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${VAPID_PUBLIC}`;
}

// ---------- Payload encryption (RFC 8291, aes128gcm) ----------
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len);
}
export async function encrypt(payload, p256dh, authSecret) {
  const uaPublic = unb64u(p256dh), auth = unb64u(authSecret);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

async function pushOne(sub, payload, env) {
  const body = await encrypt(payload, sub.keys.p256dh, sub.keys.auth);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(sub.endpoint, env), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' },
    body,
  });
  return r.status;
}

// ---------- Scheduled reminders (KV: "idx" = list of keys, "r:<uid>:<device>" = { subs, items }) ----------
const validSub = (s) => s && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth;
async function saveSchedule(env, uid, d) {
  const device = String(d.device || 'web').replace(/[^\w-]/g, '').slice(0, 40) || 'web';
  const key = `r:${uid}:${device}`;
  const subs = (Array.isArray(d.subs) ? d.subs : []).filter(validSub).slice(0, 3);
  const now = Date.now();
  const items = (Array.isArray(d.items) ? d.items : [])
    .filter((x) => x && Number(x.at) > now && Number(x.at) < now + 15 * 864e5)
    .slice(0, 300)
    .map((x) => ({ at: Number(x.at), title: String(x.title || '').slice(0, 120), body: String(x.body || '').slice(0, 300), tag: String(x.tag || '').slice(0, 60) }));
  const idx = JSON.parse((await env.REMINDERS.get('idx')) || '[]');
  if (!subs.length || !items.length) {
    await env.REMINDERS.delete(key);
    if (idx.includes(key)) await env.REMINDERS.put('idx', JSON.stringify(idx.filter((k) => k !== key)));
    return 0;
  }
  await env.REMINDERS.put(key, JSON.stringify({ subs, items, updated: now }));
  if (!idx.includes(key)) { idx.push(key); await env.REMINDERS.put('idx', JSON.stringify(idx)); }
  return items.length;
}

async function runDue(env, end) {
  if (!env.REMINDERS || !env.VAPID_PRIVATE) return;
  const start = end - 60000;
  const idx = JSON.parse((await env.REMINDERS.get('idx')) || '[]');
  for (const key of idx) {
    const rec = JSON.parse((await env.REMINDERS.get(key)) || 'null');
    if (!rec) continue;
    const due = rec.items.filter((x) => x.at > start && x.at <= end);
    if (!due.length) continue;
    let gone = false;
    for (const it of due) {
      const payload = JSON.stringify({ title: it.title, body: it.body, tag: it.tag || 'reminder', url: './' });
      for (const s of rec.subs) {
        try { const st = await pushOne(s, payload, env); if (st === 404 || st === 410) { s.gone = true; gone = true; } } catch {}
      }
    }
    if (gone) {
      rec.subs = rec.subs.filter((s) => !s.gone);
      await env.REMINDERS.put(key, JSON.stringify(rec));
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDue(env, event.scheduledTime || Date.now()));
  },
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (req.method === 'GET') return json({ ok: true, app: 'mochi-push', ready: !!env.VAPID_PRIVATE, reminders: !!env.REMINDERS, publicKey: VAPID_PUBLIC });
    if (req.method !== 'POST' || !['/send', '/schedule'].includes(url.pathname)) return json({ error: 'not found' }, 404);
    if (!env.VAPID_PRIVATE) return json({ error: 'VAPID_PRIVATE secret is missing' }, 500);
    let from;
    try { from = await verifyIdToken((req.headers.get('Authorization') || '').replace(/^Bearer /, '')); }
    catch (e) { return json({ error: 'unauthorized' }, 401); }
    let d;
    try { d = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
    if (url.pathname === '/schedule') {
      if (!env.REMINDERS) return json({ error: 'REMINDERS KV binding is missing' }, 501);
      return json({ ok: true, saved: await saveSchedule(env, from, d) });
    }
    const subs = (Array.isArray(d.subs) ? d.subs : []).slice(0, 10).filter((s) => s && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth);
    const payload = JSON.stringify({ title: String(d.title || '').slice(0, 120), body: String(d.body || '').slice(0, 300), tag: String(d.tag || '').slice(0, 60), url: String(d.url || '').slice(0, 200), from });
    const results = [];
    for (const s of subs) {
      try { results.push({ endpoint: s.endpoint, status: await pushOne(s, payload, env) }); }
      catch (e) { results.push({ endpoint: s.endpoint, status: 0, error: String(e.message || e) }); }
    }
    return json({ ok: true, results });
  },
};
