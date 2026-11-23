// In-app update check (Android APK): compares this build with the latest GitHub release.
import { APP } from './config.js';
import { t } from './i18n.js';
import { esc } from './utils.js';
import { isNative, openExternal } from './native.js';
import { openSheet, closeSheet, sheetHead, toast, sheetOpen } from './ui.js';

const API = APP.repoUrl.replace('https://github.com/', 'https://api.github.com/repos/') + '/releases/latest';
const LAST = 'mochi-update-check', SNOOZE = 'mochi-update-snooze';
const buildOf = (tag) => Number((String(tag).match(/v?\d+\.\d+\.(\d+)/) || [])[1] || 0);
export const currentBuild = () => (/^\d+$/.test(APP.build) ? Number(APP.build) : 0);

/** Release notes: the "What's new" part of the release text, without commit trailers. */
export function notesOf(body = '') {
  const lines = String(body).split(/\r?\n/);
  const i = lines.findIndex((l) => /What's new|更新内容/.test(l));
  if (i < 0) return '';
  const out = [];
  for (const l of lines.slice(i + 1)) {
    if (/^📱|^Commit:/.test(l.trim())) break;
    if (/^(Co-Authored-By|Claude-Session):/i.test(l.trim())) continue;
    out.push(l);
  }
  return out.join('\n').trim();
}

async function fetchLatest() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(API, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    const apk = (j.assets || []).find((a) => /\.apk$/i.test(a.name));
    return { tag: j.tag_name, build: buildOf(j.tag_name), notes: notesOf(j.body), url: apk?.browser_download_url || j.html_url, page: j.html_url, size: apk?.size || 0 };
  } finally { clearTimeout(timer); }
}

function showUpdate(rel) {
  const el = openSheet(`${sheetHead('🎉 ' + t('update.title'))}
    <p style="margin:0 0 10px">${t('update.body', { v: esc(rel.tag), cur: esc('v' + APP.version.replace(/\.\d+$/, '') + '.' + currentBuild()) })}</p>
    ${rel.notes ? `<div class="card" style="white-space:pre-line;font-size:.9rem;margin-bottom:12px"><b>${t('update.whatsNew')}</b>\n${esc(rel.notes)}</div>` : ''}
    <p class="tiny muted" style="margin:0 0 12px">${t('update.howTo')}${rel.size ? ` · ${(rel.size / 1048576).toFixed(1)} MB` : ''}</p>
    <div class="sheet-actions"><button class="btn" data-u="later">${t('update.later')}</button><button class="btn primary" data-u="go">⬇️ ${t('update.download')}</button></div>`);
  el.querySelector('[data-u=later]').addEventListener('click', () => { try { localStorage.setItem(SNOOZE, JSON.stringify({ tag: rel.tag, until: Date.now() + 24 * 3600e3 })); } catch {} closeSheet(); });
  el.querySelector('[data-u=go]').addEventListener('click', () => { openExternal(rel.url); closeSheet(); });
}

/** manual: from Settings → About (always answers); otherwise a quiet check at most every 6 h. */
export async function checkUpdate({ manual = false } = {}) {
  if (!isNative() && !manual) return;
  const cur = currentBuild();
  if (!cur) { if (manual) toast(t('update.devBuild')); return; }
  if (!manual) {
    try { if (Date.now() - Number(localStorage.getItem(LAST) || 0) < 6 * 3600e3) return; localStorage.setItem(LAST, String(Date.now())); } catch {}
  }
  let rel;
  try { rel = await fetchLatest(); } catch { if (manual) toast(t('update.failed'), 'err'); return; }
  if (rel.build <= cur) { if (manual) toast(t('update.latest')); return; }
  if (!manual) {
    try { const s = JSON.parse(localStorage.getItem(SNOOZE) || 'null'); if (s && s.tag === rel.tag && Date.now() < s.until) return; } catch {}
    if (sheetOpen() || document.querySelector('.onboard')) return;
  }
  showUpdate(rel);
}
