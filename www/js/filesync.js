// Cloud sync for photos & attachments (Firestore only – works on the free Spark plan).
// users/{uid}/files/{fileId}            { name, type, size, createdAt, chunks, uploadedAt }
// users/{uid}/files/{fileId}/parts/{i}  { d: base64 chunk }
import { store, getFile, putFileRecord, fileRefs } from './store.js';
import * as cloud from './cloud.js';
import { debounce } from './utils.js';

export const MAX_FILE = 10 * 1024 * 1024; // larger files stay on this device only
const CHUNK = 700000; // base64 characters per part (Firestore documents max out at 1 MiB)
export const fileSync = { running: false, synced: 0, pending: 0, tooBig: 0, error: null };
const subs = new Set();
export const onFileSync = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => { try { f(fileSync); } catch {} });

const key = () => `mochi-cloudfiles-${cloud.status.user?.uid || ''}`;
function known() { try { return new Set(JSON.parse(localStorage.getItem(key()) || '[]')); } catch { return new Set(); } }
function saveKnown(s) { try { localStorage.setItem(key(), JSON.stringify([...s])); } catch {} }

const ready = () => cloud.getFB() && cloud.status.user && store.state.settings.cloud.autoSync !== false;
const FS = () => { const { F, db } = cloud.getFB(); return { F, db, uid: cloud.status.user.uid }; };

function blobToB64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
}
function b64ToBlob(b64, type) {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type });
}

async function uploadOne(f) {
  const { F, db, uid } = FS();
  const b64 = await blobToB64(f.blob);
  const n = Math.max(1, Math.ceil(b64.length / CHUNK));
  const ref = F.doc(db, 'users', uid, 'files', f.id);
  for (let i = 0; i < n; i++) await F.setDoc(F.doc(db, 'users', uid, 'files', f.id, 'parts', String(i)), { d: b64.slice(i * CHUNK, (i + 1) * CHUNK) });
  // meta last: its existence means the file is complete
  await F.setDoc(ref, { name: f.name, type: f.type, size: f.size, createdAt: f.createdAt || Date.now(), chunks: n, uploadedAt: Date.now() });
}

async function removeOne(id) {
  const { F, db, uid } = FS();
  const meta = await F.getDoc(F.doc(db, 'users', uid, 'files', id));
  const n = meta.exists() ? meta.data().chunks || 0 : 0;
  await F.deleteDoc(F.doc(db, 'users', uid, 'files', id));
  for (let i = 0; i < Math.max(n, 1); i++) await F.deleteDoc(F.doc(db, 'users', uid, 'files', id, 'parts', String(i)));
}

const inflight = new Map();
/** Download a file this device doesn't have yet. Returns the local record or null. */
export function fetchFile(id) {
  if (!ready()) return Promise.resolve(null);
  if (inflight.has(id)) return inflight.get(id);
  const p = (async () => {
    try {
      const { F, db, uid } = FS();
      const meta = await F.getDoc(F.doc(db, 'users', uid, 'files', id));
      if (!meta.exists()) return null;
      const m = meta.data();
      let b64 = '';
      for (let i = 0; i < (m.chunks || 1); i++) {
        const part = await F.getDoc(F.doc(db, 'users', uid, 'files', id, 'parts', String(i)));
        if (!part.exists()) return null;
        b64 += part.data().d || '';
      }
      const rec = { id, name: m.name || 'file', type: m.type || 'application/octet-stream', size: m.size || 0, createdAt: m.createdAt || Date.now(), blob: b64ToBlob(b64, m.type || 'application/octet-stream') };
      await putFileRecord(rec);
      const k = known(); k.add(id); saveKnown(k);
      window.dispatchEvent(new CustomEvent('mochi-files', { detail: { id } }));
      return rec;
    } catch (e) { console.warn('fetchFile', e); return null; } finally { inflight.delete(id); }
  })();
  inflight.set(id, p);
  return p;
}

let again = false;
export async function syncFiles() {
  if (!ready()) return;
  if (fileSync.running) { again = true; return; }
  fileSync.running = true; fileSync.error = null; emit();
  try {
    const refs = fileRefs();
    const k = known();
    let tooBig = 0, pending = 0;
    // 1. upload new local files / download missing ones
    for (const id of refs.keys()) {
      if (k.has(id)) { if (!(await getFile(id))) await fetchFile(id); continue; }
      const f = await getFile(id);
      if (!f) { await fetchFile(id); continue; }
      if ((f.size || 0) > MAX_FILE) { tooBig++; continue; }
      pending++; fileSync.pending = pending; emit();
      await uploadOne(f);
      k.add(id); saveKnown(k);
    }
    // 2. delete cloud copies of files no longer used by any assignment / note
    for (const id of [...k]) {
      if (refs.has(id)) continue;
      await removeOne(id);
      k.delete(id); saveKnown(k);
    }
    fileSync.synced = [...refs.keys()].filter((id) => k.has(id)).length;
    fileSync.tooBig = tooBig; fileSync.pending = 0;
  } catch (e) {
    console.warn('file sync', e);
    fileSync.error = cloud.normalize(e);
  }
  fileSync.running = false; emit();
  if (again) { again = false; schedule(); }
}
const schedule = debounce(() => syncFiles(), 4000);

export function initFileSync() {
  store.onChange((reason) => { if (!['cloud-meta', 'timer'].includes(reason)) schedule(); });
  cloud.onCloud((st) => { if (st.user && st.state === 'synced') schedule(); });
  window.addEventListener('online', () => schedule());
}

/** Remove every cloud file of the signed-in account (used when deleting the account). */
export async function purgeCloudFiles() {
  if (!cloud.getFB() || !cloud.status.user) return;
  const { F, db, uid } = FS();
  const list = await F.getDocs(F.collection(db, 'users', uid, 'files'));
  for (const d of list.docs) await removeOne(d.id);
  saveKnown(new Set());
}
