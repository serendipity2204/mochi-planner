// The pig's home: pick a house, decorate the living room & bedroom, and a coin shop.
import { store, commit, defaultState } from '../store.js';
import { t } from '../i18n.js';
import { esc, uid } from '../utils.js';
import { on, go, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, $, tap } from '../ui.js';
import { pigSVG } from '../pig.js';
import { pigProps } from '../data.js';
import { playSound } from '../native.js';
import { ITEMS, WALLS, FLOORS, HOUSES, ROOMS, CATS as ITEM_CATS, itemById, itemSVG, sprite, roomBG, swatch, houseSVG, clampPos, toScreen, ROOM } from '../homeart.js';

const S = () => store.state;
export function H() {
  const s = S();
  if (!s.home?.rooms) s.home = defaultState().home;
  for (const r of ROOMS) if (!s.home.rooms[r]) s.home.rooms[r] = { wall: 'cream', floor: 'wood', items: [] };
  return s.home;
}
export const coins = () => S().rewards.coins || 0;
const coinPill = () => `<button class="coin-pill" data-act="home.shop">🪙 <b>${coins()}</b></button>`;
const placedCount = (id) => ROOMS.reduce((n, r) => n + H().rooms[r].items.filter((x) => x.id === id).length, 0);
const freeCount = (id) => (H().owned[id] || 0) - placedCount(id);

function spend(price) {
  if (coins() < price) { toast(t('home.notEnough', { n: price - coins() }), 'err'); return false; }
  S().rewards.coins = coins() - price;
  if (S().settings.sound.app) playSound('coin');
  return true;
}

// ================= House (outside) =================
export function renderHouse() {
  const h = H();
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('home.title')}</h1>${coinPill()}</div>
    <div class="house-scene">
      <div class="hs-sun"></div><div class="hs-cloud c1"></div><div class="hs-cloud c2"></div>
      <button class="hs-house" data-act="home.enter" data-room="living" aria-label="${t('home.enter')}">${houseSVG(h.house)}</button>
      <div class="hs-pig">${pigSVG(pigProps({ size: 84, mood: 'cheer' }))}</div>
      <div class="hs-grass"></div>
    </div>
    <p class="center small muted" style="margin:8px 0 14px">${t('home.tapHouse')}</p>
    <div class="grid-2" style="grid-template-columns:1fr 1fr">${ROOMS.map((r) => `<button class="card room-card" data-act="home.enter" data-room="${r}">
      <div class="room-mini">${roomScene(r, { mini: true })}</div><b>${t('home.room.' + r)}</b></button>`).join('')}</div>
    <div class="card" style="margin-top:14px"><div class="card-title">🏡 ${t('home.houseStyle')}</div>
      <div class="house-pick">${HOUSES.map((x) => {
        const own = h.houses.includes(x.id);
        return `<button class="hp ${h.house === x.id ? 'on' : ''}" data-act="home.house" data-id="${x.id}">${houseSVG(x.id)}<span>${t('home.house.' + x.id)}</span><small>${own ? (h.house === x.id ? t('home.using') : t('home.owned')) : `🪙 ${x.price}`}</small></button>`;
      }).join('')}</div></div>
    <button class="btn primary block" style="margin-top:14px" data-act="home.shop">🛍️ ${t('home.shop')}</button>
    <p class="tiny muted center" style="margin-top:10px">${t('home.earnHint')}</p>
  </div>`;
}

// ================= Room (inside) =================
let editing = false, selected = null, wanderTimer = null, invTab = 'items';
const SK = 26.565; // wall slant (degrees)
const SCALE = 1.65; // furniture size relative to the room
/** style for a placed item (positions are stored as % of the 400x400 room picture) */
function itemStyle(it) {
  const a = itemById(it.id), sp = sprite(it.id); if (!a || !sp) return null;
  const s = (it.s || 1) * SCALE;
  const [sx, sy, side] = clampPos(a, (it.x ?? 50) * 4, (it.y ?? 80) * 4, SCALE * (it.s || 1));
  it.x = Math.round(sx / 4 * 10) / 10; it.y = Math.round(sy / 4 * 10) / 10;
  const w = sp.w * s, ox = (it.f ? sp.w - sp.ox : sp.ox) * s, oy = sp.oy * s;
  const z = a.flat ? 5 : a.zone === 'wall' ? 8 : 100 + Math.round(sy);
  const tf = a.zone === 'wall' ? `skewY(${side === 'L' ? -SK : SK}deg)${it.f ? ' scaleX(-1)' : ''}` : it.f ? 'scaleX(-1)' : 'none';
  return `left:${(sx - ox) / 4}%;top:${(sy - oy) / 4}%;width:${w / 4}%;z-index:${z};transform:${tf};transform-origin:${(ox / w) * 100}% 100%;`;
}
function itemHTML(it, room) {
  const st = itemStyle(it); if (!st) return '';
  return `<div class="ritem ${selected === it.uid ? 'sel' : ''}" data-uid="${it.uid}" data-room="${room}" style="${st}">${itemSVG(itemById(it.id))}</div>`;
}
const pigSpot = () => { const [x, y] = toScreen(40 + Math.random() * 140, 40 + Math.random() * 140); return [x / 4, y / 4]; };
function roomScene(room, { mini = false } = {}) {
  const r = H().rooms[room];
  const [px, py] = [50, 78];
  return `<div class="room ${mini ? 'mini' : ''} ${editing && !mini ? 'editing' : ''}" data-room="${room}">${roomBG(r.wall, r.floor)}${r.items.map((it) => itemHTML(it, room)).join('')}
    ${mini ? '' : `<div class="room-pig" style="left:${px}%;top:${py}%;z-index:${100 + py * 4}">${pigSVG(pigProps({ size: 60, mood: 'happy' }))}</div><div class="room-bubble hidden"></div>`}</div>`;
}

export function renderRoom(params = {}) {
  const room = ROOMS.includes(params.room) ? params.room : 'living';
  const sel = selected && H().rooms[room].items.find((x) => x.uid === selected);
  const inv = ITEM_CATS.flatMap((c) => ITEMS.filter((a) => a.cat === c && freeCount(a.id) > 0));
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('home.room.' + room)}</h1>${coinPill()}</div>
    <div class="seg" style="margin-bottom:12px">${ROOMS.map((r) => `<button class="${r === room ? 'on' : ''}" data-act="home.enter" data-room="${r}" data-replace="1">${t('home.room.' + r)}</button>`).join('')}</div>
    ${roomScene(room)}
    ${editing ? `
      <div class="room-actions ${sel ? '' : 'muted'}">${sel ? `<b class="grow ellipsis">${t('home.item.' + sel.id)}</b>
        <button class="icon-btn sm" data-act="home.it" data-op="flip" title="${t('home.flip')}">⇋</button>
        <button class="icon-btn sm" data-act="home.it" data-op="smaller">−</button><button class="icon-btn sm" data-act="home.it" data-op="bigger">＋</button>
        <button class="btn sm" data-act="home.it" data-op="store">${t('home.putAway')}</button>` : `<span class="small">${t('home.dragHint')}</span>`}</div>
      <div class="card inv">
        <div class="seg" style="margin-bottom:10px">${['items', 'wall', 'floor'].map((k) => `<button class="${invTab === k ? 'on' : ''}" data-act="home.inv" data-k="${k}">${t('home.inv.' + k)}</button>`).join('')}</div>
        ${invTab === 'items' ? (inv.length ? `<div class="inv-grid">${inv.map((a) => `<button class="inv-it" data-act="home.place" data-id="${a.id}" data-room="${room}">${itemSVG(a)}<span>${t('home.item.' + a.id)}</span><small>×${freeCount(a.id)}</small></button>`).join('')}</div>` : `<div class="empty">${t('home.invEmpty')}</div>`)
        : `<div class="inv-grid">${(invTab === 'wall' ? H().walls : H().floors).map((id) => `<button class="inv-it ${H().rooms[room][invTab] === id ? 'on' : ''}" data-act="home.surface" data-k="${invTab}" data-id="${id}" data-room="${room}">${swatch(invTab, id)}<span>${t(`home.${invTab}.${id}`)}</span></button>`).join('')}</div>`}
        <div class="row" style="margin-top:12px"><button class="btn grow" data-act="home.shop">🛍️ ${t('home.shop')}</button><button class="btn primary grow" data-act="home.edit">✓ ${t('home.done')}</button></div>
      </div>`
      : `<div class="row" style="margin-top:12px"><button class="btn primary grow" data-act="home.edit">✏️ ${t('home.decorate')}</button><button class="btn grow" data-act="home.shop">🛍️ ${t('home.shop')}</button></div>
         <p class="tiny muted center">${t('home.roomHint')}</p>`}
  </div>`;
}

const LINES = ['home.say1', 'home.say2', 'home.say3', 'home.say4', 'home.say5'];
export function mountRoom(root) {
  const scene = root.querySelector('.room');
  if (!scene) return;
  const room = scene.dataset.room;
  // pig strolls around the room
  const pig = scene.querySelector('.room-pig');
  clearInterval(wanderTimer);
  if (pig && !editing) {
    const walk = () => {
      const [x, y] = pigSpot(), cur = parseFloat(pig.style.left) || 50;
      pig.style.setProperty('--dir', x < cur ? -1 : 1);
      pig.style.left = x + '%'; pig.style.top = y + '%'; pig.style.zIndex = 100 + Math.round(y * 4);
    };
    setTimeout(walk, 600);
    wanderTimer = setInterval(walk, 4200);
    pig.addEventListener('click', () => {
      const b = scene.querySelector('.room-bubble');
      b.textContent = t(LINES[Math.floor(Math.random() * LINES.length)]);
      b.style.left = pig.style.left; b.style.top = `calc(${pig.style.top} - 26%)`; b.classList.remove('hidden');
      pig.classList.remove('pig-jump'); void pig.offsetWidth; pig.classList.add('pig-jump'); tap();
      clearTimeout(b._t); b._t = setTimeout(() => b.classList.add('hidden'), 2600);
    });
  } else if (pig) pig.style.display = 'none';
  if (!editing) return;
  // drag & drop furniture
  let drag = null;
  scene.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.ritem'); if (!el) return;
    const it = H().rooms[room].items.find((x) => x.uid === el.dataset.uid); if (!it) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const r = scene.getBoundingClientRect();
    drag = { el, it, r, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, moved: false };
  });
  scene.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 400 / drag.r.width;
    const dx = (e.clientX - drag.sx) * k, dy = (e.clientY - drag.sy) * k;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 5) drag.moved = true;
    drag.it.x = (drag.ox * 4 + dx) / 4; drag.it.y = (drag.oy * 4 + dy) / 4;
    const st = itemStyle(drag.it); if (st) drag.el.setAttribute('style', st);
  });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { selected = selected === d.it.uid ? null : d.it.uid; rerender(); return; }
    selected = d.it.uid; commit('home'); rerender();
  };
  scene.addEventListener('pointerup', end);
  scene.addEventListener('pointercancel', end);
}
export function unmountRoom() { clearInterval(wanderTimer); }

// ================= Shop =================
const CATS = [...ITEM_CATS, 'paper', 'floor', 'house'];
let shopCat = 'furniture';
export function renderShop(params = {}) {
  if (params.cat && CATS.includes(params.cat)) shopCat = params.cat;
  const h = H();
  let cards = '';
  if (ITEM_CATS.includes(shopCat)) {
    cards = ITEMS.filter((a) => a.cat === shopCat).map((a) => {
      const n = h.owned[a.id] || 0;
      return `<button class="shop-card" data-act="home.buy" data-kind="item" data-id="${a.id}"><div class="shop-art">${itemSVG(a)}</div><b>${t('home.item.' + a.id)}</b>
        <span class="price">🪙 ${a.price}</span>${n ? `<small class="own">${t('home.ownedN', { n })}</small>` : ''}</button>`;
    }).join('');
  } else if (shopCat === 'paper' || shopCat === 'floor') {
    const kind = shopCat === 'paper' ? 'wall' : 'floor';
    const list = kind === 'wall' ? WALLS : FLOORS, have = kind === 'wall' ? h.walls : h.floors;
    cards = list.map((x) => `<button class="shop-card" data-act="home.buy" data-kind="${kind}" data-id="${x.id}"><div class="shop-art swatch">${swatch(kind, x.id)}</div><b>${t(`home.${kind}.${x.id}`)}</b>
      ${have.includes(x.id) ? `<small class="own">${t('home.owned')}</small>` : `<span class="price">🪙 ${x.price}</span>`}</button>`).join('');
  } else {
    cards = HOUSES.map((x) => `<button class="shop-card" data-act="home.buy" data-kind="house" data-id="${x.id}"><div class="shop-art">${houseSVG(x.id)}</div><b>${t('home.house.' + x.id)}</b>
      ${h.houses.includes(x.id) ? `<small class="own">${t('home.owned')}</small>` : `<span class="price">🪙 ${x.price}</span>`}</button>`).join('');
  }
  return `<div class="page">
    <div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('home.shop')}</h1><span class="coin-pill">🪙 <b>${coins()}</b></span></div>
    <div class="chips" style="margin-bottom:12px">${CATS.map((c) => `<button class="chip ${shopCat === c ? 'on' : ''}" data-act="home.cat" data-c="${c}">${t('home.cat.' + c)}</button>`).join('')}</div>
    <div class="shop-grid">${cards}</div>
    <p class="tiny muted center" style="margin-top:14px">${t('home.earnHint')}</p>
  </div>`;
}

async function buy(kind, id) {
  const h = H();
  if (kind === 'item') {
    const a = itemById(id); if (!a) return;
    if (!(await confirmDialog(t('home.buyMsg', { name: t('home.item.' + id), n: a.price }), { title: t('home.buy'), ok: t('home.buyOk') }))) return;
    if (!spend(a.price)) return;
    h.owned[id] = (h.owned[id] || 0) + 1;
    commit('home');
    toast(t('home.bought'));
    rerender();
    return;
  }
  const list = kind === 'wall' ? WALLS : kind === 'floor' ? FLOORS : HOUSES;
  const have = kind === 'wall' ? h.walls : kind === 'floor' ? h.floors : h.houses;
  const x = list.find((y) => y.id === id); if (!x) return;
  if (have.includes(id)) { if (kind === 'house') { h.house = id; commit('home'); toast(t('home.moved')); rerender(); } else toast(t('home.ownedTip')); return; }
  const name = t(kind === 'house' ? 'home.house.' + id : `home.${kind}.${id}`);
  if (!(await confirmDialog(t('home.buyMsg', { name, n: x.price }), { title: t('home.buy'), ok: t('home.buyOk') }))) return;
  if (!spend(x.price)) return;
  have.push(id);
  if (kind === 'house') h.house = id;
  commit('home'); toast(t('home.bought')); rerender();
}

on({
  'home.open': () => go('pighome'),
  'home.shop': () => go('shop'),
  'home.cat': (el) => { shopCat = el.dataset.c; rerender(); },
  'home.buy': (el) => buy(el.dataset.kind, el.dataset.id),
  'home.enter': (el) => { selected = null; if (el.dataset.replace) { go('pigroom', { room: el.dataset.room }); } else { editing = false; go('pigroom', { room: el.dataset.room }); } },
  'home.house': (el) => buy('house', el.dataset.id),
  'home.edit': () => { editing = !editing; selected = null; invTab = 'items'; rerender(); },
  'home.inv': (el) => { invTab = el.dataset.k; rerender(); },
  'home.place': (el) => {
    const a = itemById(el.dataset.id); if (!a || freeCount(a.id) <= 0) return;
    const [sx, sy] = a.zone === 'wall' ? toScreen(0, 60 + Math.random() * 100, 70).map((n, i) => (i ? n : n)) : toScreen(60 + Math.random() * 100, 60 + Math.random() * 100);
    const it = { uid: uid(), id: a.id, x: sx / 4, y: (a.zone === 'wall' ? sy : sy) / 4, s: 1, f: false };
    H().rooms[el.dataset.room].items.push(it); selected = it.uid; tap();
    commit('home'); rerender();
  },
  'home.surface': (el) => { H().rooms[el.dataset.room][el.dataset.k] = el.dataset.id; commit('home'); tap(); rerender(); },
  'home.it': (el) => {
    const room = $('.room')?.dataset.room; if (!room || !selected) return;
    const list = H().rooms[room].items, it = list.find((x) => x.uid === selected); if (!it) return;
    const op = el.dataset.op;
    if (op === 'flip') it.f = !it.f;
    else if (op === 'smaller') it.s = Math.max(0.5, Math.round(((it.s || 1) - 0.1) * 10) / 10);
    else if (op === 'bigger') it.s = Math.min(1.8, Math.round(((it.s || 1) + 0.1) * 10) / 10);
    else if (op === 'store') { H().rooms[room].items = list.filter((x) => x.uid !== it.uid); selected = null; }
    commit('home'); rerender();
  },
});
