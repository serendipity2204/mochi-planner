// Tasks: assignments (with subtasks & status colours), exams (countdown & study plan), to-dos.
import { peekPig } from '../icons.js';
import { store, commit, delFile } from '../store.js';
import { t, fmtTime, fmtDate, relDay, fmtDuration, fmtCountdown } from '../i18n.js';
import { esc, uid, dkey, addDays, parseDate, daysBetween } from '../utils.js';
import { on, go, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, formData, fieldError, field, input, select, empty, celebrate, tap, topSheet } from '../ui.js';
import { sortedAssignments, assignmentProgress, assignmentStatus, isComplete, urgency, dueAt, courseOptions, courseColorByKey, sortedExams, examAt, examDaysLeft, examPlanProgress, sortedTodos } from '../data.js';
import { thumbsHTML, hydrateThumbs, addAttachments, attachCtx } from '../attach.js';
import { voiceParse } from '../voice.js';
import { reschedule } from '../reminders.js';
import { remindLabel } from './schedule.js';

const S = () => store.state;
const st = { tab: 'asg', filter: 'active', course: '', showDone: false };

const courseDatalist = () => `<datalist id="course-dl">${courseOptions().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</datalist>`;
const statusLabel = (s) => t('status.' + s);

export function render(params = {}) {
  if (params.tab) st.tab = params.tab;
  const tabs = ['asg', 'exam', 'todo'];
  const addAct = { asg: 'asg.add', exam: 'exam.add', todo: 'todo.add' }[st.tab];
  const voiceAct = { asg: 'asg.voice', exam: 'exam.voice', todo: 'todo.voice' }[st.tab];
  return `<div class="page">
    <div class="topbar"><h1>${t('nav.tasks')}</h1><button class="icon-btn" data-act="${voiceAct}" aria-label="${t('common.voice')}">🎤</button><button class="icon-btn" data-act="${addAct}" style="background:var(--primary);color:#fff" aria-label="${t('common.add')}">＋</button></div>
    <div class="seg" style="margin-bottom:12px">${tabs.map((x) => `<button class="${st.tab === x ? 'on' : ''}" data-act="tasks.tab" data-tab="${x}">${t('tasks.' + x)}</button>`).join('')}</div>
    ${st.tab === 'asg' ? asgList() : st.tab === 'exam' ? examList() : todoList()}
  </div>`;
}

// ================= Assignments =================
function asgItem(a) {
  const p = assignmentProgress(a), s = assignmentStatus(a), u = urgency(a);
  const due = a.dueDate ? `${relDay(a.dueDate)} ${fmtTime(a.dueTime || '23:59')}` : t('asg.noDue');
  return `<button class="item ${u}" data-act="asg.open" data-id="${a.id}">
    <span class="dot ${s}" title="${statusLabel(s)}"></span>
    <div class="grow"><div class="title ellipsis">${esc(a.title)}</div>
      <div class="sub ellipsis">${a.course ? `<span class="badge" style="background:${courseColorByKey(a.course)}22;color:${courseColorByKey(a.course)}">${esc(a.course)}</span> ` : ''}${u === 'overdue' ? `<b style="color:var(--red)">${t('asg.overdue')}</b> · ` : u === 'soon' ? `<b style="color:#C88A10">${t('asg.dueSoon')}</b> · ` : ''}${esc(due)}</div>
      ${a.subtasks?.length ? `<div class="progress ${s}" style="height:6px;margin-top:6px"><i style="width:${p * 100}%"></i></div>` : ''}</div>
    <div class="right">${a.subtasks?.length ? `${a.subtasks.filter((x) => x.done).length}/${a.subtasks.length}` : ''}${a.files?.length ? '<br>📎' + a.files.length : ''}</div></button>`;
}

function asgList() {
  let list = sortedAssignments();
  const courses = [...new Set(list.map((a) => a.course).filter(Boolean))];
  if (st.course) list = list.filter((a) => a.course === st.course);
  const counts = { active: list.filter((a) => !isComplete(a)).length, done: list.filter(isComplete).length, all: list.length };
  if (st.filter === 'active') list = list.filter((a) => !isComplete(a));
  if (st.filter === 'done') list = list.filter(isComplete);
  const total = S().assignments.length, done = S().assignments.filter(isComplete).length;
  return `${total ? `<div class="card has-peek" style="margin-bottom:12px">${peekPig()}<div class="row"><div class="grow"><div class="bold">${t('asg.overall')}</div><div class="small muted">${t('asg.doneOf', { d: done, n: total })}</div></div><b style="color:var(--primary-ink);font-size:1.3rem">${Math.round(done / total * 100)}%</b></div><div class="progress" style="margin-top:8px"><i style="width:${done / total * 100}%"></i></div>
    <div class="row small muted" style="margin-top:10px;gap:12px;flex-wrap:wrap"><span><span class="dot red"></span> ${t('status.red')}</span><span><span class="dot yellow"></span> ${t('status.yellow')}</span><span><span class="dot green"></span> ${t('status.green')}</span></div></div>` : ''}
    <div class="chips">${['active', 'done', 'all'].map((f) => `<button class="chip ${st.filter === f ? 'on' : ''}" data-act="asg.filter" data-f="${f}">${t('filter.' + f)} ${counts[f]}</button>`).join('')}
    ${courses.length > 1 ? `<span style="width:1px;background:var(--line);flex:none"></span>${['', ...courses].map((c) => `<button class="chip ${st.course === c ? 'on' : ''}" data-act="asg.course" data-c="${esc(c)}">${c ? esc(c) : t('filter.allCourses')}</button>`).join('')}` : ''}</div>
    ${list.length ? `<div class="list">${list.map(asgItem).join('')}</div>` : `<div class="card">${empty(st.filter === 'done' ? t('asg.noneDone') : t('asg.none'))}<div class="center"><button class="btn primary" data-act="asg.add">＋ ${t('asg.add')}</button></div></div>`}`;
}

export function openAsgForm(a = {}) {
  const isNew = !a.id;
  const rec = { subtasks: [], files: [], remind: null, ...a };
  const subs = rec.subtasks.map((s) => ({ ...s }));
  attachCtx.ids = [...(rec.files || [])]; attachCtx.added = [];
  let saved = false;
  const subRow = (s) => `<div class="row" data-sid="${s.id}" style="margin-bottom:6px"><input class="input grow" data-sub value="${esc(s.title)}" placeholder="${esc(t('asg.subPh'))}"><button type="button" class="icon-btn" data-delsub>✕</button></div>`;
  const remindOpts = [{ value: '', label: t('remind.default') + ` (${remindLabel(S().settings.notif.assignmentLead)})` }, ...[60, 180, 360, 720, 1440, 2880, 4320, 10080].map((m) => ({ value: m, label: t('remind.before', { t: remindLabel(m) }) }))];
  const el = openSheet(`${sheetHead(isNew ? t('asg.add') : t('asg.edit'))}
    ${rec._heard ? `<div class="badge" style="margin-bottom:10px">🎤 “${esc(rec._heard)}”</div>` : ''}
    <form novalidate>${courseDatalist()}
      ${field(t('asg.title') + ' *', input('title', rec.title, `placeholder="${esc(t('asg.titlePh'))}" autofocus`))}
      ${field(t('asg.course'), input('course', rec.course, `list="course-dl" placeholder="${esc(t('asg.coursePh'))}"`))}
      <div class="field-row">${field(t('asg.dueDate') + ' *', input('dueDate', rec.dueDate || dkey(addDays(new Date(), 7)), 'type="date"'))}${field(t('asg.dueTime'), input('dueTime', rec.dueTime || '23:59', 'type="time"'))}</div>
      ${field(t('asg.desc'), `<textarea class="input" name="desc" placeholder="${esc(t('asg.descPh'))}">${esc(rec.desc)}</textarea>`)}
      <div class="field"><label>${t('asg.subtasks')}</label><div id="subs">${subs.map(subRow).join('')}</div>
        <div class="row wrap"><button type="button" class="btn sm" id="add-sub">＋ ${t('asg.addSub')}</button><button type="button" class="btn sm ghost" id="tpl-sub">✨ ${t('asg.template')}</button></div></div>
      ${field(t('asg.remind'), select('remind', remindOpts, rec.remind ?? ''))}
      <div class="field"><label>${t('asg.files')}</label><div id="att"></div>
        <div class="row wrap" style="margin-top:8px"><button type="button" class="btn sm" data-src="camera">📷 ${t('file.camera')}</button><button type="button" class="btn sm" data-src="image">🖼️ ${t('file.photo')}</button><button type="button" class="btn sm" data-src="any">📎 ${t('file.file')}</button></div></div>
      ${field(t('asg.notes'), `<textarea class="input" name="notes" placeholder="${esc(t('asg.notesPh'))}">${esc(rec.notes)}</textarea>`)}
      <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="asg.delete" data-id="${rec.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div>
    </form>`, { onClose: () => { if (!saved) attachCtx.added.forEach((id) => delFile(id)); attachCtx.ids = null; } });
  const att = el.querySelector('#att');
  const refreshAtt = () => { att.innerHTML = attachCtx.ids.length ? thumbsHTML(attachCtx.ids, { removable: true }) : `<div class="small muted">${t('file.none')}</div>`; hydrateThumbs(att); };
  attachCtx.refresh = refreshAtt; refreshAtt();
  el.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', async () => { const ids = await addAttachments(b.dataset.src); attachCtx.ids.push(...ids); attachCtx.added.push(...ids); refreshAtt(); }));
  const subsBox = el.querySelector('#subs');
  const addSub = (title = '') => { const s = { id: uid(), title, done: false }; subs.push(s); subsBox.insertAdjacentHTML('beforeend', subRow(s)); return subsBox.lastElementChild.querySelector('input'); };
  el.querySelector('#add-sub').addEventListener('click', () => addSub().focus());
  el.querySelector('#tpl-sub').addEventListener('click', () => ['asg.tpl1', 'asg.tpl2', 'asg.tpl3', 'asg.tpl4'].forEach((k) => addSub(t(k))));
  subsBox.addEventListener('click', (e) => { const b = e.target.closest('[data-delsub]'); if (b) { const row = b.closest('[data-sid]'); subs.splice(subs.findIndex((s) => s.id === row.dataset.sid), 1); row.remove(); } });
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, v = formData(f);
    if (!v.title) return fieldError(f, 'title', t('err.required'));
    if (!v.dueDate) return fieldError(f, 'dueDate', t('err.required'));
    subsBox.querySelectorAll('[data-sid]').forEach((row) => { const s = subs.find((x) => x.id === row.dataset.sid); if (s) s.title = row.querySelector('input').value.trim(); });
    const finalSubs = subs.filter((s) => s.title);
    const out = { ...rec, ...v, remind: v.remind === '' ? null : Number(v.remind), subtasks: finalSubs, files: [...attachCtx.ids], id: rec.id || uid() };
    delete out._heard;
    if (isNew) { out.createdAt = Date.now(); S().assignments.push(out); } else Object.assign(S().assignments.find((x) => x.id === rec.id), out);
    saved = true;
    commit('asg'); reschedule(); closeSheet();
    toast(isNew ? t('asg.added') : t('common.saved'));
    rerender();
    if (!isNew) openAsgDetail(out.id);
  });
}

function asgDetailHTML(a) {
  const p = assignmentProgress(a), s = assignmentStatus(a), u = urgency(a);
  return `${sheetHead(a.title)}
    <div class="row wrap" style="margin-bottom:10px"><span class="badge ${s}"><span class="dot ${s}"></span> ${statusLabel(s)}</span>${a.course ? `<span class="badge">${esc(a.course)}</span>` : ''}${u ? `<span class="badge ${u === 'overdue' ? 'red' : 'yellow'}">${t(u === 'overdue' ? 'asg.overdue' : 'asg.dueSoon')}</span>` : ''}</div>
    <div class="card" style="margin-bottom:12px"><div class="row"><div class="grow"><div class="small muted bold">${t('asg.due')}</div><div class="bold">${a.dueDate ? fmtDate(a.dueDate, { weekday: true }) + ' ' + fmtTime(a.dueTime || '23:59') : t('asg.noDue')}</div>
      ${a.dueDate && !isComplete(a) ? `<div class="small" style="color:${u === 'overdue' ? 'var(--red)' : 'var(--primary)'}">${u === 'overdue' ? t('asg.overdueBy', { t: fmtCountdown(Date.now() - dueAt(a)) }) : t('asg.leftTime', { t: fmtCountdown(dueAt(a) - Date.now()) })}</div>` : ''}</div>
      <b style="font-size:1.6rem;color:var(--${s === 'green' ? 'green' : s === 'yellow' ? 'yellow' : 'red'})">${Math.round(p * 100)}%</b></div>
      <div class="progress ${s}" style="margin-top:8px"><i style="width:${p * 100}%"></i></div></div>
    <div class="card" style="margin-bottom:12px"><div class="card-title"><span class="grow">${t('asg.subtasks')}</span><span class="small muted">${a.subtasks.filter((x) => x.done).length}/${a.subtasks.length}</span></div>
      ${a.subtasks.map((x) => `<div class="subtask ${x.done ? 'done' : ''}"><button class="check ${x.done ? 'on' : ''}" data-act="sub.toggle" data-id="${a.id}" data-sid="${x.id}">✓</button><span class="st-title grow">${esc(x.title)}</span><button class="btn ghost sm" data-act="sub.del" data-id="${a.id}" data-sid="${x.id}" aria-label="${t('common.delete')}">✕</button></div>`).join('') || `<div class="small muted">${t('asg.noSubs')}</div>`}
      <form class="row" style="margin-top:10px" data-subform="${a.id}"><input class="input grow" name="sub" placeholder="${esc(t('asg.subPh'))}"><button class="btn sm primary">＋</button></form></div>
    ${a.desc ? `<div class="card" style="margin-bottom:12px"><div class="card-title">${t('asg.desc')}</div><div class="prose" style="white-space:pre-wrap">${esc(a.desc)}</div></div>` : ''}
    ${a.files?.length ? `<div class="card" style="margin-bottom:12px"><div class="card-title">${t('asg.files')}</div>${thumbsHTML(a.files)}</div>` : ''}
    ${a.notes ? `<div class="card" style="margin-bottom:12px"><div class="card-title">${t('asg.notes')}</div><div class="prose" style="white-space:pre-wrap">${esc(a.notes)}</div></div>` : ''}
    <div class="sheet-actions">${!a.subtasks.length ? `<button class="btn ${a.done ? '' : 'primary'}" data-act="asg.toggleDone" data-id="${a.id}">${a.done ? t('asg.markUndone') : '✓ ' + t('asg.markDone')}</button>` : !isComplete(a) ? `<button class="btn" data-act="asg.allDone" data-id="${a.id}">✓ ${t('asg.allDone')}</button>` : ''}<button class="btn" data-act="focus.for" data-label="${esc(a.course || a.title)}">⏱️</button><button class="btn primary" data-act="asg.edit" data-id="${a.id}">${t('common.edit')}</button></div>`;
}

export function openAsgDetail(id) {
  const a = S().assignments.find((x) => x.id === id);
  if (!a) return;
  const el = openSheet(asgDetailHTML(a));
  bindDetail(el, a);
}
function bindDetail(el, a) {
  hydrateThumbs(el);
  el.querySelector('[data-subform]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = e.target.sub.value.trim(); if (!v) return;
    a.subtasks.push({ id: uid(), title: v, done: false });
    if (a.completedAt) a.completedAt = null;
    commit('asg'); refreshDetail(a.id);
    topSheet()?.querySelector('[name=sub]')?.focus();
  });
}
function refreshDetail(id) {
  const el = topSheet(); const a = S().assignments.find((x) => x.id === id);
  if (!el || !a) return;
  const scroll = el.scrollTop;
  el.innerHTML = '<div class="grab"></div>' + asgDetailHTML(a);
  el.scrollTop = scroll;
  bindDetail(el, a);
  rerender();
}
function afterProgress(a, before) {
  if (!before && isComplete(a)) {
    a.completedAt = Date.now();
    celebrate(); toast(t('asg.complete'));
    const s = S().settings.sound; if (s.app) import('../native.js').then((n) => n.playSound('coin'));
  } else if (!isComplete(a)) a.completedAt = null;
  commit('asg'); reschedule(); refreshDetail(a.id);
}

// ================= Exams =================
function examCard(e) {
  const n = examDaysLeft(e), past = examAt(e) < new Date();
  const p = examPlanProgress(e);
  const big = past ? t('exam.done') : n === 0 ? t('exam.today') : n;
  return `<button class="item" data-act="exam.open" data-id="${e.id}" style="align-items:stretch">
    <div style="min-width:64px;text-align:center;background:var(--card);border-radius:14px;padding:8px 4px;flex:none"><div style="font-size:${typeof big === 'number' ? '1.7rem' : '1rem'};font-weight:900;color:${n <= 3 && !past ? 'var(--red)' : 'var(--primary)'}">${big}</div><div class="tiny muted bold">${typeof big === 'number' ? t('exam.daysLeft') : ''}</div></div>
    <div class="grow"><div class="title ellipsis">${esc(e.course)}</div><div class="sub">${fmtDate(e.date, { weekday: true })} ${fmtTime(e.time || '09:00')}${e.location ? ' · ' + esc(e.location) : ''}</div>
    ${e.plan?.length ? `<div class="row" style="margin-top:6px"><div class="progress grow" style="height:6px"><i style="width:${p * 100}%"></i></div><span class="tiny muted">${t('exam.planPct', { p: Math.round(p * 100) })}</span></div>` : `<div class="tiny muted" style="margin-top:6px">${t('exam.noPlan')}</div>`}</div></button>`;
}

function examList() {
  const all = sortedExams();
  const up = all.filter((e) => examAt(e) >= new Date(Date.now() - 3 * 3600000));
  const past = all.filter((e) => !up.includes(e)).reverse();
  return `${up.length ? `<div class="list">${up.map(examCard).join('')}</div>` : `<div class="card">${empty(t('exam.none'))}<div class="center"><button class="btn primary" data-act="exam.add">＋ ${t('exam.add')}</button></div></div>`}
    ${past.length ? `<details style="margin-top:16px"><summary class="bold muted">${t('exam.past')} (${past.length})</summary><div class="list" style="margin-top:8px">${past.map(examCard).join('')}</div></details>` : ''}`;
}

export function openExamForm(e = {}) {
  const isNew = !e.id;
  const rec = { remindDays: [...S().settings.notif.examDays], plan: [], goalHours: '', ...e };
  const dayChoices = [14, 7, 5, 3, 2, 1];
  const el = openSheet(`${sheetHead(isNew ? t('exam.add') : t('exam.edit'))}
    ${rec._heard ? `<div class="badge" style="margin-bottom:10px">🎤 “${esc(rec._heard)}”</div>` : ''}
    <form novalidate>${courseDatalist()}
      ${field(t('exam.course') + ' *', input('course', rec.course, `list="course-dl" placeholder="${esc(t('exam.coursePh'))}" autofocus`))}
      <div class="field-row">${field(t('exam.date') + ' *', input('date', rec.date || dkey(addDays(new Date(), 14)), 'type="date"'))}${field(t('exam.time'), input('time', rec.time || '09:00', 'type="time"'))}</div>
      ${field(t('exam.location'), input('location', rec.location, `placeholder="${esc(t('exam.locationPh'))}"`))}
      ${field(t('exam.goalHours'), input('goalHours', rec.goalHours, 'type="number" min="0" step="1" placeholder="10"'))}
      <div class="field"><label>${t('exam.remindDays')}</label><div class="chips" id="rdays">${dayChoices.map((d) => `<button type="button" class="chip ${rec.remindDays.includes(d) ? 'on' : ''}" data-d="${d}">${t('exam.dBefore', { n: d })}</button>`).join('')}</div></div>
      ${field(t('exam.notes'), `<textarea class="input" name="notes" placeholder="${esc(t('exam.notesPh'))}">${esc(rec.notes)}</textarea>`)}
      <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="exam.delete" data-id="${rec.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div>
    </form>`);
  el.querySelector('#rdays').addEventListener('click', (ev) => { const b = ev.target.closest('[data-d]'); if (b) b.classList.toggle('on'); });
  el.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target, v = formData(f);
    if (!v.course) return fieldError(f, 'course', t('err.required'));
    if (!v.date) return fieldError(f, 'date', t('err.required'));
    v.remindDays = [...el.querySelectorAll('#rdays .on')].map((b) => +b.dataset.d);
    const out = { ...rec, ...v, id: rec.id || uid() };
    delete out._heard;
    if (isNew) S().exams.push(out); else Object.assign(S().exams.find((x) => x.id === rec.id), out);
    commit('exam'); reschedule(); closeSheet(); toast(isNew ? t('exam.added') : t('common.saved')); rerender();
    openExamDetail(out.id);
  });
}

function examDetailHTML(e) {
  const n = examDaysLeft(e), past = examAt(e) < new Date();
  const studied = S().focusLog.filter((f) => f.label && f.label === e.course).reduce((a, f) => a + f.minutes, 0);
  const goal = Number(e.goalHours) || 0;
  const p = examPlanProgress(e);
  return `${sheetHead(e.course)}
    <div class="card center" style="margin-bottom:12px"><div class="small muted bold">${past ? t('exam.done') : t('exam.countdown')}</div>
      <div class="big-count" style="color:${n <= 3 && !past ? 'var(--red)' : 'var(--primary)'}">${past ? '✓' : n === 0 ? t('exam.today') : n}</div>
      ${!past && n > 0 ? `<div class="small muted bold">${t('exam.daysLeft')} · ${fmtCountdown(examAt(e) - Date.now())}</div>` : ''}
      <div style="margin-top:8px" class="bold">${fmtDate(e.date, { weekday: true })} ${fmtTime(e.time || '09:00')}</div>${e.location ? `<div class="small muted">📍 ${esc(e.location)}</div>` : ''}</div>
    <div class="card" style="margin-bottom:12px"><div class="card-title"><span class="grow">⏱️ ${t('exam.studyTime')}</span><button class="btn sm" data-act="focus.for" data-label="${esc(e.course)}">${t('focus.start')}</button></div>
      <div class="row"><b class="grow">${fmtDuration(studied)}${goal ? ` / ${fmtDuration(goal * 60)}` : ''}</b>${goal ? `<span class="small muted">${Math.min(100, Math.round(studied / (goal * 60) * 100))}%</span>` : ''}</div>
      ${goal ? `<div class="progress" style="margin-top:8px"><i style="width:${Math.min(100, studied / (goal * 60) * 100)}%"></i></div>` : `<div class="tiny muted">${t('exam.goalHint')}</div>`}</div>
    <div class="card" style="margin-bottom:12px"><div class="card-title"><span class="grow">📖 ${t('exam.studyPlan')}</span><span class="small muted">${Math.round(p * 100)}%</span></div>
      ${e.plan?.length ? `<div class="progress" style="margin-bottom:8px"><i style="width:${p * 100}%"></i></div>` : ''}
      ${(e.plan || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((x) => `<div class="subtask ${x.done ? 'done' : ''}"><button class="check ${x.done ? 'on' : ''}" data-act="plan.toggle" data-id="${e.id}" data-pid="${x.id}">✓</button><div class="grow"><div class="st-title">${esc(x.title)}</div>${x.date ? `<div class="tiny muted">${fmtDate(x.date, { short: true })} · ${relDay(x.date)}</div>` : ''}</div><button class="btn ghost sm" data-act="plan.del" data-id="${e.id}" data-pid="${x.id}">✕</button></div>`).join('') || `<div class="small muted">${t('exam.noPlanLong')}</div>`}
      <form class="col" style="margin-top:10px" data-planform="${e.id}"><input class="input" name="title" placeholder="${esc(t('exam.planPh'))}"><div class="row"><input class="input grow" type="date" name="date" value="${dkey()}"><button class="btn primary">＋</button></div></form>
      ${!past ? `<button class="btn block" style="margin-top:10px" data-act="plan.auto" data-id="${e.id}">✨ ${t('exam.autoPlan')}</button>` : ''}</div>
    ${e.notes ? `<div class="card" style="margin-bottom:12px"><div class="card-title">${t('exam.notes')}</div><div class="prose" style="white-space:pre-wrap">${esc(e.notes)}</div></div>` : ''}
    <div class="sheet-actions"><button class="btn danger" data-act="exam.delete" data-id="${e.id}">${t('common.delete')}</button><button class="btn primary" data-act="exam.edit" data-id="${e.id}">${t('common.edit')}</button></div>`;
}
export function openExamDetail(id) {
  const e = S().exams.find((x) => x.id === id);
  if (!e) return;
  bindExam(openSheet(examDetailHTML(e)), e);
}
function bindExam(el, e) {
  el.querySelector('[data-planform]')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = ev.target.title.value.trim(); if (!title) return;
    (e.plan = e.plan || []).push({ id: uid(), title, date: ev.target.date.value, done: false });
    commit('exam'); reschedule(); refreshExam(e.id);
  });
}
function refreshExam(id) {
  const el = topSheet(); const e = S().exams.find((x) => x.id === id);
  if (!el || !e) return;
  const sc = el.scrollTop; el.innerHTML = '<div class="grab"></div>' + examDetailHTML(e); el.scrollTop = sc; bindExam(el, e); rerender();
}

// ================= To-dos =================
function todoList() {
  const list = sortedTodos();
  const active = list.filter((x) => !x.done), done = list.filter((x) => x.done);
  const pri = [{ value: 'high', label: t('pri.high') }, { value: 'med', label: t('pri.med') }, { value: 'low', label: t('pri.low') }];
  return `<form class="card" id="todo-quick" style="margin-bottom:12px"><div class="row"><input class="input grow" name="title" placeholder="${esc(t('todo.quickPh'))}"><button class="btn primary">＋</button></div>
      <div class="row" style="margin-top:8px">${select('priority', pri, 'med', 'style="flex:1"')}<input class="input" type="date" name="due" style="flex:1"></div></form>
    ${active.length ? `<div class="list">${active.map(todoItem).join('')}</div>` : `<div class="card">${empty(t('todo.none'), 'cheer')}</div>`}
    ${done.length ? `<details style="margin-top:16px" ${st.showDone ? 'open' : ''} data-act="todo.showDone"><summary class="bold muted">${t('todo.done')} (${done.length})</summary><div class="list" style="margin-top:8px">${done.map(todoItem).join('')}</div>
      <button class="btn sm ghost" style="margin-top:8px" data-act="todo.clearDone">${t('todo.clearDone')}</button></details>` : ''}`;
}
const todoItem = (x) => `<div class="item ${x.done ? 'done' : ''}"><button class="check round ${x.done ? 'on' : ''}" data-act="todo.toggle" data-id="${x.id}" aria-label="${t('common.done')}">✓</button>
  <button class="grow" style="text-align:left" data-act="todo.edit" data-id="${x.id}"><div class="title">${esc(x.title)}</div><div class="sub"><span class="pri-${x.priority}">●</span> ${t('pri.' + x.priority)}${x.due ? ' · ' + relDay(x.due) : ''}</div></button></div>`;

export function openTodoForm(x = {}) {
  const isNew = !x.id;
  const pri = [{ value: 'high', label: t('pri.high') }, { value: 'med', label: t('pri.med') }, { value: 'low', label: t('pri.low') }];
  const el = openSheet(`${sheetHead(isNew ? t('todo.add') : t('todo.edit'))}
    ${x._heard ? `<div class="badge" style="margin-bottom:10px">🎤 “${esc(x._heard)}”</div>` : ''}
    <form novalidate>${field(t('todo.title') + ' *', input('title', x.title, 'autofocus'))}
    <div class="field-row">${field(t('todo.priority'), select('priority', pri, x.priority || 'med'))}${field(t('todo.due'), input('due', x.due || '', 'type="date"'))}</div>
    <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="todo.delete" data-id="${x.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div></form>`);
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title) return fieldError(e.target, 'title', t('err.required'));
    if (isNew) S().todos.push({ id: uid(), done: false, createdAt: Date.now(), ...v });
    else Object.assign(S().todos.find((y) => y.id === x.id), v);
    commit('todo'); reschedule(); closeSheet(); toast(t('common.saved')); rerender();
  });
}

// ================= Actions =================
on({
  'tasks.tab': (el) => { st.tab = el.dataset.tab; rerender(); },
  'asg.filter': (el) => { st.filter = el.dataset.f; rerender(); },
  'asg.course': (el) => { st.course = el.dataset.c; rerender(); },
  'asg.add': () => { closeSheet(); openAsgForm(); },
  'asg.addFor': (el) => { closeSheet(); openAsgForm({ course: el.dataset.course }); },
  'asg.voice': async () => { const p = await voiceParse('assignment'); if (p) openAsgForm(p); },
  'asg.open': (el) => { closeSheet(); openAsgDetail(el.dataset.id); },
  'asg.edit': (el) => { const a = S().assignments.find((x) => x.id === el.dataset.id); closeSheet(); openAsgForm(a); },
  'asg.delete': async (el) => {
    const a = S().assignments.find((x) => x.id === el.dataset.id);
    if (!a || !(await confirmDialog(t('asg.deleteMsg', { name: a.title }), { danger: true, ok: t('common.delete') }))) return;
    for (const f of a.files || []) await delFile(f);
    S().assignments = S().assignments.filter((x) => x.id !== a.id);
    commit('asg'); reschedule(); closeSheet(); toast(t('common.deleted')); rerender();
  },
  'asg.toggleDone': (el) => { const a = S().assignments.find((x) => x.id === el.dataset.id); const b = isComplete(a); a.done = !a.done; afterProgress(a, b); },
  'asg.allDone': (el) => { const a = S().assignments.find((x) => x.id === el.dataset.id); const b = isComplete(a); a.subtasks.forEach((s) => (s.done = true)); afterProgress(a, b); },
  'sub.toggle': (el) => { const a = S().assignments.find((x) => x.id === el.dataset.id); const b = isComplete(a); const s = a.subtasks.find((x) => x.id === el.dataset.sid); s.done = !s.done; tap(); afterProgress(a, b); },
  'sub.del': (el) => { const a = S().assignments.find((x) => x.id === el.dataset.id); const b = isComplete(a); a.subtasks = a.subtasks.filter((x) => x.id !== el.dataset.sid); afterProgress(a, b); },
  'exam.add': () => { closeSheet(); openExamForm(); },
  'exam.voice': async () => { const p = await voiceParse('exam'); if (p) openExamForm(p); },
  'exam.open': (el) => { closeSheet(); openExamDetail(el.dataset.id); },
  'exam.edit': (el) => { const e = S().exams.find((x) => x.id === el.dataset.id); closeSheet(); openExamForm(e); },
  'exam.delete': async (el) => {
    const e = S().exams.find((x) => x.id === el.dataset.id);
    if (!e || !(await confirmDialog(t('exam.deleteMsg', { name: e.course }), { danger: true, ok: t('common.delete') }))) return;
    S().exams = S().exams.filter((x) => x.id !== e.id);
    commit('exam'); reschedule(); closeSheet(); toast(t('common.deleted')); rerender();
  },
  'plan.toggle': (el) => { const e = S().exams.find((x) => x.id === el.dataset.id); const p = e.plan.find((x) => x.id === el.dataset.pid); p.done = !p.done; tap(); if (p.done) celebrate(undefined, undefined, 4); commit('exam'); reschedule(); refreshExam(e.id); },
  'plan.del': (el) => { const e = S().exams.find((x) => x.id === el.dataset.id); e.plan = e.plan.filter((x) => x.id !== el.dataset.pid); commit('exam'); reschedule(); refreshExam(e.id); },
  'plan.auto': async (el) => {
    const e = S().exams.find((x) => x.id === el.dataset.id);
    const days = daysBetween(new Date(), parseDate(e.date));
    if (days < 1) return toast(t('exam.tooClose'), 'err');
    if (e.plan?.length && !(await confirmDialog(t('exam.autoPlanMsg')))) return;
    const n = Math.min(6, days);
    const steps = ['exam.auto1', 'exam.auto2', 'exam.auto3', 'exam.auto4', 'exam.auto5', 'exam.auto6'].slice(6 - n);
    e.plan = (e.plan || []).concat(steps.map((k, i) => ({ id: uid(), title: t(k), date: dkey(addDays(new Date(), Math.max(0, Math.round((days - 1) * i / Math.max(1, n - 1))))), done: false })));
    commit('exam'); reschedule(); refreshExam(e.id); toast(t('exam.autoDone', { n }));
  },
  'todo.add': () => openTodoForm(),
  'todo.voice': async () => { const p = await voiceParse('todo'); if (p) openTodoForm(p); },
  'todo.edit': (el) => openTodoForm(S().todos.find((x) => x.id === el.dataset.id)),
  'todo.toggle': (el) => {
    const x = S().todos.find((y) => y.id === el.dataset.id); if (!x) return;
    x.done = !x.done; x.doneAt = x.done ? Date.now() : null;
    if (x.done) { const r = el.getBoundingClientRect(); celebrate(r.left + 12, r.top, 4); tap(); }
    commit('todo'); reschedule(); rerender();
  },
  'todo.delete': async (el) => { if (!(await confirmDialog(t('todo.deleteMsg'), { danger: true, ok: t('common.delete') }))) return; S().todos = S().todos.filter((x) => x.id !== el.dataset.id); commit('todo'); reschedule(); closeSheet(); rerender(); },
  'todo.clearDone': async () => { if (!(await confirmDialog(t('todo.clearMsg'), { danger: true }))) return; S().todos = S().todos.filter((x) => !x.done); commit('todo'); rerender(); },
  'todo.showDone': (el) => { setTimeout(() => (st.showDone = el.open), 0); },
});

export function mount(root) {
  root.querySelector('#todo-quick')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title) return;
    S().todos.push({ id: uid(), done: false, createdAt: Date.now(), ...v });
    commit('todo'); reschedule(); rerender(); tap();
    setTimeout(() => document.querySelector('#todo-quick [name=title]')?.focus(), 30);
  });
}
