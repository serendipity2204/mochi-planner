// Friends & chat data layer (Firestore). Works on top of the signed-in cloud session.
// profiles/{uid}, inviteCodes/{code}, friendships/{a_b}, shared/{uid}, chats/{a_b}/messages/{id}
import { store } from './store.js';
import * as cloud from './cloud.js';
import { notifyNow, playSound, vibrate, plug } from './native.js';
import { FIREBASE_CONFIG } from './firebase-config.js';
import { t } from './i18n.js';
import { debounce, dkey, toMin, parseDate } from './utils.js';
import { courseColor, expandCourse } from './data.js';

export const pairId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const FS = () => cloud.getFB();
const settings = () => store.state.settings.friends;

export const state = {
  me: null, profile: null, friends: [], requests: [], outgoing: [],
  profiles: {}, shared: {}, chats: {}, ready: false, openChat: null,
};
const subs = new Set();
export const onFriends = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = debounce(() => { subs.forEach((f) => { try { f(state); } catch (e) { console.error(e); } }); syncNativeMessages(); }, 60);
let pokeHandler = () => {};
export const setPokeHandler = (fn) => { pokeHandler = fn; };

let unsubs = [];
const friendUnsubs = new Map();
// chat id -> last notified timestamp (persisted so messages that arrived while the app was closed alert once)
const notified = new Map((() => { try { return Object.entries(JSON.parse(localStorage.getItem('mochi-notified') || '{}')); } catch { return []; } })());
const saveNotified = () => { try { localStorage.setItem('mochi-notified', JSON.stringify(Object.fromEntries(notified))); } catch {} };
let bannerHandler = null;
export const setBannerHandler = (fn) => { bannerHandler = fn; };

export function initFriends() {
  cloud.onCloud((st) => {
    if (st.user && st.state !== 'loading' && state.me !== st.user.uid && FS()) start(st.user).catch((e) => console.warn('friends', e));
    else if (!st.user && state.me) stop();
  });
  store.onChange((reason) => { if (state.me && !['cloud-meta', 'timer'].includes(reason)) publish(); if (reason === 'settings' || reason === 'lang') syncNativeMessages(); });
}

function stop() {
  unsubs.forEach((u) => u()); unsubs = [];
  friendUnsubs.forEach((u) => u.forEach((x) => x())); friendUnsubs.clear();
  Object.assign(state, { me: null, profile: null, friends: [], requests: [], outgoing: [], profiles: {}, shared: {}, chats: {}, ready: false });
  emit();
}

async function start(user) {
  stop();
  state.me = user.uid;
  const { F, db } = FS();
  await ensureProfile();
  await publishNow();
  unsubs.push(F.onSnapshot(F.query(F.collection(db, 'friendships'), F.where('users', 'array-contains', user.uid)), (snap) => {
    const prevReq = new Set(state.requests.map((r) => r.id));
    state.friends = []; state.requests = []; state.outgoing = [];
    snap.forEach((d) => {
      const x = { id: d.id, ...d.data() };
      x.other = x.users.find((u) => u !== state.me);
      if (x.status === 'accepted') state.friends.push(x);
      else if (x.from === state.me) state.outgoing.push(x);
      else state.requests.push(x);
    });
    for (const x of [...state.friends, ...state.requests, ...state.outgoing]) watchFriend(x.other, x.status === 'accepted');
    for (const uid of [...friendUnsubs.keys()]) if (![...state.friends, ...state.requests, ...state.outgoing].some((x) => x.other === uid)) { friendUnsubs.get(uid).forEach((u) => u()); friendUnsubs.delete(uid); }
    const fresh = state.requests.filter((r) => !prevReq.has(r.id) && state.ready);
    for (const r of fresh) alertUser(t('friends.newRequestTitle'), t('friends.newRequestBody', { name: nameOf(r.other) }));
    state.ready = true; emit();
  }, (e) => { console.warn('friendships', e); state.error = cloud.normalize(e); emit(); }));
  unsubs.push(F.onSnapshot(F.query(F.collection(db, 'chats'), F.where('users', 'array-contains', user.uid)), (snap) => {
    snap.forEach((d) => {
      const c = d.data();
      const prev = state.chats[d.id];
      state.chats[d.id] = c;
      const last = c.last;
      if (!last || last.from === state.me) return;
      const read = c.read?.[state.me] || 0;
      const seen = Math.max(read, notified.get(d.id) || 0);
      if (last.at > seen) {
        notified.set(d.id, last.at); saveNotified(); nativeSeen(d.id, last.at);
        const other = c.users.find((u) => u !== state.me);
        const fresh = Date.now() - last.at < 120000;
        if (last.type === 'poke' && fresh) { pokeHandler(other, last); alertUser(t('friends.pokeTitle', { name: nameOf(other) }), t('friends.pokeBody'), true, other); }
        else if (state.openChat !== other) alertUser(nameOf(other), last.type === 'poke' ? t('friends.pokeBody') : last.text || t('chat.newMessage'), false, other, !fresh);
      }
    });
    emit();
  }, (e) => console.warn('chats', e)));
}

function alertUser(title, body, strong = false, uid = null, quiet = false) {
  if (!settings().notify) return;
  const s = store.state.settings.sound;
  if (!quiet && s.app) playSound(strong ? 'bell' : 'bubble', 0.3);
  if (!quiet && s.vibrate) vibrate(strong ? 500 : 80);
  if (document.visibilityState !== 'visible') notifyNow(title, body, store.state.settings.notif.sound);
  else if (!strong) bannerHandler?.({ uid, title, body });
}

// ---------- Android background message check (runs ~every 15 min while the app is closed) ----------
function nativeSeen(chat, at) { try { plug('MochiWidgets')?.msgSeen({ chat, at }); } catch {} }
export const syncNativeMessages = debounce(async () => {
  const W = plug('MochiWidgets');
  if (!W?.configureMessages) return;
  try {
    const user = cloud.getFB()?.auth?.currentUser;
    const on = !!(state.me && user && settings().notify);
    const names = Object.fromEntries(state.friends.map((f) => [f.other, nameOf(f.other)]));
    await W.configureMessages({
      enabled: on, instant: !!settings().instant, uid: on ? state.me : '', refreshToken: on ? user.refreshToken || '' : '',
      apiKey: FIREBASE_CONFIG.apiKey, projectId: FIREBASE_CONFIG.projectId,
      names: JSON.stringify(names), notified: JSON.stringify(Object.fromEntries(notified)),
      labels: JSON.stringify({ newMsg: t('chat.newMessage'), poke: t('friends.pokeTitle', { name: '{name}' }), pokeBody: t('friends.pokeBody'), friend: t('greet.friend'), image: t('chat.prevImage'), voice: t('chat.prevVoice'), card: t('chat.prevCard'), channel: t('friends.notify'), channelId: store.state.settings.notif.sound && store.state.settings.notif.sound !== 'none' ? 'mochi_' + store.state.settings.notif.sound : '', watchTitle: t('friends.watchTitle'), watchText: t('friends.watchText'), watchChannel: t('friends.instant') }),
    });
  } catch (e) { console.warn('native msgs', e); }
}, 1500);
export async function takeOpenChat() {
  try { const r = await plug('MochiWidgets')?.takeOpenChat(); return r?.uid || null; } catch { return null; }
}

function watchFriend(uid, accepted) {
  if (friendUnsubs.has(uid) && (!accepted || friendUnsubs.get(uid).length > 1)) return;
  const { F, db } = FS();
  const list = friendUnsubs.get(uid) || [];
  if (!list.length) list.push(F.onSnapshot(F.doc(db, 'profiles', uid), (d) => { state.profiles[uid] = d.data() || {}; emit(); }, () => {}));
  if (accepted && list.length === 1) list.push(F.onSnapshot(F.doc(db, 'shared', uid), (d) => { state.shared[uid] = d.data() || null; emit(); }, () => {}));
  friendUnsubs.set(uid, list);
}

// ---------- profile & invite code ----------
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

async function ensureProfile() {
  const { F, db } = FS();
  const ref = F.doc(db, 'profiles', state.me);
  const snap = await F.getDoc(ref);
  let code = snap.exists() ? snap.data().code : null;
  if (!code) {
    for (let i = 0; i < 6 && !code; i++) {
      const c = newCode();
      if (!(await F.getDoc(F.doc(db, 'inviteCodes', c))).exists()) { await F.setDoc(F.doc(db, 'inviteCodes', c), { uid: state.me }); code = c; }
    }
  }
  state.profile = { ...(snap.data() || {}), code };
  await F.setDoc(ref, profilePayload(code), { merge: true });
}
function profilePayload(code) {
  const p = store.state.profile;
  const avatar = p.avatar && p.avatar.length < 60000 ? p.avatar : '🐷';
  return { name: p.name || cloud.status.user?.displayName || t('greet.friend'), avatar, code: code || state.profile?.code, pig: store.state.settings.pig, updatedAt: Date.now() };
}

function sharedPayload() {
  const s = settings();
  const courses = s.shareTimetable ? store.state.courses.filter((c) => s.sharedCourses === 'all' || (s.sharedCourses || []).includes(c.id)) : [];
  return {
    shareTimetable: !!s.shareTimetable, allowReminders: s.allowReminders !== false, allowChat: s.allowChat !== false, allowMedia: s.allowMedia !== false,
    timetable: courses.flatMap(expandCourse).map((c) => ({ name: c.name || '', code: c.code || '', start: c.start, end: c.end, days: c.days || [], startDate: c.startDate || '', endDate: c.endDate || '', location: c.location || '', type: c.type || '', color: courseColor(c) })),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '', updatedAt: Date.now(),
  };
}
async function publishNow() {
  if (!state.me) return;
  const { F, db } = FS();
  await F.setDoc(F.doc(db, 'shared', state.me), sharedPayload());
  await F.setDoc(F.doc(db, 'profiles', state.me), profilePayload(), { merge: true });
}
const publish = debounce(() => publishNow().catch((e) => console.warn('publish', e)), 2500);
export const publishShared = () => publish();

// ---------- friend requests ----------
const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw cloud.normalize(e); } };
const needMe = () => { if (!state.me) throw Object.assign(new Error('fbNotSignedIn'), { mochi: true }); };

export const addByCode = wrap(async (raw) => {
  needMe();
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) throw Object.assign(new Error('friendBadCode'), { mochi: true });
  const { F, db } = FS();
  const inv = await F.getDoc(F.doc(db, 'inviteCodes', code));
  if (!inv.exists()) throw Object.assign(new Error('friendBadCode'), { mochi: true });
  const other = inv.data().uid;
  if (other === state.me) throw Object.assign(new Error('friendSelf'), { mochi: true });
  const id = pairId(state.me, other);
  const ref = F.doc(db, 'friendships', id);
  const cur = await F.getDoc(ref);
  if (cur.exists()) {
    const d = cur.data();
    if (d.status === 'accepted') throw Object.assign(new Error('friendAlready'), { mochi: true });
    if (d.from === state.me) throw Object.assign(new Error('friendPending'), { mochi: true });
    await F.updateDoc(ref, { status: 'accepted', acceptedAt: Date.now() });
    return 'accepted';
  }
  await F.setDoc(ref, { users: [state.me, other].sort(), from: state.me, status: 'pending', createdAt: Date.now() });
  return 'sent';
});
export const accept = wrap(async (id) => { const { F, db } = FS(); await F.updateDoc(F.doc(db, 'friendships', id), { status: 'accepted', acceptedAt: Date.now() }); });
export const removeFriendship = wrap(async (id) => { const { F, db } = FS(); await F.deleteDoc(F.doc(db, 'friendships', id)); });

// ---------- chat ----------
export const send = wrap(async (other, msg) => {
  needMe();
  const { F, db } = FS();
  const id = pairId(state.me, other);
  const chatRef = F.doc(db, 'chats', id);
  const now = Date.now();
  await F.addDoc(F.collection(chatRef, 'messages'), { ...msg, from: state.me, createdAt: F.serverTimestamp(), clientTime: now });
  const preview = msg.type === 'text' ? msg.text.slice(0, 80) : msg.type === 'poke' ? t('chat.prevPoke') : msg.type === 'image' ? t('chat.prevImage') : msg.type === 'voice' ? t('chat.prevVoice') : t('chat.prevCard');
  await F.setDoc(chatRef, { users: [state.me, other].sort(), last: { type: msg.type, text: preview, from: state.me, at: now }, read: { [state.me]: now } }, { merge: true });
});
export const poke = (other) => send(other, { type: 'poke', text: t('friends.pokeText') });

export async function markRead(other) {
  if (!state.me) return;
  const { F, db } = FS();
  const id = pairId(state.me, other);
  if ((state.chats[id]?.read?.[state.me] || 0) >= (state.chats[id]?.last?.at || 0)) return;
  try { await F.setDoc(F.doc(db, 'chats', id), { users: [state.me, other].sort(), read: { [state.me]: Date.now() } }, { merge: true }); } catch (e) { console.warn(e); }
}

export function listenMessages(other, cb, limit = 80) {
  const { F, db } = FS();
  const q = F.query(F.collection(db, 'chats', pairId(state.me, other), 'messages'), F.orderBy('clientTime', 'desc'), F.limit(limit));
  return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), (e) => cb(null, cloud.normalize(e)));
}
export const deleteMessage = wrap(async (other, mid) => { const { F, db } = FS(); await F.deleteDoc(F.doc(db, 'chats', pairId(state.me, other), 'messages', mid)); });
export const editMessage = wrap(async (other, msg, text) => {
  const { F, db } = FS();
  const id = pairId(state.me, other);
  await F.updateDoc(F.doc(db, 'chats', id, 'messages', msg.id), { text, edited: true, editedAt: Date.now() });
  // keep the chat-list preview in sync when the latest message was edited
  const last = state.chats[id]?.last;
  if (last && last.from === state.me && last.type === 'text' && Math.abs((last.at || 0) - (msg.clientTime || 0)) < 5000) {
    await F.setDoc(F.doc(db, 'chats', id), { last: { ...last, text: text.slice(0, 80) } }, { merge: true });
  }
});
export const friendshipWith = (uid) => [...state.friends, ...state.requests, ...state.outgoing].find((x) => x.other === uid);

// ---------- helpers for views ----------
export const nameOf = (uid) => state.profiles[uid]?.name || t('greet.friend');
export const avatarOf = (uid) => state.profiles[uid]?.avatar || '🐷';
export const unreadOf = (uid) => {
  const c = state.chats[pairId(state.me, uid)];
  return c?.last && c.last.from !== state.me && c.last.at > (c.read?.[state.me] || 0);
};
export const unreadCount = () => state.friends.filter((f) => unreadOf(f.other)).length + state.requests.length;

const activeOn = (c, date) => {
  const k = dkey(date);
  if (c.startDate && k < c.startDate) return false;
  if (c.endDate && k > c.endDate) return false;
  return (c.days || []).includes(date.getDay());
};
export function friendClassesOn(uid, date) {
  return (state.shared[uid]?.timetable || []).filter((c) => activeOn(c, date)).sort((a, b) => toMin(a.start) - toMin(b.start));
}
// { state: 'hidden'|'inClass'|'free'|'done'|'noClass', course, next }
export function friendStatus(uid, now = new Date()) {
  const sh = state.shared[uid];
  if (!sh || !sh.shareTimetable) return { state: 'hidden' };
  const list = friendClassesOn(uid, now);
  const m = now.getHours() * 60 + now.getMinutes();
  const cur = list.find((c) => toMin(c.start) <= m && m < toMin(c.end));
  const next = list.find((c) => toMin(c.start) > m);
  if (cur) return { state: 'inClass', course: cur, next };
  if (next) return { state: 'free', next };
  return { state: list.length ? 'done' : 'noClass' };
}
export { parseDate };
export const _startForTests = (u) => start(u);
