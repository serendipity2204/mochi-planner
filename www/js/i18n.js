// i18n core + locale-aware formatting. Dictionaries live in lang.js.
import { DICT } from './lang.js';
import { store } from './store.js';
import { pad, startOfDay, daysBetween } from './utils.js';

export const lang = () => store.state.settings.lang || 'zh';

export function t(key, vars) {
  const d = DICT[lang()] || DICT.en;
  let s = d[key] ?? DICT.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

export function applyLang() {
  document.documentElement.lang = lang() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('app.name');
}

export const weekdayShort = (d) => t('wd.s' + d);
export const weekdayLong = (d) => t('wd.l' + d);
export const monthName = (m) => t('mon.' + m);

export function fmtTime(hhmm) {
  if (!hhmm) return '';
  if (store.state.settings.cal.timeFmt === '24') return hhmm;
  let [h, m] = hhmm.split(':').map(Number);
  const pm = h >= 12; h = h % 12 || 12;
  return lang() === 'zh' ? `${pm ? '下午' : '上午'}${h}:${pad(m)}` : `${h}:${pad(m)} ${pm ? 'PM' : 'AM'}`;
}
export const fmtClock = (d) => fmtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

export function fmtDate(d, opts = {}) {
  if (!d) return '';
  if (typeof d === 'string') { const [y, m, dd] = d.split('-').map(Number); d = new Date(y, m - 1, dd); }
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const f = store.state.settings.cal.dateFmt;
  let s;
  if (opts.short) s = lang() === 'zh' ? `${m}月${day}日` : `${day} ${t('mon.' + (m - 1)).slice(0, 3)}`;
  else if (f === 'DMY') s = `${pad(day)}/${pad(m)}/${y}`;
  else if (f === 'MDY') s = `${pad(m)}/${pad(day)}/${y}`;
  else s = `${y}-${pad(m)}-${pad(day)}`;
  if (opts.weekday) s += ' ' + weekdayShort(d.getDay());
  return s;
}

export function relDay(d) {
  if (typeof d === 'string') { const [y, m, dd] = d.split('-').map(Number); d = new Date(y, m - 1, dd); }
  const n = daysBetween(startOfDay(new Date()), d);
  if (n === 0) return t('rel.today');
  if (n === 1) return t('rel.tomorrow');
  if (n === -1) return t('rel.yesterday');
  if (n > 1) return t('rel.inDays', { n });
  return t('rel.daysAgo', { n: -n });
}

export function fmtDuration(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60), m = min % 60;
  if (lang() === 'zh') return h ? `${h}小时${m ? m + '分' : ''}` : `${m}分钟`;
  return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m} min`;
}

export function fmtCountdown(ms) {
  if (ms < 0) ms = 0;
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440), h = Math.floor((totalMin % 1440) / 60), m = totalMin % 60;
  if (d) return t('cd.dh', { d, h });
  if (h) return t('cd.hm', { h, m });
  return t('cd.m', { m: Math.max(m, ms > 0 ? 1 : 0) });
}

export function fmtDateTime(ts) {
  const d = new Date(ts);
  return fmtDate(d) + ' ' + fmtClock(d);
}
