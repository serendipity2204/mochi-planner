// Natural-language parsing for voice input & OCR (Chinese + English heuristics).
import { dkey, addDays, pad, toMin, fromMin } from './utils.js';

const DAY_WORDS = [
  [0, /(星期日|星期天|礼拜天|礼拜日|周日|周天|\bsunday\b|\bsun\b)/gi],
  [1, /(星期一|礼拜一|周一|\bmonday\b|\bmon\b)/gi],
  [2, /(星期二|礼拜二|周二|\btuesday\b|\btues?\b)/gi],
  [3, /(星期三|礼拜三|周三|\bwednesday\b|\bwed\b)/gi],
  [4, /(星期四|礼拜四|周四|\bthursday\b|\bthu(?:rs?)?\b)/gi],
  [5, /(星期五|礼拜五|周五|\bfriday\b|\bfri\b)/gi],
  [6, /(星期六|礼拜六|周六|\bsaturday\b|\bsat\b)/gi],
];
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

// Convert simple Chinese numerals (一 ~ 三十九) to digits so the rest of the parser works
function cnDigits(s) {
  return s.replace(/[零一二两三四五六七八九十]{1,3}(?=[点時时号日月天周个分:])/g, (m) => {
    if (m.length === 1) return String(CN_NUM[m]);
    if (m[0] === '十') return String(10 + (CN_NUM[m[1]] || 0));
    if (m[1] === '十') return String(CN_NUM[m[0]] * 10 + (CN_NUM[m[2]] || 0));
    return m;
  });
}

export function findCode(text) {
  const m = text.match(/(?<![A-Za-z])([A-Za-z]{2,5})\s?-?(\d{3,4}[A-Za-z]?)(?!\d)/);
  return m ? { code: (m[1] + m[2]).toUpperCase(), raw: m[0] } : null;
}

export function findDays(text) {
  const days = new Set();
  let rest = text;
  for (const [d, re] of DAY_WORDS) {
    if (re.test(rest)) { days.add(d); rest = rest.replace(re, ' '); }
    re.lastIndex = 0;
  }
  if (/(weekdays|工作日|周一至周五|周一到周五)/i.test(text)) [1, 2, 3, 4, 5].forEach((d) => days.add(d));
  return { days: [...days].sort(), rest };
}

// Returns { date: 'YYYY-MM-DD' | null, rest }
export function findDate(text, now = new Date()) {
  let rest = text, date = null;
  const take = (re, fn) => {
    if (date) return;
    const m = rest.match(re);
    if (m) { const d = fn(m); if (d && !isNaN(d)) { date = dkey(d); rest = rest.replace(m[0], ' '); } }
  };
  const y = now.getFullYear();
  const future = (d) => (d < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()) : d);
  take(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})[日号]?/, (m) => new Date(+m[1], m[2] - 1, +m[3]));
  take(/(\d{1,2})月(\d{1,2})[日号]?/, (m) => future(new Date(y, m[1] - 1, +m[2])));
  take(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\b/i, (m) => future(new Date(y, MONTHS[m[2].toLowerCase().slice(0, 4)] ? MONTHS[m[2].toLowerCase().slice(0, 4)] - 1 : MONTHS[m[2].toLowerCase().slice(0, 3)] - 1, +m[1])));
  take(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, (m) => future(new Date(y, MONTHS[m[1].toLowerCase().slice(0, 3)] - 1, +m[2])));
  take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => new Date(m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : y, m[2] - 1, +m[1])); // D/M (Malaysia/UK style)
  take(/(大后天)/, () => addDays(now, 3));
  take(/(后天|day after tomorrow)/i, () => addDays(now, 2));
  take(/(明天|明日|tomorrow)/i, () => addDays(now, 1));
  take(/(今天|今日|今晚|tonight|today)/i, () => now);
  take(/(\d{1,2})\s*(?:天后|days? later|days?)\b|in\s+(\d{1,2})\s+days?/i, (m) => addDays(now, +(m[1] || m[2])));
  take(/(?:in\s+)?(\d)\s*(?:weeks?|周后|个星期后|星期后)/i, (m) => addDays(now, 7 * m[1]));
  // Next/this weekday
  if (!date) {
    for (const [d, re] of DAY_WORDS) {
      re.lastIndex = 0;
      const m = rest.match(new RegExp('(下(?:个)?|next\\s+|this\\s+|本|这)?\\s*' + re.source, 'i'));
      if (m) {
        const mondayOffset = (x) => (x + 6) % 7; // Mon=0 … Sun=6
        const thisWeekMon = addDays(now, -mondayOffset(now.getDay()));
        let target;
        if (m[1] && /下|next/i.test(m[1])) target = addDays(thisWeekMon, 7 + mondayOffset(d));
        else if (m[1]) { target = addDays(thisWeekMon, mondayOffset(d)); if (dkey(target) < dkey(now)) target = addDays(target, 7); }
        else { let diff = (d - now.getDay() + 7) % 7; if (diff === 0) diff = 7; target = addDays(now, diff); }
        date = dkey(target);
        rest = rest.replace(m[0], ' ');
        break;
      }
    }
  }
  return { date, rest };
}

// Returns { times: ['HH:MM', ...], rest }
export function findTimes(text) {
  let rest = text;
  const times = [];
  const hourFix = (h, mer, ctx) => {
    h = +h;
    const pm = /pm|p\.m|下午|晚上|傍晚|中午/i.test(mer || '') || /下午|晚上|傍晚/.test(ctx || '');
    const am = /am|a\.m|上午|早上|早/i.test(mer || '');
    if (pm && h < 12 && !(/中午/.test(mer || '') && h >= 11)) h += 12;
    if (am && h === 12) h = 0;
    return h;
  };
  const minOf = (mm, half, q1, q3) => (half ? 30 : q1 ? 15 : q3 ? 45 : mm ? +mm : 0);
  const T = '(上午|早上|中午|下午|晚上|傍晚)?\\s*(\\d{1,2})(?:[:：.](\\d{2})|\\s*点\\s*(?:(\\d{1,2})\\s*分?|(半)|(一刻)|(三刻))?)?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?';
  const range = new RegExp('(?<![\\w\\d/-])' + T + '\\s*(?:-|–|—|~|～|to|until|till|到|至)\\s*' + T + '(?![\\d/])', 'i');
  let m = rest.match(range);
  if (m) {
    const mer1 = m[1] || m[8], mer2 = m[9] || m[16] || (m[8] ? null : null);
    let h1 = hourFix(m[2], mer1 || (m[16] && !m[8] ? m[16] : ''), '');
    let h2 = hourFix(m[10], mer2 || mer1 || '', '');
    const hasMarker = mer1 || mer2 || m[3] || m[11];
    if (!mer1 && !mer2) { if (h1 < 7) h1 += 12; if (h2 < 7 || h2 < h1) h2 += 12; }
    if (h2 < h1 && h2 < 12) h2 += 12;
    if (h1 <= 23 && h2 <= 24 && (hasMarker || /到|至|to|-|–/.test(m[0]))) {
      times.push(fromMin(h1 * 60 + minOf(m[3] || m[4], m[5], m[6], m[7])));
      times.push(fromMin(Math.min(h2, 23) * 60 + minOf(m[11] || m[12], m[13], m[14], m[15])));
      rest = rest.replace(m[0], ' ');
    }
  }
  const single = new RegExp('(?<![\\w\\d/-])(上午|早上|中午|下午|晚上|傍晚)?\\s*(\\d{1,2})(?:([:：.])(\\d{2})|\\s*(点)\\s*(?:(\\d{1,2})\\s*分?|(半)|(一刻)|(三刻))?)?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?(?![\\d/])', 'gi');
  let s;
  while ((s = single.exec(rest)) && times.length < 2) {
    const marked = s[1] || s[3] || s[5] || s[10];
    if (!marked) continue;
    const h = hourFix(s[2], s[1] || s[10], '');
    if (h > 23) continue;
    times.push(fromMin(h * 60 + minOf(s[4] || s[6], s[7], s[8], s[9])));
    rest = rest.replace(s[0], ' ');
    single.lastIndex = 0;
  }
  return { times, rest };
}

function grab(text, res) {
  for (const re of res) { const m = text.match(re); if (m) return { val: m[1].trim(), rest: text.replace(m[0], ' ') }; }
  return { val: '', rest: text };
}

const STOP = /\b(every|each|weekly|class|lecture|tutorial|lab|from|on|and|the|a|an|at|in|due|by|is|exam|test|quiz|assignment|homework|submit|deadline|of|for|to|until|o'?clock)\b|每周|每星期|每个星期|每|上课|课程|课|从|到|至|在|于|的|有|交|截止|作业|考试|测验|时间|地点|是|和|，|,|。|\.|；|;|：|:/gi;
const clean = (s) => s.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
const STOP_LIGHT = /\b(due|by|submit|deadline|on|at|is|until)\b|截止|要交|交|的|，|,|。|；|;/gi;
const cleanLight = (s) => s.replace(STOP_LIGHT, ' ').replace(/\s+/g, ' ').trim();
const fixLoc = (v) => v.replace(/^(?:(?:at|in|on|room)\s+)+/i, '').trim();
const ROOM = /(?<![A-Za-z0-9])([A-Z]{1,4}-?\d{1,4}[A-Z]?)(?![A-Za-z0-9])/;

export function parseCourse(input) {
  let text = cnDigits(input);
  const out = { name: '', code: '', start: '', end: '', location: '', lecturer: '', days: [] };
  const c = findCode(text); if (c) { out.code = c.code; text = text.replace(c.raw, ' '); }
  let r = grab(text, [/(?:lecturer|teacher|prof(?:essor)?|tutor|by|with)\s+((?:dr\.?|mr\.?|ms\.?|mrs\.?|madam|prof\.?)?\s*[A-Za-z][\w.]*(?:\s+[A-Z][\w.]*)?)/i, /(?:老师|讲师|教授)[:：\s]*([一-龥A-Za-z.]{1,10})/, /([一-龥]{1,3}(?:老师|教授|讲师))/]);
  out.lecturer = r.val; text = r.rest;
  const t = findTimes(text); text = t.rest; [out.start = '', out.end = ''] = t.times;
  if (out.start && !out.end) out.end = fromMin(Math.min(toMin(out.start) + 120, 23 * 60 + 59));
  const d = findDays(text); out.days = d.days; text = d.rest;
  r = grab(text, [/(?:地点|教室|课室|地方)[:：\s]*([^\s,，。;；]+)/, /在\s*([A-Za-z0-9一-龥\-]{2,16}?)(?:上课|上|，|,|。|\s|$)/, /\b(?:at|in|room|venue|location|hall)\s+([A-Za-z0-9][A-Za-z0-9\- ]{0,18}?)(?=\s+(?:with|by|lecturer|on|from|every|taught)\b|[,.;]|$)/i]);
  out.location = fixLoc(r.val); text = r.rest;
  if (!out.location) { const m = text.match(ROOM); if (m) { out.location = m[1]; text = text.replace(m[0], ' '); } }
  out.name = clean(text).slice(0, 60);
  if (!out.name && out.code) out.name = out.code;
  return out;
}

export function parseAssignment(input) {
  let text = cnDigits(input);
  const out = { course: '', title: '', dueDate: '', dueTime: '', desc: '' };
  const c = findCode(text); if (c) { out.course = c.code; text = text.replace(c.raw, ' '); }
  const dt = findDate(text); out.dueDate = dt.date || ''; text = dt.rest;
  const t = findTimes(text); out.dueTime = t.times[0] || ''; text = t.rest;
  out.title = cleanLight(text).slice(0, 80);
  return out;
}

export function parseExam(input) {
  let text = cnDigits(input);
  const out = { course: '', date: '', time: '', location: '', notes: '' };
  const c = findCode(text); if (c) { out.course = c.code; text = text.replace(c.raw, ' '); }
  const dt = findDate(text); out.date = dt.date || ''; text = dt.rest;
  const t = findTimes(text); out.time = t.times[0] || ''; text = t.rest;
  const r = grab(text, [/(?:地点|考场|教室)[:：\s]*([^\s,，。;；]+)/, /在\s*([A-Za-z0-9一-龥\-]{2,16}?)(?:考试|考|，|,|。|\s|$)/, /\b(?:at|in|room|venue|hall)\s+([A-Za-z0-9][A-Za-z0-9\- ]{0,18}?)(?=\s+(?:on|from|at)\b|[,.;]|$)/i]);
  out.location = fixLoc(r.val); text = r.rest;
  const left = clean(text);
  if (!out.course) out.course = left.slice(0, 40); else out.notes = left;
  return out;
}

export function parseTodo(input) {
  let text = cnDigits(input);
  const dt = findDate(text); text = dt.rest;
  let priority = 'med';
  if (/(urgent|important|high priority|紧急|重要|优先)/i.test(text)) priority = 'high';
  else if (/(low priority|不急|有空)/i.test(text)) priority = 'low';
  return { title: clean(text.replace(/(urgent|important|high priority|low priority|紧急|重要|优先|不急|有空)/gi, ' ')) || input.trim(), due: dt.date || '', priority };
}

// OCR: split the recognised text into course blocks, each parsed into a candidate row
export function parseTimetableText(raw) {
  const lines = raw.split(/\n+/).map((l) => l.replace(/[|_]{2,}/g, ' ').trim()).filter((l) => l.length > 1);
  const blocks = [];
  let cur = null, curDays = [];
  for (const line of lines) {
    const dayOnly = findDays(line);
    const isHeader = dayOnly.days.length && clean(dayOnly.rest).replace(/[\d\s:-]/g, '').length < 3 && !findCode(line);
    if (isHeader) { curDays = dayOnly.days.length === 1 ? dayOnly.days : []; cur = null; continue; }
    const code = findCode(line);
    const hasTime = findTimes(cnDigits(line)).times.length > 0;
    if (code || (!cur && hasTime)) { cur = { text: line, days: curDays.slice(), n: 1 }; blocks.push(cur); }
    else if (cur && cur.n < 4) { cur.text += ' ' + line; cur.n++; }
  }
  const rows = [];
  for (const b of blocks) {
    const p = parseCourse(b.text);
    if (!p.days.length) p.days = b.days;
    if (!p.code && !p.start) continue;
    const dup = rows.find((r) => r.code && r.code === p.code && r.start === p.start && r.end === p.end);
    if (dup) { dup.days = [...new Set([...dup.days, ...p.days])].sort(); continue; }
    rows.push(p);
  }
  return rows;
}

export const _test = { cnDigits, pad };
