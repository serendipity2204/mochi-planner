// Notes & study materials (photos/files by course) + global search & filter.
import { store, commit, delFile } from '../store.js';
import { t, fmtDate, fmtTime, weekdayShort } from '../i18n.js';
import { esc, uid, dkey } from '../utils.js';
import { on, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, formData, fieldError, field, input, select, empty } from '../ui.js';
import { thumbsHTML, hydrateThumbs, addAttachments, attachCtx } from '../attach.js';
import { courseOptions, courseColorByKey, isComplete, sessionsOf } from '../data.js';
import { sessionLine } from './schedule.js';

const S = () => store.state;
const CATS = ['lecture', 'handout', 'brief', 'personal', 'other'];
const st = { cat: '', course: '', q: '' };

// ---------------- Notes ----------------
function noteCard(n) {
  return `<div class="card" role="button" tabindex="0" style="cursor:pointer" data-act="note.open" data-id="${n.id}">
    <div class="row" style="margin-bottom:6px">${n.course ? `<span class="badge" style="background:${courseColorByKey(n.course)}22;color:${courseColorByKey(n.course)}">${esc(n.course)}</span>` : ''}<span class="badge">${t('note.cat.' + (n.category || 'other'))}</span><span class="grow"></span>${n.files?.length ? `<span class="small muted">📎${n.files.length}</span>` : ''}</div>
    <div class="bold" style="font-size:1.05rem">${esc(n.title)}</div>
    ${n.body ? `<div class="small muted" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap">${esc(n.body.slice(0, 240))}</div>` : ''}
    ${n.files?.length ? `<div style="margin-top:8px">${thumbsHTML(n.files.slice(0, 4))}</div>` : ''}
    <div class="tiny muted" style="margin-top:8px">${fmtDate(new Date(n.updatedAt))}</div></div>`;
}

export function renderNotes() {
  let list = [...S().notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const courses = [...new Set(list.map((n) => n.course).filter(Boolean))];
  if (st.cat) list = list.filter((n) => (n.category || 'other') === st.cat);
  if (st.course) list = list.filter((n) => n.course === st.course);
  if (st.q) { const q = st.q.toLowerCase(); list = list.filter((n) => (n.title + ' ' + n.body + ' ' + n.course).toLowerCase().includes(q)); }
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('nav.notes')}</h1><button class="icon-btn" data-act="note.add" style="background:var(--primary);color:#fff">＋</button></div>
    <input class="input" id="note-q" placeholder="🔍 ${esc(t('note.searchPh'))}" value="${esc(st.q)}" style="margin-bottom:10px">
    <div class="chips">${['', ...CATS].map((c) => `<button class="chip ${st.cat === c ? 'on' : ''}" data-act="note.cat" data-c="${c}">${c ? t('note.cat.' + c) : t('filter.all')}</button>`).join('')}</div>
    ${courses.length ? `<div class="chips">${['', ...courses].map((c) => `<button class="chip ${st.course === c ? 'on' : ''}" data-act="note.course" data-c="${esc(c)}">${c ? esc(c) : t('filter.allCourses')}</button>`).join('')}</div>` : ''}
    <div id="note-list" style="margin-top:6px">${list.length ? `<div class="masonry">${list.map(noteCard).join('')}</div>` : `<div class="card">${empty(S().notes.length ? t('search.none') : t('note.none'))}<div class="center"><button class="btn primary" data-act="note.add">＋ ${t('note.add')}</button></div></div>`}</div>
  </div>`;
}
export function mountNotes(root) {
  hydrateThumbs(root);
  const q = root.querySelector('#note-q');
  q?.addEventListener('input', () => { st.q = q.value; const pos = q.selectionStart; rerender(); const nq = document.getElementById('note-q'); nq.focus(); nq.setSelectionRange(pos, pos); });
}

export function openNoteForm(n = {}) {
  const isNew = !n.id;
  const rec = { files: [], category: 'lecture', ...n };
  attachCtx.ids = [...rec.files]; attachCtx.added = [];
  let saved = false;
  const el = openSheet(`${sheetHead(isNew ? t('note.add') : t('note.edit'))}<form novalidate>
    <datalist id="course-dl2">${courseOptions().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</datalist>
    ${field(t('note.title') + ' *', input('title', rec.title, `placeholder="${esc(t('note.titlePh'))}" ${isNew ? 'autofocus' : ''}`))}
    <div class="field-row">${field(t('asg.course'), input('course', rec.course, 'list="course-dl2"'))}${field(t('note.category'), select('category', CATS.map((c) => ({ value: c, label: t('note.cat.' + c) })), rec.category))}</div>
    ${field(t('note.body'), `<textarea class="input" name="body" style="min-height:200px" placeholder="${esc(t('note.bodyPh'))}">${esc(rec.body)}</textarea>`)}
    <div class="field"><label>${t('asg.files')}</label><div id="att"></div><div class="row wrap" style="margin-top:8px"><button type="button" class="btn sm" data-src="camera">📷 ${t('file.camera')}</button><button type="button" class="btn sm" data-src="image">🖼️ ${t('file.photo')}</button><button type="button" class="btn sm" data-src="any">📎 ${t('file.file')}</button></div></div>
    <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="note.delete" data-id="${rec.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div></form>`,
  { onClose: () => { if (!saved) attachCtx.added.forEach((id) => delFile(id)); attachCtx.ids = null; } });
  const att = el.querySelector('#att');
  const refresh = () => { att.innerHTML = attachCtx.ids.length ? thumbsHTML(attachCtx.ids, { removable: true }) : `<div class="small muted">${t('file.none')}</div>`; hydrateThumbs(att); };
  attachCtx.refresh = refresh; refresh();
  el.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', async () => { const ids = await addAttachments(b.dataset.src); attachCtx.ids.push(...ids); attachCtx.added.push(...ids); refresh(); }));
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (!v.title && !v.body && !attachCtx.ids.length) return fieldError(e.target, 'title', t('err.required'));
    if (!v.title) v.title = v.body ? v.body.split('\n')[0].slice(0, 40) : t('note.untitled');
    const out = { ...rec, ...v, files: [...attachCtx.ids], updatedAt: Date.now(), id: rec.id || uid() };
    if (isNew) { out.createdAt = Date.now(); S().notes.push(out); } else Object.assign(S().notes.find((x) => x.id === rec.id), out);
    saved = true;
    commit('note'); closeSheet(); toast(t('common.saved')); rerender();
  });
}

// ---------------- Search ----------------
const ss = { q: '', type: 'all', course: '', from: '', to: '' };
const hl = (s, q) => { s = esc(s || ''); if (!q) return s; const i = s.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? s : s.slice(0, i) + '<mark>' + s.slice(i, i + esc(q).length) + '</mark>' + s.slice(i + esc(q).length); };

function results() {
  const q = ss.q.trim().toLowerCase();
  const inRange = (k) => (!ss.from || (k && k >= ss.from)) && (!ss.to || (k && k <= ss.to));
  const hasDate = ss.from || ss.to;
  const courseOk = (c) => !ss.course || (c || '').toUpperCase() === ss.course.toUpperCase();
  const match = (...f) => !q || f.some((x) => String(x || '').toLowerCase().includes(q));
  const groups = [];
  if (ss.type === 'all' || ss.type === 'courses') {
    const r = S().courses.filter((c) => courseOk(c.code || c.name) && match(c.name, c.code, c.lecturer, ...sessionsOf(c).map((x) => x.location)) && (!hasDate || ((!c.endDate || !ss.from || c.endDate >= ss.from) && (!c.startDate || !ss.to || c.startDate <= ss.to))));
    if (r.length) groups.push([t('search.courses'), r.map((c) => `<button class="item" data-act="course.open" data-id="${c.id}"><span>📚</span><div class="grow"><div class="title">${hl(c.name, q)}</div><div class="sub">${hl([c.code, c.lecturer].filter(Boolean).join(' · '), q)}${sessionsOf(c).map((x) => `<br>${hl(sessionLine(x), q)}`).join('')}</div></div></button>`)]);
  }
  if (ss.type === 'all' || ss.type === 'assignments') {
    const r = S().assignments.filter((a) => courseOk(a.course) && (!hasDate || inRange(a.dueDate)) && match(a.title, a.desc, a.notes, a.course, ...(a.subtasks || []).map((x) => x.title)));
    if (r.length) groups.push([t('search.assignments'), r.map((a) => `<button class="item" data-act="asg.open" data-id="${a.id}"><span>${isComplete(a) ? '✅' : '📝'}</span><div class="grow"><div class="title">${hl(a.title, q)}</div><div class="sub">${hl(a.course, q)} · ${a.dueDate ? fmtDate(a.dueDate) : ''}</div></div></button>`)]);
  }
  if (ss.type === 'all' || ss.type === 'exams') {
    const r = S().exams.filter((e) => courseOk(e.course) && (!hasDate || inRange(e.date)) && match(e.course, e.location, e.notes));
    if (r.length) groups.push([t('search.exams'), r.map((e) => `<button class="item" data-act="exam.open" data-id="${e.id}"><span>🎯</span><div class="grow"><div class="title">${hl(e.course, q)}</div><div class="sub">${fmtDate(e.date)} · ${hl(e.location, q)}</div></div></button>`)]);
  }
  if (ss.type === 'all' || ss.type === 'notes') {
    const r = S().notes.filter((n) => courseOk(n.course) && (!hasDate || inRange(dkey(new Date(n.updatedAt)))) && match(n.title, n.body, n.course, t('note.cat.' + (n.category || 'other'))));
    if (r.length) groups.push([t('search.notes'), r.map((n) => `<button class="item" data-act="note.open" data-id="${n.id}"><span>🗒️</span><div class="grow"><div class="title">${hl(n.title, q)}</div><div class="sub ellipsis">${hl(n.course, q)} ${hl((n.body || '').slice(0, 80), q)}</div></div></button>`)]);
  }
  if ((ss.type === 'all' || ss.type === 'todos') && !ss.course) {
    const r = S().todos.filter((x) => (!hasDate || inRange(x.due)) && match(x.title));
    if (r.length) groups.push([t('search.todos'), r.map((x) => `<button class="item ${x.done ? 'done' : ''}" data-act="todo.edit" data-id="${x.id}"><span>${x.done ? '☑️' : '⬜'}</span><div class="grow"><div class="title">${hl(x.title, q)}</div>${x.due ? `<div class="sub">${fmtDate(x.due)}</div>` : ''}</div></button>`)]);
  }
  if (!q && !hasDate && !ss.course && ss.type === 'all') return `<div class="empty">${t('search.hint')}</div>`;
  if (!groups.length) return empty(t('search.none'), 'worried');
  return groups.map(([title, items]) => `<div class="card"><div class="card-title">${esc(title)} <span class="muted small">${items.length}</span></div><div class="list">${items.join('')}</div></div>`).join('');
}

export function renderSearch() {
  const codes = [...new Set([...S().courses.map((c) => c.code || c.name), ...S().assignments.map((a) => a.course), ...S().exams.map((e) => e.course), ...S().notes.map((n) => n.course)].filter(Boolean))];
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('nav.search')}</h1></div>
    <input class="input" id="search-q" placeholder="🔍 ${esc(t('search.ph'))}" value="${esc(ss.q)}" autofocus>
    <div class="chips" style="margin-top:10px">${['all', 'courses', 'assignments', 'exams', 'notes', 'todos'].map((x) => `<button class="chip ${ss.type === x ? 'on' : ''}" data-act="search.type" data-t="${x}">${t(x === 'all' ? 'filter.all' : 'search.' + x)}</button>`).join('')}</div>
    <div class="row wrap" style="margin-bottom:12px"><select class="input" id="search-course" style="flex:1;min-width:140px"><option value="">${t('filter.allCourses')}</option>${codes.map((c) => `<option ${ss.course === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <input class="input" type="date" id="search-from" value="${ss.from}" style="flex:1;min-width:130px" aria-label="${t('search.from')}"><input class="input" type="date" id="search-to" value="${ss.to}" style="flex:1;min-width:130px" aria-label="${t('search.to')}">
      ${ss.course || ss.from || ss.to ? `<button class="btn sm ghost" data-act="search.clear">${t('search.clear')}</button>` : ''}</div>
    <div id="search-res" class="col" style="gap:14px">${results()}</div></div>`;
}
export function mountSearch(root) {
  const q = root.querySelector('#search-q');
  q.addEventListener('input', () => { ss.q = q.value; root.querySelector('#search-res').innerHTML = results(); });
  root.querySelector('#search-course').addEventListener('change', (e) => { ss.course = e.target.value; rerender(); });
  root.querySelector('#search-from').addEventListener('change', (e) => { ss.from = e.target.value; rerender(); });
  root.querySelector('#search-to').addEventListener('change', (e) => { ss.to = e.target.value; rerender(); });
  if (window.innerWidth > 860) q.focus();
}

on({
  'note.add': () => { closeSheet(); openNoteForm(); },
  'note.open': (el) => { closeSheet(); openNoteForm(S().notes.find((n) => n.id === el.dataset.id)); },
  'note.cat': (el) => { st.cat = el.dataset.c; rerender(); },
  'note.course': (el) => { st.course = el.dataset.c; rerender(); },
  'note.delete': async (el) => {
    const n = S().notes.find((x) => x.id === el.dataset.id);
    if (!n || !(await confirmDialog(t('note.deleteMsg', { name: n.title }), { danger: true, ok: t('common.delete') }))) return;
    for (const f of n.files || []) await delFile(f);
    S().notes = S().notes.filter((x) => x.id !== n.id);
    attachCtx.added = [];
    commit('note'); closeSheet(); toast(t('common.deleted')); rerender();
  },
  'search.type': (el) => { ss.type = el.dataset.t; rerender(); },
  'search.clear': () => { ss.course = ss.from = ss.to = ''; rerender(); },
});
