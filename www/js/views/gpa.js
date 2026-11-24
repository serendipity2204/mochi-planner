// Grades: semester GPA, CGPA and a "what do I need next semester" calculator.
import { store, commit } from '../store.js';
import { t } from '../i18n.js';
import { esc, uid } from '../utils.js';
import { on, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, formData, fieldError, field, input, select, empty } from '../ui.js';
import { pigSVG } from '../pig.js';
import { pigProps } from '../data.js';

const S = () => store.state;
const G = () => { if (!S().grades) S().grades = { semesters: [], scale: null, target: '', nextCredits: '' }; return S().grades; };

// Common Malaysian 4.00 scale (universities differ slightly – editable in the app)
export const DEFAULT_SCALE = [
  ['A+', 4.0], ['A', 4.0], ['A-', 3.67], ['B+', 3.33], ['B', 3.0], ['B-', 2.67],
  ['C+', 2.33], ['C', 2.0], ['C-', 1.67], ['D+', 1.33], ['D', 1.0], ['F', 0],
];
export const scale = () => (G().scale?.length ? G().scale : DEFAULT_SCALE);
const pointsOf = (grade) => { const r = scale().find(([g]) => g === grade); return r ? Number(r[1]) : null; };
const fmt = (n) => (n == null || Number.isNaN(n) ? '–' : n.toFixed(2));

/** { points, credits, gpa } for a list of graded courses */
export function calc(courses) {
  let p = 0, c = 0;
  for (const x of courses) {
    const pt = pointsOf(x.grade), cr = Number(x.credits) || 0;
    if (pt == null || !cr) continue;
    p += pt * cr; c += cr;
  }
  return { points: p, credits: c, gpa: c ? p / c : null };
}
export const cgpa = () => calc(G().semesters.flatMap((s) => s.courses || []));

const gpaClass = (g) => (g == null ? '' : g >= 3.67 ? 'great' : g >= 3.0 ? 'good' : g >= 2.0 ? 'ok' : 'low');

export function render() {
  const g = G(), all = cgpa();
  const sems = g.semesters;
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('gpa.title')}</h1><button class="icon-btn" data-act="gpa.scale" aria-label="${t('gpa.scale')}">⚙️</button></div>
    <div class="card next-card gpa-hero"><div class="row"><div class="grow">
      <div class="small muted bold">CGPA</div><div class="gpa-big">${fmt(all.gpa)}</div>
      <div class="small muted">${t('gpa.summary', { c: all.credits, s: sems.length })}</div></div>
      ${pigSVG(pigProps({ size: 92, mood: all.gpa == null ? 'happy' : all.gpa >= 3.5 ? 'cheer' : 'happy' }))}</div></div>
    ${sems.map((s, i) => semCard(s, i)).join('') || `<div class="card">${empty(t('gpa.none'))}</div>`}
    <div class="row" style="margin-top:14px"><button class="btn primary grow" data-act="gpa.addSem">＋ ${t('gpa.addSem')}</button><button class="btn" data-act="gpa.import">📚 ${t('gpa.import')}</button></div>
    ${targetCard(all)}
    <p class="tiny muted center" style="margin-top:14px">${t('gpa.scaleNote')}</p>
  </div>`;
}

function semCard(s, i) {
  const r = calc(s.courses || []);
  return `<div class="card gpa-sem"><div class="card-title"><span class="grow">${esc(s.name || t('gpa.semN', { n: i + 1 }))}</span>
      <span class="gpa-pill ${gpaClass(r.gpa)}">GPA ${fmt(r.gpa)}</span><button class="icon-btn sm" data-act="gpa.editSem" data-id="${s.id}" aria-label="${t('common.edit')}">⋯</button></div>
    ${(s.courses || []).length ? `<div class="list">${s.courses.map((c) => `<button class="item" data-act="gpa.editCourse" data-sem="${s.id}" data-id="${c.id}">
      <div class="grow" style="min-width:0"><div class="title ellipsis">${esc(c.name || c.code)}</div><div class="sub">${esc([c.code, t('gpa.creditsN', { n: c.credits || 0 })].filter(Boolean).join(' · '))}</div></div>
      <span class="grade-chip ${c.grade ? '' : 'pending'}">${esc(c.grade || t('gpa.pending'))}</span></button>`).join('')}</div>` : `<div class="small muted">${t('gpa.noCourses')}</div>`}
    <div class="row small muted" style="margin-top:10px"><span class="grow">${t('gpa.semCredits', { c: r.credits })}</span><button class="btn sm" data-act="gpa.addCourse" data-sem="${s.id}">＋ ${t('gpa.addCourse')}</button></div></div>`;
}

function targetCard(all) {
  const g = G();
  const target = Number(g.target), next = Number(g.nextCredits);
  let msg = '';
  if (target && next) {
    const need = (target * (all.credits + next) - all.points) / next;
    msg = need <= 0 ? t('gpa.needDone') : need > 4 ? t('gpa.needImpossible', { n: fmt(need) }) : t('gpa.need', { n: fmt(need) });
  }
  return `<div class="card"><div class="card-title">🎯 ${t('gpa.targetTitle')}</div>
    <div class="field-row">${field(t('gpa.target'), `<input class="input" type="number" step="0.01" min="0" max="4" inputmode="decimal" id="gpa-target" value="${esc(g.target || '')}" placeholder="3.50">`)}${field(t('gpa.nextCredits'), `<input class="input" type="number" min="1" max="40" inputmode="numeric" id="gpa-next" value="${esc(g.nextCredits || '')}" placeholder="18">`)}</div>
    <div class="gpa-need ${msg ? '' : 'muted'}">${msg || t('gpa.targetHint')}</div></div>`;
}

export function mount(root) {
  const save = () => {
    G().target = root.querySelector('#gpa-target')?.value || '';
    G().nextCredits = root.querySelector('#gpa-next')?.value || '';
    commit('grades');
    const box = root.querySelector('.gpa-need');
    const all = cgpa(), target = Number(G().target), next = Number(G().nextCredits);
    if (!box) return;
    if (!(target && next)) { box.textContent = t('gpa.targetHint'); box.classList.add('muted'); return; }
    const need = (target * (all.credits + next) - all.points) / next;
    box.classList.remove('muted');
    box.textContent = need <= 0 ? t('gpa.needDone') : need > 4 ? t('gpa.needImpossible', { n: fmt(need) }) : t('gpa.need', { n: fmt(need) });
  };
  root.querySelector('#gpa-target')?.addEventListener('input', save);
  root.querySelector('#gpa-next')?.addEventListener('input', save);
}

// ---------- sheets ----------
const gradeOpts = () => [{ value: '', label: t('gpa.pending') }, ...scale().map(([g, p]) => ({ value: g, label: `${g}  (${Number(p).toFixed(2)})` }))];
const semOf = (id) => G().semesters.find((s) => s.id === id);

function semSheet(sem) {
  const isNew = !sem;
  const el = openSheet(`${sheetHead(isNew ? t('gpa.addSem') : t('gpa.editSem'))}<form>
    ${field(t('gpa.semName'), input('name', sem?.name || '', `placeholder="${esc(t('gpa.semNamePh'))}" autofocus`))}
    <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="gpa.delSem" data-id="${sem.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div></form>`);
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = formData(e.target);
    if (isNew) G().semesters.push({ id: uid(), name: v.name || t('gpa.semN', { n: G().semesters.length + 1 }), courses: [] });
    else sem.name = v.name || sem.name;
    commit('grades'); closeSheet(); rerender();
  });
}

function courseSheet(semId, course) {
  const isNew = !course;
  const c = course || { credits: 3, grade: '' };
  const el = openSheet(`${sheetHead(isNew ? t('gpa.addCourse') : t('gpa.editCourse'))}<form novalidate>
    ${field(t('course.name') + ' *', input('name', c.name || '', `placeholder="${esc(t('course.namePh'))}" autofocus`))}
    <div class="field-row">${field(t('course.code'), input('code', c.code || '', 'placeholder="CHM2201" autocapitalize="characters"'))}${field(t('gpa.credits') + ' *', input('credits', c.credits ?? 3, 'type="number" min="0" max="20" step="0.5" inputmode="decimal"'))}</div>
    ${field(t('gpa.grade'), select('grade', gradeOpts(), c.grade || ''))}
    <div class="sheet-actions">${isNew ? '' : `<button type="button" class="btn danger" data-act="gpa.delCourse" data-sem="${semId}" data-id="${c.id}">${t('common.delete')}</button>`}<button class="btn primary">${t('common.save')}</button></div></form>`);
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, v = formData(f);
    if (!v.name && !v.code) return fieldError(f, 'name', t('err.required'));
    const credits = Number(v.credits);
    if (!(credits >= 0)) return fieldError(f, 'credits', t('err.required'));
    const rec = { id: c.id || uid(), name: v.name || v.code, code: (v.code || '').toUpperCase(), credits, grade: v.grade || '' };
    const sem = semOf(semId); if (!sem) return;
    if (isNew) sem.courses.push(rec); else Object.assign(sem.courses.find((x) => x.id === c.id), rec);
    commit('grades'); closeSheet(); rerender();
  });
}

function scaleSheet() {
  const rows = scale().map(([g, p]) => `<div class="row scale-row"><input class="input" data-k="g" value="${esc(g)}" maxlength="4" style="width:80px"><input class="input grow" data-k="p" type="number" step="0.01" min="0" max="5" inputmode="decimal" value="${p}"><button type="button" class="icon-btn sm" data-del>✕</button></div>`).join('');
  const el = openSheet(`${sheetHead(t('gpa.scale'))}<p class="small muted" style="margin-top:0">${t('gpa.scaleHint')}</p>
    <div id="scale-rows" class="col" style="gap:8px">${rows}</div>
    <button type="button" class="btn block" style="margin-top:10px" id="scale-add">＋ ${t('gpa.addGrade')}</button>
    <div class="sheet-actions"><button class="btn" id="scale-reset">${t('gpa.resetScale')}</button><button class="btn primary" id="scale-save">${t('common.save')}</button></div>`);
  const box = el.querySelector('#scale-rows');
  box.addEventListener('click', (e) => { if (e.target.closest('[data-del]')) e.target.closest('.scale-row').remove(); });
  el.querySelector('#scale-add').addEventListener('click', () => box.insertAdjacentHTML('beforeend', `<div class="row scale-row"><input class="input" data-k="g" maxlength="4" style="width:80px"><input class="input grow" data-k="p" type="number" step="0.01" min="0" max="5" inputmode="decimal"><button type="button" class="icon-btn sm" data-del>✕</button></div>`));
  el.querySelector('#scale-reset').addEventListener('click', () => { G().scale = null; commit('grades'); closeSheet(); rerender(); toast(t('common.saved')); });
  el.querySelector('#scale-save').addEventListener('click', () => {
    const list = [...box.querySelectorAll('.scale-row')].map((r) => [r.querySelector('[data-k=g]').value.trim().toUpperCase(), Number(r.querySelector('[data-k=p]').value)]).filter(([g, p]) => g && p >= 0);
    if (!list.length) return toast(t('err.required'), 'err');
    G().scale = list; commit('grades'); closeSheet(); rerender(); toast(t('common.saved'));
  });
}

on({
  'gpa.addSem': () => semSheet(null),
  'gpa.editSem': (el) => semSheet(semOf(el.dataset.id)),
  'gpa.delSem': async (el) => {
    if (!(await confirmDialog(t('gpa.delSemMsg'), { danger: true, ok: t('common.delete') }))) return;
    G().semesters = G().semesters.filter((s) => s.id !== el.dataset.id); commit('grades'); closeSheet(); rerender();
  },
  'gpa.addCourse': (el) => courseSheet(el.dataset.sem, null),
  'gpa.editCourse': (el) => courseSheet(el.dataset.sem, semOf(el.dataset.sem)?.courses.find((c) => c.id === el.dataset.id)),
  'gpa.delCourse': (el) => {
    const s = semOf(el.dataset.sem); if (!s) return;
    s.courses = s.courses.filter((c) => c.id !== el.dataset.id); commit('grades'); closeSheet(); rerender();
  },
  'gpa.scale': () => scaleSheet(),
  'gpa.import': () => {
    const courses = S().courses;
    if (!courses.length) return toast(t('gpa.importNone'), 'err');
    let sem = G().semesters[G().semesters.length - 1];
    if (!sem) { sem = { id: uid(), name: t('gpa.semN', { n: 1 }), courses: [] }; G().semesters.push(sem); }
    const have = new Set(sem.courses.map((c) => (c.code || c.name).toUpperCase()));
    let n = 0;
    for (const c of courses) {
      const key = (c.code || c.name).toUpperCase();
      if (have.has(key)) continue;
      sem.courses.push({ id: uid(), name: c.name || c.code, code: c.code || '', credits: 3, grade: '' }); n++;
    }
    commit('grades'); rerender();
    toast(n ? t('gpa.imported', { n, s: sem.name }) : t('gpa.importNone2'));
  },
});
