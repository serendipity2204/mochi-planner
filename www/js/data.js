// Derived data & business rules shared by all views.
import { store } from './store.js';
import { dkey, parseDate, toMin, at, addDays, startOfDay, daysBetween, colorFor } from './utils.js';
import { ACCESSORIES, EXPRESSIONS } from './pig.js';

const S = () => store.state;

// ---------- Courses ----------
export function courseActiveOn(c, date) {
  const k = dkey(date);
  if (c.startDate && k < c.startDate) return false;
  if (c.endDate && k > c.endDate) return false;
  return (c.days || []).includes(date.getDay());
}
export const classesOn = (date) => S().courses.filter((c) => courseActiveOn(c, date)).sort((a, b) => toMin(a.start) - toMin(b.start));

export function nextClass(now = new Date()) {
  for (let i = 0; i < 14; i++) {
    const d = addDays(startOfDay(now), i);
    for (const c of classesOn(d)) {
      const s = at(dkey(d), c.start), e = at(dkey(d), c.end);
      if (e > now) return { course: c, start: s, end: e, ongoing: s <= now };
    }
  }
  return null;
}

export function findConflicts(course) {
  const out = [];
  for (const o of S().courses) {
    if (o.id === course.id) continue;
    const sharedDays = (course.days || []).filter((d) => (o.days || []).includes(d));
    if (!sharedDays.length) continue;
    const rangeOverlap = (!course.endDate || !o.startDate || o.startDate <= course.endDate) && (!o.endDate || !course.startDate || course.startDate <= o.endDate);
    if (!rangeOverlap) continue;
    if (toMin(course.start) < toMin(o.end) && toMin(o.start) < toMin(course.end)) out.push({ course: o, days: sharedDays });
  }
  return out;
}

export const courseColor = (c) => c.color || colorFor(c.code || c.name);

// Known course labels for selects/autocomplete: code — name
export function courseOptions() {
  const m = new Map();
  for (const c of S().courses) { const key = c.code || c.name; if (key && !m.has(key)) m.set(key, c.code && c.name ? `${c.code} · ${c.name}` : key); }
  return [...m.entries()].map(([value, label]) => ({ value, label }));
}
export function courseByKey(key) {
  if (!key) return null;
  return S().courses.find((c) => c.code === key || c.name === key) || null;
}
export const courseColorByKey = (key) => { const c = courseByKey(key); return c ? courseColor(c) : colorFor(key || 'x'); };

// ---------- Assignments ----------
export function assignmentProgress(a) {
  if (a.subtasks?.length) return a.subtasks.filter((s) => s.done).length / a.subtasks.length;
  return a.done ? 1 : 0;
}
export function assignmentStatus(a) {
  const p = assignmentProgress(a);
  if (p >= 1) return 'green';
  if (p > 0) return 'yellow';
  return 'red';
}
export const isComplete = (a) => assignmentProgress(a) >= 1;
export const dueAt = (a) => at(a.dueDate, a.dueTime || '23:59');

export function urgency(a, now = new Date()) {
  if (isComplete(a) || !a.dueDate) return '';
  const ms = dueAt(a) - now;
  if (ms < 0) return 'overdue';
  if (ms < 48 * 3600000) return 'soon';
  return '';
}
export const sortedAssignments = () => [...S().assignments].sort((a, b) => (isComplete(a) - isComplete(b)) || ((dueAt(a) || Infinity) - (dueAt(b) || Infinity)));
export const pendingAssignments = () => sortedAssignments().filter((a) => !isComplete(a));

// ---------- Exams ----------
export const examAt = (e) => at(e.date, e.time || '09:00');
export const sortedExams = () => [...S().exams].sort((a, b) => examAt(a) - examAt(b));
export const upcomingExams = () => sortedExams().filter((e) => examAt(e) > new Date(Date.now() - 3 * 3600000));
export const examDaysLeft = (e) => daysBetween(new Date(), parseDate(e.date));
export const examPlanProgress = (e) => (e.plan?.length ? e.plan.filter((p) => p.done).length / e.plan.length : 0);

// ---------- To-dos ----------
const PRI = { high: 0, med: 1, low: 2 };
export const sortedTodos = () => [...S().todos].sort((a, b) => (a.done - b.done) || (PRI[a.priority] - PRI[b.priority]) || ((a.due || '9999') < (b.due || '9999') ? -1 : 1));

// ---------- Focus ----------
export function focusByDay() {
  const m = {};
  for (const f of S().focusLog) { const k = dkey(new Date(f.start)); m[k] = (m[k] || 0) + f.minutes; }
  return m;
}
export const focusOn = (date) => focusByDay()[dkey(date)] || 0;
export const totalFocus = () => S().focusLog.reduce((a, f) => a + f.minutes, 0);
export const sessionsOn = (date) => S().focusLog.filter((f) => dkey(new Date(f.start)) === dkey(date) && f.full).length;

export function streak() {
  const by = focusByDay();
  let d = startOfDay(new Date());
  if (!by[dkey(d)]) d = addDays(d, -1);
  let n = 0;
  while (by[dkey(d)]) { n++; d = addDays(d, -1); }
  return n;
}
export function bestStreak() {
  const keys = Object.keys(focusByDay()).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) { run = prev && daysBetween(parseDate(prev), parseDate(k)) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  return best;
}

export const isUnlocked = (item) => totalFocus() >= item.min;
export const unlockedAcc = () => ACCESSORIES.filter(isUnlocked);
export const unlockedExpr = () => EXPRESSIONS.filter(isUnlocked);

// Mascot mood from the user's situation
export function pigMood() {
  if (S().timer.running && S().timer.mode === 'focus') return 'focus';
  const h = new Date().getHours();
  if (h >= 0 && h < 6) return 'sleep';
  if (S().assignments.some((a) => urgency(a) === 'overdue')) return 'worried';
  const goal = S().settings.focus.dailyGoal;
  if (goal && focusOn(new Date()) >= goal) return 'cheer';
  if (streak() >= 3) return 'proud';
  return 'happy';
}
export function pigProps(extra = {}) {
  const p = S().settings.pig;
  const acc = ACCESSORIES.find((a) => a.id === p.acc && isUnlocked(a)) ? p.acc : 'bow';
  const expr = EXPRESSIONS.find((a) => a.id === p.expr && isUnlocked(a)) ? p.expr : 'happy';
  return { acc, expr, mood: pigMood(), ...extra };
}

// Everything happening on a date (for calendar day view & month dots)
export function eventsOn(date) {
  const k = dkey(date);
  return {
    classes: classesOn(date),
    assignments: S().assignments.filter((a) => a.dueDate === k),
    exams: S().exams.filter((e) => e.date === k),
    todos: S().todos.filter((t) => t.due === k),
    plan: S().exams.flatMap((e) => (e.plan || []).filter((p) => p.date === k).map((p) => ({ ...p, exam: e }))),
  };
}
