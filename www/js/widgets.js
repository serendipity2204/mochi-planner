// Home-screen widgets: push a data snapshot to the native widgets and render in-app previews.
import { store } from './store.js';
import { t, lang, fmtTime, weekdayShort } from './i18n.js';
import { esc, dkey, addDays, startOfDay, debounce } from './utils.js';
import { classesOn, pendingAssignments, dueAt, assignmentProgress, assignmentStatus, courseColor } from './data.js';
import { plug, isNative } from './native.js';
import { pigSVG } from './pig.js';

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
  return {
    v: 1, updated: Date.now(), lang: lang(), timeFmt: store.state.settings.cal.timeFmt,
    wd: [0, 1, 2, 3, 4, 5, 6].map(weekdayShort), mon: [...Array(12).keys()].map((m) => t('mon.' + m).slice(0, 3)),
    labels: {
      today: t('widget.today'), asg: t('widget.asg'), noClass: t('widget.noClass'), noAsg: t('widget.noAsg'),
      overdue: t('asg.overdue'), hoursLeft: t('widget.hoursLeft'), daysLeft: t('widget.daysLeft'), more: t('widget.more'),
      allDone: t('widget.allDone'), openApp: t('widget.openApp'),
    },
    classes, assignments,
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
  const head = `<div class="wpv-head">${pigSVG({ size: 30, acc: 'bow', expr: 'happy' })}<b>${esc(kind === 'today' ? d.labels.today : d.labels.asg)}</b><span>${esc(lang() === 'zh' ? `${now.getMonth() + 1}月${now.getDate()}日 ${weekdayShort(now.getDay())}` : `${weekdayShort(now.getDay())} ${now.getDate()}`)}</span></div>`;
  let rows = '';
  if (kind === 'today') {
    const list = d.classes[dkey(now)] || [];
    rows = list.length ? list.slice(0, 5).map((c) => {
      const [sh, sm] = c.s.split(':').map(Number), [eh, em] = c.e.split(':').map(Number);
      const past = eh * 60 + em <= nm, live = sh * 60 + sm <= nm && !past;
      return `<div class="wpv-row ${past ? 'past' : ''}"><i style="background:${past ? '#E0D0D6' : c.col}"></i><div><b style="${live ? 'color:#EC6C9C' : ''}">${live ? '▶ ' : ''}${esc(c.n)}</b><small>${esc([c.c, c.l].filter(Boolean).join(' · '))}</small></div><em>${fmtTime(c.s)}<br>${fmtTime(c.e)}</em></div>`;
    }).join('') : `<div class="wpv-empty">${esc(d.labels.noClass)}</div>`;
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
