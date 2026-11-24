// Art & catalogue for the pig's home, drawn as little isometric (3D) dioramas.
// World units: the room floor is 219 x 219, walls are 132 high; the room picture is 400 x 400.

const O = '#5A3C2E';
const C = 0.866, SN = 0.5;
const P = (x, y, z) => [(x - y) * C, (x + y) * SN - z];
const f1 = (n) => Math.round(n * 10) / 10;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f > 0 ? 255 : 0, a = Math.abs(f);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------- tiny isometric drawing kit ----------
class Iso {
  constructor() { this.parts = []; this.pts = []; }
  add(svg, pts) { this.parts.push(svg); this.pts.push(...pts); return this; }
  poly(points, fill, extra = '') {
    const pp = points.map((p) => P(...p));
    return this.add(`<polygon points="${pp.map((q) => q.map(f1).join(',')).join(' ')}" fill="${fill}" ${extra}/>`, pp);
  }
  box(x0, y0, z0, w, d, h, c) {
    const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
    this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], shade(c, 0.18));
    this.poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], shade(c, -0.1));
    return this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c);
  }
  cyl(cx, cy, z0, r, h, c) {
    const [tx, ty] = P(cx, cy, z0 + h), [bx, by] = P(cx, cy, z0), rx = r * 1.2247, ry = r * 0.7071;
    this.add(`<path d="M${f1(tx - rx)} ${f1(ty)}L${f1(bx - rx)} ${f1(by)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(bx + rx)} ${f1(by)}L${f1(tx + rx)} ${f1(ty)}Z" fill="${c}"/>`, [[bx - rx, by + ry], [bx + rx, by + ry]]);
    return this.add(`<ellipse cx="${f1(tx)}" cy="${f1(ty)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${shade(c, 0.18)}"/>`, [[tx - rx, ty - ry], [tx + rx, ty - ry]]);
  }
  dome(cx, cy, z0, r, h, c) {
    const [bx, by] = P(cx, cy, z0), rx = r * 1.2247, ry = r * 0.7071;
    this.add(`<path d="M${f1(bx - rx)} ${f1(by)}A${f1(rx)} ${f1(h)} 0 0 1 ${f1(bx + rx)} ${f1(by)}A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(bx - rx)} ${f1(by)}Z" fill="${c}"/>`, [[bx - rx, by - h], [bx + rx, by + ry]]);
    return this.add(`<ellipse cx="${f1(bx - rx * 0.35)}" cy="${f1(by - h * 0.6)}" rx="${f1(rx * 0.22)}" ry="${f1(h * 0.14)}" fill="#fff" opacity=".45" stroke="none"/>`, []);
  }
  flat(inner, r) { // a 2D drawing laid flat on the floor (in world x,y)
    return this.add(`<g transform="matrix(${C} ${SN} ${-C} ${SN} 0 0)">${inner}</g>`, [P(-r, r, 0), P(r, -r, 0), P(-r, -r, 0), P(r, r, 0)]);
  }
  shadow(r) { const rx = r * 1.2247, ry = r * 0.7071; return this.add(`<ellipse cx="0" cy="2" rx="${f1(rx)}" ry="${f1(ry)}" fill="#5A3C2E" opacity=".14" stroke="none"/>`, []); }
  raw(svg, bbox) { return this.add(svg, bbox); }
  done() {
    const xs = this.pts.map((p) => p[0]), ys = this.pts.map((p) => p[1]);
    const pad = 3, minx = Math.min(...xs) - pad, miny = Math.min(...ys) - pad, w = Math.max(...xs) + pad - minx, h = Math.max(...ys) + pad - miny;
    return { svg: `<svg viewBox="${f1(minx)} ${f1(miny)} ${f1(w)} ${f1(h)}" xmlns="http://www.w3.org/2000/svg" stroke="${O}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">${this.parts.join('')}</svg>`, w, h, ox: -minx, oy: -miny };
  }
}
const iso = () => new Iso();
const dot = (x, y, z, r = 1.4, c = O) => { const [a, b] = P(x, y, z); return `<circle cx="${f1(a)}" cy="${f1(b)}" r="${r}" fill="${c}" stroke="none"/>`; };

// ---------- palette ----------
const COL = {
  pink: '#F7B9C8', blue: '#B9D6F2', mint: '#BFE3C0', honey: '#F6D27A', lav: '#D9C8F2', cream: '#FFF1D9',
  white: '#FFFDF8', wood: '#DDB083', dark: '#B98557', coral: '#F2A08C', red: '#EE7B6B', green: '#9FD08A',
};

// ---------- furniture builders (front faces the viewer's lower-left) ----------
const B = {
  sofa: (c) => iso().shadow(36)
    .box(-32, -13, 0, 64, 8, 32, c)
    .box(-32, -5, 0, 8, 18, 20, shade(c, -0.04))
    .box(-24, -5, 0, 48, 18, 12, c)
    .box(-24, -5, 12, 23, 18, 5, shade(c, 0.25)).box(1, -5, 12, 23, 18, 5, shade(c, 0.25))
    .box(-20, -5, 17, 12, 4, 10, COL.white).box(8, -5, 17, 12, 4, 10, COL.cream)
    .box(24, -5, 0, 8, 18, 20, shade(c, -0.04)).done(),
  armchair: (c) => iso().shadow(20)
    .box(-16, -13, 0, 32, 8, 30, c).box(-16, -5, 0, 7, 18, 19, shade(c, -0.04))
    .box(-9, -5, 0, 18, 18, 11, c).box(-9, -5, 11, 18, 18, 5, shade(c, 0.25))
    .box(9, -5, 0, 7, 18, 19, shade(c, -0.04)).done(),
  bed: (c) => iso().shadow(40)
    .box(-24, -38, 0, 48, 6, 34, COL.wood)
    .box(-24, -32, 0, 48, 70, 11, COL.wood)
    .box(-22, -32, 11, 44, 66, 6, COL.white)
    .box(-16, -30, 17, 32, 12, 5, COL.white)
    .box(-23, -12, 11, 46, 49, 9, c)
    .raw([[-14, 2], [-4, 6], [6, 2], [16, 6]].map(([x, y]) => dot(x, y, 20, 1.6, shade(c, -0.3))).join(''), [])
    .box(-24, 37, 0, 48, 4, 16, COL.wood).done(),
  table: (c) => iso().shadow(18).cyl(0, 0, 0, 4, 2, shade(c, -0.1)).box(-1.5, -1.5, 2, 3, 3, 16, shade(c, -0.15)).cyl(0, 0, 18, 18, 3, c)
    .box(-5, -6, 21, 6, 6, 5, COL.white).raw(dot(-2, -3, 26.2, 1.8, '#C98E5A'), []).done(),
  desk: (c) => iso().shadow(32)
    .box(-30, -14, 0, 3, 3, 26, shade(c, -0.1)).box(-30, 11, 0, 3, 3, 26, shade(c, -0.1))
    .box(12, -12, 0, 17, 24, 26, c).raw(dot(20, 12, 21) + dot(20, 12, 10), [])
    .box(-30, -14, 26, 60, 28, 4, c)
    .box(-18, -10, 30, 18, 12, 2, '#5A4A44').box(-17, -9, 32, 2, 10, 12, '#5A4A44').box(-16, -9, 33, 0.6, 10, 10, COL.blue)
    .box(10, -4, 30, 6, 6, 9, COL.pink).done(),
  chair: (c) => iso().shadow(12)
    .box(-9, -9, 0, 2.5, 2.5, 15, shade(c, -0.2)).box(6.5, -9, 0, 2.5, 2.5, 15, shade(c, -0.2))
    .box(-10, -10, 15, 20, 4, 20, c)
    .box(-9, 6.5, 0, 2.5, 2.5, 15, shade(c, -0.2)).box(6.5, 6.5, 0, 2.5, 2.5, 15, shade(c, -0.2))
    .box(-10, -6, 15, 20, 16, 4, shade(c, 0.1)).done(),
  shelf: (c) => {
    const s = iso().shadow(22).box(-22, -8, 0, 44, 16, 62, c);
    const books = [[-19, 4, COL.pink], [-15, 5, COL.blue], [-11, 4, COL.mint], [-6, 6, COL.honey], [4, 5, COL.lav], [9, 4, COL.coral]];
    for (const [lvl, zz] of [[0, 3], [1, 23], [2, 43]]) {
      s.box(-21, 8, zz - 1, 42, 1, 1.5, shade(c, -0.2));
      books.slice(lvl, lvl + 4).forEach(([x, w, col], i) => s.box(x + i * 2, 8, zz, w - 1, 2, 12 + ((i + lvl) % 3) * 2, col));
    }
    return s.box(-22, -8, 62, 44, 16, 2, shade(c, -0.08)).done();
  },
  wardrobe: (c) => iso().shadow(24).box(-22, -12, 0, 44, 24, 66, c)
    .raw((() => { const [a1, b1] = P(0, 12, 4), [a2, b2] = P(0, 12, 62); return `<line x1="${f1(a1)}" y1="${f1(b1)}" x2="${f1(a2)}" y2="${f1(b2)}"/>`; })(), [])
    .raw(dot(-3, 12, 34, 1.8, COL.honey) + dot(3, 12, 34, 1.8, COL.honey), [])
    .box(-22, -12, 66, 44, 24, 3, shade(c, -0.08)).done(),
  tv: () => iso().shadow(30).box(-30, -10, 0, 60, 20, 16, COL.wood).raw(dot(-8, 10, 8) + dot(8, 10, 8), [])
    .box(-25, -4, 16, 50, 4, 2, '#7A6A64').box(-26, -3, 18, 52, 3, 30, '#5A4A44')
    .poly([[-23, 0.2, 21], [23, 0.2, 21], [23, 0.2, 45], [-23, 0.2, 45]], COL.blue)
    .poly([[-12, 0.4, 26], [-4, 0.4, 32], [4, 0.4, 26]], COL.green, 'stroke-width="1"').done(),
  fridge: (c) => iso().shadow(18).box(-14, -12, 0, 28, 24, 50, c)
    .raw((() => { const [a1, b1] = P(-14, 12, 33), [a2, b2] = P(14, 12, 33); return `<line x1="${f1(a1)}" y1="${f1(b1)}" x2="${f1(a2)}" y2="${f1(b2)}"/>`; })(), [])
    .box(-10, 12, 36, 2, 1.5, 10, COL.white).box(-10, 12, 18, 2, 1.5, 10, COL.white)
    .raw(dot(4, 12, 42, 2.4, COL.red), []).done(),
  lamp: (c) => iso().shadow(9).cyl(0, 0, 0, 7, 2, COL.dark).box(-1, -1, 2, 2, 2, 40, COL.dark)
    .cyl(0, 0, 42, 9, 13, c).raw((() => { const [a, b] = P(0, 0, 42); return `<ellipse cx="${a}" cy="${f1(b + 6)}" rx="16" ry="6" fill="#FFF3B0" opacity=".45" stroke="none"/>`; })(), []).done(),
  mushlamp: (c) => iso().shadow(10).cyl(0, 0, 0, 5, 14, COL.cream).dome(0, 0, 14, 13, 13, c)
    .raw(dot(-5, 3, 22, 2.2, COL.white) + dot(4, -3, 25, 2.6, COL.white) + dot(6, 5, 19, 1.8, COL.white), []).done(),
  beanbag: (c) => iso().shadow(18).dome(0, 0, 0, 17, 22, c).raw(`<path d="M-10 -10q10 6 20 0" fill="none"/>`, []).done(),
  plant: (pot, kind) => {
    const s = iso().shadow(9).cyl(0, 0, 0, 8, 12, pot);
    const top = -12;
    const L = {
      monstera: `<path d="M0 ${top}c-6-10-16-14-22-10 4 10 14 14 22 10Z" fill="#8CCB76"/><path d="M0 ${top}c4-14 14-22 22-20-2 12-12 20-22 20Z" fill="#9FD08A"/><path d="M0 ${top}c-2-16 2-28 10-34 4 14 0 26-10 34Z" fill="#7BBF66"/>`,
      cactus: `<rect x="-5" y="${top - 26}" width="10" height="27" rx="5" fill="#8CCB76"/><path d="M-5 ${top - 12}h-4a3 3 0 0 1-3-3v-6a2.5 2.5 0 0 1 5 0v4h2M5 ${top - 16}h3a3 3 0 0 0 3-3v-5a2.5 2.5 0 0 0-5 0v3H5" fill="#8CCB76"/><circle cx="0" cy="${top - 28}" r="3" fill="#F7B9C8"/>`,
      tulip: [-6, 0, 6].map((x, i) => `<path d="M${x / 2} ${top}C${x / 2} ${top - 10} ${x} ${top - 14} ${x} ${top - 20}" fill="none" stroke-width="1.6" stroke="#6DAE58"/><path d="M${x - 4} ${top - 22}c0 4 2 6 4 6s4-2 4-6l-2 2-2-3-2 3Z" fill="${[COL.pink, COL.red, COL.honey][i]}"/>`).join(''),
      sunflower: `<path d="M0 ${top}V${top - 30}" stroke="#6DAE58" stroke-width="2"/><path d="M0 ${top - 12}c-6-2-8-6-8-8 4 0 7 3 8 8Z" fill="#8CCB76"/>${Array.from({ length: 10 }, (_, i) => { const a = i * 36 * Math.PI / 180, x = f1(Math.cos(a) * 6), y = f1(top - 34 + Math.sin(a) * 6); return `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2" transform="rotate(${i * 36} ${x} ${y})" fill="#F6D27A" stroke-width="1"/>`; }).join('')}<circle cx="0" cy="${top - 34}" r="4.5" fill="#B98557"/>`,
      succulent: `<path d="M0 ${top}c-4-2-7-7-6-11 4 1 6 6 6 11ZM0 ${top}c4-2 7-7 6-11-4 1-6 6-6 11ZM0 ${top + 1}c-6 0-11-2-13-6 5-2 10 0 13 6ZM0 ${top + 1}c6 0 11-2 13-6-5-2-10 0-13 6Z" fill="#B9DDAE"/>`,
    }[kind];
    return s.raw(L, [[-24, top - 40], [24, top - 40]]).done();
  },
  rug: (c, shape) => {
    const c2 = shade(c, 0.35);
    const inner = {
      round: `<circle r="30" fill="${c}" vector-effect="non-scaling-stroke"/><circle r="20" fill="${c2}" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/><circle r="9" fill="${c}" vector-effect="non-scaling-stroke"/>`,
      rect: `<rect x="-34" y="-24" width="68" height="48" rx="6" fill="${c}" vector-effect="non-scaling-stroke"/>${[-14, 0, 14].map((y) => `<rect x="-34" y="${y - 4}" width="68" height="8" fill="${c2}" stroke="none"/>`).join('')}<rect x="-34" y="-24" width="68" height="48" rx="6" fill="none" vector-effect="non-scaling-stroke"/>`,
      heart: `<path d="M0 22C-30 6-34-12-22-20c8-6 18-2 22 6 4-8 14-12 22-6 12 8 8 26-22 42Z" transform="rotate(-45)" fill="${c}" vector-effect="non-scaling-stroke"/>`,
      star: `<path d="M0-32l9 20 22 2-17 14 5 22-19-11-19 11 5-22-17-14 22-2Z" transform="rotate(-45)" fill="${c}" vector-effect="non-scaling-stroke"/>`,
    }[shape];
    return iso().flat(inner, 34).done();
  },
};

// 2D wall pieces (hung on a wall and slanted with it); wu = width in world units
const W = {
  window: (curtain, style) => {
    const pid = 'dots' + curtain.slice(1);
    const cur = style === 'dots' ? `fill="url(#${pid})"` : `fill="${curtain}"`;
    return `${style === 'dots' ? `<defs><pattern id="${pid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${curtain}"/><circle cx="5" cy="5" r="2" fill="#fff"/></pattern></defs>` : ''}
      <rect x="22" y="14" width="116" height="104" rx="${style === 'arch' ? 58 : 12}" ry="${style === 'arch' ? 50 : 12}" fill="#CFE3F5"/><path d="M80 ${style === 'arch' ? 16 : 14}v104M22 70h116"/>
      <path d="M40 44c4-6 12-6 16 0M98 34c4-6 12-6 16 0" stroke="#FFFDF8" stroke-width="3"/>
      ${style === 'lace' ? `<path d="M22 14h116v22c-10 8-19 8-29 0-10 8-19 8-29 0-10 8-19 8-29 0-10 8-19 8-29 0Z" fill="#FFFDF8"/>` : `<path d="M6 8c18 0 26 30 34 120H6Z" ${cur}/><path d="M154 8c-18 0-26 30-34 120h34Z" ${cur}/>`}
      <rect x="12" y="118" width="136" height="12" rx="5" fill="#E8C29A"/><path d="M4 8h152"/>`;
  },
  roundwin: () => `<circle cx="70" cy="64" r="56" fill="#E8C29A"/><circle cx="70" cy="64" r="44" fill="#CFE3F5"/><path d="M70 20v88M26 64h88"/><path d="M48 44c6-8 16-8 22 0" stroke="#fff" stroke-width="3"/>`,
  frame: (kind) => ({
    heart: `<rect x="6" y="6" width="72" height="80" rx="10" fill="#FFFDF8"/><rect x="16" y="16" width="52" height="60" rx="6" fill="#FBD9E1"/><path d="M42 62s-14-8-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 10-14 18-14 18Z" fill="#EE7B9B"/>`,
    scene: `<rect x="6" y="6" width="120" height="90" rx="10" fill="#E8C29A"/><rect x="16" y="16" width="100" height="70" rx="6" fill="#CFE3F5"/><path d="M16 72c18-22 34-26 50-10 12-14 28-14 50 6v18H16Z" fill="#B9DDAE" stroke-width="2.4"/><circle cx="92" cy="34" r="9" fill="#F6D27A" stroke-width="2.4"/>`,
    pig: `<rect x="6" y="6" width="80" height="92" rx="40" fill="#F6D27A"/><rect x="14" y="14" width="64" height="76" rx="32" fill="#FFF1D9"/><circle cx="46" cy="54" r="20" fill="#FBD3DD"/><path d="M30 38l-2-10 8 5M62 38l2-10-8 5" fill="#F6B8C8"/><ellipse cx="46" cy="60" rx="7" ry="5" fill="#F6B8C8"/><circle cx="39" cy="50" r="2" fill="${O}" stroke="none"/><circle cx="53" cy="50" r="2" fill="${O}" stroke="none"/>`,
    flower: `<rect x="6" y="6" width="80" height="80" rx="10" fill="#D9C8F2"/><rect x="16" y="16" width="60" height="60" rx="6" fill="#FFFDF8"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(46 + Math.cos(a * Math.PI / 180) * 11)}" cy="${f1(42 + Math.sin(a * Math.PI / 180) * 11)}" r="8" fill="#F7B9C8"/>`).join('')}<circle cx="46" cy="42" r="6" fill="#F6D27A"/><path d="M46 52v18" stroke="#6DAE58" stroke-width="3"/>`,
  }[kind]),
  clock: (c) => `<circle cx="42" cy="42" r="36" fill="${c}"/><circle cx="42" cy="42" r="28" fill="#FFFDF8" stroke-width="2"/><path d="M42 24v18l12 8"/><circle cx="42" cy="42" r="3" fill="${O}" stroke="none"/><path d="M14 14 6 6M70 14l8-8" stroke-width="4"/>`,
  lights: (cols) => `<path d="M6 10c40 30 84 30 125 6 41 24 85 24 125-6" fill="none" stroke-width="2"/>${[[30, 26], [70, 34], [110, 26], [152, 28], [192, 34], [232, 26]].map(([x, y], i) => `<path transform="translate(${x} ${y})" d="M0-10l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="${cols[i % cols.length]}" stroke-width="2"/>`).join('')}`,
  bunting: () => `<path d="M4 8c40 18 90 18 130 0" fill="none" stroke-width="2"/>${[14, 36, 58, 80, 102, 124].map((x, i) => `<path d="M${x - 9} ${f1(12 + Math.sin(i) * 2)}l9 22 9-22Z" fill="${[COL.pink, COL.honey, COL.blue, COL.mint, COL.lav, COL.coral][i]}" stroke-width="2"/>`).join('')}`,
  shelf: () => `<rect x="6" y="50" width="128" height="12" rx="5" fill="#E8C29A"/><path d="M24 62l8 10M116 62l-8 10" stroke-width="2.4"/><rect x="18" y="20" width="10" height="30" fill="#F7B7C6"/><rect x="30" y="14" width="10" height="36" fill="#CFE3F5"/><path d="M64 50c-2-14 4-24 14-26 10 2 16 12 14 26Z" fill="#FFF4DE"/><circle cx="112" cy="40" r="10" fill="#CDE8C4"/>`,
  mirror: () => `<ellipse cx="40" cy="54" rx="32" ry="46" fill="#F6D27A"/><ellipse cx="40" cy="54" rx="24" ry="38" fill="#DCEBFA"/><path d="M28 36c4-8 10-10 14-10" stroke="#fff" stroke-width="4"/>`,
  cloudlamp: () => `<path d="M24 64c-12 0-18-10-14-20 4-8 14-10 20-6 4-14 20-20 32-12 8-10 26-8 32 6 12 0 20 10 16 22-2 6-8 10-14 10Z" fill="#FFFDF8"/><path d="M40 52c3 3 7 3 10 0M66 52c3 3 7 3 10 0" stroke-width="2.5"/><circle cx="36" cy="58" r="3" fill="#F7B9C8" stroke="none"/><circle cx="82" cy="58" r="3" fill="#F7B9C8" stroke="none"/>`,
};
const svg2d = (art, vbw, vbh) => `<svg viewBox="0 0 ${vbw} ${vbh}" xmlns="http://www.w3.org/2000/svg" stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${art}</svg>`;
const wall2d = (art, vbw, vbh, wu) => ({ svg: svg2d(art, vbw, vbh), w: wu, h: wu * vbh / vbw, ox: wu / 2, oy: wu * vbh / vbw, wall: true });

// small standing 2D things (plushies & treats) drawn front-on
const S2 = {
  teddy: (c) => `<circle cx="20" cy="18" r="10" fill="${c}"/><circle cx="64" cy="18" r="10" fill="${c}"/><ellipse cx="42" cy="66" rx="26" ry="22" fill="${c}"/><circle cx="42" cy="34" r="24" fill="${c}"/><ellipse cx="42" cy="42" rx="9" ry="7" fill="#FFF4DE" stroke-width="2"/><circle cx="34" cy="30" r="2.6" fill="${O}" stroke="none"/><circle cx="50" cy="30" r="2.6" fill="${O}" stroke="none"/><path d="M30 58c6 6 18 6 24 0" stroke="#F7A3B8" stroke-width="4"/>`,
  bunny: () => `<ellipse cx="30" cy="20" rx="7" ry="18" fill="#FFFDF8"/><ellipse cx="54" cy="20" rx="7" ry="18" fill="#FFFDF8"/><ellipse cx="42" cy="68" rx="24" ry="20" fill="#FFFDF8"/><circle cx="42" cy="42" r="20" fill="#FFFDF8"/><circle cx="35" cy="40" r="2.4" fill="${O}" stroke="none"/><circle cx="49" cy="40" r="2.4" fill="${O}" stroke="none"/><path d="M39 47q3 3 6 0" stroke-width="2"/><ellipse cx="30" cy="48" rx="4" ry="2.4" fill="#F7B9C8" stroke="none"/><ellipse cx="54" cy="48" rx="4" ry="2.4" fill="#F7B9C8" stroke="none"/>`,
  chick: () => `<ellipse cx="42" cy="56" rx="30" ry="28" fill="#F6D27A"/><circle cx="33" cy="48" r="3" fill="${O}" stroke="none"/><circle cx="51" cy="48" r="3" fill="${O}" stroke="none"/><path d="M38 56l4 5 4-5Z" fill="#F2A08C" stroke-width="2"/><path d="M38 28c2-6 6-8 8-4" fill="none" stroke-width="2.5"/>`,
  cake: () => `<path d="M10 30h52v26H10Z" fill="#FFF4DE"/><path d="M10 30c0-10 12-16 26-16s26 6 26 16" fill="#F9C9D4"/><path d="M10 42c6 4 10 4 13 0s8-4 13 0 8 4 13 0 8-4 13 0" stroke="#F7A3B8" stroke-width="3"/><circle cx="36" cy="10" r="6" fill="#EE7B6B"/>`,
  donut: () => `<ellipse cx="36" cy="40" rx="30" ry="20" fill="#E8C29A"/><path d="M8 38c0-10 12-18 28-18s28 8 28 18c-4 6-10 4-14 8-6-4-10 2-16 0-6 2-8-4-14-2-6-2-10 0-12-6Z" fill="#F7B9C8"/><ellipse cx="36" cy="36" rx="9" ry="5" fill="#FFF4DE"/><path d="M20 30l3-2M48 28l3 2M30 24l2 2" stroke="#6FA8DC" stroke-width="2.4"/>`,
  tea: () => `<path d="M16 26h36v18a14 14 0 0 1-14 14h-8a14 14 0 0 1-14-14Z" fill="#FFFDF8"/><path d="M52 30h6a6 6 0 0 1 0 12h-6" fill="none"/><ellipse cx="34" cy="26" rx="18" ry="4" fill="#E8C29A"/><path d="M28 18c-2-4 2-6 0-10M38 18c-2-4 2-6 0-10" fill="none" stroke="#B98557" stroke-width="2"/><ellipse cx="36" cy="60" rx="28" ry="5" fill="#F7B9C8"/>`,
};
const stand2d = (art, vbw, vbh, wu) => ({ svg: svg2d(art, vbw, vbh), w: wu, h: wu * vbh / vbw, ox: wu / 2, oy: wu * vbh / vbw * 0.96 });

// ---------- catalogue ----------
// cat: furniture | soft (rugs, lamps, plushies) | plant | wall | treat ; zone: floor | wall
const V = (id, cat, price, zone, make, extra = {}) => ({ id, cat, price, zone, make, ...extra });
export const ITEMS = [
  V('sofa', 'furniture', 120, 'floor', () => B.sofa(COL.pink)),
  V('sofa_blue', 'furniture', 120, 'floor', () => B.sofa(COL.blue)),
  V('sofa_mint', 'furniture', 120, 'floor', () => B.sofa(COL.mint)),
  V('sofa_honey', 'furniture', 120, 'floor', () => B.sofa(COL.honey)),
  V('sofa_lav', 'furniture', 120, 'floor', () => B.sofa(COL.lav)),
  V('armchair', 'furniture', 80, 'floor', () => B.armchair(COL.mint)),
  V('armchair_pink', 'furniture', 80, 'floor', () => B.armchair(COL.pink)),
  V('armchair_blue', 'furniture', 80, 'floor', () => B.armchair(COL.blue)),
  V('armchair_cream', 'furniture', 80, 'floor', () => B.armchair(COL.cream)),
  V('bed', 'furniture', 160, 'floor', () => B.bed(COL.blue)),
  V('bed_pink', 'furniture', 160, 'floor', () => B.bed(COL.pink)),
  V('bed_honey', 'furniture', 160, 'floor', () => B.bed(COL.honey)),
  V('bed_mint', 'furniture', 160, 'floor', () => B.bed(COL.mint)),
  V('table', 'furniture', 60, 'floor', () => B.table(COL.wood)),
  V('table_white', 'furniture', 60, 'floor', () => B.table(COL.white)),
  V('table_pink', 'furniture', 60, 'floor', () => B.table(COL.pink)),
  V('desk', 'furniture', 100, 'floor', () => B.desk(COL.wood)),
  V('desk_white', 'furniture', 100, 'floor', () => B.desk(COL.white)),
  V('chair', 'furniture', 40, 'floor', () => B.chair(COL.honey)),
  V('chair_pink', 'furniture', 40, 'floor', () => B.chair(COL.pink)),
  V('chair_blue', 'furniture', 40, 'floor', () => B.chair(COL.blue)),
  V('chair_mint', 'furniture', 40, 'floor', () => B.chair(COL.mint)),
  V('bookshelf', 'furniture', 110, 'floor', () => B.shelf(COL.wood)),
  V('bookshelf_white', 'furniture', 110, 'floor', () => B.shelf(COL.white)),
  V('bookshelf_pink', 'furniture', 110, 'floor', () => B.shelf(COL.pink)),
  V('wardrobe', 'furniture', 130, 'floor', () => B.wardrobe(COL.cream)),
  V('wardrobe_pink', 'furniture', 130, 'floor', () => B.wardrobe(COL.pink)),
  V('wardrobe_mint', 'furniture', 130, 'floor', () => B.wardrobe(COL.mint)),
  V('tv', 'furniture', 140, 'floor', () => B.tv()),
  V('fridge', 'furniture', 90, 'floor', () => B.fridge(COL.pink)),
  V('fridge_mint', 'furniture', 90, 'floor', () => B.fridge(COL.mint)),
  V('rug', 'soft', 60, 'floor', () => B.rug(COL.pink, 'round'), { flat: true }),
  V('rug_blue', 'soft', 60, 'floor', () => B.rug(COL.blue, 'round'), { flat: true }),
  V('rug_stripe', 'soft', 70, 'floor', () => B.rug(COL.mint, 'rect'), { flat: true }),
  V('rug_heart', 'soft', 80, 'floor', () => B.rug(COL.pink, 'heart'), { flat: true }),
  V('rug_star', 'soft', 80, 'floor', () => B.rug(COL.honey, 'star'), { flat: true }),
  V('lamp', 'soft', 50, 'floor', () => B.lamp(COL.cream)),
  V('lamp_pink', 'soft', 50, 'floor', () => B.lamp(COL.pink)),
  V('lamp_mush', 'soft', 60, 'floor', () => B.mushlamp(COL.red)),
  V('lamp_mush_pink', 'soft', 60, 'floor', () => B.mushlamp(COL.pink)),
  V('beanbag', 'soft', 70, 'floor', () => B.beanbag(COL.lav)),
  V('beanbag_pink', 'soft', 70, 'floor', () => B.beanbag(COL.pink)),
  V('beanbag_honey', 'soft', 70, 'floor', () => B.beanbag(COL.honey)),
  V('teddy', 'soft', 45, 'floor', () => stand2d(S2.teddy('#E8C29A'), 84, 92, 18)),
  V('teddy_pink', 'soft', 45, 'floor', () => stand2d(S2.teddy('#F7B9C8'), 84, 92, 18)),
  V('bunny', 'soft', 45, 'floor', () => stand2d(S2.bunny(), 84, 90, 17)),
  V('chick', 'soft', 35, 'floor', () => stand2d(S2.chick(), 84, 86, 15)),
  V('plant', 'plant', 40, 'floor', () => B.plant(COL.pink, 'monstera')),
  V('plant_blue', 'plant', 40, 'floor', () => B.plant(COL.blue, 'monstera')),
  V('cactus', 'plant', 30, 'floor', () => B.plant(COL.honey, 'cactus')),
  V('tulips', 'plant', 35, 'floor', () => B.plant(COL.white, 'tulip')),
  V('sunflower', 'plant', 45, 'floor', () => B.plant(COL.blue, 'sunflower')),
  V('succulent', 'plant', 20, 'floor', () => B.plant(COL.lav, 'succulent')),
  V('cake', 'treat', 25, 'floor', () => stand2d(S2.cake(), 72, 64, 14)),
  V('donut', 'treat', 20, 'floor', () => stand2d(S2.donut(), 72, 64, 13)),
  V('tea', 'treat', 25, 'floor', () => stand2d(S2.tea(), 72, 66, 14)),
  V('window', 'wall', 90, 'wall', () => wall2d(W.window('#F9C9D4'), 160, 152, 56)),
  V('window_blue', 'wall', 90, 'wall', () => wall2d(W.window('#B9D6F2'), 160, 152, 56)),
  V('window_mint', 'wall', 90, 'wall', () => wall2d(W.window('#BFE3C0'), 160, 152, 56)),
  V('window_dots', 'wall', 100, 'wall', () => wall2d(W.window('#F7B9C8', 'dots'), 160, 152, 56)),
  V('window_lace', 'wall', 100, 'wall', () => wall2d(W.window('#FFFFFF', 'lace'), 160, 152, 56)),
  V('window_arch', 'wall', 110, 'wall', () => wall2d(W.window('#D9C8F2', 'arch'), 160, 152, 56)),
  V('window_round', 'wall', 90, 'wall', () => wall2d(W.roundwin(), 140, 128, 40)),
  V('frame_heart', 'wall', 30, 'wall', () => wall2d(W.frame('heart'), 84, 92, 22)),
  V('frame_scene', 'wall', 50, 'wall', () => wall2d(W.frame('scene'), 132, 102, 32)),
  V('frame_pig', 'wall', 50, 'wall', () => wall2d(W.frame('pig'), 92, 104, 24)),
  V('frame_flower', 'wall', 40, 'wall', () => wall2d(W.frame('flower'), 92, 92, 22)),
  V('clock', 'wall', 40, 'wall', () => wall2d(W.clock('#FFFDF8'), 84, 84, 20)),
  V('clock_pink', 'wall', 40, 'wall', () => wall2d(W.clock('#F7B9C8'), 84, 84, 20)),
  V('lights', 'wall', 55, 'wall', () => wall2d(W.lights(['#F6D27A', '#F9C9D4', '#CFE3F5', '#CDE8C4', '#E2D6F5']), 262, 62, 70)),
  V('lights_gold', 'wall', 55, 'wall', () => wall2d(W.lights(['#F6D27A']), 262, 62, 70)),
  V('bunting', 'wall', 45, 'wall', () => wall2d(W.bunting(), 140, 44, 50)),
  V('wallshelf', 'wall', 45, 'wall', () => wall2d(W.shelf(), 140, 74, 40)),
  V('mirror', 'wall', 60, 'wall', () => wall2d(W.mirror(), 80, 104, 24)),
  V('cloudlamp', 'wall', 65, 'wall', () => wall2d(W.cloudlamp(), 132, 78, 40)),
];
const cache = new Map();
export function sprite(id) {
  if (!cache.has(id)) { const it = ITEMS.find((x) => x.id === id); cache.set(id, it ? it.make() : null); }
  return cache.get(id);
}
export const itemById = (id) => ITEMS.find((x) => x.id === id);
export const itemSVG = (it) => sprite(it.id)?.svg || '';
export const CATS = ['furniture', 'soft', 'plant', 'wall', 'treat'];

export const WALLS = [
  { id: 'cream', price: 0, base: '#FFF4DE', pat: '' },
  { id: 'pinkstripe', price: 60, base: '#FDE3EA', pat: `<rect width="10" height="20" fill="#F9CBD6" opacity=".6"/>`, pw: 20, ph: 20 },
  { id: 'mintdot', price: 60, base: '#E6F3DF', pat: `<circle cx="6" cy="6" r="2.4" fill="#BFE0B2"/><circle cx="18" cy="18" r="2.4" fill="#BFE0B2"/>`, pw: 24, ph: 24 },
  { id: 'skycloud', price: 80, base: '#DCEBFA', pat: `<path d="M8 18a5 5 0 0 1 5-6 6 6 0 0 1 11 1 4 4 0 0 1 1 8H11a4 4 0 0 1-3-3Z" fill="#FFFFFF" opacity=".9"/>`, pw: 40, ph: 34 },
  { id: 'lavcheck', price: 60, base: '#EEE6FA', pat: `<rect width="12" height="12" fill="#DCCDF3" opacity=".7"/><rect x="12" y="12" width="12" height="12" fill="#DCCDF3" opacity=".7"/>`, pw: 24, ph: 24 },
  { id: 'honeyflower', price: 80, base: '#FCEBC6', pat: `<g transform="translate(14 14)"><circle r="2.2" fill="#F3C760"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${f1(Math.cos(a * Math.PI / 180) * 4.4)}" cy="${f1(Math.sin(a * Math.PI / 180) * 4.4)}" r="2.6" fill="#FFFDF8"/>`).join('')}</g>`, pw: 28, ph: 28 },
  { id: 'peachheart', price: 80, base: '#FDE6DA', pat: `<path d="M12 16s-6-3.5-6-7.5a3 3 0 0 1 6-1.4 3 3 0 0 1 6 1.4C18 12.5 12 16 12 16Z" fill="#F9C2B0"/>`, pw: 24, ph: 24 },
  { id: 'woodwall', price: 90, base: '#EFD2AE', pat: `<rect width="16" height="40" fill="#E6C39A"/><path d="M16 0v40" stroke="#D2A57A" stroke-width="1"/>`, pw: 32, ph: 40 },
];
export const FLOORS = [
  { id: 'wood', price: 0, base: '#E8C29A', pat: `<path d="M0 0h40M0 12h40" stroke="#D2A57A" stroke-width="1"/><path d="M16 0v12M34 12v12" stroke="#D2A57A" stroke-width="1"/>`, pw: 40, ph: 24 },
  { id: 'checker', price: 60, base: '#FFF4DE', pat: `<rect width="14" height="14" fill="#F6D9A8"/><rect x="14" y="14" width="14" height="14" fill="#F6D9A8"/>`, pw: 28, ph: 28 },
  { id: 'tatami', price: 60, base: '#D8E7B8', pat: `<rect width="36" height="18" fill="none" stroke="#B7CC8E" stroke-width="1.2"/>`, pw: 36, ph: 18 },
  { id: 'pinktile', price: 60, base: '#FBD9E1', pat: `<rect x="1" y="1" width="16" height="16" rx="3" fill="#FDE8EE"/>`, pw: 18, ph: 18 },
  { id: 'bluecarpet', price: 60, base: '#CFE3F5', pat: `<circle cx="6" cy="6" r="1.4" fill="#B9D3EE"/>`, pw: 12, ph: 12 },
  { id: 'darkwood', price: 70, base: '#C99A6C', pat: `<path d="M0 0h40M0 12h40" stroke="#A97D52" stroke-width="1"/><path d="M10 0v12M28 12v12" stroke="#A97D52" stroke-width="1"/>`, pw: 40, ph: 24 },
  { id: 'mintcheck', price: 60, base: '#E6F3DF', pat: `<rect width="14" height="14" fill="#CDE8C4"/><rect x="14" y="14" width="14" height="14" fill="#CDE8C4"/>`, pw: 28, ph: 28 },
];

export const HOUSES = [{ id: 'cottage', price: 0 }, { id: 'mushroom', price: 300 }, { id: 'cake', price: 400 }, { id: 'cloud', price: 500 }];
export const ROOMS = ['living', 'bedroom'];

// ---------- room geometry (screen units 0..400) ----------
export const ROOM = { cx: 200, top: 132, size: 219, wallH: 132 };
const R = ROOM;
export const toScreen = (u, v, z = 0) => [R.cx + (u - v) * C, R.top + (u + v) * SN - z];
export function toFloor(sx, sy) {
  const a = (sx - R.cx) / C, b = (sy - R.top) / SN;
  return [(a + b) / 2, (b - a) / 2];
}
/** keep an item's anchor point on the floor / on a wall. Returns [sx, sy, side] (side: 'L' | 'R' | null) */
export function clampPos(item, sx, sy, scale = 1) {
  const sp = sprite(item.id);
  if (item.zone === 'wall') {
    const left = sx < R.cx;
    const t = Math.min(R.size - 14, Math.max(14, left ? (R.cx - sx) / C : (sx - R.cx) / C));
    const gx = left ? R.cx - t * C : R.cx + t * C, gy = R.top + t * SN;
    const h = (sp?.h || 20) * scale;
    const z = Math.max(4, Math.min(R.wallH - h - 6, gy - sy)); // bottom edge height on the wall
    return [gx, gy - z, left ? 'L' : 'R'];
  }
  let [u, v] = toFloor(sx, sy);
  const m = 10;
  u = Math.min(R.size - m, Math.max(m, u)); v = Math.min(R.size - m, Math.max(m, v));
  const [x, y] = toScreen(u, v);
  return [x, y, null];
}

const PS = 1.6; // wallpaper / floor pattern scale
export function roomBG(wallId, floorId) {
  const w = WALLS.find((x) => x.id === wallId) || WALLS[0];
  const f = FLOORS.find((x) => x.id === floorId) || FLOORS[0];
  const T = toScreen(0, 0), Rr = toScreen(R.size, 0), Bt = toScreen(R.size, R.size), L = toScreen(0, R.size);
  const up = (p, d = R.wallH) => [p[0], p[1] - d];
  const pts = (a) => a.map((p) => p.map(f1).join(',')).join(' ');
  const pat = (id, p, m) => (p.pat ? `<pattern id="${id}" width="${p.pw}" height="${p.ph}" patternUnits="userSpaceOnUse" patternTransform="${m}">${p.pat}</pattern>` : '');
  const slab = 14;
  return `<svg class="room-bg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" stroke="${O}" stroke-linejoin="round"><defs>
      ${pat('pwl', w, `matrix(${C * PS} ${-SN * PS} 0 ${PS} 0 0)`)}${pat('pwr', w, `matrix(${C * PS} ${SN * PS} 0 ${PS} 0 0)`)}${pat('pf', f, `matrix(${C * PS} ${SN * PS} ${-C * PS} ${SN * PS} 0 0)`)}
      <linearGradient id="shL" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="200" cy="${f1(Bt[1] + slab + 6)}" rx="170" ry="14" fill="#5A3C2E" opacity=".12" stroke="none"/>
    <polygon points="${pts([L, Bt, [Bt[0], Bt[1] + slab], [L[0], L[1] + slab]])}" fill="${shade(f.base, -0.25)}" stroke-width="2"/>
    <polygon points="${pts([Bt, Rr, [Rr[0], Rr[1] + slab], [Bt[0], Bt[1] + slab]])}" fill="${shade(f.base, -0.38)}" stroke-width="2"/>
    <polygon points="${pts([T, Rr, Bt, L])}" fill="${f.base}" stroke-width="2"/>${f.pat ? `<polygon points="${pts([T, Rr, Bt, L])}" fill="url(#pf)" stroke="none"/>` : ''}
    <polygon points="${pts([L, T, up(T), up(L)])}" fill="${shade(w.base, -0.06)}" stroke-width="2"/>${w.pat ? `<polygon points="${pts([L, T, up(T), up(L)])}" fill="url(#pwl)" stroke="none"/>` : ''}
    <polygon points="${pts([T, Rr, up(Rr), up(T)])}" fill="${w.base}" stroke-width="2"/>${w.pat ? `<polygon points="${pts([T, Rr, up(Rr), up(T)])}" fill="url(#pwr)" stroke="none"/>` : ''}
    <polygon points="${pts([L, T, up(T, 7), up(L, 7)])}" fill="#FFFDF8" stroke-width="1.5"/>
    <polygon points="${pts([T, Rr, up(Rr, 7), up(T, 7)])}" fill="#FFFDF8" stroke-width="1.5"/>
    <polygon points="${pts([L, T, up(T), up(L)])}" fill="url(#shL)" stroke="none"/>
    <line x1="${f1(T[0])}" y1="${f1(T[1])}" x2="${f1(T[0])}" y2="${f1(T[1] - R.wallH)}" stroke-width="1.5"/>
    <polygon points="${pts([up(L), up(T), up(T, R.wallH + 8), up(L, R.wallH + 8)])}" fill="${shade(w.base, -0.15)}" stroke-width="2"/>
    <polygon points="${pts([up(T), up(Rr), up(Rr, R.wallH + 8), up(T, R.wallH + 8)])}" fill="${shade(w.base, -0.08)}" stroke-width="2"/>
  </svg>`;
}

/** small swatch for wall/floor pickers and the shop */
export function swatch(kind, id) {
  const p = (kind === 'wall' ? WALLS : FLOORS).find((x) => x.id === id) || (kind === 'wall' ? WALLS[0] : FLOORS[0]);
  const pid = `sw-${kind}-${id}`;
  return `<svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${p.pat ? `<defs><pattern id="${pid}" width="${p.pw}" height="${p.ph}" patternUnits="userSpaceOnUse">${p.pat}</pattern></defs>` : ''}<rect width="80" height="80" fill="${p.base}"/>${p.pat ? `<rect width="80" height="80" fill="url(#${pid})"/>` : ''}</svg>`;
}

// ---------- houses (outside, isometric little islands) ----------
export function houseSVG(id) {
  const s = iso();
  const isl = 78;
  s.poly([[-isl, isl, -10], [isl, isl, -10], [isl, isl, 0], [-isl, isl, 0]], '#B98557');
  s.poly([[isl, -isl, -10], [isl, isl, -10], [isl, isl, 0], [isl, -isl, 0]], '#A2744A');
  s.poly([[-isl, -isl, 0], [isl, -isl, 0], [isl, isl, 0], [-isl, isl, 0]], '#BFE0A8');
  s.flat(`<path d="M0 30 C10 50 4 64 0 76" fill="none" stroke="#F3E2C0" stroke-width="10" stroke-linecap="round"/>`, 78);
  const tree = (x, y, c = '#9FD08A') => { s.cyl(x, y, 0, 2.5, 10, '#B98557'); s.dome(x, y, 8, 11, 22, c); };
  tree(-58, -50); tree(-62, 10, '#8CCB76');
  const door = (x, y, z, w, h, c = '#E8C29A') => s.poly([[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y, z + h], [x - w / 2, y, z + h]], c);
  const winR = (x, y, z) => s.poly([[x, y - 7, z], [x, y + 7, z], [x, y + 7, z + 12], [x, y - 7, z + 12]], '#CFE3F5');
  if (id === 'mushroom') {
    s.cyl(0, 0, 0, 26, 44, '#FFF1D9');
    door(0, 26, 0, 14, 22); s.raw(dot(4, 26.5, 10, 1.6), []);
    s.dome(0, 0, 40, 46, 46, '#EE7B6B');
    s.raw([[-20, 10, 60], [8, -14, 74], [26, 12, 58], [-6, 18, 52], [-24, -16, 66]].map(([x, y, z]) => dot(x, y, z, 5, '#FFFDF8')).join(''), []);
  } else if (id === 'cake') {
    s.cyl(0, 0, 0, 40, 28, '#F7B9C8'); s.cyl(0, 0, 28, 30, 24, '#FFF1D9'); s.cyl(0, 0, 52, 19, 18, '#F7B9C8');
    door(0, 40, 0, 14, 22);
    s.raw(dot(0, 0, 80, 7, '#EE7B6B'), [[0, -95]]);
    s.raw([[-24, 28, 30], [24, 28, 30], [0, 30, 54], [-20, 22, 54], [20, 22, 54]].map(([x, y, z]) => dot(x, y, z, 2.4, '#FFFDF8')).join(''), []);
  } else if (id === 'cloud') {
    [[-26, 8], [20, -8], [0, 22], [28, 22], [-14, -22]].forEach(([x, y]) => s.dome(x, y, 0, 26, 24, '#FFFFFF'));
    s.box(-22, -20, 16, 44, 40, 36, '#DCEBFA');
    s.poly([[26, -24, 52], [26, 24, 52], [26, 0, 76]], '#CFE3F5');
    s.poly([[-26, 24, 52], [26, 24, 52], [26, 0, 76], [-26, 0, 76]], '#B9D6F2');
    door(0, 20, 16, 12, 20, '#F6D27A'); winR(22, -6, 30);
    s.raw(dot(-40, -30, 90, 3, '#F6D27A') + dot(40, -40, 100, 2.4, '#F6D27A'), [[-40, -110]]);
  } else {
    s.box(-34, -26, 0, 68, 52, 42, '#FFF1D9');
    s.box(12, -14, 48, 10, 10, 30, '#DDB083');
    s.poly([[38, -30, 40], [38, 30, 40], [38, 0, 72]], '#FFE8CC');
    s.poly([[-38, 30, 40], [38, 30, 40], [38, 0, 72], [-38, 0, 72]], '#EE9B8B');
    door(-8, 26, 0, 14, 24); s.raw(dot(-3, 26.5, 12, 1.6), []);
    s.poly([[10, 26, 18], [26, 26, 18], [26, 26, 30], [10, 26, 30]], '#CFE3F5');
    winR(34, -10, 16); winR(34, 12, 16);
  }
  return s.done().svg;
}
