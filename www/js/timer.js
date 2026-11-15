// Pomodoro engine: survives app restarts because it stores the absolute end time.
import { store, commit } from './store.js';
import { uid } from './utils.js';
import { playSound, vibrate } from './native.js';
import { unlockedAcc, unlockedExpr } from './data.js';
import { reschedule } from './reminders.js';

const T = () => store.state.timer;
const F = () => store.state.settings.focus;

export const durationMin = (mode) => ({ focus: F().focus, short: F().short, long: F().long }[mode] || 25);

export function remainingMs() {
  const tm = T();
  if (tm.running) return Math.max(0, tm.endAt - Date.now());
  if (tm.remainingMs) return tm.remainingMs;
  return durationMin(tm.mode) * 60000;
}
export const totalMs = () => T().totalMs || durationMin(T().mode) * 60000;
export const isIdle = () => !T().running && !T().remainingMs;

export function setMode(mode) {
  const tm = T();
  if (tm.running) return;
  Object.assign(tm, { mode, remainingMs: 0, totalMs: durationMin(mode) * 60000 });
  commit('timer');
}

export function start(label) {
  const tm = T();
  const total = durationMin(tm.mode) * 60000;
  Object.assign(tm, { running: true, totalMs: total, endAt: Date.now() + total, remainingMs: 0, startedAt: Date.now() });
  if (label !== undefined) tm.label = label;
  commit('timer'); reschedule();
}
export function pause() {
  const tm = T();
  if (!tm.running) return;
  tm.remainingMs = Math.max(1000, tm.endAt - Date.now());
  tm.running = false; tm.endAt = 0;
  commit('timer'); reschedule();
}
export function resume() {
  const tm = T();
  if (tm.running || !tm.remainingMs) return;
  tm.endAt = Date.now() + tm.remainingMs; tm.running = true; tm.remainingMs = 0;
  commit('timer'); reschedule();
}

// Stop early: partial focus still counts toward statistics (no reward)
export function stop() {
  const tm = T();
  const elapsed = tm.totalMs - remainingMs();
  if (tm.mode === 'focus' && elapsed >= 60000) {
    store.state.focusLog.push({ id: uid(), start: tm.startedAt || Date.now() - elapsed, minutes: Math.floor(elapsed / 60000), label: tm.label || '', full: false });
  }
  Object.assign(tm, { running: false, endAt: 0, remainingMs: 0, totalMs: durationMin(tm.mode) * 60000 });
  commit('timer'); reschedule();
  return Math.floor(elapsed / 60000);
}

export function skip() {
  const tm = T();
  if (tm.mode === 'focus') stop();
  Object.assign(tm, { running: false, endAt: 0, remainingMs: 0, mode: tm.mode === 'focus' ? 'short' : 'focus' });
  tm.totalMs = durationMin(tm.mode) * 60000;
  commit('timer'); reschedule();
}

function complete() {
  const tm = T();
  const doneMode = tm.mode;
  let detail = { mode: doneMode };
  if (doneMode === 'focus') {
    const beforeA = unlockedAcc().length + unlockedExpr().length;
    const minutes = Math.round(tm.totalMs / 60000);
    store.state.focusLog.push({ id: uid(), start: tm.startedAt || tm.endAt - tm.totalMs, minutes, label: tm.label || '', full: true });
    const coins = 10 + Math.floor(minutes / 5);
    store.state.rewards.coins = (store.state.rewards.coins || 0) + coins;
    tm.cycle = (tm.cycle || 0) + 1;
    const afterA = unlockedAcc().length + unlockedExpr().length;
    detail = { mode: doneMode, minutes, coins, unlocked: afterA > beforeA };
    tm.mode = tm.cycle % (F().longEvery || 4) === 0 ? 'long' : 'short';
  } else {
    tm.mode = 'focus';
  }
  Object.assign(tm, { running: false, endAt: 0, remainingMs: 0, totalMs: durationMin(tm.mode) * 60000 });
  const s = store.state.settings.sound;
  if (s.app) playSound(s.timer, 0.35);
  if (s.vibrate) vibrate(400);
  commit('timer');
  if (F().autoNext) start();
  else reschedule();
  window.dispatchEvent(new CustomEvent('mochi-timer-done', { detail }));
}

// Called every second by the app shell
export function check() {
  const tm = T();
  if (tm.running && Date.now() >= tm.endAt) complete();
}
