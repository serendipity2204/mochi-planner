// Shared UI helpers: actions registry, routing hooks, sheets, dialogs, toasts, form helpers.
import { t } from './i18n.js';
import { esc } from './utils.js';
import { pigSVG } from './pig.js';
import { store } from './store.js';
import { playSound, vibrate } from './native.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- Actions: elements with data-act="name" call registered handlers ----
const actions = {};
export const on = (map) => Object.assign(actions, map);
export function runAction(name, el, ev) {
  const fn = actions[name];
  if (!fn) { console.warn('no action', name); return; }
  try {
    const r = fn(el, ev);
    if (r?.catch) r.catch((e) => { console.error(e); toast(errMsg(e), 'err'); });
  } catch (e) { console.error(e); toast(errMsg(e), 'err'); }
}
export function errMsg(e) {
  const k = 'err.' + (e?.message || 'generic');
  const s = t(k);
  if (s === k) return t('err.generic');
  // Show the technical code for config/unknown cloud errors so problems can be diagnosed
  return ['err.fbGoogleConfig', 'err.fbGeneric'].includes(k) && e.detail ? `${s} [${String(e.detail).slice(0, 80)}]` : s;
}

// ---- Router hooks (set by app.js) ----
const router = { go: () => {}, back: () => {}, render: () => {}, current: () => ({}) };
export const setRouter = (r) => Object.assign(router, r);
export const go = (name, params) => router.go(name, params);
export const back = () => router.back();
export const rerender = () => router.render();
export const currentRoute = () => router.current();

// ---- Feedback ----
let toastTimer;
export function toast(msg, kind = '') {
  $('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = esc(msg);
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}
export function tap() {
  const s = store.state.settings.sound;
  if (s.app) playSound('pop', 0.12);
  if (s.vibrate) vibrate(15);
}
export function celebrate(x = window.innerWidth / 2, y = window.innerHeight / 2, n = 8, emojis = ['💗', '💖', '✨', '🌸', '⭐']) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'heart-burst';
    h.textContent = emojis[i % emojis.length];
    h.style.left = x + (Math.random() * 40 - 20) + 'px';
    h.style.top = y + (Math.random() * 20 - 10) + 'px';
    h.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    h.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
    h.style.animationDelay = i * 0.06 + 's';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1800);
  }
}

// ---- Sheets (bottom sheet on phones, centered dialog on tablets) ----
const sheets = [];
export function openSheet(html, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (opts.center ? ' center' : '');
  wrap.innerHTML = `<div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true">${opts.center ? '' : '<div class="grab"></div>'}${html}</div>`;
  wrap.addEventListener('click', (e) => { if (e.target === wrap && !opts.sticky) closeSheet(); });
  document.body.appendChild(wrap);
  const entry = { wrap, onClose: opts.onClose };
  sheets.push(entry);
  opts.onMount?.(wrap.firstElementChild);
  const first = wrap.querySelector('[autofocus]');
  if (first && window.innerWidth > 860) setTimeout(() => first.focus(), 50);
  return wrap.firstElementChild;
}
export function closeSheet() {
  const s = sheets.pop();
  if (!s) return false;
  s.wrap.remove();
  s.onClose?.();
  return true;
}
export const closeAllSheets = () => { while (closeSheet()); };
export const sheetOpen = () => sheets.length > 0;
export const topSheet = () => sheets[sheets.length - 1]?.wrap.firstElementChild;

export function sheetHead(title, extra = '') {
  return `<div class="sheet-head"><h2>${esc(title)}</h2>${extra}<button class="icon-btn" data-act="sheet.close" aria-label="${esc(t('common.close'))}">✕</button></div>`;
}

export function confirmDialog(msg, { ok = t('common.confirm'), danger = false, title = '' } = {}) {
  return new Promise((res) => {
    let result = false;
    const el = openSheet(`${pigSVG({ mood: danger ? 'worried' : 'happy', size: 90, acc: 'none', cls: 'pig-anim' }).replace('<svg', '<svg style="margin:0 auto 8px"')}
      ${title ? `<h2 style="margin-bottom:6px">${esc(title)}</h2>` : ''}<p style="margin:0 0 18px;line-height:1.5">${esc(msg)}</p>
      <div class="row"><button class="btn grow" data-r="0">${esc(t('common.cancel'))}</button><button class="btn grow ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button></div>`,
    { center: true, cls: 'dialog', onClose: () => res(result) });
    el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { result = b.dataset.r === '1'; closeSheet(); }));
  });
}

export function promptDialog(title, value = '', placeholder = '', type = 'text') {
  return new Promise((res) => {
    let result = null;
    const el = openSheet(`<h2 style="margin-bottom:12px">${esc(title)}</h2><input class="input" id="pd-in" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" autofocus>
      <div class="row" style="margin-top:16px"><button class="btn grow" data-r="0">${esc(t('common.cancel'))}</button><button class="btn grow primary" data-r="1">${esc(t('common.ok'))}</button></div>`,
    { center: true, cls: 'dialog', onClose: () => res(result) });
    const inp = el.querySelector('#pd-in');
    setTimeout(() => inp.focus(), 60);
    const done = (ok) => { result = ok ? inp.value.trim() : null; closeSheet(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); });
    el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => done(b.dataset.r === '1')));
  });
}

// ---- Form helpers ----
export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number') o[el.name] = el.value === '' ? '' : Number(el.value);
    else o[el.name] = el.value.trim();
  }
  return o;
}
export function fieldError(form, name, msg) {
  const el = form.elements[name];
  if (!el) return;
  el.classList.add('err');
  const box = el.closest('.field');
  if (box && !box.querySelector('.err-text')) box.insertAdjacentHTML('beforeend', `<span class="err-text">${esc(msg)}</span>`);
  el.addEventListener('input', () => { el.classList.remove('err'); box?.querySelector('.err-text')?.remove(); }, { once: true });
  el.focus?.();
}

export const field = (label, inner) => `<div class="field"><label>${esc(label)}</label>${inner}</div>`;
export const input = (name, value = '', attrs = '') => `<input class="input" name="${name}" value="${esc(value)}" ${attrs}>`;
export const select = (name, options, value, attrs = '') => `<select class="input" name="${name}" ${attrs}>${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
export const toggle = (attrs, checked) => `<label class="switch"><input type="checkbox" ${attrs} ${checked ? 'checked' : ''}><span></span></label>`;
export const empty = (msg, mood = 'happy') => `<div class="empty">${pigSVG({ mood, size: 96, acc: store.state.settings.pig.acc, expr: 'smile', cls: 'pig-anim' }).replace('<svg', '<svg style="margin:0 auto 6px"')}<div>${esc(msg)}</div></div>`;
export const loading = (msg) => `<div class="loading"><div class="spinner"></div>${esc(msg || t('common.loading'))}</div>`;

export function ring(pct, size = 64, stroke = 8, color = 'var(--primary)', label = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--primary-3)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" style="transition:stroke-dashoffset .5s"/></svg><div class="ring-label">${label}</div></div>`;
}

// File input helper → returns File[]
export function pickFiles({ accept = '*/*', multiple = true, capture = false } = {}) {
  return new Promise((res) => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept, multiple });
    if (capture) inp.setAttribute('capture', 'environment');
    inp.style.display = 'none';
    inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); });
    inp.addEventListener('cancel', () => { res([]); inp.remove(); });
    document.body.appendChild(inp);
    inp.click();
  });
}
