// Cloud account & sync (Firebase Auth + Firestore), loaded on demand from the official CDN.
// Data model: users/{uid} = { data: JSON(state), clientTime, device, updatedAt, size }
//             users/{uid}/backups/{id} = { data, createdAt, device, size }
import { store, commit, replaceState, flush } from './store.js';
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from './firebase-config.js';
import { isNative, plug } from './native.js';
import { uid as newId, debounce } from './utils.js';

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const C = () => store.state.settings.cloud;
let fb = null, loading = null, unsub = null;

export const status = { state: 'signedOut', user: null, error: null };
export const getFB = () => fb;
const subs = new Set();
export const onCloud = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((f) => { try { f(status); } catch (e) { console.error(e); } });

// ---------- errors ----------
const CODES = {
  'auth/invalid-email': 'fbInvalidEmail', 'auth/user-not-found': 'fbWrongLogin', 'auth/wrong-password': 'fbWrongLogin',
  'auth/invalid-credential': 'fbWrongLogin', 'auth/invalid-login-credentials': 'fbWrongLogin', 'auth/email-already-in-use': 'fbEmailInUse',
  'auth/weak-password': 'fbWeakPassword', 'auth/too-many-requests': 'fbTooMany', 'auth/network-request-failed': 'offline',
  'auth/requires-recent-login': 'fbRecentLogin', 'auth/popup-closed-by-user': 'cancelled', 'auth/cancelled-popup-request': 'cancelled',
  'auth/popup-blocked': 'fbPopupBlocked', 'auth/credential-already-in-use': 'fbCredInUse', 'auth/provider-already-linked': 'fbAlreadyLinked',
  'auth/operation-not-allowed': 'fbProviderOff', 'auth/unauthorized-domain': 'fbDomain', 'auth/missing-password': 'required',
  'auth/account-exists-with-different-credential': 'fbCredInUse', 'auth/user-mismatch': 'fbUserMismatch',
  'permission-denied': 'fbRules', unavailable: 'offline', 'deadline-exceeded': 'offline',
};
export function normalize(e) {
  if (e?.mochi) return e;
  const code = e?.code || '';
  const msg = String(e?.message || e || '');
  let key = CODES[code];
  if (!key && /^(fb[A-Z]\w+|offline|cancelled|notFound|required)$/.test(msg)) key = msg;
  if (!key) {
    if (/cancel/i.test(msg) || /cancel/i.test(code)) key = 'cancelled';
    else if (/DEVELOPER_ERROR|\b10:|No credential|oauth|client id|serverClientId/i.test(msg)) key = 'fbGoogleConfig';
    else if (/Failed to fetch|import|network|offline/i.test(msg)) key = 'offline';
    else key = 'fbGeneric';
  }
  const err = new Error(key);
  err.mochi = true; err.detail = code || msg;
  console.warn('[cloud]', code, msg);
  return err;
}
const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw normalize(e); } };

// ---------- SDK ----------
export function loadSDK() {
  if (fb) return Promise.resolve(fb);
  if (!loading) {
    loading = (async () => {
      if (!navigator.onLine) throw new Error('offline');
      const [appM, A, F] = await Promise.all([
        import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`),
      ]);
      const app = appM.initializeApp(FIREBASE_CONFIG);
      const auth = A.initializeAuth(app, {
        persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence],
        ...(isNative() ? {} : { popupRedirectResolver: A.browserPopupRedirectResolver }),
      });
      const db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
      fb = { app, auth, db, A, F };
      A.onAuthStateChanged(auth, onUser);
      return fb;
    })().catch((e) => { loading = null; throw normalize(e); });
  }
  return loading;
}

// ---------- state helpers ----------
const COLLECTIONS = ['courses', 'assignments', 'exams', 'todos', 'notes', 'focusLog'];
function syncable() {
  const s = JSON.parse(JSON.stringify(store.state));
  delete s.timer;
  for (const k of ['security', 'cloud', 'notifAsked', 'onboarded', 'backup']) delete s.settings[k];
  return s;
}
const hasLocalData = () => COLLECTIONS.some((k) => store.state[k]?.length);
const keepDeviceKeys = (cur, next) => {
  next.timer = cur.timer;
  Object.assign(next.settings, {
    security: cur.settings.security, cloud: cur.settings.cloud, notifAsked: cur.settings.notifAsked,
    onboarded: true, backup: cur.settings.backup,
  });
  return next;
};
export function mergeStates(remote, local) {
  const out = JSON.parse(JSON.stringify(remote));
  for (const k of COLLECTIONS) {
    const ids = new Set((out[k] || []).map((x) => x.id));
    out[k] = [...(out[k] || []), ...(local[k] || []).filter((x) => !ids.has(x.id))];
  }
  out.rewards = { coins: Math.max(remote.rewards?.coins || 0, local.rewards?.coins || 0) };
  return out;
}

async function applyRemote(data, clientTime) {
  await replaceState(data, 'remote', keepDeviceKeys);
  Object.assign(C(), { lastRemote: clientTime || Date.now(), lastSync: Date.now(), localChange: 0 });
  await flush();
}

// ---------- upload / download ----------
let uploading = false, again = false;
async function upload() {
  if (!fb || !status.user) return;
  if (uploading) { again = true; return; }
  uploading = true;
  status.state = 'syncing'; emit();
  try {
    const { F, db } = fb;
    const data = JSON.stringify(syncable());
    if (data.length > 950000) throw Object.assign(new Error('tooLarge'), { code: 'tooLarge' });
    const clientTime = Date.now();
    await F.setDoc(F.doc(db, 'users', status.user.uid), { data, clientTime, device: C().deviceId, size: data.length, app: 'mochi-planner', v: 1, updatedAt: F.serverTimestamp() });
    Object.assign(C(), { lastSync: Date.now(), lastRemote: clientTime, localChange: 0, size: data.length });
    commit('cloud-meta');
    status.state = 'synced'; status.error = null;
  } catch (e) {
    status.state = navigator.onLine ? 'error' : 'offline';
    status.error = e?.code === 'tooLarge' ? Object.assign(new Error('fbTooLarge'), { mochi: true }) : normalize(e);
  }
  uploading = false; emit();
  if (again) { again = false; upload(); }
}
const scheduleUpload = debounce(() => { if (C().autoSync && status.user) upload(); }, 2500);

let conflictResolver = async () => 'cloud';
export const setConflictResolver = (fn) => { conflictResolver = fn; };

async function initialSync(firstTime) {
  const { F, db } = fb;
  const snap = await F.getDoc(F.doc(db, 'users', status.user.uid));
  if (!snap.exists()) { await upload(); return; }
  const d = snap.data();
  const remote = JSON.parse(d.data || '{}');
  if (firstTime) {
    const choice = hasLocalData() ? await conflictResolver(remote) : 'cloud';
    if (choice === 'local') return upload();
    if (choice === 'merge') { await applyRemote(mergeStates(remote, syncable()), d.clientTime); return upload(); }
    return applyRemote(remote, d.clientTime);
  }
  await reconcile(d);
}

// Decide between remote and local copies (last change wins)
async function reconcile(d) {
  const remoteNewer = (d.clientTime || 0) > (C().lastRemote || 0) && d.device !== C().deviceId;
  const localDirty = (C().localChange || 0) > (C().lastSync || 0);
  if (remoteNewer && (!localDirty || d.clientTime > C().localChange)) return applyRemote(JSON.parse(d.data), d.clientTime);
  if (localDirty) return upload();
}

function startListener() {
  stopListener();
  const { F, db } = fb;
  unsub = F.onSnapshot(F.doc(db, 'users', status.user.uid), (snap) => {
    if (!snap.exists() || snap.metadata.hasPendingWrites) return;
    const d = snap.data();
    if (d.device === C().deviceId || (d.clientTime || 0) <= (C().lastRemote || 0)) return;
    if (!C().autoSync) { status.remoteNewer = true; emit(); return; }
    reconcile(d).then(() => { status.state = 'synced'; emit(); }).catch((e) => { status.error = normalize(e); emit(); });
  }, (e) => { status.state = 'error'; status.error = normalize(e); emit(); });
}
function stopListener() { if (unsub) { unsub(); unsub = null; } }

async function onUser(user) {
  status.user = user;
  stopListener();
  if (!user) {
    status.state = 'signedOut';
    if (C().uid) { Object.assign(C(), { uid: null, email: null }); commit('cloud-meta'); }
    emit(); return;
  }
  const firstTime = C().uid !== user.uid;
  if (!C().deviceId) C().deviceId = newId();
  Object.assign(C(), { uid: user.uid, email: user.email });
  if (firstTime) C().lastRemote = 0;
  if (!store.state.profile.name && user.displayName) store.state.profile.name = user.displayName;
  if (!store.state.profile.email && user.email) store.state.profile.email = user.email;
  commit('cloud-meta');
  status.state = 'syncing'; status.error = null; emit();
  try { await initialSync(firstTime); startListener(); status.state = 'synced'; status.remoteNewer = false; }
  catch (e) { status.state = navigator.onLine ? 'error' : 'offline'; status.error = normalize(e); }
  emit();
}

// ---------- public API ----------
export function initCloud() {
  store.onChange((reason) => {
    if (['cloud-meta', 'remote', 'backup', 'wipe'].includes(reason)) return;
    C().localChange = Date.now();
    scheduleUpload();
  });
  if (C().uid) {
    status.state = 'loading'; emit();
    loadSDK().catch((e) => { status.state = 'offline'; status.error = e; emit(); });
  }
  window.addEventListener('online', () => { if (status.user) syncNow().catch(() => {}); else if (C().uid && !fb) loadSDK().catch(() => {}); });
}

export const syncNow = wrap(async () => {
  await loadSDK();
  if (!status.user) throw new Error('fbNotSignedIn');
  status.state = 'syncing'; emit();
  const { F, db } = fb;
  const snap = await F.getDoc(F.doc(db, 'users', status.user.uid));
  if (snap.exists()) {
    const d = snap.data();
    const remoteNewer = (d.clientTime || 0) > (C().lastRemote || 0) && d.device !== C().deviceId;
    const localDirty = (C().localChange || 0) > (C().lastSync || 0);
    if (remoteNewer && (!localDirty || d.clientTime > C().localChange)) await applyRemote(JSON.parse(d.data), d.clientTime);
    else await upload();
  } else await upload();
  status.state = 'synced'; status.remoteNewer = false; emit();
});

async function googleCredential() {
  const { A } = fb;
  const FA = plug('FirebaseAuthentication');
  if (!FA) throw new Error('fbGoogleConfig');
  let r;
  try { r = await FA.signInWithGoogle(); }
  catch (e) {
    if (/cancel/i.test(e?.message || '')) throw e;
    console.warn('Credential Manager sign-in failed, trying legacy Google Sign-In', e);
    r = await FA.signInWithGoogle({ useCredentialManager: false });
  }
  const idToken = r?.credential?.idToken;
  if (!idToken) throw new Error('fbGoogleConfig');
  return A.GoogleAuthProvider.credential(idToken, r.credential.accessToken);
}

export const signInGoogle = wrap(async () => {
  const { A, auth } = await loadSDK();
  if (isNative()) await A.signInWithCredential(auth, await googleCredential());
  else {
    try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); }
    catch (e) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') await A.signInWithRedirect(auth, new A.GoogleAuthProvider());
      else throw e;
    }
  }
});
export const signInEmail = wrap(async (email, pw) => { const { A, auth } = await loadSDK(); await A.signInWithEmailAndPassword(auth, email, pw); });
export const signUpEmail = wrap(async (email, pw, name) => {
  const { A, auth } = await loadSDK();
  const cred = await A.createUserWithEmailAndPassword(auth, email, pw);
  if (name) await A.updateProfile(cred.user, { displayName: name });
  try { await A.sendEmailVerification(cred.user); } catch {}
});
export const resetPassword = wrap(async (email) => { const { A, auth } = await loadSDK(); await A.sendPasswordResetEmail(auth, email); });
export const resendVerification = wrap(async () => { await fb.A.sendEmailVerification(status.user); });
export const refreshUser = wrap(async () => { await status.user.reload(); status.user = fb.auth.currentUser; emit(); });

export const signOut = wrap(async () => {
  if (status.user) await upload();
  stopListener();
  await fb.A.signOut(fb.auth);
  if (isNative()) { try { await plug('FirebaseAuthentication')?.signOut(); } catch {} }
});

export const providers = () => (status.user?.providerData || []).map((p) => p.providerId);

async function reauth(password) {
  const { A } = fb; const u = status.user;
  if (providers().includes('password') && password) return A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password));
  if (providers().includes('google.com')) {
    if (isNative()) return A.reauthenticateWithCredential(u, await googleCredential());
    return A.reauthenticateWithPopup(u, new A.GoogleAuthProvider());
  }
  throw new Error('fbRecentLogin');
}

export const changePassword = wrap(async (current, next) => {
  const { A } = fb; const u = status.user;
  await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, current));
  await A.updatePassword(u, next);
});
export const linkGoogle = wrap(async () => {
  const { A } = fb;
  if (isNative()) await A.linkWithCredential(status.user, await googleCredential());
  else await A.linkWithPopup(status.user, new A.GoogleAuthProvider());
  await status.user.reload(); status.user = fb.auth.currentUser; emit();
});
export const linkPassword = wrap(async (pw) => {
  const { A } = fb;
  await A.linkWithCredential(status.user, A.EmailAuthProvider.credential(status.user.email, pw));
  await status.user.reload(); status.user = fb.auth.currentUser; emit();
});

export const deleteAccount = wrap(async (password) => {
  const { A, F, db } = fb; const u = status.user;
  await reauth(password);
  stopListener();
  const backups = await F.getDocs(F.collection(db, 'users', u.uid, 'backups'));
  for (const d of backups.docs) await F.deleteDoc(d.ref);
  await F.deleteDoc(F.doc(db, 'users', u.uid));
  await A.deleteUser(u);
  Object.assign(C(), { uid: null, email: null, lastSync: null, lastRemote: 0 });
  commit('cloud-meta');
});

// ---------- cloud backups ----------
const KEEP = 5;
export const cloudBackup = wrap(async () => {
  await loadSDK();
  if (!status.user) throw new Error('fbNotSignedIn');
  const { F, db } = fb;
  const col = F.collection(db, 'users', status.user.uid, 'backups');
  const data = JSON.stringify(syncable());
  if (data.length > 950000) throw Object.assign(new Error('fbTooLarge'), { mochi: true });
  await F.addDoc(col, { data, createdAt: Date.now(), device: C().deviceId, size: data.length });
  const all = await F.getDocs(F.query(col, F.orderBy('createdAt', 'desc')));
  for (const d of all.docs.slice(KEEP)) await F.deleteDoc(d.ref);
  C().lastCloudBackup = Date.now(); commit('cloud-meta');
});
export const listCloudBackups = wrap(async () => {
  await loadSDK();
  if (!status.user) return [];
  const { F, db } = fb;
  const all = await F.getDocs(F.query(F.collection(db, 'users', status.user.uid, 'backups'), F.orderBy('createdAt', 'desc')));
  return all.docs.map((d) => ({ id: d.id, createdAt: d.data().createdAt, size: d.data().size, device: d.data().device }));
});
export const restoreCloudBackup = wrap(async (id) => {
  const { F, db } = fb;
  const d = await F.getDoc(F.doc(db, 'users', status.user.uid, 'backups', id));
  if (!d.exists()) throw new Error('notFound');
  await replaceState(JSON.parse(d.data().data), 'restore', keepDeviceKeys);
  await upload();
});
