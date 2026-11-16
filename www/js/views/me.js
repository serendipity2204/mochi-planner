// "Me" hub, Help & Support, About.
import { store } from '../store.js';
import { t, fmtDate, fmtDuration, lang } from '../i18n.js';
import { esc } from '../utils.js';
import { on, go, runAction, openSheet, sheetHead, toast, formData, field, select } from '../ui.js';
import { pigSVG } from '../pig.js';
import { pigProps, streak, totalFocus, isComplete } from '../data.js';
import { APP } from '../config.js';
import { openExternal, isNative } from '../native.js';
import { pigName } from './focus.js';

const S = () => store.state;

export const avatarHTML = (size = 64) => {
  const a = S().profile.avatar || '🐷';
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size / 2}px">${a.startsWith('data:') ? `<img src="${a}" alt="">` : esc(a)}</div>`;
};

export function render() {
  const p = S().profile;
  const tiles = [
    ['📊', 'nav.stats', 'stats'], ['🗒️', 'nav.notes', 'notes'], ['👗', 'pig.wardrobe', 'wardrobe'], ['🔍', 'nav.search', 'search'],
    ['✅', 'tasks.todo', 'todo'], ['☁️', 'set.backup', 'settings:backup'], ['⚙️', 'common.settings', 'settings'], ['💡', 'set.help', 'help'], ['ℹ️', 'set.about', 'about'],
  ];
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="tab" data-to="home" aria-label="${t('nav.home')}">‹</button><h1>${t('nav.me')}</h1><button class="icon-btn" data-act="nav" data-to="settings">⚙️</button></div>
    <button class="card profile" style="width:100%;text-align:left" data-act="me.go" data-to="settings:account">${avatarHTML(68)}
      <div class="grow"><div class="bold" style="font-size:1.25rem">${esc(p.name || t('greet.friend'))}</div><div class="small muted">${esc(p.email || t('me.localAccount'))}</div><div class="tiny muted">${t('me.since', { d: fmtDate(new Date(p.createdAt)) })}</div></div><span class="chev"></span></button>
    <div class="card" style="margin-top:14px"><div class="row" style="gap:14px"><div data-act="pig.poke" style="cursor:pointer">${pigSVG(pigProps({ size: 84, cls: 'pig-anim' }))}</div>
      <div class="grow stat-row" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat"><b>🔥${streak()}</b><span>${t('focus.streak')}</span></div>
        <div class="stat"><b>${Math.round(totalFocus() / 60 * 10) / 10}h</b><span>${t('focus.total')}</span></div>
        <div class="stat"><b>🪙${S().rewards.coins || 0}</b><span>${t('focus.coins')}</span></div></div></div>
      <div class="small muted center" style="margin-top:8px">${t('me.pigLine', { name: esc(pigName()), n: S().assignments.filter(isComplete).length })}</div></div>
    <div class="tiles" style="margin-top:14px">${tiles.map(([ic, k, to]) => `<button class="tile" data-act="me.go" data-to="${to}"><span class="ti">${ic}</span><span>${t(k)}</span></button>`).join('')}</div>
    <div class="card" style="margin-top:14px"><div class="card-title">🚀 ${t('me.comingTitle')}</div><div class="small muted prose">${t('me.comingBody')}</div></div>
  </div>`;
}

// ---------------- Help & Support ----------------
const GUIDE = ['schedule', 'ocr', 'voice', 'asg', 'exam', 'focus', 'backup', 'lang'];
const FAQ = ['offline', 'notif', 'ocr', 'voice', 'data', 'update', 'lock'];

function deviceInfo() {
  return `App ${APP.version} (${APP.build}) · ${isNative() ? 'Android' : 'Web'} · ${lang()} · ${navigator.userAgent}`;
}
function sendFeedback(kind, text) {
  const subject = `[${kind === 'bug' ? 'Bug' : 'Feedback'}] Mochi Planner ${APP.version}`;
  const body = `${text}\n\n---\n${deviceInfo()}`;
  if (APP.contactEmail) openExternal(`mailto:${APP.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  else if (APP.repoUrl && !APP.repoUrl.includes('YOUR_GITHUB_NAME')) openExternal(`${APP.repoUrl}/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&labels=${kind === 'bug' ? 'bug' : 'feedback'}`);
  else { navigator.clipboard?.writeText(subject + '\n\n' + body).catch(() => {}); toast(t('help.copied')); return; }
}

function feedbackSheet(kind) {
  const el = openSheet(`${sheetHead(t(kind === 'bug' ? 'help.bug' : 'help.feedback'))}<form novalidate>
    ${kind === 'bug' ? field(t('help.where'), select('area', ['schedule', 'tasks', 'focus', 'notes', 'settings', 'other'].map((x) => ({ value: x, label: t('help.area.' + x) })), 'other')) : ''}
    ${field(t(kind === 'bug' ? 'help.bugDesc' : 'help.feedbackDesc'), `<textarea class="input" name="text" style="min-height:140px" placeholder="${esc(t(kind === 'bug' ? 'help.bugPh' : 'help.feedbackPh'))}" autofocus></textarea>`)}
    <div class="tiny muted">${t('help.attachInfo')}: ${esc(deviceInfo().slice(0, 80))}…</div>
    <div class="sheet-actions"><button class="btn primary">${t('help.send')}</button></div></form>`);
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.text) { toast(t('err.required'), 'err'); return; }
    sendFeedback(kind, (v.area ? `[${v.area}] ` : '') + v.text);
  });
}

export function renderHelp() {
  return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('set.help')}</h1></div>
    <div class="set-group-title">📘 ${t('help.guide')}</div>${GUIDE.map((g) => `<details class="faq"><summary>${t('guide.' + g + '.q')}</summary><p>${t('guide.' + g + '.a')}</p></details>`).join('')}
    <div class="set-group-title">❓ ${t('help.faq')}</div>${FAQ.map((g) => `<details class="faq"><summary>${t('faq.' + g + '.q')}</summary><p>${t('faq.' + g + '.a')}</p></details>`).join('')}
    <div class="set-group-title">💌 ${t('help.contact')}</div>
    <div class="set-group">
      <button class="set-row" data-act="help.contact"><span class="ic">✉️</span><span class="label">${t('help.contactUs')}<small>${esc(APP.contactEmail || t('help.viaGithub'))}</small></span><span class="chev"></span></button>
      <button class="set-row" data-act="help.feedback"><span class="ic">💡</span><span class="label">${t('help.feedback')}</span><span class="chev"></span></button>
      <button class="set-row" data-act="help.bug"><span class="ic">🐞</span><span class="label">${t('help.bug')}</span><span class="chev"></span></button>
    </div></div>`;
}

// ---------------- About ----------------
export function renderAbout() {
  return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('set.about')}</h1></div>
    <div class="card center"><div style="display:inline-block;background:var(--primary-3);border-radius:32px;padding:10px">${pigSVG({ size: 110, acc: 'bow', expr: 'happy', cls: 'pig-anim' })}</div>
      <h2 style="margin-top:10px">${t('app.name')}</h2><div class="muted small">${t('app.tagline')}</div>
      <div class="badge" style="margin-top:10px">${t('about.version')} ${APP.version}${APP.build && !APP.build.startsWith('__') ? ` (build ${esc(APP.build)})` : ''}</div></div>
    <div class="set-group" style="margin-top:14px">
      <div class="set-row"><span class="ic">👩‍💻</span><span class="label">${t('about.developer')}</span><span class="val">${esc(APP.developer)}</span></div>
      <button class="set-row" data-act="about.doc" data-doc="privacy"><span class="ic">🔒</span><span class="label">${t('about.privacy')}</span><span class="chev"></span></button>
      <button class="set-row" data-act="about.doc" data-doc="terms"><span class="ic">📜</span><span class="label">${t('about.terms')}</span><span class="chev"></span></button>
      <button class="set-row" data-act="about.doc" data-doc="licenses"><span class="ic">🧩</span><span class="label">${t('about.licenses')}</span><span class="chev"></span></button>
      <button class="set-row" data-act="about.repo"><span class="ic">🐙</span><span class="label">GitHub<small>${esc(APP.repoUrl)}</small></span><span class="chev"></span></button>
    </div>
    <p class="center tiny muted">${t('about.made')}</p></div>`;
}

const LICENSES = [
  ['Capacitor', 'MIT', 'Ionic'], ['@capacitor/local-notifications, filesystem, share, haptics, app', 'MIT', 'Ionic'],
  ['@capacitor-community/speech-recognition', 'MIT', 'Capacitor Community'], ['Tesseract.js', 'Apache-2.0', 'Jerome Wu & contributors'],
  ['Tesseract OCR traineddata (eng, chi_sim)', 'Apache-2.0', 'Google / tesseract-ocr'],
];

on({
  'me.go': (el) => {
    const [to, sec] = el.dataset.to.split(':');
    if (to === 'wardrobe') return runAction('pig.wardrobe', el, { target: el });
    if (to === 'todo') return go('tasks', { tab: 'todo' });
    go(to, sec ? { section: sec } : {});
  },
  'help.contact': () => (APP.contactEmail ? openExternal(`mailto:${APP.contactEmail}?subject=${encodeURIComponent('Mochi Planner')}`) : feedbackSheet('feedback')),
  'help.feedback': () => feedbackSheet('feedback'),
  'help.bug': () => feedbackSheet('bug'),
  'about.repo': () => openExternal(APP.repoUrl),
  'about.doc': (el) => {
    const d = el.dataset.doc;
    const body = d === 'licenses'
      ? `<div class="list">${LICENSES.map(([n, l, a]) => `<div class="item"><div class="grow"><div class="title">${esc(n)}</div><div class="sub">${esc(a)}</div></div><span class="badge">${l}</span></div>`).join('')}</div><p class="small muted">${t('about.pigOriginal')}</p>`
      : `<div class="prose">${t('doc.' + d)}</div>`;
    openSheet(sheetHead(t('about.' + d)) + body);
  },
});
