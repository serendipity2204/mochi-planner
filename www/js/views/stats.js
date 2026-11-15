// Study statistics: daily / weekly / monthly focus, completion rates, habits.
import { store } from '../store.js';
import { t, fmtDuration, weekdayShort, fmtDate, lang, monthName } from '../i18n.js';
import { esc, dkey, addDays, startOfDay, weekStart, pad } from '../utils.js';
import { on, rerender } from '../ui.js';
import { focusByDay, streak, bestStreak, isComplete, dueAt } from '../data.js';

const S = () => store.state;
const st = { period: 'week', offset: 0 };

function range() {
  const now = startOfDay(new Date());
  if (st.period === 'day') { const d = addDays(now, st.offset); return { from: d, to: addDays(d, 1), days: [d] }; }
  if (st.period === 'week') { const ws = addDays(weekStart(now, S().settings.cal.weekStart), st.offset * 7); return { from: ws, to: addDays(ws, 7), days: Array.from({ length: 7 }, (_, i) => addDays(ws, i)) }; }
  const m = new Date(now.getFullYear(), now.getMonth() + st.offset, 1);
  const n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  return { from: m, to: new Date(m.getFullYear(), m.getMonth() + 1, 1), days: Array.from({ length: n }, (_, i) => addDays(m, i)) };
}

// Single-series bar chart (one hue, rounded data ends, 2px gaps, tap/hover shows value)
function barChart(values, labels, { unit = '', highlight = -1, goal = 0 } = {}) {
  const W = 360, H = 170, padL = 4, padB = 20, padT = 20;
  const max = Math.max(goal, ...values, 1);
  const n = values.length, bw = (W - padL * 2) / n, gap = Math.max(2, bw * 0.28);
  const y = (v) => H - padB - (v / max) * (H - padB - padT);
  const bars = values.map((v, i) => {
    const x = padL + i * bw + gap / 2, w = bw - gap, top = y(v), h = H - padB - top;
    const r = Math.min(4, w / 2, h);
    const path = h > 0 ? `M${x} ${H - padB} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + w - r} Q${x + w} ${top} ${x + w} ${top + r} V${H - padB} Z` : '';
    return `<g class="bar-g" data-v="${esc(labels[i].full)}: ${esc(fmtDuration(v))}"><rect x="${padL + i * bw}" y="${padT - 10}" width="${bw}" height="${H - padT - padB + 10}" fill="transparent"/>${path ? `<path d="${path}" fill="${i === highlight ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 55%, var(--card))'}"><title>${esc(labels[i].full)}: ${esc(fmtDuration(v))}</title></path>` : ''}</g>`;
  }).join('');
  const every = n > 14 ? 5 : 1;
  const xl = labels.map((l, i) => i % every === 0 ? `<text x="${padL + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(l.short)}</text>` : '').join('');
  const maxI = values.indexOf(Math.max(...values));
  const maxLabel = values[maxI] > 0 ? `<text x="${padL + maxI * bw + bw / 2}" y="${y(values[maxI]) - 6}" text-anchor="middle" style="fill:var(--text)">${Math.round(values[maxI])}${unit}</text>` : '';
  const goalLine = goal ? `<line x1="${padL}" x2="${W - padL}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--muted)" stroke-dasharray="4 4" stroke-width="1"/><text x="${W - padL}" y="${y(goal) - 4}" text-anchor="end">${t('stats.goal')}</text>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('stats.focusChart'))}"><line x1="${padL}" x2="${W - padL}" y1="${H - padB}" y2="${H - padB}" stroke="var(--line)"/>${goalLine}${bars}${maxLabel}${xl}</svg>
    <div class="small muted center" id="bar-readout" style="min-height:1.2em">${t('stats.tapBar')}</div>`;
}

function hBars(rows) {
  const max = Math.max(...rows.map((r) => r.v), 1);
  return rows.map((r) => `<div style="margin-bottom:10px"><div class="row small"><span class="grow bold ellipsis">${esc(r.k)}</span><span class="muted">${fmtDuration(r.v)}</span></div><div class="progress" style="height:8px;margin-top:4px"><i style="width:${r.v / max * 100}%"></i></div></div>`).join('');
}

export function render() {
  const { from, to, days } = range();
  const by = focusByDay();
  const logs = S().focusLog.filter((f) => f.start >= from.getTime() && f.start < to.getTime());
  const total = logs.reduce((a, f) => a + f.minutes, 0);
  const sessions = logs.filter((f) => f.full).length;
  const dueIn = S().assignments.filter((a) => a.dueDate && dueAt(a) >= from && dueAt(a) < to);
  const doneIn = dueIn.filter(isComplete).length;
  const todosDone = S().todos.filter((x) => x.doneAt && x.doneAt >= from.getTime() && x.doneAt < to.getTime()).length;
  const activeDays = days.filter((d) => by[dkey(d)]).length;
  const goal = S().settings.focus.dailyGoal;

  let values, labels, hi = -1;
  if (st.period === 'day') {
    values = Array(24).fill(0);
    for (const f of logs) values[new Date(f.start).getHours()] += f.minutes;
    values = values.slice(6); labels = values.map((_, i) => ({ short: String(i + 6), full: `${pad(i + 6)}:00` }));
    hi = new Date().getHours() - 6;
  } else {
    values = days.map((d) => by[dkey(d)] || 0);
    labels = days.map((d) => ({ short: st.period === 'week' ? weekdayShort(d.getDay()) : String(d.getDate()), full: fmtDate(d, { short: true }) }));
    hi = days.findIndex((d) => dkey(d) === dkey());
  }
  // breakdown by label
  const byLabel = {};
  for (const f of logs) { const k = f.label || t('focus.noLabel'); byLabel[k] = (byLabel[k] || 0) + f.minutes; }
  const labelRows = Object.entries(byLabel).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v).slice(0, 6);
  // habits (all-time)
  const wd = Array(7).fill(0), hr = Array(24).fill(0);
  for (const f of S().focusLog) { const d = new Date(f.start); wd[d.getDay()] += f.minutes; hr[d.getHours()] += f.minutes; }
  const bestWd = wd.indexOf(Math.max(...wd)), bestHr = hr.indexOf(Math.max(...hr));

  let title;
  if (st.period === 'day') title = fmtDate(from, { weekday: true });
  else if (st.period === 'week') title = `${fmtDate(from, { short: true })} – ${fmtDate(addDays(to, -1), { short: true })}`;
  else title = lang() === 'zh' ? `${from.getFullYear()}年${from.getMonth() + 1}月` : `${monthName(from.getMonth())} ${from.getFullYear()}`;

  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${esc(l)}</span></div>`;
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('nav.stats')}</h1></div>
    <div class="seg" style="margin-bottom:12px">${['day', 'week', 'month'].map((p) => `<button class="${st.period === p ? 'on' : ''}" data-act="stats.period" data-p="${p}">${t('stats.' + p)}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:12px"><button class="icon-btn" data-act="stats.nav" data-d="-1">‹</button><div class="grow center bold">${esc(title)}</div><button class="icon-btn" data-act="stats.nav" data-d="1" ${st.offset >= 0 ? 'disabled style="opacity:.4"' : ''}>›</button></div>
    <div class="grid-2">
      <div class="card"><div class="card-title">⏱️ ${t('stats.focusTime')}</div>
        <div class="stat-row" style="margin-bottom:12px">${stat(fmtDuration(total), t('stats.total'))}${stat(st.period === 'day' ? sessions : fmtDuration(total / days.length), st.period === 'day' ? t('focus.sessions') : t('stats.avgDay'))}${stat(st.period === 'day' ? (goal ? Math.round(total / goal * 100) + '%' : '-') : `${activeDays}/${days.length}`, st.period === 'day' ? t('stats.goalPct') : t('stats.activeDays'))}</div>
        ${total ? barChart(values, labels, { unit: t('unit.minShort'), highlight: hi, goal: st.period === 'day' ? 0 : goal }) : `<div class="empty">${t('stats.noFocus')}</div>`}</div>
      <div class="card"><div class="card-title">📝 ${t('stats.completion')}</div>
        <div class="stat-row">${stat(dueIn.length ? Math.round(doneIn / dueIn.length * 100) + '%' : '-', t('stats.asgRate'))}${stat(`${doneIn}/${dueIn.length}`, t('stats.asgDone'))}${stat(todosDone, t('stats.todosDone'))}</div>
        ${dueIn.length ? `<div class="progress green" style="margin-top:12px"><i style="width:${doneIn / dueIn.length * 100}%"></i></div>` : ''}
        <div class="card-title" style="margin-top:18px">🔥 ${t('stats.streaks')}</div>
        <div class="stat-row">${stat(streak(), t('stats.current'))}${stat(bestStreak(), t('stats.best'))}${stat(sessions, t('focus.sessions'))}</div></div>
      <div class="card"><div class="card-title">🏷️ ${t('stats.byLabel')}</div>${labelRows.length ? hBars(labelRows) : `<div class="empty">${t('stats.noFocus')}</div>`}</div>
      <div class="card"><div class="card-title">💡 ${t('stats.habits')}</div>
        ${S().focusLog.length ? `<p class="prose" style="margin:0">${t('stats.habitText', { day: t('wd.l' + bestWd), hour: `${pad(bestHr)}:00–${pad((bestHr + 1) % 24)}:00` })}</p>` : `<div class="empty">${t('stats.noFocus')}</div>`}</div>
    </div></div>`;
}

export function mount(root) {
  root.querySelectorAll('.bar-g').forEach((g) => {
    const show = () => { const r = root.querySelector('#bar-readout'); if (r) r.textContent = g.dataset.v; };
    g.addEventListener('click', show); g.addEventListener('mouseenter', show);
  });
}

on({
  'stats.period': (el) => { st.period = el.dataset.p; st.offset = 0; rerender(); },
  'stats.nav': (el) => { st.offset = Math.min(0, st.offset + +el.dataset.d); rerender(); },
});
