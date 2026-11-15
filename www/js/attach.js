// Attachments (photos & files) shared by assignments and notes.
import { putFile, getFile } from './store.js';
import { t } from './i18n.js';
import { esc, shrinkImage, fmtBytes } from './utils.js';
import { openSheet, sheetHead, pickFiles, toast } from './ui.js';
import { saveFile } from './native.js';

const urls = new Map();
async function urlFor(id) {
  if (urls.has(id)) return urls.get(id);
  const f = await getFile(id);
  if (!f) return null;
  const u = { url: URL.createObjectURL(f.blob), type: f.type, name: f.name, size: f.size };
  urls.set(id, u);
  return u;
}

export function thumbsHTML(ids = [], { removable = false } = {}) {
  return `<div class="thumbs">${ids.map((id) => `<button type="button" class="thumb" data-file="${id}" data-act="file.open" data-id="${id}">📄${removable ? `<span class="x" data-act="file.remove" data-id="${id}">✕</span>` : ''}</button>`).join('')}</div>`;
}

// Fill thumbnails asynchronously
export async function hydrateThumbs(root) {
  for (const el of root.querySelectorAll('.thumb[data-file]')) {
    const u = await urlFor(el.dataset.file);
    if (!u) { el.innerHTML = '⚠️<br>' + esc(t('file.missing')); continue; }
    const x = el.querySelector('.x');
    if (u.type.startsWith('image/')) el.innerHTML = `<img src="${u.url}" alt="${esc(u.name)}">`;
    else el.innerHTML = `<div>📄<br>${esc(u.name.slice(0, 24))}<br><span class="muted">${fmtBytes(u.size)}</span></div>`;
    if (x) el.appendChild(x);
  }
}

export async function addAttachments(source = 'any') {
  const accept = source === 'camera' || source === 'image' ? 'image/*' : '*/*';
  const files = await pickFiles({ accept, multiple: source !== 'camera', capture: source === 'camera' });
  const ids = [];
  for (let f of files) {
    if (f.size > 25 * 1024 * 1024) { toast(t('err.fileTooBig'), 'err'); continue; }
    f = await shrinkImage(f);
    ids.push(await putFile(f));
  }
  return ids;
}

export async function openFile(id) {
  const u = await urlFor(id);
  if (!u) return toast(t('file.missing'), 'err');
  if (u.type.startsWith('image/')) {
    openSheet(`${sheetHead(u.name)}<img src="${u.url}" style="width:100%;border-radius:16px"><div class="sheet-actions"><button class="btn" data-act="file.save" data-id="${id}">⬇️ ${t('file.saveShare')}</button></div>`);
  } else {
    await shareFile(id);
  }
}

export async function shareFile(id) {
  const f = await getFile(id);
  if (!f) return;
  await saveFile(f.name, f.blob);
}

// Editing context: the open form registers its id list so "remove" works
export const attachCtx = { ids: null, refresh: null, added: [] };

import { on } from './ui.js';
import { delFile } from './store.js';
on({
  'file.open': (el, ev) => { if (ev.target.closest('.x')) return; openFile(el.dataset.id); },
  'file.save': (el) => shareFile(el.dataset.id),
  'file.remove': (el, ev) => {
    ev.stopPropagation();
    if (!attachCtx.ids) return;
    const i = attachCtx.ids.indexOf(el.dataset.id);
    if (i >= 0) attachCtx.ids.splice(i, 1);
    if (attachCtx.added.includes(el.dataset.id)) delFile(el.dataset.id);
    attachCtx.refresh?.();
  },
});
