// Bridge to native (Capacitor) features with browser fallbacks.
const cap = () => window.Capacitor;
export const isNative = () => !!cap()?.isNativePlatform?.();
const plugins = {};
export function plug(name) {
  if (!isNative()) return null;
  if (plugins[name]) return plugins[name];
  const c = cap();
  plugins[name] = c.Plugins?.[name] || (c.registerPlugin ? c.registerPlugin(name) : null);
  return plugins[name];
}

// ---------------- Sounds (WebAudio synth, no files needed) ----------------
let actx;
const NOTES = {
  chime: [[880, 0, 0.35], [1318.5, 0.12, 0.5]],
  bell: [[659.3, 0, 0.9], [987.8, 0, 0.7], [1318.5, 0.02, 0.5]],
  bubble: [[520, 0, 0.12], [780, 0.1, 0.12], [1040, 0.2, 0.18]],
  piano: [[523.3, 0, 0.4], [659.3, 0.15, 0.4], [784, 0.3, 0.6]],
  pop: [[700, 0, 0.08]],
  coin: [[988, 0, 0.08], [1319, 0.08, 0.3]],
};
export const SOUNDS = ['chime', 'bell', 'bubble', 'piano', 'none'];
export function playSound(name = 'chime', volume = 0.25) {
  if (!name || name === 'none' || !NOTES[name]) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime;
    for (const [f, start, dur] of NOTES[name]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = name === 'bubble' || name === 'pop' ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, t0 + start);
      if (name === 'bubble') o.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + start + dur);
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(actx.destination);
      o.start(t0 + start); o.stop(t0 + start + dur + 0.05);
    }
  } catch { /* audio not available */ }
}

export async function vibrate(ms = 40) {
  const H = plug('Haptics');
  try { if (H) return await H.vibrate({ duration: ms }); } catch {}
  try { navigator.vibrate?.(ms); } catch {}
}

// ---------------- Notifications ----------------
let webTimers = [];
let channelsMade = false;
export async function notifPermission(request = false) {
  const LN = plug('LocalNotifications');
  if (LN) {
    let p = await LN.checkPermissions();
    if (p.display !== 'granted' && request) p = await LN.requestPermissions();
    return p.display;
  }
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'default' && request) return Notification.requestPermission();
  return Notification.permission;
}

async function ensureChannels(names) {
  const LN = plug('LocalNotifications');
  if (!LN || channelsMade) return;
  channelsMade = true;
  for (const s of SOUNDS) {
    try {
      await LN.createChannel({ id: 'mochi_' + s, name: names[s] || s, importance: 4, visibility: 1, vibration: true, ...(s !== 'none' ? { sound: s + '.wav' } : { sound: null }) });
    } catch (e) { console.warn('channel', e); }
  }
}

/** items: [{id:int, title, body, at:Date}] */
export async function scheduleNotifications(items, sound, channelNames = {}) {
  const LN = plug('LocalNotifications');
  const future = items.filter((n) => n.at > Date.now() + 5000).sort((a, b) => a.at - b.at).slice(0, 60);
  if (LN) {
    try {
      const pending = await LN.getPending();
      if (pending.notifications?.length) await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      if (!future.length) return;
      if ((await LN.checkPermissions()).display !== 'granted') return;
      await ensureChannels(channelNames);
      await LN.schedule({
        notifications: future.map((n) => ({
          id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true },
          channelId: 'mochi_' + (sound || 'chime'), smallIcon: 'ic_stat_mochi', iconColor: '#D9A33A', extra: n.extra || null,
        })),
      });
    } catch (e) { console.warn('schedule failed', e); }
    return;
  }
  // Browser fallback: works while the page is open
  webTimers.forEach(clearTimeout); webTimers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  for (const n of future) {
    const ms = n.at - Date.now();
    if (ms < 2 ** 31 - 1) webTimers.push(setTimeout(() => { try { new Notification(n.title, { body: n.body, icon: 'assets/icon-192.png' }); } catch {} }, ms));
  }
}

export async function notifyNow(title, body, sound) {
  const LN = plug('LocalNotifications');
  if (LN) {
    try { await LN.schedule({ notifications: [{ id: 1900000000 + Math.floor(Math.random() * 1e6), title, body, schedule: { at: new Date(Date.now() + 500) }, channelId: 'mochi_' + (sound || 'chime') }] }); } catch {}
    return;
  }
  if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body }); } catch {} }
}

// ---------------- Speech recognition ----------------
export function speechSupported() {
  return isNative() || !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
export async function listen(lang, prompt) {
  const SR = plug('SpeechRecognition');
  const code = lang === 'zh' ? 'zh-CN' : 'en-US';
  if (SR) {
    const av = await SR.available();
    if (!av.available) throw new Error('speechUnavailable');
    const perm = await SR.requestPermissions();
    if (perm.speechRecognition && perm.speechRecognition !== 'granted') throw new Error('micDenied');
    const r = await SR.start({ language: code, maxResults: 1, prompt, partialResults: false, popup: true });
    return (r.matches && r.matches[0]) || '';
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) throw new Error('speechUnavailable');
  return new Promise((res, rej) => {
    const rec = new Ctor();
    rec.lang = code; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => res(e.results[0][0].transcript);
    rec.onerror = (e) => rej(new Error(e.error === 'not-allowed' ? 'micDenied' : 'speechFailed'));
    rec.onend = () => res('');
    rec.start();
  });
}

// ---------------- Files: save / share / open ----------------
export async function saveFile(filename, blob) {
  const FS = plug('Filesystem'), SH = plug('Share');
  if (FS) {
    const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    const res = await FS.writeFile({ path: filename, data: b64, directory: 'CACHE' });
    if (SH) { try { await SH.share({ title: filename, url: res.uri, dialogTitle: filename }); } catch (e) { if (!/cancel/i.test(e.message || '')) throw e; } }
    return res.uri;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return url;
}

export function openExternal(url) {
  // In the Android WebView, navigating to an external URL is handed to the system (browser / mail app)
  if (isNative()) { window.location.href = url; return; }
  const a = Object.assign(document.createElement('a'), { href: url, target: '_blank', rel: 'noopener' });
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------------- App lifecycle ----------------
export function onBack(fn) { const A = plug('App'); if (A) A.addListener('backButton', fn); }
export function onResume(fn) {
  const A = plug('App');
  if (A) A.addListener('resume', fn);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fn(); });
}
export function exitApp() { const A = plug('App'); if (A) A.exitApp(); }
