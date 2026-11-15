// Original mascot "Mochi" – a round rice-dumpling (糯米团子) pig drawn as SVG.
// Expressions, moods and accessories; API: pigSVG({ mood, expr, acc, size, cls }).
const OUT = '#D9829C';
const FILL = '#FFDCE5';
const FILL2 = '#FFC9D7';
const SNOUT = '#FFB0C4';
const EYE = '#5A3140';

// Accessories & expressions unlock by total focus minutes
export const ACCESSORIES = [
  { id: 'none', min: 0 }, { id: 'bow', min: 0 }, { id: 'flower', min: 30 }, { id: 'glasses', min: 60 },
  { id: 'scarf', min: 120 }, { id: 'headphones', min: 240 }, { id: 'partyhat', min: 400 },
  { id: 'crown', min: 600 }, { id: 'gradcap', min: 1000 },
];
export const EXPRESSIONS = [
  { id: 'happy', min: 0 }, { id: 'smile', min: 0 }, { id: 'wink', min: 45 },
  { id: 'love', min: 180 }, { id: 'star', min: 360 }, { id: 'cool', min: 800 },
];

const L = 74, R = 126, Y = 112;
const line = (d, w = 4) => `<path d="${d}" fill="none" stroke="${EYE}" stroke-width="${w}" stroke-linecap="round"/>`;
const roundEye = (x) => `<ellipse cx="${x}" cy="${Y}" rx="7" ry="8.5" fill="${EYE}"/><circle cx="${x + 2.5}" cy="${Y - 3.5}" r="2.8" fill="#fff"/><circle cx="${x - 2.5}" cy="${Y + 3}" r="1.3" fill="#fff"/>`;

function eyes(expr) {
  switch (expr) {
    case 'happy': return [L, R].map((x) => line(`M${x - 8} ${Y + 2} Q${x} ${Y - 8} ${x + 8} ${Y + 2}`)).join('');
    case 'sleep': return [L, R].map((x) => line(`M${x - 8} ${Y} Q${x} ${Y + 6} ${x + 8} ${Y}`)).join('');
    case 'wink': return `<g class="pig-eye">${roundEye(L)}</g>${line(`M${R - 8} ${Y + 2} Q${R} ${Y - 7} ${R + 8} ${Y + 2}`)}`;
    case 'love':
      return [L, R].map((x) => `<path d="M${x} ${Y + 8} C${x - 13} ${Y - 1} ${x - 7} ${Y - 11} ${x} ${Y - 4} C${x + 7} ${Y - 11} ${x + 13} ${Y - 1} ${x} ${Y + 8}Z" fill="#FF6F98" stroke="${OUT}" stroke-width="1.8"/>`).join('');
    case 'star':
      return [L, R].map((x) => `<path d="M${x} ${Y - 10} L${x + 3} ${Y - 3} L${x + 10} ${Y - 2} L${x + 5} ${Y + 3} L${x + 6} ${Y + 10} L${x} ${Y + 6} L${x - 6} ${Y + 10} L${x - 5} ${Y + 3} L${x - 10} ${Y - 2} L${x - 3} ${Y - 3}Z" fill="#FFD54F" stroke="${OUT}" stroke-width="1.8"/>`).join('');
    case 'cool':
      return `<path d="M54 104 H146 L142 110 Q138 124 122 122 Q109 120 105 110 H95 Q91 120 78 122 Q62 124 58 110Z" fill="#3A2E3A" stroke="${OUT}" stroke-width="2.5"/><path d="M64 108 L72 108" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    case 'worried':
      return `<g class="pig-eye">${roundEye(L)}${roundEye(R)}</g>${line(`M${L - 10} ${Y - 12} L${L + 6} ${Y - 17}`, 3)}${line(`M${R + 10} ${Y - 12} L${R - 6} ${Y - 17}`, 3)}`;
    default: return `<g class="pig-eye">${roundEye(L)}${roundEye(R)}</g>`;
  }
}

function accessory(id) {
  const s = `stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"`;
  switch (id) {
    case 'bow':
      return `<g transform="translate(132 60) rotate(16)"><path d="M0 0 L-18 -11 Q-23 0 -18 11Z" fill="#FF7BA5" ${s}/><path d="M0 0 L18 -11 Q23 0 18 11Z" fill="#FF7BA5" ${s}/><circle r="5.5" fill="#FF9CBC" ${s}/></g>`;
    case 'flower':
      return `<g transform="translate(66 60)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="6.5" ry="10" cy="-9" transform="rotate(${a})" fill="#FFF3B0" ${s}/>`).join('')}<circle r="5.5" fill="#FFB74D" ${s}/></g>`;
    case 'glasses':
      return `<g fill="rgba(255,255,255,.25)" stroke="#7FB3E0" stroke-width="3.5"><circle cx="${L}" cy="${Y}" r="15"/><circle cx="${R}" cy="${Y}" r="15"/><path d="M89 110 Q100 104 111 110" fill="none"/></g>`;
    case 'scarf':
      return `<g><path d="M30 150 Q100 172 170 150 L171 163 Q100 187 29 163Z" fill="#FF9A8F" ${s}/><path d="M128 166 L136 192 L120 190 L116 168Z" fill="#FF9A8F" ${s}/><path d="M48 160 l8 3 M70 166 l8 2 M92 169 l8 0" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".75"/></g>`;
    case 'headphones':
      return `<g><path d="M32 112 Q30 34 100 34 Q170 34 168 112" fill="none" stroke="#9C7BD8" stroke-width="8" stroke-linecap="round"/><rect x="18" y="96" width="22" height="34" rx="10" fill="#B39DDB" ${s}/><rect x="160" y="96" width="22" height="34" rx="10" fill="#B39DDB" ${s}/></g>`;
    case 'partyhat':
      return `<g transform="translate(96 52) rotate(-10)"><path d="M-18 4 L0 -44 L18 4Z" fill="#9AD8F5" ${s}/><path d="M-11 -12 L9 -9 M-5 -27 L5 -25" stroke="#FFE066" stroke-width="3.5" stroke-linecap="round"/><circle cy="-46" r="6" fill="#FFE066" ${s}/></g>`;
    case 'crown':
      return `<g transform="translate(100 50)"><path d="M-26 8 L-30 -20 L-14 -6 L0 -26 L14 -6 L30 -20 L26 8Z" fill="#FFD966" ${s}/><circle cy="-2" r="4" fill="#FF7BA5"/><circle cx="-16" cy="2" r="3" fill="#7FB3E0"/><circle cx="16" cy="2" r="3" fill="#8FD19E"/></g>`;
    case 'gradcap':
      return `<g transform="translate(100 50)"><path d="M-24 -2 L-24 9 Q0 20 24 9 L24 -2Z" fill="#4E5B66" ${s}/><path d="M-44 -6 L0 -24 L44 -6 L0 12Z" fill="#5D6B77" ${s}/><path d="M0 -6 L32 2 L32 20" fill="none" stroke="#FFD966" stroke-width="3"/><circle cx="32" cy="22" r="4" fill="#FFD966"/></g>`;
    default: return '';
  }
}

/**
 * Render the pig.
 * @param {object} o { mood: happy|focus|sleep|worried|cheer|proud, expr, acc, size, cls }
 */
export function pigSVG(o = {}) {
  const mood = o.mood || 'happy';
  const acc = o.acc ?? 'bow';
  let expr = o.expr || 'happy';
  if (mood === 'sleep') expr = 'sleep';
  if (mood === 'worried' && expr !== 'cool') expr = 'worried';
  if (mood === 'cheer' && (expr === 'smile' || expr === 'worried')) expr = 'happy';
  const armsUp = mood === 'cheer' || mood === 'proud';
  const size = o.size || 120;
  const mouth = mood === 'worried'
    ? `<ellipse cx="100" cy="146" rx="4" ry="3.5" fill="#B9557A"/>`
    : mood === 'cheer' ? `<path d="M92 142 Q100 154 108 142Z" fill="#F0648F" stroke="${EYE}" stroke-width="2" stroke-linejoin="round"/>`
      : `<path d="M93 143 q3.5 4 7 0 q3.5 4 7 0" fill="none" stroke="${EYE}" stroke-width="2.5" stroke-linecap="round"/>`;
  const arms = armsUp
    ? `<g class="pig-arms-up"><ellipse cx="34" cy="116" rx="9" ry="13" transform="rotate(40 34 116)" fill="${FILL2}" stroke="${OUT}" stroke-width="3"/><ellipse cx="166" cy="116" rx="9" ry="13" transform="rotate(-40 166 116)" fill="${FILL2}" stroke="${OUT}" stroke-width="3"/></g>`
    : `<ellipse cx="44" cy="152" rx="9" ry="12" transform="rotate(25 44 152)" fill="${FILL2}" stroke="${OUT}" stroke-width="3"/><ellipse cx="156" cy="152" rx="9" ry="12" transform="rotate(-25 156 152)" fill="${FILL2}" stroke="${OUT}" stroke-width="3"/>`;
  const book = mood === 'focus'
    ? `<g transform="translate(100 168)"><path d="M-32 -14 L0 -8 L0 16 L-32 10Z" fill="#FFF8E1" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 -14 L0 -8 L0 16 L32 10Z" fill="#FFF3C4" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><path d="M-25 -5 L-8 -2 M-25 3 L-8 6 M8 -2 L25 -5 M8 6 L25 3" stroke="#D8B87A" stroke-width="2"/></g>` : '';
  const extras = {
    sleep: `<g class="pig-zzz" fill="#B49AD8" font-family="Arial Rounded MT Bold,Arial" font-weight="700"><text x="14" y="58" font-size="22">Z</text><text x="30" y="38" font-size="15">z</text></g>`,
    worried: `<path d="M156 76 Q164 88 156 94 Q148 88 156 76Z" fill="#A9D4F5" stroke="${OUT}" stroke-width="2"/>`,
    cheer: `<g class="pig-sparkle" fill="#FFD966" stroke="${OUT}" stroke-width="1.5"><path d="M20 62 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z"/><path d="M178 58 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>`,
    proud: `<g class="pig-sparkle" fill="#FF9CBC"><circle cx="24" cy="70" r="4"/><circle cx="176" cy="66" r="5"/></g>`,
  }[mood] || '';
  const behind = acc === 'headphones' ? accessory(acc) : '';
  const front = acc === 'headphones' ? '' : accessory(acc);
  return `<svg class="pig ${o.cls || ''} pig-mood-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Mochi">
  <ellipse cx="100" cy="192" rx="58" ry="6" fill="rgba(217,130,156,.18)"/>
  <g class="pig-body">
    <ellipse cx="74" cy="183" rx="13" ry="7" fill="${FILL2}" stroke="${OUT}" stroke-width="3.5"/>
    <ellipse cx="126" cy="183" rx="13" ry="7" fill="${FILL2}" stroke="${OUT}" stroke-width="3.5"/>
  </g>
  <g class="pig-head">
    <g class="pig-ear-l"><path d="M54 74 Q36 28 86 50 Q70 66 54 74Z" fill="${FILL}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/><path d="M58 64 Q50 42 74 52Z" fill="${SNOUT}" opacity=".7"/></g>
    <g class="pig-ear-r"><path d="M146 74 Q164 28 114 50 Q130 66 146 74Z" fill="${FILL}" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/><path d="M142 64 Q150 42 126 52Z" fill="${SNOUT}" opacity=".7"/></g>
    ${behind}
    <path d="M28 146 C28 86 58 50 100 50 C142 50 172 86 172 146 C172 176 142 185 100 185 C58 185 28 176 28 146Z" fill="${FILL}" stroke="${OUT}" stroke-width="3.5"/>
    <path d="M94 52 Q92 40 102 38 Q110 38 106 46" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="54" cy="130" rx="12" ry="7" fill="#FF9DB8" opacity=".55"/><ellipse cx="146" cy="130" rx="12" ry="7" fill="#FF9DB8" opacity=".55"/>
    <path d="M48 129 l3 -4 M54 129 l3 -4 M142 129 l3 -4 M148 129 l3 -4" stroke="#F07A9C" stroke-width="1.6" stroke-linecap="round"/>
    <g class="pig-eyes">${eyes(expr)}</g>
    <ellipse cx="100" cy="128" rx="17" ry="11" fill="${SNOUT}" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="94" cy="128" rx="2.6" ry="4" fill="#C25A7A"/><ellipse cx="106" cy="128" rx="2.6" ry="4" fill="#C25A7A"/>
    ${mouth}
  </g>
  ${acc === 'scarf' ? front : ''}
  ${arms}
  ${book}
  ${acc === 'scarf' ? '' : front}
  ${extras}
</svg>`;
}
