// Data layer: IndexedDB persistence for app state, files (Blobs) and local backup snapshots.
import { uid, blobToDataURL, dataURLToBlob, debounce } from './utils.js';

const DB_NAME = 'mochi-db';
let db;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('backups')) d.createObjectStore('backups', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const req = fn(s);
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export function defaultSettings() {
  const zh = (navigator.language || 'en').toLowerCase().startsWith('zh');
  return {
    lang: zh ? 'zh' : 'en',
    onboarded: false,
    appearance: { mode: 'system', color: 'honey', fontScale: 1 },
    home: { sections: ['next', 'today', 'friends', 'focus', 'assignments', 'exams', 'todos'], hidden: [] },
    pig: { acc: 'bow', expr: 'happy', name: '' },
    notif: {
      enabled: true, class: true, assignment: true, exam: true, review: true, pomodoro: true, todo: true,
      classLead: 15, assignmentLead: 1440, examDays: [7, 3, 1], reviewTime: '20:00',
      dnd: false, dndStart: '23:00', dndEnd: '07:00', sound: 'chime',
    },
    cal: { weekStart: 1, view: 'week', timeFmt: '24', dateFmt: 'YMD', dayStart: 7, dayEnd: 22 },
    semester: { start: '', weeks: 14, special: {} },
    sound: { app: true, vibrate: true, timer: 'bell' },
    focus: { focus: 25, short: 5, long: 15, longEvery: 4, dailyGoal: 120, autoNext: false },
    backup: { auto: true, last: null, lastExport: null },
    security: { pin: null, lockOnResume: true },
    friends: { shareTimetable: true, sharedCourses: 'all', allowReminders: true, allowChat: true, allowMedia: true, notify: true, instant: false },
    cloud: { autoSync: true, deviceId: '', uid: null, email: null, lastSync: null, lastRemote: 0, localChange: 0 },
  };
}

export function defaultState() {
  return {
    v: 1,
    profile: { name: '', avatar: '🐷', email: '', createdAt: Date.now() },
    settings: defaultSettings(),
    courses: [], assignments: [], exams: [], todos: [], notes: [], focusLog: [],
    timer: { mode: 'focus', running: false, endAt: 0, remainingMs: 0, totalMs: 0, cycle: 0, label: '' },
    rewards: { coins: 0 },
    grades: { semesters: [], scale: null, target: '', nextCredits: '' },
  };
}

// Deep-merge saved data over defaults so newly added settings always exist
function merge(def, saved) {
  if (Array.isArray(def) || typeof def !== 'object' || def === null) return saved === undefined ? def : saved;
  const out = { ...def };
  for (const k of Object.keys(saved || {})) out[k] = k in def ? merge(def[k], saved[k]) : saved[k];
  return out;
}

const listeners = new Set();
export const store = {
  state: defaultState(),
  ready: false,
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export async function initStore() {
  db = await openDB();
  const saved = await tx('kv', 'readonly', (s) => s.get('state'));
  store.state = saved ? merge(defaultState(), saved) : defaultState();
  store.ready = true;
  return store.state;
}

const persist = debounce(async () => {
  try { await tx('kv', 'readwrite', (s) => s.put(JSON.parse(JSON.stringify(store.state)), 'state')); }
  catch (e) { console.error('save failed', e); window.dispatchEvent(new CustomEvent('mochi-error', { detail: 'saveFailed' })); }
  autoBackup();
}, 250);

// Call after mutating store.state
export function commit(reason = '') {
  persist();
  listeners.forEach((fn) => fn(reason));
}

export async function flush() {
  await tx('kv', 'readwrite', (s) => s.put(JSON.parse(JSON.stringify(store.state)), 'state'));
}

// ---------- Files ----------
export async function putFile(file) {
  const rec = { id: uid(), name: file.name || 'file', type: file.type || 'application/octet-stream', size: file.size, blob: file, createdAt: Date.now() };
  await tx('files', 'readwrite', (s) => s.put(rec));
  return rec.id;
}
// small key/value helpers (e.g. the last synced state used for merging between devices)
export const kvGet = (key) => tx('kv', 'readonly', (s) => s.get(key));
export const kvPut = (key, val) => tx('kv', 'readwrite', (s) => s.put(val, key));
export const putFileRecord = (rec) => tx('files', 'readwrite', (s) => s.put(rec));
export const getFile = (id) => tx('files', 'readonly', (s) => s.get(id));
export const delFile = (id) => tx('files', 'readwrite', (s) => s.delete(id));
export const listFiles = () => tx('files', 'readonly', (s) => s.getAll());

export function fileRefs() {
  const refs = new Map();
  const add = (ids, label) => (ids || []).forEach((id) => refs.set(id, label));
  store.state.assignments.forEach((a) => add(a.files, a.title));
  store.state.notes.forEach((n) => add(n.files, n.title));
  return refs;
}

// ---------- Backups ----------
const AUTO_MIN_GAP = 6 * 3600 * 1000;
async function autoBackup() {
  const b = store.state.settings.backup;
  if (!b.auto) return;
  if (b.last && Date.now() - b.last < AUTO_MIN_GAP) return;
  await snapshot('auto');
}

export async function snapshot(kind = 'manual') {
  const rec = { id: uid(), at: Date.now(), kind, state: JSON.parse(JSON.stringify(store.state)) };
  await tx('backups', 'readwrite', (s) => s.put(rec));
  const all = (await tx('backups', 'readonly', (s) => s.getAll())).sort((a, b) => b.at - a.at);
  for (const old of all.slice(10)) await tx('backups', 'readwrite', (s) => s.delete(old.id));
  store.state.settings.backup.last = rec.at;
  await flush();
  listeners.forEach((fn) => fn('backup'));
  return rec;
}

export async function listBackups() {
  return (await tx('backups', 'readonly', (s) => s.getAll())).sort((a, b) => b.at - a.at)
    .map((b) => ({ id: b.id, at: b.at, kind: b.kind, size: JSON.stringify(b.state).length }));
}

export async function restoreBackup(id) {
  const rec = await tx('backups', 'readonly', (s) => s.get(id));
  if (!rec) throw new Error('notFound');
  const keepBackup = store.state.settings.backup;
  store.state = merge(defaultState(), rec.state);
  store.state.settings.backup = { ...store.state.settings.backup, last: keepBackup.last };
  await flush();
  listeners.forEach((fn) => fn('restore'));
}

export async function exportData(includeFiles = true) {
  const out = { app: 'mochi-planner', format: 1, exportedAt: new Date().toISOString(), state: store.state, files: [] };
  if (includeFiles) {
    for (const f of await listFiles()) out.files.push({ id: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, data: await blobToDataURL(f.blob) });
  }
  return out;
}

export async function importData(obj) {
  if (!obj || obj.app !== 'mochi-planner' || !obj.state) throw new Error('invalidBackup');
  await snapshot('before-import');
  for (const f of obj.files || []) {
    const blob = await dataURLToBlob(f.data);
    await tx('files', 'readwrite', (s) => s.put({ id: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, blob }));
  }
  store.state = merge(defaultState(), obj.state);
  await flush();
  listeners.forEach((fn) => fn('import'));
}

export async function storageUsage() {
  const files = await listFiles();
  const filesBytes = files.reduce((a, f) => a + (f.size || 0), 0);
  const dataBytes = JSON.stringify(store.state).length;
  let quota = null;
  try { const est = await navigator.storage?.estimate?.(); if (est) quota = est; } catch {}
  return { files: files.length, filesBytes, dataBytes, quota };
}

export async function wipeAll() {
  await tx('kv', 'readwrite', (s) => s.clear());
  await tx('files', 'readwrite', (s) => s.clear());
  await tx('backups', 'readwrite', (s) => s.clear());
  store.state = defaultState();
  listeners.forEach((fn) => fn('wipe'));
}

// Replace the whole state (used by cloud sync); keeps device-only keys from the current state
export async function replaceState(next, reason = 'remote', keep = (cur, nxt) => nxt) {
  const merged = keep(store.state, merge(defaultState(), next));
  store.state = merged;
  await flush();
  listeners.forEach((fn) => fn(reason));
}
