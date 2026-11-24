// Web Push for the iPhone home-screen app (and browsers): instant friend messages & reminders
// even when the app is closed. Sending goes through our Cloudflare Worker (push-worker/worker.js).
import { PUSH } from './config.js';
import { store } from './store.js';
import * as cloud from './cloud.js';
import { isNative } from './native.js';
import { hashStr } from './utils.js';

const FB = () => cloud.getFB();
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => !!(navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches);
export const pushConfigured = () => !!PUSH.url;
/** This device can receive web push (iPhone: only after "Add to Home Screen", iOS 16.4+). */
export const pushSupported = () => !isNative() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushPermission = () => ('Notification' in window ? Notification.permission : 'unsupported');

function keyBytes(b64) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
const deviceId = () => store.state.settings.cloud.deviceId || 'web';

async function saveSub(sub) {
  const fb = FB(); const u = cloud.status.user;
  if (!fb || !u || !sub) return;
  const j = sub.toJSON();
  await fb.F.setDoc(fb.F.doc(fb.db, 'pushSubs', u.uid), { subs: { [deviceId()]: { endpoint: j.endpoint, keys: j.keys, at: Date.now(), ios: isIOS() } } }, { merge: true });
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  try { const reg = await navigator.serviceWorker.ready; return !!(await reg.pushManager.getSubscription()); } catch { return false; }
}

/** Must be called from a tap (iOS requires a user gesture for the permission prompt). */
export async function enablePush() {
  if (!pushSupported()) throw Object.assign(new Error(isIOS() && !isStandalone() ? 'pushNeedsHome' : 'pushUnsupported'), { mochi: true });
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw Object.assign(new Error('pushDenied'), { mochi: true });
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUSH.publicKey) }));
  await saveSub(sub);
  syncReminderSchedule(500);
  return true;
}

export async function disablePush() {
  setTimeout(() => syncReminderSchedule(0), 500);
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); } catch {}
  const fb = FB(); const u = cloud.status.user;
  if (fb && u) { try { await fb.F.setDoc(fb.F.doc(fb.db, 'pushSubs', u.uid), { subs: { [deviceId()]: fb.F.deleteField() } }, { merge: true }); } catch (e) { console.warn(e); } }
}

/** Keep this device's subscription saved under the signed-in account (endpoints can change). */
export async function refreshPush() {
  if (!pushSupported() || !pushConfigured() || pushPermission() !== 'granted' || !cloud.status.user) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUSH.publicKey) });
    if (store.state.settings.friends.notify === false) return disablePush();
    await saveSub(sub);
  } catch (e) { console.warn('push refresh', e); }
}

/** Send a push to all of a friend's devices that turned push on. Never throws. */
export async function sendPush(uid, { title, body, tag = '', url = '' }) {
  try {
    if (!pushConfigured()) return;
    const fb = FB(); const u = fb?.auth?.currentUser;
    if (!fb || !u) return;
    const d = await fb.F.getDoc(fb.F.doc(fb.db, 'pushSubs', uid));
    const subs = Object.values((d.exists() && d.data().subs) || {}).filter((s) => s?.endpoint);
    if (!subs.length) return;
    const token = await u.getIdToken();
    await fetch(PUSH.url.replace(/\/$/, '') + '/send', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subs, title, body, tag, url }),
    });
  } catch (e) { console.warn('push send', e); }
}

// ---------- Class / assignment / exam reminders for iPhone (sent by the push server every minute) ----------
let scheduleTimer = null, buildFn = null;
/** reminders.js hands us its builder so we avoid a circular import */
export const setReminderBuilder = (fn) => { buildFn = fn; };
export function syncReminderSchedule(delay = 3000) {
  clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(uploadSchedule, delay);
}
async function uploadSchedule() {
  if (isNative() || !pushConfigured() || !pushSupported() || !buildFn) return;
  const fb = FB(); const u = fb?.auth?.currentUser;
  if (!u) return;
  let sub = null;
  if (pushPermission() === 'granted') { try { sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); } catch {} }
  const items = sub ? buildFn().map((r) => ({ at: r.at, title: r.title, body: r.body, tag: 'r' + r.id })) : [];
  const body = JSON.stringify({ device: deviceId(), subs: sub ? [sub.toJSON()] : [], items });
  const sig = String(hashStr(u.uid + body));
  try { if (localStorage.getItem('mochi-sched-sig') === sig) return; } catch {}
  try {
    const r = await fetch(PUSH.url.replace(/\/$/, '') + '/schedule', {
      method: 'POST', headers: { Authorization: 'Bearer ' + (await u.getIdToken()), 'Content-Type': 'application/json' }, body,
    });
    if (r.ok) { try { localStorage.setItem('mochi-sched-sig', sig); } catch {} }
    else console.warn('schedule upload', r.status);
  } catch (e) { console.warn('schedule upload', e); }
}
