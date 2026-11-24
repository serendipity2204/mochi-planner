// Cute hand-drawn style icons (rounded cocoa outlines + soft honey fill) and little pig stickers.
// Emoji used across the app are swapped for these icons automatically (see decorate()).

const F = 'class="f"'; // soft accent fill
const I = {
  home: `<path ${F} d="M6 10.6V18a2.5 2.5 0 0 0 2.5 2.5h7A2.5 2.5 0 0 0 18 18v-7.4"/><path d="M3.6 11.6 12 4.2l8.4 7.4"/><path d="M12 17.6s-2.6-1.5-2.6-3.2a1.4 1.4 0 0 1 2.6-.8 1.4 1.4 0 0 1 2.6.8c0 1.7-2.6 3.2-2.6 3.2Z" fill="currentColor" stroke="none"/>`,
  calendar: `<rect ${F} x="3.8" y="5.6" width="16.4" height="14.8" rx="4"/><path d="M8.2 3.6v3.6M15.8 3.6v3.6M3.8 10.4h16.4"/><circle cx="9" cy="15.2" r="1.1" fill="currentColor" stroke="none"/><path d="M13.2 15.4l1.4 1.3 2.4-2.6"/>`,
  plus: `<path d="M12 5.5v13M5.5 12h13" stroke-width="2.8"/>`,
  tasks: `<rect ${F} x="5" y="4.6" width="14" height="16" rx="3.5"/><rect x="9" y="2.8" width="6" height="3.6" rx="1.6" fill="var(--card)"/><path d="M8.6 12.8l2.2 2.2 4.6-4.8"/>`,
  timer: `<circle ${F} cx="12" cy="13.6" r="7"/><path d="M12 6.6c-.6-1.6-2.4-2.4-4-1.8M12 6.6c.6-1.6 2.4-2.4 4-1.8M12 6.6V4.4"/><path d="M12 13.6v-3M12 13.6l2.3 1.4"/>`,
  pig: `<path ${F} d="M5.2 8.6 4.6 4.8l3.6 1.6M18.8 8.6l.6-3.8-3.6 1.6"/><circle ${F} cx="12" cy="13" r="7.6"/><ellipse cx="12" cy="15" rx="3" ry="2.1" fill="var(--card)"/><circle cx="11" cy="15" r=".55" fill="currentColor" stroke="none"/><circle cx="13" cy="15" r=".55" fill="currentColor" stroke="none"/><circle cx="8.8" cy="11.4" r=".9" fill="currentColor" stroke="none"/><circle cx="15.2" cy="11.4" r=".9" fill="currentColor" stroke="none"/>`,
  gear: `<circle ${F} cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/>`,
  search: `<circle ${F} cx="10.8" cy="10.8" r="6.4"/><path d="M15.6 15.6 20 20"/><path d="M8 9.2a3 3 0 0 1 2.4-1.8" opacity=".7"/>`,
  mic: `<rect ${F} x="8.8" y="3.2" width="6.4" height="11" rx="3.2"/><path d="M5.8 11.2a6.2 6.2 0 0 0 12.4 0M12 17.4v3.2M9 20.6h6"/>`,
  camera: `<rect ${F} x="3.4" y="7" width="17.2" height="12.8" rx="3.8"/><path d="M8.4 7l1.4-2.6h4.4L15.6 7"/><circle cx="12" cy="13.3" r="3.3" fill="var(--card)"/><circle cx="17.4" cy="10" r=".7" fill="currentColor" stroke="none"/>`,
  bell: `<path ${F} d="M6.2 16.4V11a5.8 5.8 0 0 1 11.6 0v5.4l1.6 1.8H4.6Z"/><path d="M10 20.4a2.1 2.1 0 0 0 4 0M12 3.2v1.9"/>`,
  books: `<rect ${F} x="3.6" y="5.4" width="4.8" height="14.6" rx="1.3"/><path d="M3.6 8.6h4.8M3.6 16.6h4.8"/><rect x="9.6" y="3.6" width="4.6" height="16.4" rx="1.3" fill="var(--card)"/><path d="M11.9 7v3.4"/><path ${F} d="m15.4 6.4 3.6-1 3.6 13.8-3.6 1Z"/><path d="M2.6 20.4h18.8"/>`,
  homework: `<path ${F} d="M6.4 3.6h8.4l3.6 3.6v6.4M18.4 17.6v.8a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2"/><path d="M8 9h6M8 12.4h3.6"/><path d="M20.6 10.6a1.4 1.4 0 0 1 2 2l-6.2 6.2-2.8.8.8-2.8Z" fill="var(--card)"/>`,
  checklist: `<rect ${F} x="3.8" y="3.8" width="16.4" height="16.4" rx="4.6"/><path d="M8 12.2l2.8 2.8 5.4-5.8" stroke-width="2.3"/>`,
  dress: `<path ${F} d="M9.2 3.6 8 8.6l1.8 1.6L5.6 20h12.8l-4.2-9.8L16 8.6l-1.2-5"/><path d="M9.2 3.6c.8 1.2 4.8 1.2 5.6 0"/>`,
  close: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-width="2.4"/>`,
  dots: `<circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none"/>`,
  back: `<path d="M14.6 5.6 8.2 12l6.4 6.4" stroke-width="2.6"/>`,
  fwd: `<path d="M9.4 5.6 15.8 12l-6.4 6.4" stroke-width="2.6"/>`,
  minus: `<path d="M6 12h12" stroke-width="2.8"/>`,
  send: `<path ${F} d="M4 11.4 19.6 4.6 15 20.2l-3.4-6.4Z"/><path d="M11.6 13.8 19.6 4.6"/>`,
  chat: `<path ${F} d="M5.6 5h12.8A2.6 2.6 0 0 1 21 7.6v7.2a2.6 2.6 0 0 1-2.6 2.6H11l-4.4 3.2v-3.2h-1A2.6 2.6 0 0 1 3 14.8V7.6A2.6 2.6 0 0 1 5.6 5Z"/><circle cx="8.4" cy="11.2" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="11.2" r="1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="11.2" r="1" fill="currentColor" stroke="none"/>`,
  friends: `<circle ${F} cx="8.6" cy="8.4" r="3.2"/><circle ${F} cx="16" cy="9.6" r="2.6"/><path d="M3.6 19.6c.6-3.4 2.6-5.2 5-5.2s4.4 1.8 5 5.2M14 14.6c2.6-.6 5.2.8 6.2 4.4"/>`,
  cloud: `<path ${F} d="M7.4 18.6h9.8a4 4 0 0 0 .6-7.9 5.6 5.6 0 0 0-10.8 1.4 3.3 3.3 0 0 0 .4 6.5Z"/>`,
  lock: `<rect ${F} x="5" y="10.4" width="14" height="10" rx="3"/><path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4M12 14.4v2.2"/>`,
  sound: `<path ${F} d="M4.4 9.6h3.2L12 5.8v12.4l-4.4-3.8H4.4Z"/><path d="M15.4 9a4.2 4.2 0 0 1 0 6M17.8 6.6a7.6 7.6 0 0 1 0 10.8"/>`,
  bulb: `<path ${F} d="M8.6 15.6a6 6 0 1 1 6.8 0v1.4H8.6Z"/><path d="M9.6 20h4.8M10.6 12.4l1.4 1.4 1.4-1.4"/>`,
  info: `<circle ${F} cx="12" cy="12" r="8.4"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r="1.1" fill="currentColor" stroke="none"/>`,
  palette: `<path ${F} d="M12 3.6a8.4 8.4 0 0 0 0 16.8c1.2 0 1.8-.8 1.6-1.8-.3-1.4.6-2.4 2-2.4h1.6a3.2 3.2 0 0 0 3.2-3.2A9 9 0 0 0 12 3.6Z"/><circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none"/><circle cx="11" cy="7.6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.4" cy="8.6" r="1.2" fill="currentColor" stroke="none"/>`,
  globe: `<circle ${F} cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.4 3.4 5.2 3.4 8.4s-1 6-3.4 8.4c-2.4-2.4-3.4-5.2-3.4-8.4s1-6 3.4-8.4Z"/>`,
  widget: `<rect ${F} x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect ${F} x="13" y="13" width="7" height="7" rx="2.2"/>`,
  stats: `<rect ${F} x="4.4" y="12" width="3.8" height="8" rx="1.4"/><rect x="10.1" y="7.6" width="3.8" height="12.4" rx="1.4"/><rect ${F} x="15.8" y="4" width="3.8" height="16" rx="1.4"/>`,
  alarm: `<circle ${F} cx="12" cy="13" r="7"/><path d="M12 9.6V13l2.2 1.6M4.6 5.6l2.6-2M19.4 5.6l-2.6-2"/>`,
  user: `<circle ${F} cx="12" cy="8.6" r="3.8"/><path d="M4.8 20c.8-4 3.6-6 7.2-6s6.4 2 7.2 6"/>`,
  refresh: `<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.3M19.6 4.4v3.8h-3.8"/>`,
  note: `<path ${F} d="M6.6 3.8h8.2l4 4v10.6a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z"/><path d="M14.6 3.8v4.2h4.2M8.4 12.4h7.2M8.4 16h4.6"/>`,
  fire: `<path ${F} d="M12 20.6c-3.6 0-6-2.4-6-5.6 0-3 2.2-4.6 3.2-7.4.8 1.4 1.6 2 2.6 2.2.2-2.4 1.6-4.6 3.4-5.8-.4 2.6.8 4.4 1.8 5.8 1 1.4 1 2.6 1 3.4 0 4.6-2.6 7.4-6 7.4Z"/>`,
  tag: `<path ${F} d="M3.8 11.6V5.2a1.4 1.4 0 0 1 1.4-1.4h6.4l8.4 8.4a1.6 1.6 0 0 1 0 2.2l-6 6a1.6 1.6 0 0 1-2.2 0Z"/><circle cx="8.2" cy="8.2" r="1.3" fill="currentColor" stroke="none"/>`,
  sparkle: `<path ${F} d="M12 3.4c.6 4 2.4 5.8 6.6 6.6-4.2.8-6 2.6-6.6 6.6-.6-4-2.4-5.8-6.6-6.6 4.2-.8 6-2.6 6.6-6.6Z"/><path d="M18.6 16.4c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2Z"/>`,
  moon: `<path ${F} d="M19.4 14.6A7.8 7.8 0 1 1 9.4 4.6a6.2 6.2 0 0 0 10 10Z"/>`,
  key: `<circle ${F} cx="8" cy="14.6" r="4"/><path d="M10.8 11.8 19 3.6M16.6 6l2.4 2.4M14.4 8.2l1.8 1.8"/>`,
  phone: `<rect ${F} x="6.6" y="2.8" width="10.8" height="18.4" rx="3"/><path d="M10.6 18h2.8"/>`,
  ticket: `<path ${F} d="M3.6 8.2a1.6 1.6 0 0 1 1.6-1.6h13.6a1.6 1.6 0 0 1 1.6 1.6v1.6a2.2 2.2 0 0 0 0 4.4v1.6a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6v-1.6a2.2 2.2 0 0 0 0-4.4Z"/><path d="M14.2 6.6v10.8" stroke-dasharray="1.6 1.8"/>`,
  target: `<circle ${F} cx="11" cy="13" r="7.6"/><circle cx="11" cy="13" r="4.2" fill="var(--card)"/><circle cx="11" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M11 13 19.2 4.8M16.6 4.4l2.6.4.4 2.6"/>`,
  pencil: `<path ${F} d="M15.4 4.6a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L9 19l-4.4 1 1-4.4Z"/><path d="M13.6 6.4l4 4"/>`,
  play: `<path ${F} d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6Z"/>`,
  rocket: `<path ${F} d="M12 3.2c3.2 2.2 4.6 5.4 4.2 9.4l-1.8 3.2H9.6l-1.8-3.2C7.4 8.6 8.8 5.4 12 3.2Z"/><circle cx="12" cy="9.6" r="1.6" fill="var(--card)"/><path d="M7.8 12.6 5 15.4l2.8.8M16.2 12.6l2.8 2.8-2.8.8M10.6 18.6 12 21l1.4-2.4"/>`,
};

// emoji (without variation selector) -> icon
const EMOJI = {
  '🏠': 'home', '📅': 'calendar', '📆': 'calendar', '🗓': 'calendar', '＋': 'plus', '+': 'plus', '➕': 'plus', '📝': 'homework', '📋': 'tasks', '⏱': 'timer', '🍅': 'timer', '🐷': 'pig',
  '⚙': 'gear', '🔍': 'search', '🎤': 'mic', '📷': 'camera', '🔔': 'bell', '📚': 'books', '📖': 'books', '👗': 'dress', '✕': 'close', '⋯': 'dots',
  '‹': 'back', '›': 'fwd', '−': 'minus', '➤': 'send', '💬': 'chat', '👫': 'friends', '☁': 'cloud', '🔒': 'lock', '🔊': 'sound', '💡': 'bulb',
  'ℹ': 'info', '🎨': 'palette', '🌐': 'globe', '🧩': 'widget', '📊': 'stats', '⏰': 'alarm', '👤': 'user', '🔄': 'refresh', '🗒': 'note', '📒': 'note',
  '🔥': 'fire', '🏷': 'tag', '✨': 'sparkle', '🌙': 'moon', '🔑': 'key', '📱': 'phone', '📲': 'phone', '🎟': 'ticket', '🚀': 'rocket', '🎯': 'target', '✏': 'pencil', '▶': 'play', '✅': 'checklist', '☑': 'checklist', '🗂': 'note', '📦': 'cloud', '💾': 'cloud', '👀': 'search', '👁': 'search', '🎵': 'sound', '📳': 'phone', '📣': 'bell', '🕒': 'alarm', '🕐': 'alarm',
};

export function icon(name, size = 22) {
  const body = I[name];
  if (!body) return '';
  return `<svg class="ico ico-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
const norm = (s) => s.replace(/️/g, '').trim();
export const iconForEmoji = (e) => EMOJI[norm(e)] || null;

// Little pig peeking over the top edge of a card (sticker)
export function peekPig() {
  // card edge sits at y=66; the head is behind it, the paws rest on top of it
  return `<svg class="peek-pig" viewBox="0 0 120 80" aria-hidden="true">
    <g stroke="#5A3C2E" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M33 34 27 12l18 9M87 34l6-22-18 9" fill="#F6B8C8"/>
      <path d="M22 66c0-24 17-42 38-42s38 18 38 42Z" fill="#FBD3DD"/>
      <ellipse cx="60" cy="55" rx="11" ry="7.5" fill="#F6B8C8"/>
      <ellipse cx="37" cy="69" rx="12" ry="8.5" fill="#FFFDF8"/>
      <ellipse cx="83" cy="69" rx="12" ry="8.5" fill="#FFFDF8"/>
      <path d="M33 66v5M41 66v5M79 66v5M87 66v5" stroke-width="2"/>
    </g>
    <circle cx="46" cy="44" r="3.4" fill="#5A3C2E"/><circle cx="74" cy="44" r="3.4" fill="#5A3C2E"/>
    <circle cx="56.5" cy="55" r="2.2" fill="#5A3C2E"/><circle cx="63.5" cy="55" r="2.2" fill="#5A3C2E"/>
    <ellipse cx="36" cy="52" rx="5.5" ry="3.2" fill="#F7A3B8" opacity=".75"/><ellipse cx="84" cy="52" rx="5.5" ry="3.2" fill="#F7A3B8" opacity=".75"/>
    <path d="M60 24c-1-7 2-12 9-14-1 6-4 10-9 14Z" fill="#9CCB7E" stroke="#5A3C2E" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`;
}

// ---------- swap emoji for icons in the places that act as icons ----------
const SINGLE = '.nav-item .ni, .icon-btn, .topbar .back, .set-row > .ic, .tile .ti, .nav-plus, .quick-grid button > span';
const LEADING = '.card-title, .set-group-title, .btn';
function swapWhole(el) {
  if (el.dataset.iconified) return;
  if (el.children.length && !(el.children.length === 1 && el.firstElementChild.classList.contains('badge'))) return;
  const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
  const name = iconForEmoji(text);
  if (!name) return;
  el.dataset.iconified = '1';
  [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => n.remove());
  el.insertAdjacentHTML('afterbegin', icon(name, el.classList.contains('nav-plus') ? 30 : el.closest('.quick-grid') ? 30 : 22));
}
const LEAD = /^\s*(\p{Extended_Pictographic}️?)\s*/u;
function swapLeading(el) {
  if (el.dataset.iconified) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  if (!node) return;
  const m = node.textContent.match(LEAD);
  if (!m) return;
  const name = iconForEmoji(m[1]);
  if (!name) return;
  el.dataset.iconified = '1';
  node.textContent = node.textContent.slice(m[0].length);
  const span = document.createElement('span');
  span.className = 'title-ico';
  span.innerHTML = icon(name, 20);
  node.parentNode.insertBefore(span, node);
}

export function decorate(root) {
  if (!root || root.nodeType !== 1) return;
  if (root.matches?.(SINGLE)) swapWhole(root);
  root.querySelectorAll(SINGLE).forEach(swapWhole);
  if (root.matches?.(LEADING)) swapLeading(root);
  root.querySelectorAll(LEADING).forEach(swapLeading);
}

export function initIcons() {
  decorate(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) if (n.nodeType === 1) decorate(n);
      if (m.type === 'characterData' || (m.type === 'childList' && m.target.nodeType === 1 && m.target.matches?.(SINGLE))) {
        const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (el?.matches?.(SINGLE)) { delete el.dataset.iconified; swapWhole(el); }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
