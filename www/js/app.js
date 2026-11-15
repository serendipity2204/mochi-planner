// App shell: boot, routing, navigation, quick-add, onboarding, lock, global events.
import { store, initStore, commit } from './store.js';
import { t, applyLang, lang } from './i18n.js';
import { esc } from './utils.js';
import { on, runAction, setRouter, openSheet, closeSheet, sheetOpen, sheetHead, toast, errMsg, $ } from './ui.js';
import { pigSVG } from './pig.js';
import { onBack, onResume, exitApp, notifPermission, isNative } from './native.js';
import { reschedule } from './reminders.js';
import * as timer from './timer.js';
import { lockIfNeeded } from './lock.js';

import * as home from './views/home.js';
import * as schedule from './views/schedule.js';
import * as tasks from './views/tasks.js';
import * as focus from './views/focus.js';
import * as me from './views/me.js';
import * as stats from './views/stats.js';
import * as notes from './views/notes.js';
import * as settings from './views/settings.js';

const ROUTES = {
  home, schedule, tasks, focus, me, stats, settings,
  notes: { render: notes.renderNotes, mount: notes.mountNotes },
  search: { render: notes.renderSearch, mount: notes.mountSearch },
  help: { render: me.renderHelp },
  about: { render: me.renderAbout },
};
const TABS = [['home', '🏠'], ['schedule', '📅'], ['plus'], ['tasks', '📝'], ['focus', '⏱️'], ['me', '🐷']];

let route = { name: 'home', params: {} };
const stack = [];
let main, nav;

function renderNav() {
  const active = TABS.some(([n]) => n === route.name) ? route.name : ({ stats: 'me', notes: 'me', settings: 'me', help: 'me', about: 'me', search: 'home' }[route.name] || 'home');
  nav.innerHTML = `<div class="nav-brand">${pigSVG({ size: 34, acc: store.state.settings.pig.acc, expr: 'happy' })}${esc(t('app.name'))}</div>` + TABS.map(([n, ic]) => n === 'plus'
    ? `<button class="nav-plus" data-act="quick" data-label="${esc(t('quick.title'))}" aria-label="${esc(t('quick.title'))}">＋</button>`
    : `<button class="nav-item ${active === n ? 'active' : ''}" data-act="tab" data-to="${n}"><span class="ni">${ic}</span><span>${t('nav.' + n)}</span></button>`).join('');
}

function render(scrollTop = false) {
  const view = ROUTES[route.name] || home;
  const y = window.scrollY;
  try {
    main.innerHTML = view.render(route.params || {});
    view.mount?.(main, route.params || {});
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="page"><div class="card center">${pigSVG({ mood: 'worried', size: 110 }).replace('<svg', '<svg style="margin:0 auto"')}<p>${esc(t('err.render'))}</p><button class="btn primary" data-act="tab" data-to="home">${t('nav.home')}</button></div></div>`;
  }
  renderNav();
  window.scrollTo(0, scrollTop ? 0 : y);
}

function go(name, params = {}) {
  if (!ROUTES[name]) name = 'home';
  const isTab = TABS.some(([n]) => n === name);
  if (isTab) stack.length = 0;
  else if (route.name !== name || JSON.stringify(route.params) !== JSON.stringify(params)) stack.push(route);
  route = { name, params };
  render(true);
}
function back() {
  const prev = stack.pop();
  route = prev || { name: 'home', params: {} };
  render(true);
}
setRouter({ go, back, render: () => render(false), current: () => route });

// ---------------- Quick add ----------------
function quickSheet() {
  const items = [['📚', 'quick.course', 'course.add'], ['📝', 'quick.asg', 'asg.add'], ['🎯', 'quick.exam', 'exam.add'], ['✅', 'quick.todo', 'todo.add'], ['🗒️', 'quick.note', 'note.add'], ['📷', 'quick.scan', 'course.ocr']];
  const voice = [['📚', 'quick.course', 'course.voice'], ['📝', 'quick.asg', 'asg.voice'], ['🎯', 'quick.exam', 'exam.voice'], ['✅', 'quick.todo', 'todo.voice']];
  openSheet(`${sheetHead(t('quick.title'))}
    <div class="quick-grid">${items.map(([ic, k, a]) => `<button data-act="quick.run" data-a="${a}"><span>${ic}</span>${t(k)}</button>`).join('')}</div>
    <div class="set-group-title">🎤 ${t('quick.voice')}</div>
    <div class="quick-grid" style="grid-template-columns:repeat(4,1fr)">${voice.map(([ic, k, a]) => `<button data-act="quick.run" data-a="${a}"><span>${ic}</span>${t(k)}</button>`).join('')}</div>
    <button class="btn block primary" style="margin-top:14px" data-act="quick.focus">⏱️ ${t('quick.focus')}</button>`);
}

// ---------------- Onboarding ----------------
function onboarding() {
  return new Promise((resolve) => {
    const slides = [
      { pig: { mood: 'focus', acc: 'glasses', expr: 'happy' }, k: 1 },
      { pig: { mood: 'cheer', acc: 'flower', expr: 'happy' }, k: 2 },
      { pig: { mood: 'happy', acc: 'bow', expr: 'smile' }, k: 3 },
    ];
    let i = 0;
    const el = document.createElement('div');
    el.className = 'onboard';
    const draw = () => {
      const s = slides[i], last = i === slides.length - 1;
      el.innerHTML = `<button class="btn sm skip" data-ob="lang">${lang() === 'zh' ? 'English' : '中文'}</button>
        <div><h1>${t('ob.title' + s.k)}</h1><p class="muted" style="max-width:340px;margin:10px auto 0;line-height:1.5">${t('ob.body' + s.k)}</p></div>
        <div>${last ? `<div class="bubble up" style="display:inline-block;margin-bottom:14px">${t('ob.hello')}</div>` : ''}${pigSVG({ ...s.pig, size: 210, cls: 'pig-anim' }).replace('<svg', '<svg style="margin:0 auto"')}</div>
        <div style="width:100%;max-width:380px">
          ${last ? `<input class="input" id="ob-name" placeholder="${esc(t('ob.namePh'))}" style="margin-bottom:12px;text-align:center" maxlength="24">` : ''}
          <div class="ob-dots">${slides.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn primary block" data-ob="${last ? 'done' : 'next'}" style="min-height:52px;font-size:1.05rem">${last ? t('ob.start') : t('ob.next')}</button>
          ${last ? '' : `<button class="btn ghost block" data-ob="skipall" style="margin-top:6px">${t('ob.skip')}</button>`}
        </div>`;
    };
    draw();
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-ob]')?.dataset.ob; if (!a) return;
      if (a === 'lang') { store.state.settings.lang = lang() === 'zh' ? 'en' : 'zh'; applyLang(); draw(); return; }
      if (a === 'next') { i++; draw(); return; }
      if (a === 'skipall') { i = slides.length - 1; draw(); return; }
      if (a === 'done') {
        const name = el.querySelector('#ob-name')?.value.trim();
        if (name) store.state.profile.name = name;
        store.state.settings.onboarded = true;
        commit('onboard');
        el.remove();
        resolve();
      }
    });
    document.body.appendChild(el);
  });
}

// ---------------- Global actions ----------------
on({
  tab: (el) => go(el.dataset.to),
  back: () => back(),
  'sheet.close': () => closeSheet(),
  quick: () => quickSheet(),
  'quick.run': (el) => { closeSheet(); runAction(el.dataset.a, el, { target: el }); },
  'quick.focus': () => { closeSheet(); go('focus'); },
});

// ---------------- Boot ----------------
async function boot() {
  try { await initStore(); }
  catch (e) { console.error(e); document.getElementById('splash').innerHTML = `<p style="padding:24px;text-align:center">⚠️ Storage unavailable / 无法访问本地存储<br><small>${esc(e.message)}</small></p>`; return; }
  applyLang();
  settings.applyAppearance();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', settings.applyAppearance);

  document.getElementById('app').innerHTML = '<main class="main" id="main"></main><nav class="nav" id="nav"></nav>';
  main = $('#main'); nav = $('#nav');
  document.getElementById('splash')?.remove();

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'A') e.preventDefault();
    runAction(el.dataset.act, el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetOpen()) closeSheet();
    if (e.key === 'Enter' && e.target.matches('[role=button][data-act]')) runAction(e.target.dataset.act, e.target, e);
  });
  window.addEventListener('mochi-error', (e) => toast(t('err.' + e.detail), 'err'));
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); toast(errMsg(e.reason), 'err'); });

  if (!store.state.settings.onboarded) await onboarding();
  if (store.state.timer.running && !store.state.timer.endAt) store.state.timer.running = false;
  timer.check();
  render(true);
  await lockIfNeeded();

  // Ask for notification permission once (Android 13+ needs it)
  if (store.state.settings.notif.enabled && !store.state.settings.notifAsked) {
    store.state.settings.notifAsked = true; commit('settings');
    setTimeout(() => notifPermission(true).then(reschedule).catch(() => {}), 1200);
  }
  reschedule();

  setInterval(() => {
    timer.check();
    (ROUTES[route.name]?.tick)?.();
  }, 1000);

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hiddenAt = Date.now(); });
  onResume(() => {
    timer.check();
    reschedule();
    const s = store.state.settings.security;
    if (s.pin && s.lockOnResume && hiddenAt && Date.now() - hiddenAt > 60000) lockIfNeeded();
    hiddenAt = 0;
    if (!sheetOpen()) render(false);
  });
  onBack(() => {
    if (document.querySelector('.onboard')) return;
    if (closeSheet()) return;
    if (stack.length) return back();
    if (route.name !== 'home') return go('home');
    exitApp();
  });
  if (isNative()) document.documentElement.classList.add('native');
}

window.__mochi = { store, timer }; // debugging / automated tests
boot();
