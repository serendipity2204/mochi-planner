// Timetable & calendar: day / week / month views, course CRUD, OCR import, voice input.
import { store, commit } from '../store.js';
import { t, fmtTime, fmtDate, weekdayShort, weekdayLong, monthName, lang, relDay } from '../i18n.js';
import { esc, uid, dkey, parseDate, addDays, startOfDay, toMin, weekStart, COURSE_COLORS, colorFor } from '../utils.js';
import { on, go, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, formData, fieldError, field, input, select, empty, loading, pickFiles, tap, $ } from '../ui.js';
import { classesOn, findConflicts, courseColor, eventsOn, isComplete, assignmentStatus, examDaysLeft, courseColorByKey } from '../data.js';
import { parseTimetableText } from '../parse.js';
import { voiceParse } from '../voice.js';
import { reschedule } from '../reminders.js';

const st = { view: null, date: dkey() };
const S = () => store.state;

const reminderOpts = () => [{ value: '', label: t('remind.default') }, { value: -1, label: t('remind.none') }, ...[0, 5, 10, 15, 30, 60, 120, 180, 1440].map((m) => ({ value: m, label: t('remind.before', { t: remindLabel(m) }) }))];
export const remindLabel = (m) => (m === 0 ? t('remind.atTime') : m < 60 ? t('unit.min', { n: m }) : m % 1440 === 0 ? t('unit.day', { n: m / 1440 }) : t('unit.hour', { n: m / 60 }));

// Pick a colour not yet used by another course (same code keeps its colour)
function nextColor(key) {
  const same = S().courses.find((c) => (c.code || c.name) === key && c.color);
  if (same) return same.color;
  const used = new Set(S().courses.map((c) => c.color));
  return COURSE_COLORS.find((c) => !used.has(c)) || colorFor(key);
}
const dayOrder = () => { const s = S().settings.cal.weekStart; return [0, 1, 2, 3, 4, 5, 6].map((i) => (i + s) % 7); };

export function render(params = {}) {
  if (params.view) st.view = params.view;
  if (params.date) st.date = params.date;
  if (!st.view) st.view = S().settings.cal.view || 'week';
  const d = parseDate(st.date);
  let label;
  if (st.view === 'month') label = lang() === 'zh' ? `${d.getFullYear()}年${d.getMonth() + 1}月` : `${monthName(d.getMonth())} ${d.getFullYear()}`;
  else if (st.view === 'week') { const ws = weekStart(d, S().settings.cal.weekStart); label = `${fmtDate(ws, { short: true })} – ${fmtDate(addDays(ws, 6), { short: true })}`; }
  else label = `${fmtDate(d, { short: true })} ${weekdayLong(d.getDay())}`;
  const body = st.view === 'month' ? monthView(d) : st.view === 'week' ? weekView(d) : dayView(d);
  return `<div class="page">
    <div class="topbar"><h1>${t('nav.schedule')}</h1>
      <button class="icon-btn" data-act="course.list" aria-label="${t('course.all')}">📚</button>
      <button class="icon-btn" data-act="course.ocr" aria-label="${t('course.scan')}">📷</button>
      <button class="icon-btn" data-act="course.voice" aria-label="${t('course.voice')}">🎤</button>
      <button class="icon-btn" data-act="course.add" aria-label="${t('course.add')}" style="background:var(--primary);color:#fff">＋</button></div>
    <div class="seg" style="margin-bottom:12px">${['day', 'week', 'month'].map((v) => `<button class="${st.view === v ? 'on' : ''}" data-act="sch.view" data-v="${v}">${t('cal.' + v)}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:12px"><button class="icon-btn" data-act="sch.nav" data-d="-1">‹</button><div class="grow center bold">${esc(label)}</div><button class="btn sm" data-act="sch.today">${t('rel.today')}</button><button class="icon-btn" data-act="sch.nav" data-d="1">›</button></div>
    ${body}
  </div>`;
}

function weekStrip(d) {
  const ws = weekStart(d, S().settings.cal.weekStart);
  return `<div class="weekstrip">${[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const x = addDays(ws, i); const e = eventsOn(x);
    const has = e.classes.length + e.assignments.length + e.exams.length > 0;
    return `<button class="${dkey(x) === dkey() ? 'today' : ''} ${dkey(x) === dkey(d) ? 'sel' : ''}" data-act="sch.pick" data-date="${dkey(x)}">${weekdayShort(x.getDay())}<b>${x.getDate()}</b><i class="${has ? 'has' : ''}"></i></button>`;
  }).join('')}</div>`;
}

export function dayList(d, { compact = false } = {}) {
  const e = eventsOn(d);
  const rows = [];
  for (const c of e.classes) rows.push(`<button class="item" data-act="course.open" data-id="${c.id}"><span class="bar" style="background:${courseColor(c)}"></span><div class="grow"><div class="title ellipsis">${esc(c.name || c.code)}</div><div class="sub ellipsis">${esc([c.code, c.location, c.lecturer].filter(Boolean).join(' · '))}</div></div><div class="right"><b style="color:var(--text)">${fmtTime(c.start)}</b><br>${fmtTime(c.end)}</div></button>`);
  for (const x of e.exams) rows.push(`<button class="item" data-act="exam.open" data-id="${x.id}"><span class="bar" style="background:var(--red)"></span><div class="grow"><div class="title">📝 ${esc(x.course)}</div><div class="sub">${t('exam.exam')} · ${esc(x.location || '')}</div></div><div class="right"><b style="color:var(--red)">${fmtTime(x.time || '09:00')}</b></div></button>`);
  for (const a of e.assignments) rows.push(`<button class="item" data-act="asg.open" data-id="${a.id}"><span class="dot ${assignmentStatus(a)}"></span><div class="grow"><div class="title ellipsis">${esc(a.title)}</div><div class="sub">${t('asg.due')} ${fmtTime(a.dueTime || '23:59')} ${a.course ? '· ' + esc(a.course) : ''}</div></div></button>`);
  for (const p of e.plan) rows.push(`<button class="item ${p.done ? 'done' : ''}" data-act="exam.open" data-id="${p.exam.id}"><span>📖</span><div class="grow"><div class="title ellipsis">${esc(p.title)}</div><div class="sub">${t('exam.studyPlan')} · ${esc(p.exam.course)}</div></div></button>`);
  for (const td of e.todos) rows.push(`<div class="item ${td.done ? 'done' : ''}"><button class="check round ${td.done ? 'on' : ''}" data-act="todo.toggle" data-id="${td.id}">✓</button><div class="grow title">${esc(td.title)}</div></div>`);
  if (!rows.length) return compact ? `<div class="empty">${t('cal.free')}</div>` : empty(t('cal.free'), 'sleep');
  return `<div class="list">${rows.join('')}</div>`;
}

function dayView(d) {
  return `${weekStrip(d)}<div class="card"><div class="card-title"><span class="grow">${relDay(d)} · ${weekdayLong(d.getDay())}</span></div>${dayList(d)}</div>`;
}

function weekView(d) {
  const ws = weekStart(d, S().settings.cal.weekStart);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(ws, i));
  let startH = S().settings.cal.dayStart, endH = S().settings.cal.dayEnd;
  for (const x of days) for (const c of classesOn(x)) { startH = Math.min(startH, Math.floor(toMin(c.start) / 60)); endH = Math.max(endH, Math.ceil(toMin(c.end) / 60)); }
  const H = 52, rows = endH - startH;
  const hours = Array.from({ length: rows }, (_, i) => `<div class="wg-hour" style="height:${H}px">${fmtTime(`${String(startH + i).padStart(2, '0')}:00`).replace(':00', '')}</div>`).join('');
  const now = new Date();
  const cols = days.map((x) => {
    const isToday = dkey(x) === dkey();
    // Lay out overlapping classes side by side
    const list = classesOn(x);
    const cols = [];
    const placed = list.map((c) => {
      let col = cols.findIndex((end) => end <= toMin(c.start));
      if (col < 0) { col = cols.length; cols.push(0); }
      cols[col] = toMin(c.end);
      return { c, col };
    });
    const evs = placed.map(({ c, col }) => {
      const group = placed.filter((o) => toMin(o.c.start) < toMin(c.end) && toMin(c.start) < toMin(o.c.end));
      const n = Math.max(...group.map((o) => o.col)) + 1;
      const top = (toMin(c.start) - startH * 60) / 60 * H, h = Math.max(24, (toMin(c.end) - toMin(c.start)) / 60 * H - 2);
      return `<button class="wg-ev ${n > 1 ? 'narrow' : ''}" data-act="course.open" data-id="${c.id}" style="top:${top}px;height:${h}px;left:calc(${col * 100 / n}% + 2px);right:auto;width:calc(${100 / n}% - 4px);background:${courseColor(c)}">${esc(c.code || c.name)}<small>${esc(c.location || '')}</small></button>`;
    }).join('');
    const exams = S().exams.filter((e) => e.date === dkey(x)).map((e) => {
      const m = toMin(e.time || '09:00'); const top = (m - startH * 60) / 60 * H;
      return top >= 0 && top < rows * H ? `<button class="wg-ev" data-act="exam.open" data-id="${e.id}" style="top:${top}px;height:${H - 4}px;background:var(--red)">📝 ${esc(e.course)}</button>` : '';
    }).join('');
    const nowLine = isToday ? (() => { const m = now.getHours() * 60 + now.getMinutes() - startH * 60; return m >= 0 && m <= rows * 60 ? `<div class="wg-now" style="top:${m / 60 * H}px"></div>` : ''; })() : '';
    const lines = Array.from({ length: rows }, (_, i) => `<div class="wg-line" style="top:${i * H}px"></div>`).join('');
    return `<div class="wg-col ${isToday ? 'today' : ''}" style="height:${rows * H}px" data-act="sch.pick" data-date="${dkey(x)}">${lines}${evs}${exams}${nowLine}</div>`;
  }).join('');
  const head = `<div class="wg-head"></div>` + days.map((x) => `<div class="wg-head ${dkey(x) === dkey() ? 'today' : ''}">${weekdayShort(x.getDay())}<b>${x.getDate()}</b></div>`).join('');
  const hasAny = days.some((x) => classesOn(x).length);
  return `<div class="week-grid">${head}<div class="wg-hours">${hours}</div>${cols}</div>
    ${hasAny ? '' : `<div class="card" style="margin-top:14px">${empty(t('course.emptyWeek'))}<div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn primary" data-act="course.add">＋ ${t('course.add')}</button><button class="btn" data-act="course.ocr">📷 ${t('course.scan')}</button></div></div>`}`;
}

function monthView(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const gs = weekStart(first, S().settings.cal.weekStart);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const x = addDays(gs, i);
    if (i >= 35 && x.getMonth() !== d.getMonth()) break;
    const e = eventsOn(x);
    const dots = [...e.classes.slice(0, 3).map((c) => courseColor(c)), ...e.assignments.slice(0, 2).map((a) => (isComplete(a) ? 'var(--green)' : 'var(--yellow)')), ...e.exams.map(() => 'var(--red)')]
      .map((c) => `<i style="background:${c}"></i>`).join('');
    cells.push(`<button class="mday ${x.getMonth() !== d.getMonth() ? 'out' : ''} ${dkey(x) === dkey() ? 'today' : ''} ${dkey(x) === st.date ? 'sel' : ''}" data-act="sch.pickm" data-date="${dkey(x)}">${x.getDate()}<span class="dots">${dots}</span></button>`);
  }
  return `<div class="grid-2"><div class="card"><div class="month-grid">${dayOrder().map((w) => `<div class="mh">${weekdayShort(w)}</div>`).join('')}${cells.join('')}</div>
    <div class="row small muted" style="margin-top:10px;gap:14px;flex-wrap:wrap"><span><span class="dot" style="background:var(--primary)"></span> ${t('cal.legendClass')}</span><span><span class="dot yellow"></span> ${t('cal.legendAsg')}</span><span><span class="dot red"></span> ${t('cal.legendExam')}</span></div></div>
    <div class="card"><div class="card-title">${fmtDate(st.date, { short: true })} ${weekdayLong(d.getDay())}</div>${dayList(d, { compact: true })}</div></div>`;
}

// ---------------- Course form ----------------
export function openCourseForm(course = {}, opts = {}) {
  const c = { days: [], color: '', remind: '', ...course };
  const isNew = !c.id;
  const swatches = COURSE_COLORS.map((col) => `<button type="button" class="dot" data-color="${col}" style="width:30px;height:30px;background:${col};border:3px solid ${c.color === col ? 'var(--text)' : 'transparent'}"></button>`).join('');
  const el = openSheet(`${sheetHead(isNew ? t('course.add') : t('course.edit'))}
    ${c._heard ? `<div class="badge" style="margin-bottom:10px">🎤 “${esc(c._heard)}”</div>` : ''}
    <form id="course-form" novalidate>
      ${field(t('course.name') + ' *', input('name', c.name, `placeholder="${esc(t('course.namePh'))}" autofocus`))}
      <div class="field-row">${field(t('course.code'), input('code', c.code, 'placeholder="MAT101" autocapitalize="characters"'))}${field(t('course.location'), input('location', c.location, `placeholder="${esc(t('course.locationPh'))}"`))}</div>
      <div class="field-row">${field(t('course.start') + ' *', input('start', c.start || '09:00', 'type="time"'))}${field(t('course.end') + ' *', input('end', c.end || '11:00', 'type="time"'))}</div>
      <div class="field"><label>${t('course.days')} *</label><div class="daypick" id="daypick">${dayOrder().map((w) => `<button type="button" data-day="${w}" class="${c.days.includes(w) ? 'on' : ''}">${weekdayShort(w)}</button>`).join('')}</div></div>
      ${field(t('course.lecturer'), input('lecturer', c.lecturer, `placeholder="${esc(t('course.lecturerPh'))}"`))}
      <div class="field-row">${field(t('course.startDate'), input('startDate', c.startDate || '', 'type="date"'))}${field(t('course.endDate'), input('endDate', c.endDate || '', 'type="date"'))}</div>
      <div class="tiny muted" style="margin:-6px 0 12px">${t('course.repeatHint')}</div>
      ${field(t('course.remind'), select('remind', reminderOpts(), c.remind ?? ''))}
      <div class="field"><label>${t('course.color')}</label><div class="row wrap" id="swatches">${swatches}</div></div>
      <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="course.delete" data-id="${c.id}">${t('common.delete')}</button>`}<button class="btn primary" type="submit">${t('common.save')}</button></div>
    </form>`);
  let color = c.color;
  el.querySelector('#daypick').addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { b.classList.toggle('on'); tap(); } });
  el.querySelector('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    color = b.dataset.color; el.querySelectorAll('[data-color]').forEach((x) => (x.style.borderColor = x === b ? 'var(--text)' : 'transparent'));
  });
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, v = formData(f);
    v.days = [...el.querySelectorAll('#daypick .on')].map((b) => +b.dataset.day).sort();
    if (!v.name && !v.code) return fieldError(f, 'name', t('err.required'));
    if (!v.name) v.name = v.code;
    if (!v.start || !v.end) return fieldError(f, 'start', t('err.required'));
    if (toMin(v.end) <= toMin(v.start)) return fieldError(f, 'end', t('err.endAfterStart'));
    if (!v.days.length) { toast(t('err.pickDay'), 'err'); return; }
    if (v.startDate && v.endDate && v.endDate < v.startDate) return fieldError(f, 'endDate', t('err.endAfterStart'));
    v.code = v.code.toUpperCase();
    v.remind = v.remind === '' ? null : Number(v.remind);
    const rec = { ...c, ...v, color: color || c.color || nextColor(v.code || v.name), id: c.id || uid() };
    delete rec._heard;
    const conflicts = findConflicts(rec);
    if (conflicts.length) {
      const names = conflicts.map((x) => `${x.course.code || x.course.name} (${x.days.map(weekdayShort).join('/')} ${fmtTime(x.course.start)}-${fmtTime(x.course.end)})`).join('\n');
      const ok = await confirmDialog(t('course.conflictMsg', { list: names }), { title: t('course.conflict'), ok: t('course.saveAnyway') });
      if (!ok) return;
    }
    if (isNew) S().courses.push(rec); else Object.assign(S().courses.find((x) => x.id === c.id), rec);
    commit('course'); reschedule();
    closeSheet();
    toast(isNew ? t('course.added') : t('common.saved'));
    opts.onSaved?.(rec);
    rerender();
  });
}

function openCourse(id) {
  const c = S().courses.find((x) => x.id === id);
  if (!c) return;
  const related = S().assignments.filter((a) => a.course && (a.course === c.code || a.course === c.name));
  const exams = S().exams.filter((e) => e.course === c.code || e.course === c.name);
  const row = (ic, label, val) => (val ? `<div class="set-row"><span class="ic">${ic}</span><span class="label">${esc(label)}</span><span class="val">${esc(val)}</span></div>` : '');
  openSheet(`${sheetHead(c.name)}
    <div class="card" style="background:${courseColor(c)};color:#fff;border:0;margin-bottom:14px"><div class="bold" style="font-size:1.3rem">${esc(c.code || c.name)}</div><div>${c.days.map(weekdayLong).join('、')} · ${fmtTime(c.start)} – ${fmtTime(c.end)}</div></div>
    <div class="set-group">
      ${row('📍', t('course.location'), c.location)}${row('👩‍🏫', t('course.lecturer'), c.lecturer)}
      ${row('📅', t('course.period'), c.startDate || c.endDate ? `${c.startDate ? fmtDate(c.startDate) : '…'} → ${c.endDate ? fmtDate(c.endDate) : '…'}` : t('course.everyWeek'))}
      ${row('⏰', t('course.remind'), c.remind == null ? t('remind.default') + ` (${remindLabel(S().settings.notif.classLead)})` : c.remind < 0 ? t('remind.none') : remindLabel(c.remind))}
      ${row('📚', t('nav.tasks'), t('course.related', { a: related.length, e: exams.length }))}
    </div>
    <div class="sheet-actions"><button class="btn danger" data-act="course.delete" data-id="${c.id}">${t('common.delete')}</button><button class="btn" data-act="asg.addFor" data-course="${esc(c.code || c.name)}">＋ ${t('asg.short')}</button><button class="btn primary" data-act="course.edit" data-id="${c.id}">${t('common.edit')}</button></div>`);
}

function courseListSheet() {
  const list = [...S().courses].sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
  openSheet(`${sheetHead(t('course.all'))}
    ${list.length ? `<div class="list">${list.map((c) => `<button class="item" data-act="course.open" data-id="${c.id}"><span class="bar" style="background:${courseColor(c)}"></span><div class="grow"><div class="title">${esc(c.name)}</div><div class="sub">${esc(c.code || '')} · ${c.days.map(weekdayShort).join(' ')} ${fmtTime(c.start)}-${fmtTime(c.end)}</div></div><span class="chev"></span></button>`).join('')}</div>` : empty(t('course.none'))}
    <div class="sheet-actions"><button class="btn" data-act="course.ocr">📷 ${t('course.scan')}</button><button class="btn primary" data-act="course.add">＋ ${t('course.add')}</button></div>`);
}

// ---------------- OCR import ----------------
const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = TESS_URL; s.onload = res; s.onerror = () => rej(new Error('ocrLoad'));
    document.head.appendChild(s);
  });
}

async function startOCR() {
  closeSheet();
  const [file] = await pickFiles({ accept: 'image/*', multiple: false });
  if (!file) return;
  const url = URL.createObjectURL(file);
  let cancelled = false;
  const el = openSheet(`${sheetHead(t('ocr.title'))}<img src="${url}" style="width:100%;max-height:220px;object-fit:contain;border-radius:16px;background:var(--card-2)"><div id="ocr-status">${loading(t('ocr.loading'))}</div>`, { onClose: () => { cancelled = true; } });
  const status = (msg) => { const s = el.querySelector('#ocr-status .loading'); if (s) s.lastChild.textContent = msg; };
  try {
    if (!navigator.onLine) throw new Error('offlineOCR');
    await loadTesseract();
    status(t('ocr.recognizing', { p: 0 }));
    const worker = await window.Tesseract.createWorker(['eng', 'chi_sim'], 1, {
      logger: (m) => { if (m.status === 'recognizing text') status(t('ocr.recognizing', { p: Math.round(m.progress * 100) })); else if (/load/i.test(m.status)) status(t('ocr.loading')); },
    });
    const { data } = await worker.recognize(file);
    await worker.terminate();
    if (cancelled) return;
    closeSheet();
    openOCRReview(parseTimetableText(data.text || ''), data.text || '', url);
  } catch (e) {
    console.error(e);
    if (cancelled) return;
    el.querySelector('#ocr-status').innerHTML = `<div class="empty">${esc(t(['offlineOCR', 'ocrLoad'].includes(e.message) ? 'err.' + e.message : 'err.ocrFailed'))}</div><button class="btn block" data-act="course.add">＋ ${t('course.addManual')}</button>`;
  }
}

function ocrRow(r, i) {
  return `<div class="ocr-row" data-i="${i}">
    <div class="row" style="margin-bottom:8px"><button type="button" class="check on" data-act="ocr.toggle">✓</button><input class="input grow" data-k="name" value="${esc(r.name)}" placeholder="${esc(t('course.name'))}"><input class="input" style="width:110px" data-k="code" value="${esc(r.code)}" placeholder="${esc(t('course.code'))}"></div>
    <div class="row" style="margin-bottom:8px"><input class="input" type="time" data-k="start" value="${esc(r.start)}"><span>–</span><input class="input" type="time" data-k="end" value="${esc(r.end)}"></div>
    <div class="daypick" style="margin-bottom:8px">${dayOrder().map((w) => `<button type="button" data-day="${w}" class="${r.days.includes(w) ? 'on' : ''}">${weekdayShort(w)}</button>`).join('')}</div>
    <div class="row"><input class="input grow" data-k="location" value="${esc(r.location)}" placeholder="${esc(t('course.location'))}"><input class="input grow" data-k="lecturer" value="${esc(r.lecturer)}" placeholder="${esc(t('course.lecturer'))}"></div>
  </div>`;
}

function openOCRReview(rows, raw, imgUrl) {
  const el = openSheet(`${sheetHead(t('ocr.review'))}
    <p class="small muted" style="margin-top:0">${t(rows.length ? 'ocr.reviewHint' : 'ocr.nothing', { n: rows.length })}</p>
    <div class="field-row">${field(t('course.startDate'), '<input class="input" type="date" id="ocr-sd">')}${field(t('course.endDate'), '<input class="input" type="date" id="ocr-ed">')}</div>
    <div id="ocr-rows">${rows.map(ocrRow).join('')}</div>
    <button class="btn block" data-act="ocr.addRow">＋ ${t('ocr.addRow')}</button>
    <details style="margin-top:12px"><summary class="small muted bold">${t('ocr.raw')}</summary><img src="${imgUrl}" style="width:100%;border-radius:12px;margin:8px 0"><textarea class="input" readonly style="min-height:160px;font-size:.8rem">${esc(raw)}</textarea></details>
    <div class="sheet-actions"><button class="btn primary" data-act="ocr.import">${t('ocr.import')}</button></div>`);
  el.addEventListener('click', (e) => { const b = e.target.closest('.daypick [data-day]'); if (b) b.classList.toggle('on'); });
}

function importOCR() {
  const el = $('#ocr-rows')?.closest('.sheet');
  if (!el) return;
  const sd = el.querySelector('#ocr-sd').value, ed = el.querySelector('#ocr-ed').value;
  let added = 0, skipped = 0, conflicts = 0;
  for (const row of el.querySelectorAll('.ocr-row')) {
    if (row.classList.contains('off')) continue;
    const v = {}; row.querySelectorAll('[data-k]').forEach((i) => (v[i.dataset.k] = i.value.trim()));
    v.days = [...row.querySelectorAll('.daypick .on')].map((b) => +b.dataset.day);
    if (!(v.name || v.code) || !v.start || !v.end || !v.days.length || toMin(v.end) <= toMin(v.start)) { skipped++; row.style.borderColor = 'var(--red)'; continue; }
    const rec = { id: uid(), name: v.name || v.code, code: v.code.toUpperCase(), start: v.start, end: v.end, days: v.days.sort(), location: v.location, lecturer: v.lecturer, startDate: sd, endDate: ed, remind: null, color: nextColor(v.code || v.name) };
    if (findConflicts(rec).length) conflicts++;
    S().courses.push(rec); added++;
    row.remove();
  }
  if (added) { commit('course'); reschedule(); }
  if (skipped) { toast(t('ocr.someInvalid', { n: skipped }), 'err'); rerender(); return; }
  closeSheet();
  toast(t('ocr.imported', { n: added }) + (conflicts ? ' · ' + t('ocr.conflicts', { n: conflicts }) : ''));
  rerender();
}

on({
  'sch.view': (el) => { st.view = el.dataset.v; rerender(); },
  'sch.nav': (el) => {
    const n = +el.dataset.d, d = parseDate(st.date);
    st.date = dkey(st.view === 'month' ? new Date(d.getFullYear(), d.getMonth() + n, 1) : addDays(d, n * (st.view === 'week' ? 7 : 1)));
    rerender();
  },
  'sch.today': () => { st.date = dkey(); rerender(); },
  'sch.pick': (el, ev) => { if (ev.target.closest('.wg-ev')) return; st.date = el.dataset.date; st.view = 'day'; rerender(); },
  'sch.pickm': (el) => { st.date = el.dataset.date; rerender(); },
  'course.add': () => { closeSheet(); openCourseForm({ startDate: '', endDate: '' }); },
  'course.edit': (el) => { const c = S().courses.find((x) => x.id === el.dataset.id); closeSheet(); openCourseForm(c); },
  'course.open': (el) => { closeSheet(); openCourse(el.dataset.id); },
  'course.list': () => courseListSheet(),
  'course.delete': async (el) => {
    const c = S().courses.find((x) => x.id === el.dataset.id);
    if (!c || !(await confirmDialog(t('course.deleteMsg', { name: c.name }), { danger: true, ok: t('common.delete') }))) return;
    S().courses = S().courses.filter((x) => x.id !== c.id);
    commit('course'); reschedule(); closeSheet(); toast(t('common.deleted')); rerender();
  },
  'course.voice': async () => { closeSheet(); const p = await voiceParse('course'); if (p) openCourseForm(p); },
  'course.ocr': () => startOCR(),
  'ocr.toggle': (el) => { const r = el.closest('.ocr-row'); r.classList.toggle('off'); el.classList.toggle('on'); },
  'ocr.addRow': () => { const box = $('#ocr-rows'); box.insertAdjacentHTML('beforeend', ocrRow({ name: '', code: '', start: '09:00', end: '11:00', days: [], location: '', lecturer: '' }, box.children.length)); },
  'ocr.import': () => importOCR(),
});

export const courseKeyColor = courseColorByKey;
export { examDaysLeft };
