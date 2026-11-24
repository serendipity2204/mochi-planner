// Pomodoro focus mode with the pig study buddy, rewards, wardrobe unlocks and streaks.
import { peekPig } from '../icons.js';
import { store, commit } from '../store.js';
import { t, fmtDuration, weekdayShort } from '../i18n.js';
import { esc, pad, addDays, startOfDay, dkey } from '../utils.js';
import { on, go, rerender, openSheet, closeSheet, sheetHead, toast, promptDialog, field, input, select, toggle, celebrate, ring, formData, currentRoute, $ } from '../ui.js';
import { pigSVG, ACCESSORIES, EXPRESSIONS } from '../pig.js';
import { pigProps, focusOn, sessionsOn, streak, totalFocus, isUnlocked, courseOptions, pendingAssignments, upcomingExams } from '../data.js';
import * as timer from '../timer.js';
import { playSound, SOUNDS } from '../native.js';

const S = () => store.state;
const ENC_COUNT = 16;
export const encouragement = () => t('enc.' + Math.floor(Math.random() * ENC_COUNT));
export const pigName = () => S().settings.pig.name || t('pig.defaultName');

function timerMood() {
  const tm = S().timer;
  if (tm.running) return tm.mode === 'focus' ? 'focus' : 'sleep';
  if (!timer.isIdle()) return 'worried';
  return 'happy';
}
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };

function nextUnlock() {
  const tf = totalFocus();
  const all = [...ACCESSORIES.map((a) => ({ ...a, kind: 'acc' })), ...EXPRESSIONS.map((e) => ({ ...e, kind: 'expr' }))].filter((x) => x.min > tf).sort((a, b) => a.min - b.min);
  return all[0] ? { ...all[0], left: all[0].min - tf } : null;
}

export function render() {
  const tm = S().timer, f = S().settings.focus;
  const rem = timer.remainingMs(), tot = timer.totalMs();
  const R = 140, C = 2 * Math.PI * R;
  const today = focusOn(new Date());
  const goal = f.dailyGoal || 0;
  const nu = nextUnlock();
  const msg = tm.running ? (tm.mode === 'focus' ? t('focus.msgFocus') : t('focus.msgBreak')) : !timer.isIdle() ? t('focus.msgPaused') : encouragement();
  const controls = tm.running
    ? `<button class="btn" data-act="timer.pause">⏸ ${t('focus.pause')}</button><button class="btn danger" data-act="timer.stop">⏹ ${t('focus.stop')}</button>`
    : !timer.isIdle() ? `<button class="btn primary" data-act="timer.resume">▶ ${t('focus.resume')}</button><button class="btn danger" data-act="timer.stop">⏹ ${t('focus.stop')}</button>`
      : `<button class="btn primary" data-act="timer.start">▶ ${tm.mode === 'focus' ? t('focus.start') : t('focus.startBreak')}</button>${tm.mode !== 'focus' ? `<button class="btn" data-act="timer.skip">⏭ ${t('focus.skip')}</button>` : ''}`;
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i - 6));
  const maxW = Math.max(goal, ...week.map((d) => focusOn(d)), 1);
  return `<div class="page">
    <div class="topbar"><h1>${t('nav.focus')}</h1><button class="icon-btn" data-act="pig.wardrobe" aria-label="${t('pig.wardrobe')}">👗</button><button class="icon-btn" data-act="timer.settings" aria-label="${t('common.settings')}">⚙️</button></div>
    <div class="focus-wrap">
      <div class="card">
        <div class="seg" style="margin-bottom:6px">${['focus', 'short', 'long'].map((m) => `<button class="${tm.mode === m ? 'on' : ''}" data-act="timer.mode" data-m="${m}" ${tm.running || !timer.isIdle() ? 'disabled style="opacity:.6"' : ''}>${t('focus.' + m)}</button>`).join('')}</div>
        ${timer.isIdle() ? durationEditor(tm.mode) : `<div class="center small muted" style="margin-top:6px">${t('focus.lockedWhileRunning')}</div>`}
        <div class="focus-stage">
          <div class="timer-ring">
            <svg class="ring-svg" viewBox="0 0 300 300"><circle cx="150" cy="150" r="${R}" fill="none" stroke="var(--primary-3)" stroke-width="14"/><circle id="tr-arc" cx="150" cy="150" r="${R}" fill="none" stroke="${tm.mode === 'focus' ? 'var(--primary)' : 'var(--green)'}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - rem / tot)}" style="transition:stroke-dashoffset 1s linear" data-c="${C}"/></svg>
            <div class="inner"><div id="tr-pig" data-act="pig.poke">${pigSVG(pigProps({ mood: timerMood(), size: 104, cls: 'pig-anim' }))}</div><div class="time" id="tr-time">${mmss(rem)}</div><div class="small muted bold">${t('focus.' + tm.mode)}</div></div>
          </div>
          <button class="chip" data-act="timer.label" ${tm.running ? 'disabled' : ''}>🏷️ ${tm.label ? esc(tm.label) : t('focus.chooseLabel')}</button>
          <div class="cycle-dots">${Array.from({ length: f.longEvery || 4 }, (_, i) => `<i class="${i < (tm.cycle || 0) % (f.longEvery || 4) ? 'on' : ''}"></i>`).join('')}</div>
          <div class="bubble up center" style="max-width:320px" id="tr-msg">${esc(msg)}</div>
          <div class="timer-controls">${controls}</div>
        </div>
      </div>
      <div class="col" style="gap:14px">
        <div class="card has-peek">${peekPig()}<div class="card-title">${t('focus.today')}</div>
          <div class="row" style="gap:16px">${ring(goal ? today / goal : 0, 92, 10, 'var(--primary)', `<div style="font-size:1.1rem">${Math.round(today)}</div><div class="tiny muted">/${goal} ${t('unit.minShort')}</div>`)}
          <div class="grow stat-row" style="grid-template-columns:1fr 1fr">
            <div class="stat"><b>🔥 ${streak()}</b><span>${t('focus.streak')}</span></div>
            <div class="stat"><b>🍅 ${sessionsOn(new Date())}</b><span>${t('focus.sessions')}</span></div>
            <div class="stat"><b>🪙 ${S().rewards.coins || 0}</b><span>${t('focus.coins')}</span></div>
            <div class="stat"><b>${Math.round(totalFocus() / 6) / 10}h</b><span>${t('focus.total')}</span></div></div></div>
          ${goal && today >= goal ? `<div class="badge green" style="margin-top:10px">🎉 ${t('focus.goalMet')}</div>` : ''}
        </div>
        <div class="card"><div class="card-title">${t('focus.thisWeek')}</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:110px">${week.map((d) => { const v = focusOn(d); return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><span class="tiny muted">${v ? Math.round(v) : ''}</span><div style="width:70%;border-radius:8px 8px 4px 4px;background:${dkey(d) === dkey() ? 'var(--primary)' : 'var(--primary-2)'};height:${Math.max(4, v / maxW * 70)}px"></div><span class="tiny muted bold">${weekdayShort(d.getDay())}</span></div>`; }).join('')}</div></div>
        <button class="card row" data-act="pig.wardrobe" style="text-align:left;width:100%">${pigSVG(pigProps({ mood: 'happy', size: 56 }))}<div class="grow"><div class="bold">${t('pig.wardrobe')}</div><div class="small muted">${nu ? t('pig.nextUnlock', { min: nu.left, item: t((nu.kind === 'acc' ? 'acc.' : 'expr.') + nu.id) }) : t('pig.allUnlocked')}</div></div><span class="chev"></span></button>
      </div>
    </div></div>`;
}

// Quick duration editing right on the timer screen
const PRESETS = { focus: [15, 25, 30, 45, 60, 90], short: [3, 5, 10, 15], long: [15, 20, 30] };
const LIMITS = { focus: [1, 180], short: [1, 60], long: [1, 90] };
function durationEditor(mode) {
  const f = S().settings.focus, v = f[mode];
  return `<div class="dur-row">
      <button class="icon-btn" data-act="dur.step" data-d="-1" aria-label="-">−</button>
      <button class="dur-val" data-act="dur.custom"><b>${v}</b> ${t('unit.minShort')} ✏️</button>
      <button class="icon-btn" data-act="dur.step" data-d="1" aria-label="+">＋</button></div>
    <div class="chips" style="justify-content:center;flex-wrap:wrap">${PRESETS[mode].map((m) => `<button class="chip ${m === v ? 'on' : ''}" data-act="dur.set" data-v="${m}">${m} ${t('unit.minShort')}</button>`).join('')}</div>
    <div class="center tiny muted">${t('focus.durSummary', { f: f.focus, s: f.short, l: f.long, n: f.longEvery })} · <button class="link" style="color:var(--primary-ink);font-weight:800" data-act="timer.settings">${t('focus.moreSettings')}</button></div>`;
}
function setDuration(v) {
  const tm = S().timer, [lo, hi] = LIMITS[tm.mode];
  v = Math.round(Number(v));
  if (!Number.isFinite(v)) return;
  v = Math.max(lo, Math.min(hi, v));
  S().settings.focus[tm.mode] = v;
  if (timer.isIdle()) tm.totalMs = v * 60000;
  commit('settings'); rerender();
}

let lastMood = '';
export function tick() {
  const el = $('#tr-time');
  if (!el) return;
  const rem = timer.remainingMs(), tot = timer.totalMs();
  el.textContent = mmss(rem);
  const arc = $('#tr-arc');
  if (arc) arc.style.strokeDashoffset = arc.dataset.c * (1 - rem / tot);
  const mood = timerMood();
  if (mood !== lastMood) { lastMood = mood; $('#tr-pig').innerHTML = pigSVG(pigProps({ mood, size: 104, cls: 'pig-anim' })); }
  if (S().timer.running) document.title = `${mmss(rem)} · ${t('app.name')}`;
}

function rewardSheet(d) {
  if (d.mode !== 'focus') { toast(t('focus.breakOver')); if (currentRoute().name === 'focus') rerender(); return; }
  celebrate(window.innerWidth / 2, window.innerHeight * 0.6, 12);
  openSheet(`<div class="center">${pigSVG(pigProps({ mood: 'cheer', size: 150, cls: 'pig-anim' })).replace('<svg', '<svg style="margin:0 auto"')}
    <h2 style="margin:8px 0">${t('focus.rewardTitle')}</h2>
    <p class="muted" style="margin:0 0 12px">${t('focus.rewardBody', { min: d.minutes, coins: d.coins })}</p>
    ${d.unlocked ? `<div class="badge green" style="margin-bottom:12px">🎁 ${t('focus.newUnlock')}</div>` : ''}
    <div class="row"><button class="btn grow" data-act="sheet.close">${t('common.close')}</button>${d.unlocked ? `<button class="btn grow" data-act="pig.wardrobe">👗 ${t('pig.wardrobe')}</button>` : ''}<button class="btn primary grow" data-act="timer.startNext">${t('focus.takeBreak')}</button></div></div>`, { center: true, cls: 'dialog' });
  if (currentRoute().name === 'focus') rerender();
}
window.addEventListener('mochi-timer-done', (e) => rewardSheet(e.detail));

function settingsSheet() {
  const f = S().settings.focus;
  const el = openSheet(`${sheetHead(t('focus.settings'))}<form novalidate>
    <div class="field-row">${field(t('focus.focusMin'), input('focus', f.focus, 'type="number" min="1" max="180"'))}${field(t('focus.dailyGoal'), input('dailyGoal', f.dailyGoal, 'type="number" min="0" max="1440" step="5"'))}</div>
    <div class="field-row">${field(t('focus.shortMin'), input('short', f.short, 'type="number" min="1" max="60"'))}${field(t('focus.longMin'), input('long', f.long, 'type="number" min="1" max="90"'))}</div>
    ${field(t('focus.longEvery'), input('longEvery', f.longEvery, 'type="number" min="2" max="10"'))}
    <div class="set-group"><div class="set-row"><span class="label">${t('focus.autoNext')}</span>${toggle('name="autoNext"', f.autoNext)}</div>
    <div class="set-row"><span class="label">${t('set.timerSound')}</span>${select('timerSound', SOUNDS.map((s) => ({ value: s, label: t('sound.' + s) })), S().settings.sound.timer)}<button type="button" class="btn sm" id="prev">▶</button></div></div>
    <div class="sheet-actions"><button class="btn primary">${t('common.save')}</button></div></form>`);
  el.querySelector('#prev').addEventListener('click', () => playSound(el.querySelector('[name=timerSound]').value, 0.35));
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    const num = (x, lo, hi, d) => (Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x) : d);
    Object.assign(f, { focus: num(v.focus, 1, 180, 25), short: num(v.short, 1, 60, 5), long: num(v.long, 1, 90, 15), longEvery: num(v.longEvery, 2, 10, 4), dailyGoal: num(v.dailyGoal, 0, 1440, 120), autoNext: v.autoNext });
    S().settings.sound.timer = v.timerSound;
    if (timer.isIdle()) S().timer.totalMs = timer.durationMin(S().timer.mode) * 60000;
    commit('settings'); closeSheet(); toast(t('common.saved')); rerender();
  });
}

function labelSheet() {
  const opts = [...courseOptions().map((o) => o.value), ...pendingAssignments().slice(0, 5).map((a) => a.course || a.title), ...upcomingExams().map((e) => e.course)];
  const uniq = [...new Set(opts.filter(Boolean))];
  const el = openSheet(`${sheetHead(t('focus.chooseLabel'))}<div class="chips" style="flex-wrap:wrap">${['', ...uniq].map((o) => `<button class="chip ${S().timer.label === o ? 'on' : ''}" data-lbl="${esc(o)}">${o ? esc(o) : t('focus.noLabel')}</button>`).join('')}</div>
    <form class="row" style="margin-top:12px"><input class="input grow" name="custom" placeholder="${esc(t('focus.customLabel'))}"><button class="btn primary">${t('common.ok')}</button></form>`);
  const set = (v) => { S().timer.label = v; commit('timer'); closeSheet(); rerender(); };
  el.querySelectorAll('[data-lbl]').forEach((b) => b.addEventListener('click', () => set(b.dataset.lbl)));
  el.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = e.target.custom.value.trim(); if (v) set(v); });
}

export function wardrobeSheet() {
  const p = S().settings.pig;
  const tf = totalFocus();
  const item = (kind, x) => {
    const unlocked = isUnlocked(x);
    const sel = (kind === 'acc' ? p.acc : p.expr) === x.id;
    const props = kind === 'acc' ? { acc: x.id, expr: 'happy' } : { acc: 'none', expr: x.id };
    return `<button class="ward-item ${sel ? 'on' : ''} ${unlocked ? '' : 'locked'}" data-act="pig.set" data-kind="${kind}" data-id="${x.id}" ${unlocked ? '' : 'data-locked="1"'}>${unlocked ? '' : '<span class="lock">🔒</span>'}${pigSVG({ ...props, mood: 'happy', size: 72 })}<span>${t((kind === 'acc' ? 'acc.' : 'expr.') + x.id)}</span>${unlocked ? '' : `<span class="tiny muted">${fmtDuration(x.min)}</span>`}</button>`;
  };
  const html = `${sheetHead(t('pig.wardrobe'))}
    <div class="center">${pigSVG(pigProps({ mood: 'happy', size: 140, cls: 'pig-anim' })).replace('<svg', '<svg style="margin:0 auto"')}</div>
    <form class="row" id="pig-name" style="margin:8px 0 6px"><input class="input grow" name="n" value="${esc(p.name)}" placeholder="${esc(t('pig.namePh'))}" maxlength="16"><button class="btn sm primary">${t('common.save')}</button></form>
    <p class="small muted center">${t('pig.unlockHint', { total: fmtDuration(tf) })}</p>
    <div class="card-title">${t('pig.accessories')}</div><div class="wardrobe">${ACCESSORIES.map((x) => item('acc', x)).join('')}</div>
    <div class="card-title" style="margin-top:16px">${t('pig.expressions')}</div><div class="wardrobe">${EXPRESSIONS.map((x) => item('expr', x)).join('')}</div>`;
  const el = openSheet(html);
  el.querySelector('#pig-name').addEventListener('submit', (e) => { e.preventDefault(); p.name = e.target.n.value.trim(); commit('settings'); toast(t('common.saved')); rerender(); });
}

on({
  'timer.mode': (el) => { timer.setMode(el.dataset.m); rerender(); },
  'dur.set': (el) => setDuration(el.dataset.v),
  'dur.step': (el) => {
    const mode = S().timer.mode, cur = S().settings.focus[mode], d = +el.dataset.d;
    const big = mode === 'focus' && (d > 0 ? cur >= 10 : cur > 10);
    setDuration(big ? Math.round((cur + d * 5) / 5) * 5 : cur + d);
  },
  'dur.custom': async () => {
    const mode = S().timer.mode, [lo, hi] = LIMITS[mode];
    const v = await promptDialog(t('focus.customDur', { mode: t('focus.' + mode), lo, hi }), String(S().settings.focus[mode]));
    if (v === null || v === '') return;
    if (!/^\d+$/.test(v) || +v < lo || +v > hi) return toast(t('focus.durRange', { lo, hi }), 'err');
    setDuration(v);
  },
  'timer.start': () => { timer.start(); toast(S().timer.mode === 'focus' ? t('focus.started') : t('focus.breakStarted')); rerender(); },
  'timer.pause': () => { timer.pause(); rerender(); },
  'timer.resume': () => { timer.resume(); rerender(); },
  'timer.stop': () => { const m = timer.stop(); if (m >= 1) toast(t('focus.stoppedLogged', { m })); rerender(); },
  'timer.skip': () => { timer.skip(); rerender(); },
  'timer.startNext': () => { closeSheet(); timer.start(); go('focus'); },
  'timer.settings': () => settingsSheet(),
  'timer.label': () => labelSheet(),
  'focus.for': (el) => { closeSheet(); if (!S().timer.running) { S().timer.label = el.dataset.label || ''; if (S().timer.mode !== 'focus' && timer.isIdle()) timer.setMode('focus'); commit('timer'); } go('focus'); },
  'pig.wardrobe': () => { closeSheet(); wardrobeSheet(); },
  'pig.set': (el) => {
    if (el.dataset.locked) return toast(t('pig.locked'), 'err');
    S().settings.pig[el.dataset.kind] = el.dataset.id;
    commit('settings'); closeSheet(); wardrobeSheet(); rerender();
  },
  'pig.poke': (el) => {
    const svg = el.querySelector('svg') || el;
    svg.classList.remove('pig-jump'); void svg.getBBox?.(); svg.classList.add('pig-jump');
    const r = el.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top + 20, 3, ['💗', '✨', '🌸']);
    const msg = document.getElementById('tr-msg') || document.getElementById('home-msg');
    if (msg) msg.textContent = encouragement();
    if (S().settings.sound.app) playSound('bubble', 0.15);
  },
});
