// Art & catalogue for the pig's home: furniture, decorations, wallpapers, floors and houses.
// Everything is drawn as small SVGs in the same cute style (cocoa outline + pastel fills).

const O = '#5A3C2E';
const g = (body, vb) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

// zone: 'floor' | 'wall' | 'any'; w = width in % of the room; flat items (rugs) stay behind everything
export const ITEMS = [
  // ---------- furniture ----------
  { id: 'sofa', cat: 'furniture', price: 120, w: 36, zone: 'floor', vb: '0 0 200 120', art: `
    <rect x="18" y="22" width="164" height="58" rx="22" fill="#F9C9D4"/>
    <rect x="6" y="52" width="40" height="52" rx="16" fill="#F7B7C6"/><rect x="154" y="52" width="40" height="52" rx="16" fill="#F7B7C6"/>
    <rect x="36" y="62" width="128" height="34" rx="12" fill="#FBD9E1"/><path d="M100 64v30"/>
    <path d="M30 104v10M170 104v10"/><circle cx="66" cy="40" r="4" fill="${O}" stroke="none"/><circle cx="134" cy="40" r="4" fill="${O}" stroke="none"/>` },
  { id: 'armchair', cat: 'furniture', price: 80, w: 19, zone: 'floor', vb: '0 0 110 112', art: `
    <rect x="18" y="10" width="74" height="62" rx="24" fill="#CDE8C4"/>
    <rect x="4" y="46" width="24" height="50" rx="11" fill="#B9DDAE"/><rect x="82" y="46" width="24" height="50" rx="11" fill="#B9DDAE"/>
    <rect x="24" y="60" width="62" height="32" rx="12" fill="#DDF0D6"/><path d="M18 96v12M92 96v12"/>` },
  { id: 'table', cat: 'furniture', price: 60, w: 22, zone: 'floor', vb: '0 0 140 74', art: `
    <ellipse cx="70" cy="18" rx="64" ry="13" fill="#E8C29A"/><path d="M6 18v8c0 7 28 13 64 13s64-6 64-13v-8" fill="#D9A877"/>
    <path d="M28 36v34M112 36v34M70 39v32"/><circle cx="54" cy="14" r="6" fill="#FFFDF8"/><path d="M60 14h5"/>` },
  { id: 'bed', cat: 'furniture', price: 160, w: 42, zone: 'floor', vb: '0 0 220 132', art: `
    <rect x="6" y="10" width="44" height="112" rx="14" fill="#E8C29A"/>
    <rect x="40" y="54" width="170" height="44" rx="14" fill="#FFFDF8"/>
    <rect x="44" y="40" width="46" height="28" rx="12" fill="#FFFDF8"/>
    <path d="M96 52h104a10 10 0 0 1 10 10v26H96Z" fill="#CFE3F5"/><path d="M110 64l6 6 6-6M140 64l6 6 6-6M170 64l6 6 6-6" stroke-width="2"/>
    <rect x="186" y="44" width="28" height="78" rx="10" fill="#E8C29A"/><path d="M50 98v24M196 98v24"/>` },
  { id: 'desk', cat: 'furniture', price: 100, w: 28, zone: 'floor', vb: '0 0 160 122', art: `
    <rect x="6" y="40" width="148" height="16" rx="6" fill="#E8C29A"/>
    <rect x="96" y="56" width="50" height="62" rx="6" fill="#D9A877"/><path d="M96 86h50"/><circle cx="121" cy="72" r="3" fill="${O}" stroke="none"/><circle cx="121" cy="102" r="3" fill="${O}" stroke="none"/>
    <path d="M16 56v62"/><rect x="24" y="8" width="38" height="32" rx="6" fill="#FFF4DE"/><path d="M43 18v10" stroke-width="2"/>
    <path d="M70 40l6-26h8l6 26" fill="#F6D27A"/><circle cx="80" cy="12" r="5" fill="#F6D27A"/>` },
  { id: 'chair', cat: 'furniture', price: 40, w: 12, zone: 'floor', vb: '0 0 72 112', art: `
    <rect x="12" y="6" width="48" height="56" rx="14" fill="#F6D27A"/><path d="M26 22h20M26 36h20" stroke-width="2"/>
    <rect x="6" y="58" width="60" height="16" rx="7" fill="#E8C29A"/><path d="M14 74v34M58 74v34"/>` },
  { id: 'bookshelf', cat: 'furniture', price: 110, w: 19, zone: 'floor', vb: '0 0 110 172', art: `
    <rect x="6" y="6" width="98" height="160" rx="8" fill="#D9A877"/><path d="M6 58h98M6 110h98"/>
    <rect x="16" y="24" width="10" height="32" fill="#F7B7C6"/><rect x="28" y="18" width="10" height="38" fill="#CFE3F5"/><rect x="40" y="28" width="10" height="28" fill="#CDE8C4"/><path d="M58 56l14-34 9 4-12 30" fill="#F6D27A"/>
    <rect x="16" y="78" width="12" height="30" fill="#E2D6F5"/><rect x="30" y="70" width="12" height="38" fill="#F9C9D4"/><circle cx="76" cy="94" r="12" fill="#CDE8C4"/><path d="M76 82v-6"/>
    <rect x="58" y="124" width="36" height="34" rx="6" fill="#FFF4DE"/><rect x="18" y="130" width="12" height="28" fill="#F6D27A"/>` },
  { id: 'lamp', cat: 'furniture', price: 50, w: 10, zone: 'floor', vb: '0 0 64 172', art: `
    <path d="M14 46 22 8h20l8 38Z" fill="#FFF4DE"/><path d="M32 46v112"/><ellipse cx="32" cy="162" rx="22" ry="6" fill="#E8C29A"/>
    <path d="M10 50c8 6 36 6 44 0" stroke="#F6D27A" stroke-width="4" opacity=".7"/>` },
  { id: 'plant', cat: 'furniture', price: 40, w: 13, zone: 'floor', vb: '0 0 84 132', art: `
    <path d="M42 70c-4-22-22-34-34-30 4 16 18 28 34 30ZM42 70c4-26 20-44 34-40-2 20-16 36-34 40ZM42 74c-2-30 4-52 18-64 4 22-4 46-18 64Z" fill="#A8D58F"/>
    <path d="M22 74h40l-6 52H28Z" fill="#F9C9D4"/><path d="M20 74h44"/>` },
  { id: 'succulent', cat: 'decor', price: 20, w: 8, zone: 'any', vb: '0 0 64 64', art: `
    <path d="M32 34c-8-4-14-14-12-22 8 2 12 12 12 22ZM32 34c8-4 14-14 12-22-8 2-12 12-12 22ZM32 36c-10 0-20-4-24-10 8-4 18-2 24 10ZM32 36c10 0 20-4 24-10-8-4-18-2-24 10Z" fill="#B9DDAE"/>
    <path d="M14 36h36l-4 24H18Z" fill="#CFE3F5"/>` },
  { id: 'rug', cat: 'furniture', price: 60, w: 44, zone: 'floor', flat: true, vb: '0 0 240 64', art: `
    <ellipse cx="120" cy="32" rx="114" ry="26" fill="#F9C9D4"/><ellipse cx="120" cy="32" rx="84" ry="17" fill="#FBD9E1" stroke-dasharray="6 6"/>
    <ellipse cx="120" cy="32" rx="44" ry="8" fill="#FFFDF8"/>` },
  { id: 'tv', cat: 'furniture', price: 140, w: 28, zone: 'floor', vb: '0 0 170 142', art: `
    <rect x="22" y="8" width="126" height="78" rx="12" fill="#5A4A44"/><rect x="32" y="18" width="106" height="58" rx="6" fill="#CFE3F5" stroke-width="2"/>
    <path d="M52 62c10-14 22-14 32 0M90 46l10 10 14-18" stroke-width="2.4"/>
    <rect x="6" y="94" width="158" height="38" rx="8" fill="#E8C29A"/><path d="M85 94v38"/><circle cx="72" cy="113" r="3" fill="${O}" stroke="none"/><circle cx="98" cy="113" r="3" fill="${O}" stroke="none"/><path d="M20 132v6M150 132v6"/>` },
  { id: 'beanbag', cat: 'furniture', price: 70, w: 20, zone: 'floor', vb: '0 0 132 102', art: `
    <path d="M14 92c-12-24 0-62 30-76 22-10 52-8 66 10 18 22 18 52 6 66Z" fill="#E2D6F5"/><path d="M40 60c14 10 40 10 56 0" stroke-width="2.4"/>
    <ellipse cx="66" cy="92" rx="54" ry="6" fill="#D4C4EE"/>` },
  { id: 'teddy', cat: 'decor', price: 45, w: 11, zone: 'any', vb: '0 0 84 92', art: `
    <circle cx="20" cy="18" r="10" fill="#E8C29A"/><circle cx="64" cy="18" r="10" fill="#E8C29A"/>
    <ellipse cx="42" cy="66" rx="26" ry="22" fill="#E8C29A"/><circle cx="42" cy="34" r="24" fill="#E8C29A"/>
    <ellipse cx="42" cy="42" rx="9" ry="7" fill="#FFF4DE" stroke-width="2"/><circle cx="34" cy="30" r="2.6" fill="${O}" stroke="none"/><circle cx="50" cy="30" r="2.6" fill="${O}" stroke="none"/>
    <path d="M30 58c6 6 18 6 24 0" stroke="#F7A3B8" stroke-width="4"/>` },
  { id: 'wardrobe', cat: 'furniture', price: 130, w: 22, zone: 'floor', vb: '0 0 130 192', art: `
    <rect x="8" y="6" width="114" height="172" rx="10" fill="#FFF4DE"/><path d="M65 6v172"/>
    <circle cx="56" cy="92" r="4" fill="#F6D27A"/><circle cx="74" cy="92" r="4" fill="#F6D27A"/>
    <path d="M24 30c6-8 18-8 24 0M82 30c6-8 18-8 24 0" stroke="#F7B7C6" stroke-width="4"/><path d="M18 178v8M112 178v8"/>` },
  { id: 'cake', cat: 'decor', price: 25, w: 9, zone: 'any', vb: '0 0 72 64', art: `
    <path d="M10 30h52v26H10Z" fill="#FFF4DE"/><path d="M10 30c0-10 12-16 26-16s26 6 26 16" fill="#F9C9D4"/>
    <path d="M10 42c6 4 10 4 13 0s8-4 13 0 8 4 13 0 8-4 13 0" stroke="#F7A3B8" stroke-width="3"/>
    <circle cx="36" cy="10" r="6" fill="#EE7B6B"/><path d="M36 4l3-3" stroke="#6DBE84"/>` },
  // ---------- wall decorations ----------
  { id: 'frame_heart', cat: 'decor', price: 30, w: 12, zone: 'wall', vb: '0 0 84 92', art: `
    <path d="M42 4v12" stroke-width="2"/><rect x="6" y="16" width="72" height="70" rx="10" fill="#FFFDF8"/><rect x="16" y="26" width="52" height="50" rx="6" fill="#FBD9E1"/>
    <path d="M42 64s-14-8-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 10-14 18-14 18Z" fill="#EE7B9B"/>` },
  { id: 'frame_scene', cat: 'decor', price: 50, w: 19, zone: 'wall', vb: '0 0 132 102', art: `
    <rect x="6" y="6" width="120" height="90" rx="10" fill="#E8C29A"/><rect x="16" y="16" width="100" height="70" rx="6" fill="#CFE3F5"/>
    <path d="M16 72c18-22 34-26 50-10 12-14 28-14 50 6v18H16Z" fill="#B9DDAE" stroke-width="2.4"/><circle cx="92" cy="34" r="9" fill="#F6D27A" stroke-width="2.4"/>` },
  { id: 'clock', cat: 'decor', price: 40, w: 11, zone: 'wall', vb: '0 0 84 84', art: `
    <circle cx="42" cy="42" r="36" fill="#FFFDF8"/><circle cx="42" cy="42" r="28" fill="#FFF4DE" stroke-width="2"/>
    <path d="M42 24v18l12 8"/><circle cx="42" cy="42" r="3" fill="${O}" stroke="none"/>
    <path d="M14 14 6 6M70 14l8-8" stroke-width="4"/>` },
  { id: 'window', cat: 'decor', price: 90, w: 26, zone: 'wall', vb: '0 0 160 152', art: `
    <rect x="22" y="14" width="116" height="104" rx="12" fill="#CFE3F5"/><path d="M80 14v104M22 66h116"/>
    <path d="M40 40c4-6 12-6 16 0M98 30c4-6 12-6 16 0" stroke="#FFFDF8" stroke-width="3"/>
    <path d="M6 8c18 0 26 30 34 120H6Z" fill="#F9C9D4"/><path d="M154 8c-18 0-26 30-34 120h34Z" fill="#F9C9D4"/>
    <rect x="12" y="118" width="136" height="12" rx="5" fill="#E8C29A"/><path d="M4 8h152"/>` },
  { id: 'lights', cat: 'decor', price: 55, w: 46, zone: 'wall', vb: '0 0 262 62', art: `
    <path d="M6 10c40 30 84 30 125 6 41 24 85 24 125-6" fill="none" stroke-width="2"/>
    ${[[30, 26], [70, 34], [110, 26], [152, 28], [192, 34], [232, 26]].map(([x, y], i) => `<path transform="translate(${x} ${y})" d="M0-10l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="${['#F6D27A', '#F9C9D4', '#CFE3F5', '#CDE8C4', '#E2D6F5', '#F6D27A'][i]}" stroke-width="2"/>`).join('')}` },
  { id: 'wallshelf', cat: 'decor', price: 45, w: 22, zone: 'wall', vb: '0 0 140 74', art: `
    <rect x="6" y="50" width="128" height="12" rx="5" fill="#E8C29A"/><path d="M24 62l8 10M116 62l-8 10" stroke-width="2.4"/>
    <rect x="18" y="20" width="10" height="30" fill="#F7B7C6"/><rect x="30" y="14" width="10" height="36" fill="#CFE3F5"/>
    <path d="M64 50c-2-14 4-24 14-26 10 2 16 12 14 26Z" fill="#FFF4DE"/><circle cx="112" cy="40" r="10" fill="#CDE8C4"/>` },
];

export const WALLS = [
  { id: 'cream', price: 0, base: '#FFF4DE', pat: '' },
  { id: 'pinkstripe', price: 60, base: '#FDE3EA', pat: `<rect width="20" height="40" fill="#F9CBD6" opacity=".55"/>`, pw: 40, ph: 40 },
  { id: 'mintdot', price: 60, base: '#E6F3DF', pat: `<circle cx="10" cy="10" r="4" fill="#BFE0B2"/><circle cx="30" cy="30" r="4" fill="#BFE0B2"/>`, pw: 40, ph: 40 },
  { id: 'skycloud', price: 80, base: '#DCEBFA', pat: `<path d="M14 30a8 8 0 0 1 8-10 10 10 0 0 1 18 2 7 7 0 0 1 2 14H18a6 6 0 0 1-4-6Z" fill="#FFFFFF" opacity=".85"/>`, pw: 70, ph: 60 },
  { id: 'lavcheck', price: 60, base: '#EEE6FA', pat: `<rect width="20" height="20" fill="#DCCDF3" opacity=".7"/><rect x="20" y="20" width="20" height="20" fill="#DCCDF3" opacity=".7"/>`, pw: 40, ph: 40 },
  { id: 'honeyflower', price: 80, base: '#FCEBC6', pat: `<g transform="translate(20 20)"><circle r="3.5" fill="#F3C760"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${Math.round(Math.cos(a * Math.PI / 180) * 7)}" cy="${Math.round(Math.sin(a * Math.PI / 180) * 7)}" r="4" fill="#FFFDF8"/>`).join('')}</g>`, pw: 50, ph: 50 },
];
export const FLOORS = [
  { id: 'wood', price: 0, base: '#E8C29A', pat: `<path d="M0 0h80M0 20h80" stroke="#D2A57A" stroke-width="2"/><path d="M30 0v20M70 20v20" stroke="#D2A57A" stroke-width="2"/>`, pw: 80, ph: 40 },
  { id: 'checker', price: 60, base: '#FFF4DE', pat: `<rect width="24" height="24" fill="#F6D9A8"/><rect x="24" y="24" width="24" height="24" fill="#F6D9A8"/>`, pw: 48, ph: 48 },
  { id: 'tatami', price: 60, base: '#D8E7B8', pat: `<path d="M0 0h60v30H0Z" fill="none" stroke="#B7CC8E" stroke-width="2"/>`, pw: 60, ph: 30 },
  { id: 'pinktile', price: 60, base: '#FBD9E1', pat: `<rect x="1" y="1" width="28" height="28" rx="4" fill="#FDE8EE"/>`, pw: 30, ph: 30 },
  { id: 'bluecarpet', price: 60, base: '#CFE3F5', pat: `<circle cx="10" cy="10" r="2" fill="#B9D3EE"/>`, pw: 20, ph: 20 },
];

export const HOUSES = [
  { id: 'cottage', price: 0 }, { id: 'mushroom', price: 300 }, { id: 'cake', price: 400 }, { id: 'cloud', price: 500 },
];

export const ROOMS = ['living', 'bedroom'];
export const itemById = (id) => ITEMS.find((x) => x.id === id);
export const itemSVG = (it) => g(it.art, it.vb);

// ---------- room background ----------
export const WALL_H = 56; // % of the room height that is wall
export function roomBG(wallId, floorId) {
  const w = WALLS.find((x) => x.id === wallId) || WALLS[0];
  const f = FLOORS.find((x) => x.id === floorId) || FLOORS[0];
  const pat = (id, p) => (p.pat ? `<pattern id="${id}" width="${p.pw}" height="${p.ph}" patternUnits="userSpaceOnUse">${p.pat}</pattern>` : '');
  const wy = 400 * WALL_H / 100;
  return `<svg class="room-bg" viewBox="0 0 300 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs>${pat('pw', w)}${pat('pf', f)}</defs>
    <rect width="300" height="${wy}" fill="${w.base}"/>${w.pat ? `<rect width="300" height="${wy}" fill="url(#pw)"/>` : ''}
    <rect y="${wy}" width="300" height="${400 - wy}" fill="${f.base}"/>${f.pat ? `<rect y="${wy}" width="300" height="${400 - wy}" fill="url(#pf)"/>` : ''}
    <rect y="${wy - 6}" width="300" height="8" fill="#FFFDF8" stroke="${O}" stroke-width="1.5"/>
    <rect y="${wy + 2}" width="300" height="14" fill="#000" opacity=".05"/></svg>`;
}

/** small swatch for wall/floor pickers and the shop */
export function swatch(kind, id) {
  const p = (kind === 'wall' ? WALLS : FLOORS).find((x) => x.id === id) || (kind === 'wall' ? WALLS[0] : FLOORS[0]);
  const pid = `sw-${kind}-${id}`;
  return `<svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${p.pat ? `<defs><pattern id="${pid}" width="${p.pw}" height="${p.ph}" patternUnits="userSpaceOnUse">${p.pat}</pattern></defs>` : ''}<rect width="80" height="80" fill="${p.base}"/>${p.pat ? `<rect width="80" height="80" fill="url(#${pid})"/>` : ''}</svg>`;
}

// ---------- houses (outside view) ----------
export function houseSVG(id) {
  const door = (x, y, w = 34, h = 46, c = '#E8C29A') => `<g class="house-door"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" ry="${w / 2}" fill="${c}"/><path d="M${x} ${y + h}h${w}" /><circle cx="${x + w - 9}" cy="${y + h / 2 + 4}" r="3" fill="${O}" stroke="none"/></g>`;
  const win = (x, y) => `<rect x="${x}" y="${y}" width="30" height="28" rx="8" fill="#CFE3F5"/><path d="M${x + 15} ${y}v28M${x} ${y + 14}h30" stroke-width="2"/>`;
  const art = {
    cottage: `<path d="M40 92 110 30l70 62" fill="#EE9B8B"/><rect x="52" y="86" width="116" height="84" rx="8" fill="#FFF4DE"/>
      <path d="M30 96 110 26l80 70" fill="none" stroke-width="7" stroke="#C9705F"/><rect x="140" y="38" width="16" height="30" fill="#E8C29A"/>
      ${win(66, 104)}${win(126, 104)}${door(93, 124)}<path d="M60 170c-14 0-20-8-20-14 8-2 14 2 16 6" fill="#A8D58F"/>`,
    mushroom: `<rect x="66" y="86" width="88" height="84" rx="24" fill="#FFF4DE"/>
      <path d="M22 96c0-46 40-76 88-76s88 30 88 76c0 6-6 8-12 8H34c-6 0-12-2-12-8Z" fill="#EE7B6B"/>
      <circle cx="70" cy="56" r="11" fill="#FFFDF8"/><circle cx="118" cy="40" r="9" fill="#FFFDF8"/><circle cx="154" cy="66" r="12" fill="#FFFDF8"/><circle cx="104" cy="78" r="7" fill="#FFFDF8"/>
      ${win(78, 114)}${door(118, 124, 30, 46)}`,
    cake: `<rect x="44" y="110" width="132" height="60" rx="10" fill="#F9C9D4"/><path d="M44 126c11 8 22 8 33 0s22-8 33 0 22 8 33 0 22-8 33 0" fill="none" stroke="#FFFDF8" stroke-width="6"/>
      <rect x="60" y="62" width="100" height="50" rx="10" fill="#FFF4DE"/><path d="M60 76c10 7 20 7 30 0s20-7 30 0 20 7 30 0 10 0 10 0" fill="none" stroke="#F7B7C6" stroke-width="5"/>
      <circle cx="110" cy="46" r="14" fill="#EE7B6B"/><path d="M110 32l5-8" stroke="#6DBE84" stroke-width="4"/><rect x="106" y="54" width="8" height="10" fill="#FFFDF8"/>
      ${win(70, 80)}${win(120, 80)}${door(93, 126)}`,
    cloud: `<path d="M36 120c-16 0-24-12-20-24 4-12 18-16 28-12 2-22 22-36 44-30 10-18 40-22 56-6 18-6 40 6 42 26 18 2 28 16 24 30-4 12-14 16-24 16Z" fill="#FFFFFF"/>
      <rect x="62" y="96" width="96" height="74" rx="14" fill="#DCEBFA"/><path d="M62 96l48-34 48 34" fill="#CFE3F5"/>
      <path d="M150 42l2 6 6 1-5 4 2 6-5-4-6 4 2-6-5-4 6-1Z" fill="#F6D27A" stroke-width="2"/><path d="M40 34l1.5 4 4 .6-3 2.6 1 4-3.5-2-3.5 2 1-4-3-2.6 4-.6Z" fill="#F6D27A" stroke-width="2"/>
      ${win(72, 112)}${door(118, 124, 30, 46, '#F6D27A')}`,
  }[id] || '';
  return g(art, '0 0 220 176');
}
