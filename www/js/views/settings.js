// Settings: every option is live, auto-saved and applied instantly.
import { store, commit, snapshot, listBackups, restoreBackup, exportData, importData, storageUsage, listFiles, delFile, fileRefs, wipeAll } from '../store.js';
import { t, applyLang, fmtDateTime, fmtDate, weekdayLong } from '../i18n.js';
import { esc, fmtBytes, dkey, shrinkImage, blobToDataURL } from '../utils.js';
import { on, go, back, rerender, openSheet, closeSheet, sheetHead, confirmDialog, promptDialog, toast, errMsg, formData, fieldError, select, toggle, pickFiles, loading, empty, closeAllSheets } from '../ui.js';
import * as cloud from '../cloud.js';
import { notifPermission, notifyNow, playSound, SOUNDS, saveFile, isNative } from '../native.js';
import { reschedule, buildReminders } from '../reminders.js';
import { SECTION_IDS } from './home.js';
import { setupPin, verifyPinCancellable } from '../lock.js';
import { avatarHTML } from './me.js';
import { previewHTML, pinWidget, pushWidgets } from '../widgets.js';

const S = () => store.state;
const set = () => S().settings;

const SECTIONS = [
  ['language', '🌐'], ['account', '👤'], ['notifications', '🔔'], ['appearance', '🎨'], ['calendar', '📅'],
  ['widgets', '🧩'], ['backup', '☁️'], ['privacy', '🔒'], ['friends', '👫'], ['sound', '🔊'], ['help', '💡'], ['about', 'ℹ️'],
];

// ---------- small builders ----------
const row = (ic, label, control, sub = '') => `<div class="set-row">${ic ? `<span class="ic">${ic}</span>` : ''}<span class="label">${label}${sub ? `<small>${sub}</small>` : ''}</span>${control}</div>`;
const btnRow = (ic, label, act, sub = '', extra = '') => `<button class="set-row" data-act="${act}" ${extra}><span class="ic">${ic}</span><span class="label">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="chev"></span></button>`;
const sw = (path, val) => toggle(`data-set="${path}" data-type="bool"`, val);
const sel = (path, opts, val, type = 'str') => select('', opts, val, `data-set="${path}" data-type="${type}"`);
const group = (title, rows) => `${title ? `<div class="set-group-title">${title}</div>` : ''}<div class="set-group">${rows.join('')}</div>`;
const leadOpts = (list) => list.map((m) => ({ value: m, label: m < 60 ? t('unit.min', { n: m }) : m % 1440 === 0 ? t('unit.day', { n: m / 1440 }) : t('unit.hour', { n: m / 60 }) }));

export function render(params = {}) {
  const sec = params.section;
  if (!sec) {
    return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('common.settings')}</h1></div>
      <div class="set-group">${SECTIONS.map(([k, ic]) => btnRow(ic, t('set.' + k), 'set.open', summary(k), `data-sec="${k}"`)).join('')}</div>
      <p class="center tiny muted">${t('set.autoSaved')}</p></div>`;
  }
  const body = (BUILDERS[sec] || (() => ''))();
  return `<div class="page" style="max-width:760px"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('set.' + sec)}</h1></div>${body}</div>`;
}

function summary(k) {
  const s = set();
  switch (k) {
    case 'language': return s.lang === 'zh' ? '简体中文' : 'English';
    case 'account': return cloud.status.user ? (cloud.status.user.email || S().profile.name) : (S().profile.name ? S().profile.name + ' · ' : '') + t('cloud.notSignedIn');
    case 'notifications': return s.notif.enabled ? (s.notif.dnd ? t('set.onDnd') : t('common.on')) : t('common.off');
    case 'appearance': return t('set.mode.' + s.appearance.mode) + ' · ' + t('color.' + s.appearance.color);
    case 'calendar': return `${t('set.weekStartsOn', { d: weekdayLong(s.cal.weekStart) })} · ${s.cal.timeFmt === '24' ? '24h' : '12h'}`;
    case 'backup': return cloud.status.user ? t('cloud.state.' + cloud.status.state) + (s.cloud.lastSync ? ' · ' + fmtDateTime(s.cloud.lastSync) : '') : s.backup.last ? t('set.lastBackup', { t: fmtDateTime(s.backup.last) }) : t('set.neverBackedUp');
    case 'privacy': return s.security.pin ? t('set.pinOn') : t('set.pinOff');
    case 'friends': return t('set.comingV3');
    case 'widgets': return t('widget.summary');
    case 'sound': return `${s.sound.app ? '🔊' : '🔇'} ${s.sound.vibrate ? '📳' : ''}`;
    default: return '';
  }
}

// ---------- cloud account UI ----------
let authMode = 'login';
export function syncBadge() {
  const st = cloud.status.state;
  const cls = { synced: 'green', syncing: 'yellow', loading: 'yellow', error: 'red', offline: '' }[st] || '';
  return `<span class="badge ${cls}">${t('cloud.state.' + st)}</span>`;
}
function cloudAccountHTML() {
  const u = cloud.status.user, st = cloud.status.state;
  if (!u) {
    if (st === 'loading') return `<div class="card" style="margin:14px 0">${loading(t('cloud.connecting'))}</div>`;
    return `<div class="card" style="margin:14px 0"><div class="card-title">☁️ ${t('cloud.title')}</div>
      <p class="small muted" style="margin:0 0 12px">${t('cloud.intro')}</p>
      <button class="btn block" data-act="cloud.google" style="background:var(--card-2);color:var(--text);border:1.5px solid var(--line)"><b style="color:#4285F4">G</b> ${t('cloud.google')}</button>
      <div class="center tiny muted" style="margin:12px 0">— ${t('cloud.orEmail')} —</div>
      <div class="seg" style="margin-bottom:12px">${['login', 'register'].map((m) => `<button class="${authMode === m ? 'on' : ''}" data-act="cloud.mode" data-m="${m}">${t('cloud.' + m)}</button>`).join('')}</div>
      <form id="auth-form" novalidate>
        ${authMode === 'register' ? `<div class="field"><label>${t('acct.nickname')}</label><input class="input" name="name" maxlength="24" value="${esc(S().profile.name)}"></div>` : ''}
        <div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>
        <div class="field"><label>${t('cloud.password')}</label><input class="input" name="pw" type="password" autocomplete="${authMode === 'register' ? 'new-password' : 'current-password'}" placeholder="${esc(t('cloud.pwPh'))}"></div>
        <button class="btn primary block">${t('cloud.' + authMode)}</button>
      </form>
      ${authMode === 'login' ? `<button class="btn ghost block sm" style="margin-top:6px" data-act="cloud.forgot">${t('cloud.forgot')}</button>` : ''}
      ${cloud.status.error && st !== 'signedOut' ? `<div class="err-text" style="margin-top:8px">${esc(t('err.' + cloud.status.error.message))}</div>` : ''}</div>`;
  }
  const prov = cloud.providers();
  const hasPw = prov.includes('password'), hasG = prov.includes('google.com');
  return `${group(t('cloud.title'), [
      row('👤', esc(u.displayName || S().profile.name || t('greet.friend')), syncBadge(), esc(u.email || '')),
      ...(hasPw && !u.emailVerified ? [btnRow('📧', t('cloud.verifyEmail'), 'cloud.verify', t('cloud.verifySub'))] : []),
      row('🔑', t('cloud.methods'), `<span class="val small">${[hasG ? 'Google ✓' : '', hasPw ? 'Email ✓' : ''].filter(Boolean).join(' · ')}</span>`),
      ...(!hasG ? [btnRow('🔗', t('cloud.linkGoogle'), 'cloud.linkGoogle')] : []),
      ...(!hasPw ? [btnRow('🔗', t('cloud.linkPassword'), 'cloud.linkPassword', t('cloud.linkPasswordSub'))] : []),
      ...(hasPw ? [btnRow('🔒', t('cloud.changePassword'), 'cloud.changePassword')] : []),
      btnRow('☁️', t('set.backup'), 'cloud.goBackup', set().cloud.lastSync ? t('cloud.lastSync', { t: fmtDateTime(set().cloud.lastSync) }) : ''),
      btnRow('🚪', t('cloud.signOut'), 'cloud.signOut', t('cloud.signOutSub')),
    ])}`;
}

async function cloudBackupList() {
  const el = openSheet(`${sheetHead(t('cloud.restore'))}<div id="cb-list">${loading()}</div>`);
  const list = await cloud.listCloudBackups();
  el.querySelector('#cb-list').innerHTML = `<p class="small muted" style="margin-top:0">${t('cloud.restoreHint')}</p>` + (list.length
    ? `<div class="list">${list.map((b) => `<div class="item"><span>☁️</span><div class="grow"><div class="title">${fmtDateTime(b.createdAt)}</div><div class="sub">${fmtBytes(b.size || 0)}${b.device === set().cloud.deviceId ? ' · ' + t('cloud.thisDevice') : ''}</div></div><button class="btn sm" data-act="cloud.restoreOne" data-id="${b.id}">${t('backup.restoreBtn')}</button></div>`).join('')}</div>`
    : empty(t('backup.none')));
}

function passwordSheet(title, fields, onSubmit) {
  const el = openSheet(`${sheetHead(title)}<form novalidate>${fields.map(([name, label]) => `<div class="field"><label>${esc(label)}</label><input class="input" type="password" name="${name}" autocomplete="new-password"></div>`).join('')}
    <div class="sheet-actions"><button class="btn primary">${t('common.save')}</button></div></form>`);
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = formData(e.target);
    const btn = e.target.querySelector('.btn.primary'); btn.disabled = true;
    try { await onSubmit(v, e.target); } catch (err) { toast(errMsg(err), 'err'); } finally { btn.disabled = false; }
  });
}

const BUILDERS = {
  language() {
    const s = set();
    return `<div class="set-group">${[['zh', '简体中文', 'Simplified Chinese'], ['en', 'English', '英文']].map(([v, a, b]) => `<button class="set-row" data-act="set.lang" data-v="${v}"><span class="ic">${v === 'zh' ? '🇨🇳' : '🇬🇧'}</span><span class="label">${a}<small>${b}</small></span>${s.lang === v ? '<b style="color:var(--primary);font-size:1.3rem">✓</b>' : ''}</button>`).join('')}</div>
      <p class="small muted" style="margin:0 6px">${t('set.langNote')}</p>`;
  },
  account() {
    const p = S().profile;
    const counts = `${S().courses.length} ${t('search.courses')} · ${S().assignments.length} ${t('search.assignments')} · ${S().exams.length} ${t('search.exams')} · ${S().notes.length} ${t('search.notes')}`;
    return `<div class="card center">${avatarHTML(88).replace('class="avatar"', 'class="avatar" style="margin:0 auto"')}
        <div class="row" style="justify-content:center;margin-top:10px;flex-wrap:wrap">${['🐷', '🐰', '🐱', '🐻', '🦊', '🐼', '🐥', '🌸'].map((e) => `<button class="btn sm" data-act="acct.emoji" data-e="${e}" style="padding:0 10px">${e}</button>`).join('')}<button class="btn sm" data-act="acct.photo">📷 ${t('acct.photo')}</button></div></div>
      ${cloudAccountHTML()}
      ${group(t('acct.profile'), [
        row('😊', t('acct.nickname'), `<input class="input" style="max-width:55%" data-set="profile.name" data-type="str" data-root="profile" value="${esc(p.name)}" maxlength="24" placeholder="${esc(t('acct.nicknamePh'))}">`),
      ])}
      ${group(t('acct.info'), [
        row('📅', t('acct.created'), `<span class="val">${fmtDate(new Date(p.createdAt))}</span>`),
        row('📦', t('acct.data'), `<span class="val small">${counts}</span>`),
        row('💾', t('acct.storage'), `<span class="val">${cloud.status.user ? t('acct.localAndCloud') : t('acct.localOnly')}</span>`),
      ])}
      ${group(t('acct.danger'), [
        btnRow('🧹', `<span style="color:var(--red)">${t('acct.delete')}</span>`, 'acct.delete', t('acct.deleteSub')),
        ...(cloud.status.user ? [btnRow('🗑️', `<span style="color:var(--red)">${t('cloud.deleteAccount')}</span>`, 'cloud.deleteAccount', t('cloud.deleteAccountSub'))] : []),
      ])}`;
  },
  notifications() {
    const n = set().notif;
    const cats = ['class', 'assignment', 'exam', 'review', 'pomodoro', 'todo'];
    const icons = { class: '📚', assignment: '📝', exam: '🎯', review: '📖', pomodoro: '🍅', todo: '✅' };
    return `<div id="perm-box"></div>
      ${group('', [row('🔔', t('notif.master'), sw('notif.enabled', n.enabled), t('notif.masterSub'))])}
      ${group(t('notif.types'), cats.map((c) => row(icons[c], t('notif.cat.' + c), sw('notif.' + c, n[c]))))}
      ${group(t('notif.timing'), [
        row('⏰', t('notif.classLead'), sel('notif.classLead', leadOpts([0, 5, 10, 15, 30, 60, 120, 180]), n.classLead, 'num')),
        row('📝', t('notif.asgLead'), sel('notif.assignmentLead', leadOpts([60, 180, 360, 720, 1440, 2880, 4320, 10080]), n.assignmentLead, 'num')),
        `<div class="set-row"><span class="ic">🎯</span><span class="label">${t('notif.examDays')}</span></div><div class="chips" style="padding:0 16px 12px;flex-wrap:wrap" id="exam-days">${[14, 7, 5, 3, 2, 1].map((d) => `<button class="chip ${n.examDays.includes(d) ? 'on' : ''}" data-act="set.examDay" data-d="${d}">${t('exam.dBefore', { n: d })}</button>`).join('')}</div>`,
        row('📖', t('notif.reviewTime'), `<input class="input" type="time" data-set="notif.reviewTime" data-type="str" value="${n.reviewTime}">`, t('notif.reviewTimeSub')),
      ])}
      ${group(t('notif.soundTitle'), [row('🎵', t('notif.sound'), `${sel('notif.sound', SOUNDS.map((s) => ({ value: s, label: t('sound.' + s) })), n.sound)}<button class="btn sm" data-act="set.preview" data-path="notif.sound">▶</button>`, isNative() ? t('notif.soundSub') : '')])}
      ${group(t('notif.dnd'), [
        row('🌙', t('notif.dndOn'), sw('notif.dnd', n.dnd), t('notif.dndSub')),
        row('', t('notif.dndFrom'), `<input class="input" type="time" data-set="notif.dndStart" data-type="str" value="${n.dndStart}">`),
        row('', t('notif.dndTo'), `<input class="input" type="time" data-set="notif.dndEnd" data-type="str" value="${n.dndEnd}">`),
      ])}
      <div class="row wrap"><button class="btn" data-act="notif.test">🔔 ${t('notif.test')}</button><span class="small muted" id="sched-count"></span></div>`;
  },
  appearance() {
    const a = set().appearance;
    const colors = { pink: '#EC6C9C', peach: '#F08A5D', lavender: '#9C7BD8', mint: '#34B08A', sky: '#4A9FE0' };
    const h = set().home;
    const order = [...h.sections, ...SECTION_IDS.filter((s) => !h.sections.includes(s))].filter((s) => SECTION_IDS.includes(s));
    return `${group(t('set.themeMode'), [`<div style="padding:12px"><div class="seg">${['light', 'dark', 'system'].map((m) => `<button class="${a.mode === m ? 'on' : ''}" data-act="set.mode" data-v="${m}">${t('set.mode.' + m)}</button>`).join('')}</div></div>`])}
      ${group(t('set.themeColor'), [`<div class="row wrap" style="padding:14px;gap:14px">${Object.entries(colors).map(([k, c]) => `<button data-act="set.color" data-v="${k}" style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.75rem;font-weight:800"><span style="width:42px;height:42px;border-radius:50%;background:${c};border:4px solid ${a.color === k ? 'var(--text)' : 'var(--card)'};box-shadow:var(--shadow-sm)"></span>${t('color.' + k)}</button>`).join('')}</div>`])}
      ${group(t('set.fontSize'), [`<div style="padding:14px"><div class="row"><span class="small">A</span><input type="range" min="0.85" max="1.3" step="0.05" value="${a.fontScale}" data-set="appearance.fontScale" data-type="num" class="grow" style="accent-color:var(--primary)"><span style="font-size:1.3rem">A</span></div><div class="center small muted" style="margin-top:6px">${Math.round(a.fontScale * 100)}%</div></div>`])}
      ${group(t('set.homeLayout'), order.map((s, i) => `<div class="set-row"><span class="label">${t('home.sec.' + s)}</span><button class="btn sm ghost" data-act="home.move" data-s="${s}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm ghost" data-act="home.move" data-s="${s}" data-d="1" ${i === order.length - 1 ? 'disabled' : ''}>↓</button>${toggle(`data-act-change="home.toggle" data-s="${s}"`, !h.hidden.includes(s))}</div>`))}
      ${group(t('set.pig'), [btnRow('👗', t('pig.wardrobe'), 'pig.wardrobe', t('set.pigSub'))])}`;
  },
  calendar() {
    const c = set().cal;
    return group('', [
      row('📆', t('cal.weekStart'), sel('cal.weekStart', [{ value: 1, label: weekdayLong(1) }, { value: 0, label: weekdayLong(0) }], c.weekStart, 'num')),
      row('👁️', t('cal.defaultView'), sel('cal.view', ['day', 'week', 'month'].map((v) => ({ value: v, label: t('cal.' + v) })), c.view)),
      row('🕐', t('cal.timeFmt'), sel('cal.timeFmt', [{ value: '24', label: t('cal.24h') }, { value: '12', label: t('cal.12h') }], c.timeFmt)),
      row('🗓️', t('cal.dateFmt'), sel('cal.dateFmt', [{ value: 'YMD', label: '2026-11-16' }, { value: 'DMY', label: '16/11/2026' }, { value: 'MDY', label: '11/16/2026' }], c.dateFmt)),
      row('⏰', t('notif.classLead'), sel('notif.classLead', leadOpts([0, 5, 10, 15, 30, 60, 120, 180]), set().notif.classLead, 'num')),
      row('🌅', t('cal.dayStart'), sel('cal.dayStart', Array.from({ length: 12 }, (_, i) => ({ value: i + 5, label: `${i + 5}:00` })), c.dayStart, 'num')),
      row('🌇', t('cal.dayEnd'), sel('cal.dayEnd', Array.from({ length: 8 }, (_, i) => ({ value: i + 17, label: `${i + 17}:00` })), c.dayEnd, 'num')),
    ]);
  },
  backup() {
    const b = set().backup, c = set().cloud, u = cloud.status.user;
    const cloudRows = u ? [
      row('☁️', t('cloud.status'), `<span class="val">${syncBadge()}</span>`, c.lastSync ? t('cloud.lastSync', { t: fmtDateTime(c.lastSync) }) : ''),
      row('🔄', t('cloud.autoSync'), sw('cloud.autoSync', c.autoSync), t('cloud.autoSyncSub')),
      btnRow('⚡', t('cloud.syncNow'), 'cloud.sync', cloud.status.remoteNewer ? t('cloud.remoteNewer') : ''),
      btnRow('📦', t('cloud.backupNow'), 'cloud.backup', c.lastCloudBackup ? t('cloud.lastBackup', { t: fmtDateTime(c.lastCloudBackup) }) : t('cloud.backupSub')),
      btnRow('♻️', t('cloud.restore'), 'cloud.restoreList', t('cloud.restoreSub')),
      row('📊', t('cloud.usage'), `<span class="val">${c.size ? fmtBytes(c.size) + ' / 1 MB' : '-'}</span>`, t('cloud.usageSub')),
    ] : [btnRow('☁️', t('cloud.signInToSync'), 'cloud.goAccount', t('cloud.signInToSyncSub'))];
    return `${group(t('backup.cloud'), cloudRows)}
      ${group(t('backup.local'), [
        row('🔄', t('backup.auto'), sw('backup.auto', b.auto), t('backup.autoSub')),
        row('🕒', t('backup.last'), `<span class="val">${b.last ? fmtDateTime(b.last) : t('set.neverBackedUp')}</span>`),
        btnRow('💾', t('backup.now'), 'backup.now'),
        btnRow('♻️', t('backup.restore'), 'backup.list', t('backup.restoreSub')),
      ])}
      ${group(t('backup.transfer'), [
        btnRow('📤', t('backup.export'), 'backup.export', t('backup.exportSub') + (b.lastExport ? ' · ' + fmtDateTime(b.lastExport) : '')),
        btnRow('📥', t('backup.import'), 'backup.import', t('backup.importSub')),
      ])}
      ${group(t('backup.storage'), [`<div id="usage">${loading()}</div>`, btnRow('🗂️', t('backup.files'), 'backup.files', t('backup.filesSub'))])}
      <p class="small muted" style="margin:0 6px">${t('cloud.filesNote')}</p>`;
  },
  privacy() {
    const s = set().security;
    return `${group(t('priv.lock'), [
        s.pin ? btnRow('🔑', t('priv.changePin'), 'pin.change') : btnRow('🔐', t('priv.setPin'), 'pin.set', t('priv.setPinSub')),
        ...(s.pin ? [row('⏱️', t('priv.lockOnResume'), sw('security.lockOnResume', s.lockOnResume), t('priv.lockOnResumeSub')), btnRow('🔓', t('priv.removePin'), 'pin.remove')] : []),
      ])}
      ${group(t('priv.data'), [row('📱', t('priv.where'), '', t('priv.whereSub')), row('👀', t('priv.visibility'), `<span class="val">${t('priv.onlyYou')}</span>`, t('priv.visibilitySub'))])}
      <div class="card"><div class="card-title">👫 ${t('priv.sharingTitle')}</div><p class="small muted prose" style="margin:0">${t('priv.sharingBody')}</p></div>`;
  },
  widgets() {
    const card = (kind) => `<div class="card" style="margin-bottom:14px"><div class="card-title"><span class="grow">${t(kind === 'today' ? 'widget.today' : 'widget.asg')}</span></div>
      <p class="small muted" style="margin:0 0 12px">${t(kind === 'today' ? 'widget.todayDesc' : 'widget.asgDesc')}</p>
      ${previewHTML(kind)}
      <button class="btn primary block" style="margin-top:14px" data-act="widget.pin" data-kind="${kind}">📌 ${t('widget.add')}</button></div>`;
    return `<p class="small muted" style="margin:0 6px 12px;line-height:1.5">${t('widget.intro')}</p>
      ${isNative() ? '' : `<div class="card" style="margin-bottom:14px;border-color:var(--yellow)">⚠️ ${t('widget.nativeOnly')}</div>`}
      ${card('today')}${card('assignments')}
      <details class="faq"><summary>${t('widget.manualTitle')}</summary><p>${t('widget.manual')}</p></details>`;
  },
  friends() {
    return `<div class="card center">${empty(t('friends.coming'))}<p class="small muted prose">${t('friends.body')}</p></div>`;
  },
  sound() {
    const s = set().sound;
    return group('', [
      row('🔊', t('sound.app'), sw('sound.app', s.app), t('sound.appSub')),
      row('📳', t('sound.vibrate'), sw('sound.vibrate', s.vibrate)),
      row('🔔', t('notif.sound'), `${sel('notif.sound', SOUNDS.map((x) => ({ value: x, label: t('sound.' + x) })), set().notif.sound)}<button class="btn sm" data-act="set.preview" data-path="notif.sound">▶</button>`),
      row('🍅', t('set.timerSound'), `${sel('sound.timer', SOUNDS.map((x) => ({ value: x, label: t('sound.' + x) })), s.timer)}<button class="btn sm" data-act="set.preview" data-path="sound.timer">▶</button>`),
    ]);
  },
};

// ---------- apply ----------
export function applyAppearance() {
  const a = set().appearance;
  const dark = a.mode === 'dark' || (a.mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.color = a.color;
  document.documentElement.style.setProperty('--fs', a.fontScale);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#1C1518' : '#FFE9F1');
}

function getPath(path) { const [root, ...rest] = path.split('.'); let o = root === 'profile' ? S().profile : set()[root]; for (const k of rest.slice(0, -1)) o = o[k]; return [o, rest[rest.length - 1]]; }

export function mount(root, params) {
  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.actChange === 'home.toggle') {
      const h = set().home, s = el.dataset.s;
      h.hidden = el.checked ? h.hidden.filter((x) => x !== s) : [...new Set([...h.hidden, s])];
      commit('settings'); return;
    }
    const path = el.dataset.set; if (!path) return;
    const [obj, key] = getPath(path);
    const type = el.dataset.type;
    obj[key] = type === 'bool' ? el.checked : type === 'num' ? Number(el.value) : el.value.trim();
    commit('settings');
    if (path.startsWith('appearance')) { applyAppearance(); if (path === 'appearance.fontScale') rerender(); }
    if (path.startsWith('notif') || path.startsWith('cal')) reschedule();
    if (path === 'notif.enabled' && el.checked) notifPermission(true).then(() => { reschedule(); rerender(); });
    if (path === 'notif.sound' || path === 'sound.timer') playSound(el.value, 0.3);
    if (path.startsWith('profile')) toast(t('common.saved'));
    if (path === 'cloud.autoSync' && el.checked && cloud.status.user) cloud.syncNow().catch(() => {});
  });
  root.querySelector('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, v = formData(f);
    if (!/^\S+@\S+\.\S+$/.test(v.email)) return fieldError(f, 'email', t('err.fbInvalidEmail'));
    if (!v.pw || v.pw.length < 6) return fieldError(f, 'pw', t('err.fbWeakPassword'));
    const btn = f.querySelector('.btn.primary'); btn.disabled = true; btn.textContent = t('common.loading');
    try {
      if (authMode === 'register') await cloud.signUpEmail(v.email, v.pw, v.name);
      else await cloud.signInEmail(v.email, v.pw);
      toast(t(authMode === 'register' ? 'cloud.registered' : 'cloud.signedIn'));
    } catch (err) { toast(errMsg(err), 'err'); btn.disabled = false; btn.textContent = t('cloud.' + authMode); }
  });
  if (params.section === 'backup') showUsage(root);
  if (params.section === 'notifications') showPerm(root);
}

async function showPerm(root) {
  const p = await notifPermission(false);
  const box = root.querySelector('#perm-box'); if (!box) return;
  if (p !== 'granted') box.innerHTML = `<div class="card" style="margin-bottom:14px;border-color:var(--yellow)"><div class="bold">⚠️ ${t(p === 'unsupported' ? 'notif.unsupported' : 'notif.noPerm')}</div>${p !== 'unsupported' && p !== 'denied' ? `<button class="btn primary sm" style="margin-top:8px" data-act="notif.request">${t('notif.allow')}</button>` : p === 'denied' ? `<div class="small muted">${t('notif.deniedHelp')}</div>` : ''}</div>`;
  const c = root.querySelector('#sched-count'); if (c) c.textContent = t('notif.scheduled', { n: buildReminders().length });
}

async function showUsage(root) {
  const u = await storageUsage();
  const box = root.querySelector('#usage'); if (!box) return;
  box.innerHTML = row('📊', t('backup.usage'), `<span class="val">${fmtBytes(u.dataBytes + u.filesBytes)}</span>`, t('backup.usageSub', { data: fmtBytes(u.dataBytes), n: u.files, files: fmtBytes(u.filesBytes) }) + (u.quota?.quota ? ' · ' + t('backup.quota', { q: fmtBytes(u.quota.quota) }) : ''));
}

async function backupList() {
  const list = await listBackups();
  openSheet(`${sheetHead(t('backup.restore'))}<p class="small muted" style="margin-top:0">${t('backup.restoreHint')}</p>
    ${list.length ? `<div class="list">${list.map((b) => `<div class="item"><span>${b.kind === 'auto' ? '🔄' : b.kind === 'before-import' ? '📥' : '💾'}</span><div class="grow"><div class="title">${fmtDateTime(b.at)}</div><div class="sub">${t('backup.kind.' + b.kind)} · ${fmtBytes(b.size)}</div></div><button class="btn sm" data-act="backup.restoreOne" data-id="${b.id}">${t('backup.restoreBtn')}</button></div>`).join('')}</div>` : empty(t('backup.none'))}`);
}

async function filesSheet() {
  const files = (await listFiles()).sort((a, b) => b.createdAt - a.createdAt);
  const refs = fileRefs();
  const orphans = files.filter((f) => !refs.has(f.id));
  openSheet(`${sheetHead(t('backup.files'))}
    ${orphans.length ? `<button class="btn block danger" data-act="files.cleanup" style="margin-bottom:12px">🧹 ${t('backup.cleanup', { n: orphans.length, s: fmtBytes(orphans.reduce((a, f) => a + f.size, 0)) })}</button>` : ''}
    ${files.length ? `<div class="list">${files.map((f) => `<div class="item"><span>${f.type.startsWith('image/') ? '🖼️' : '📄'}</span><div class="grow" style="min-width:0"><div class="title ellipsis">${esc(f.name)}</div><div class="sub ellipsis">${fmtBytes(f.size)} · ${refs.has(f.id) ? esc(refs.get(f.id)) : t('backup.unused')}</div></div><button class="btn sm" data-act="file.open" data-id="${f.id}">👁️</button><button class="btn sm danger" data-act="files.del" data-id="${f.id}">✕</button></div>`).join('')}</div>` : empty(t('file.none'))}`);
}

function stripRefs(id) {
  for (const a of S().assignments) a.files = (a.files || []).filter((x) => x !== id);
  for (const n of S().notes) n.files = (n.files || []).filter((x) => x !== id);
}

on({
  'set.open': (el) => { const k = el.dataset.sec; if (k === 'help' || k === 'about') go(k); else go('settings', { section: k }); },
  'set.lang': (el) => { set().lang = el.dataset.v; commit('settings'); applyLang(); reschedule(); rerender(); toast(t('set.langChanged')); },
  'set.mode': (el) => { set().appearance.mode = el.dataset.v; commit('settings'); applyAppearance(); rerender(); },
  'set.color': (el) => { set().appearance.color = el.dataset.v; commit('settings'); applyAppearance(); rerender(); },
  'set.preview': (el) => { const [o, k] = getPath(el.dataset.path); playSound(o[k], 0.35); },
  'set.examDay': (el) => { const n = set().notif, d = +el.dataset.d; n.examDays = n.examDays.includes(d) ? n.examDays.filter((x) => x !== d) : [...n.examDays, d].sort((a, b) => b - a); commit('settings'); reschedule(); el.classList.toggle('on'); },
  'home.move': (el) => {
    const h = set().home; const order = [...h.sections, ...SECTION_IDS.filter((s) => !h.sections.includes(s))].filter((s) => SECTION_IDS.includes(s));
    const i = order.indexOf(el.dataset.s), j = i + +el.dataset.d; if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]]; h.sections = order; commit('settings'); rerender();
  },
  'notif.request': async () => { await notifPermission(true); reschedule(); rerender(); },
  'notif.test': async () => {
    const p = await notifPermission(true);
    if (p !== 'granted') return toast(t('notif.noPerm'), 'err');
    await notifyNow(t('notif.testTitle'), t('notif.testBody'), set().notif.sound);
    toast(t('notif.testSent'));
  },
  'acct.emoji': (el) => { S().profile.avatar = el.dataset.e; commit('profile'); rerender(); },
  'acct.photo': async () => {
    const [f] = await pickFiles({ accept: 'image/*', multiple: false }); if (!f) return;
    const small = await shrinkImage(f, 256, 0.8);
    S().profile.avatar = await blobToDataURL(small); commit('profile'); rerender();
  },
  'acct.delete': async () => {
    if (!(await confirmDialog(t('acct.deleteMsg'), { danger: true, ok: t('acct.deleteOk'), title: t('acct.delete') }))) return;
    if (!(await verifyPinCancellable())) return;
    if (!(await confirmDialog(t('acct.deleteMsg2'), { danger: true, ok: t('common.delete') }))) return;
    await wipeAll();
    closeAllSheets();
    location.reload();
  },
  'backup.now': async () => { await snapshot('manual'); toast(t('backup.done')); rerender(); },
  'backup.list': () => backupList(),
  'backup.restoreOne': async (el) => {
    if (!(await confirmDialog(t('backup.restoreMsg'), { ok: t('backup.restoreBtn') }))) return;
    await restoreBackup(el.dataset.id);
    closeAllSheets(); applyLang(); applyAppearance(); reschedule(); toast(t('backup.restored')); rerender();
  },
  'backup.export': async () => {
    toast(t('backup.exporting'));
    const data = await exportData(true);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    await saveFile(`mochi-backup-${dkey()}.json`, blob);
    set().backup.lastExport = Date.now(); commit('settings'); rerender();
  },
  'backup.import': async () => {
    const [f] = await pickFiles({ accept: 'application/json,.json', multiple: false }); if (!f) return;
    let obj;
    try { obj = JSON.parse(await f.text()); } catch { throw new Error('invalidBackup'); }
    if (obj?.app !== 'mochi-planner') throw new Error('invalidBackup');
    if (!(await confirmDialog(t('backup.importMsg', { d: obj.exportedAt ? fmtDateTime(new Date(obj.exportedAt).getTime()) : '?' }), { ok: t('backup.import') }))) return;
    await importData(obj);
    applyLang(); applyAppearance(); reschedule(); toast(t('backup.imported')); rerender();
  },
  'backup.files': () => filesSheet(),
  'files.del': async (el) => {
    if (!(await confirmDialog(t('backup.fileDelMsg'), { danger: true, ok: t('common.delete') }))) return;
    await delFile(el.dataset.id); stripRefs(el.dataset.id); commit('files'); closeSheet(); filesSheet();
  },
  'files.cleanup': async () => {
    const refs = fileRefs(); const files = await listFiles();
    for (const f of files) if (!refs.has(f.id)) await delFile(f.id);
    closeSheet(); toast(t('common.deleted')); filesSheet();
  },
  'widget.pin': async (el) => {
    pushWidgets();
    const r = await pinWidget(el.dataset.kind);
    if (r === 'requested') toast(t('widget.requested'));
    else if (r === 'manual') toast(t('widget.useLauncher'));
    else toast(t('widget.nativeOnly'), 'err');
  },
  'cloud.mode': (el) => { authMode = el.dataset.m; rerender(); },
  'cloud.google': async (el) => {
    el.disabled = true;
    try { await cloud.signInGoogle(); toast(t('cloud.signedIn')); }
    catch (e) { if (e.message !== 'cancelled') toast(errMsg(e), 'err'); }
    finally { el.disabled = false; }
  },
  'cloud.forgot': async () => {
    const email = await promptDialog(t('cloud.forgotTitle'), document.querySelector('#auth-form [name=email]')?.value || '', 'name@example.com', 'email');
    if (!email) return;
    await cloud.resetPassword(email);
    toast(t('cloud.resetSent'));
  },
  'cloud.verify': async () => {
    await cloud.refreshUser();
    if (cloud.status.user?.emailVerified) { toast(t('cloud.verified')); rerender(); return; }
    await cloud.resendVerification(); toast(t('cloud.verifySent'));
  },
  'cloud.signOut': async () => {
    if (!(await confirmDialog(t('cloud.signOutMsg'), { ok: t('cloud.signOut') }))) return;
    await cloud.signOut(); toast(t('cloud.signedOut')); rerender();
  },
  'cloud.sync': async () => { await cloud.syncNow(); toast(t('cloud.synced')); rerender(); },
  'cloud.backup': async () => { toast(t('common.loading')); await cloud.cloudBackup(); toast(t('backup.done')); rerender(); },
  'cloud.restoreList': () => cloudBackupList(),
  'cloud.restoreOne': async (el) => {
    if (!(await confirmDialog(t('cloud.restoreMsg'), { ok: t('backup.restoreBtn') }))) return;
    await cloud.restoreCloudBackup(el.dataset.id);
    closeAllSheets(); applyLang(); applyAppearance(); reschedule(); toast(t('backup.restored')); rerender();
  },
  'cloud.goAccount': () => go('settings', { section: 'account' }),
  'cloud.goBackup': () => go('settings', { section: 'backup' }),
  'cloud.linkGoogle': async () => { await cloud.linkGoogle(); toast(t('cloud.linked')); rerender(); },
  'cloud.linkPassword': () => passwordSheet(t('cloud.linkPassword'), [['pw', t('cloud.newPassword')], ['pw2', t('cloud.confirmPassword')]], async (v, f) => {
    if (!v.pw || v.pw.length < 6) return fieldError(f, 'pw', t('err.fbWeakPassword'));
    if (v.pw !== v.pw2) return fieldError(f, 'pw2', t('cloud.pwMismatch'));
    await cloud.linkPassword(v.pw); closeSheet(); toast(t('cloud.linked')); rerender();
  }),
  'cloud.changePassword': () => passwordSheet(t('cloud.changePassword'), [['cur', t('cloud.currentPassword')], ['pw', t('cloud.newPassword')], ['pw2', t('cloud.confirmPassword')]], async (v, f) => {
    if (!v.cur) return fieldError(f, 'cur', t('err.required'));
    if (!v.pw || v.pw.length < 6) return fieldError(f, 'pw', t('err.fbWeakPassword'));
    if (v.pw !== v.pw2) return fieldError(f, 'pw2', t('cloud.pwMismatch'));
    await cloud.changePassword(v.cur, v.pw); closeSheet(); toast(t('cloud.pwChanged'));
  }),
  'cloud.deleteAccount': async () => {
    if (!(await confirmDialog(t('cloud.deleteMsg'), { danger: true, ok: t('acct.deleteOk'), title: t('cloud.deleteAccount') }))) return;
    let pw = null;
    if (cloud.providers().includes('password')) { pw = await promptDialog(t('cloud.currentPassword'), '', '', 'password'); if (!pw) return; }
    await cloud.deleteAccount(pw);
    toast(t('cloud.deleted')); rerender();
  },
  'pin.set': async () => { await setupPin(); rerender(); },
  'pin.change': async () => { if (await verifyPinCancellable()) { await setupPin(); rerender(); } },
  'pin.remove': async () => { if (await verifyPinCancellable()) { set().security.pin = null; commit('settings'); toast(t('priv.pinRemoved')); rerender(); } },
});
