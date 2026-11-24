// Home-screen widgets: push a data snapshot to the native widgets and render in-app previews.
import { store } from './store.js';
import { t, lang, fmtTime, fmtDate, weekdayShort } from './i18n.js';
import { esc, dkey, addDays, startOfDay, debounce } from './utils.js';
import { classesOn, pendingAssignments, dueAt, assignmentProgress, assignmentStatus, courseColor, sortedTodos, upcomingExams, examAt } from './data.js';
import { parseDate } from './utils.js';
import { plug, isNative } from './native.js';
import { pigSVG } from './pig.js';

// The app's current colours (theme colour + light/dark), so home-screen widgets match the app
function themeColors() {
  try {
    const cs = getComputedStyle(document.documentElement);
    const hex = (name, fb) => { const v = cs.getPropertyValue(name).trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : fb; };
    return {
      bg: hex('--primary-3', '#FFF0F5'), text: hex('--text', '#4A3540'), muted: hex('--muted', '#9B8790'),
      accent: hex('--primary', '#EC6C9C'), ink: hex('--primary-ink', hex('--primary', '#EC6C9C')),
      dark: document.documentElement.dataset.theme === 'dark',
    };
  } catch { return null; }
}

export function widgetData() {
  const today = startOfDay(new Date());
  const classes = {};
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    classes[dkey(d)] = classesOn(d).map((c) => ({ s: c.start, e: c.end, n: c.name || c.code, c: c.code || '', l: c.location || '', col: courseColor(c) }));
  }
  const assignments = pendingAssignments().filter((a) => a.dueDate).slice(0, 12).map((a) => ({
    t: a.title, c: a.course || '', due: dueAt(a).getTime(), p: Math.round(assignmentProgress(a) * 100), st: assignmentStatus(a),
  }));
  const todos = sortedTodos().filter((x) => !x.done).slice(0, 12).map((x) => ({
    t: x.title, pr: x.priority, pl: t('pri.' + x.priority) + (x.due ? ' · ' + fmtDate(x.due, { short: true }) : ''), day: x.due ? parseDate(x.due).getTime() : 0,
  }));
  const exams = upcomingExams().slice(0, 12).map((e) => ({
    t: e.course, at: examAt(e).getTime(), day: parseDate(e.date).getTime(),
    w: `${fmtDate(e.date, { short: true })} ${fmtTime(e.time || '09:00')}${e.location ? ' · ' + e.location : ''}`,
  }));
  return {
    v: 1, updated: Date.now(), lang: lang(), timeFmt: store.state.settings.cal.timeFmt, theme: themeColors(),
    wd: [0, 1, 2, 3, 4, 5, 6].map(weekdayShort), mon: [...Array(12).keys()].map((m) => t('mon.' + m).slice(0, 3)),
    labels: {
      today: t('widget.today'), asg: t('widget.asg'), noClass: t('widget.noClass'), noAsg: t('widget.noAsg'),
      overdue: t('asg.overdue'), hoursLeft: t('widget.hoursLeft'), daysLeft: t('widget.daysLeft'), more: t('widget.more'),
      allDone: t('widget.allDone'), openApp: t('widget.openApp'), todo: t('widget.todo'), exam: t('widget.exam'),
      noTodo: t('widget.noTodo'), noExam: t('widget.noExam'), todayShort: t('rel.today'), tomorrow: t('rel.tomorrow'), examDays: t('widget.examDays'),
    },
    classes, assignments, todos, exams,
  };
}

export const pushWidgets = debounce(async () => {
  const W = plug('MochiWidgets');
  if (!W) return;
  try { await W.update({ data: JSON.stringify(widgetData()) }); } catch (e) { console.warn('widgets', e); }
}, 1200);

export async function pinWidget(kind) {
  const W = plug('MochiWidgets');
  if (!W) return 'web';
  const s = await W.isPinSupported();
  if (!s.supported) return 'manual';
  await W.pin({ kind });
  return 'requested';
}

export async function widgetCount() {
  const W = plug('MochiWidgets');
  if (!W) return null;
  try { return await W.count(); } catch { return null; }
}

// In-app preview that mirrors the native layout
export function previewHTML(kind) {
  const d = widgetData();
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  const title = { today: d.labels.today, assignments: d.labels.asg, todos: d.labels.todo, exams: d.labels.exam }[kind];
  const head = `<div class="wpv-head">${pigSVG({ size: 30, acc: 'bow', expr: 'happy' })}<b>${esc(title)}</b><span>${esc(lang() === 'zh' ? `${now.getMonth() + 1}月${now.getDate()}日 ${weekdayShort(now.getDay())}` : `${weekdayShort(now.getDay())} ${now.getDate()}`)}</span></div>`;
  let rows = '';
  if (kind === 'today') {
    const list = d.classes[dkey(now)] || [];
    rows = list.length ? list.slice(0, 5).map((c) => {
      const [sh, sm] = c.s.split(':').map(Number), [eh, em] = c.e.split(':').map(Number);
      const past = eh * 60 + em <= nm, live = sh * 60 + sm <= nm && !past;
      return `<div class="wpv-row ${past ? 'past' : ''}"><i style="background:${past ? '#E0D0D6' : c.col}"></i><div><b style="${live ? 'color:#EC6C9C' : ''}">${live ? '▶ ' : ''}${esc(c.n)}</b><small>${esc([c.c, c.l].filter(Boolean).join(' · '))}</small></div><em>${fmtTime(c.s)}<br>${fmtTime(c.e)}</em></div>`;
    }).join('') : `<div class="wpv-empty">${esc(d.labels.noClass)}</div>`;
  } else if (kind === 'todos') {
    const t0 = startOfDay(new Date()).getTime();
    const rel = (day) => { const n = Math.round((day - t0) / 864e5); return n < 0 ? d.labels.overdue : n === 0 ? d.labels.todayShort : n === 1 ? d.labels.tomorrow : d.labels.daysLeft.replace('%d', n); };
    rows = d.todos.length ? d.todos.slice(0, 5).map((x) => {
      const col = { high: '#F26D6D', med: '#F2B33D', low: '#45BF86' }[x.pr];
      const n = x.day ? Math.round((x.day - t0) / 864e5) : null;
      return `<div class="wpv-row"><i style="background:${col}"></i><div><b>○ ${esc(x.t)}</b><small>${esc(x.pl)}</small></div><em style="color:${n !== null && n < 0 ? '#F26D6D' : n === 0 ? '#C88A10' : ''}">${x.day ? esc(rel(x.day)) : ''}</em></div>`;
    }).join('') : `<div class="wpv-empty">${esc(d.labels.noTodo)}</div>`;
  } else if (kind === 'exams') {
    const t0 = startOfDay(new Date()).getTime();
    rows = d.exams.length ? d.exams.slice(0, 5).map((e) => {
      const n = Math.round((e.day - t0) / 864e5), col = n <= 3 ? '#F26D6D' : '#EC6C9C';
      return `<div class="wpv-row"><i style="background:${col}"></i><div><b>${esc(e.t)}</b><small>${esc(e.w)}</small></div><em style="color:${col};font-weight:800">${esc(n <= 0 ? d.labels.todayShort : d.labels.examDays.replace('%d', n))}</em></div>`;
    }).join('') : `<div class="wpv-empty">${esc(d.labels.noExam)}</div>`;
  } else {
    rows = d.assignments.length ? d.assignments.slice(0, 5).map((a) => {
      const ms = a.due - Date.now();
      const when = ms < 0 ? d.labels.overdue : ms < 864e5 ? d.labels.hoursLeft.replace('%d', Math.max(1, Math.floor(ms / 36e5))) : d.labels.daysLeft.replace('%d', Math.floor(ms / 864e5));
      const col = { green: '#45BF86', yellow: '#F2B33D', red: '#F26D6D' }[a.st];
      return `<div class="wpv-row"><i style="background:${col}"></i><div><b>${esc(a.t)}</b><small>${esc([a.c, a.p + '%'].filter(Boolean).join(' · '))}</small></div><em style="color:${ms < 0 ? '#F26D6D' : ms < 864e5 ? '#C88A10' : ''}">${esc(when)}</em></div>`;
    }).join('') : `<div class="wpv-empty">${esc(d.labels.noAsg)}</div>`;
  }
  return `<div class="wpv">${head}${rows}</div>`;
}

export const widgetsSupported = () => isNative();
