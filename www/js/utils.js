// Generic helpers: ids, escaping, dates & times
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const pad = (n) => String(n).padStart(2, '0');

// Local date key "YYYY-MM-DD"
export const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDate = (k) => {
  if (!k) return null;
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameDay = (a, b) => dkey(a) === dkey(b);

export const toMin = (hhmm) => { if (!hhmm) return 0; const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

// Combine date key + "HH:MM" into Date
export const at = (k, hhmm = '23:59') => { const d = parseDate(k); if (!d) return null; const m = toMin(hhmm); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

export const weekStart = (d, startDay = 1) => { const x = startOfDay(d); const diff = (x.getDay() - startDay + 7) % 7; return addDays(x, -diff); };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export const fmtBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

export const hashStr = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

export async function sha256(text) {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'h' + hashStr(text); // fallback for non-secure contexts
}

export const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
export const dataURLToBlob = async (url) => (await fetch(url)).blob();

// Resize an image file to keep storage small
export async function shrinkImage(file, max = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 800000) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return file; }
}

export const COURSE_COLORS = ['#F48FB1', '#FFB74D', '#81C784', '#64B5F6', '#BA68C8', '#4DB6AC', '#FF8A65', '#9575CD', '#F06292', '#AED581'];
export const colorFor = (s) => COURSE_COLORS[hashStr(s) % COURSE_COLORS.length];
