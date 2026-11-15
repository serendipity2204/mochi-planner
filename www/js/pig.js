// Original pink-pig mascot "Mochi" drawn as SVG: expressions, moods, accessories.
const OUT = '#8A4A5E';
const SKIN = '#FCC6D6';
const SKIN2 = '#F7AFC4';
const SNOUT = '#F59DB8';

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

function eyes(expr) {
  const L = 72, R = 128, Y = 88;
  switch (expr) {
    case 'happy':
      return `<path d="M${L - 9} ${Y + 3} Q${L} ${Y - 8} ${L + 9} ${Y + 3}" class="pig-line"/><path d="M${R - 9} ${Y + 3} Q${R} ${Y - 8} ${R + 9} ${Y + 3}" class="pig-line"/>`;
    case 'sleep':
      return `<path d="M${L - 9} ${Y} Q${L} ${Y + 7} ${L + 9} ${Y}" class="pig-line"/><path d="M${R - 9} ${Y} Q${R} ${Y + 7} ${R + 9} ${Y}" class="pig-line"/>`;
    case 'wink':
      return `<g class="pig-eye"><ellipse cx="${L}" cy="${Y}" rx="6.5" ry="8" fill="#3B2530"/><circle cx="${L + 2}" cy="${Y - 3}" r="2.4" fill="#fff"/></g><path d="M${R - 9} ${Y + 2} Q${R} ${Y - 7} ${R + 9} ${Y + 2}" class="pig-line"/>`;
    case 'love':
      return [L, R].map((x) => `<path d="M${x} ${Y + 8} C${x - 14} ${Y - 2} ${x - 7} ${Y - 12} ${x} ${Y - 4} C${x + 7} ${Y - 12} ${x + 14} ${Y - 2} ${x} ${Y + 8}Z" fill="#FF5C8A" stroke="${OUT}" stroke-width="2"/>`).join('');
    case 'star':
      return [L, R].map((x) => `<path d="M${x} ${Y - 10} L${x + 3} ${Y - 3} L${x + 10} ${Y - 2} L${x + 5} ${Y + 3} L${x + 6} ${Y + 10} L${x} ${Y + 6} L${x - 6} ${Y + 10} L${x - 5} ${Y + 3} L${x - 10} ${Y - 2} L${x - 3} ${Y - 3}Z" fill="#FFD54F" stroke="${OUT}" stroke-width="2"/>`).join('');
    case 'cool':
      return `<path d="M52 80 H148 L144 86 Q140 102 122 100 Q108 98 104 86 H96 Q92 98 78 100 Q60 102 56 86Z" fill="#2B2B3A" stroke="${OUT}" stroke-width="2.5"/><path d="M64 84 L72 84" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    case 'worried':
      return `<g class="pig-eye"><ellipse cx="${L}" cy="${Y + 2}" rx="6" ry="7" fill="#3B2530"/><circle cx="${L + 2}" cy="${Y - 1}" r="2" fill="#fff"/><ellipse cx="${R}" cy="${Y + 2}" rx="6" ry="7" fill="#3B2530"/><circle cx="${R + 2}" cy="${Y - 1}" r="2" fill="#fff"/></g><path d="M${L - 10} ${Y - 10} L${L + 6} ${Y - 16}" class="pig-line"/><path d="M${R + 10} ${Y - 10} L${R - 6} ${Y - 16}" class="pig-line"/>`;
    default: // smile – open round eyes
      return `<g class="pig-eye"><ellipse cx="${L}" cy="${Y}" rx="6.5" ry="8" fill="#3B2530"/><circle cx="${L + 2}" cy="${Y - 3}" r="2.4" fill="#fff"/><ellipse cx="${R}" cy="${Y}" rx="6.5" ry="8" fill="#3B2530"/><circle cx="${R + 2}" cy="${Y - 3}" r="2.4" fill="#fff"/></g>`;
  }
}

function accessory(id) {
  switch (id) {
    case 'bow':
      return `<g transform="translate(140 34) rotate(18)"><path d="M0 0 L-22 -12 Q-28 0 -22 12Z" fill="#FF6F9C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M0 0 L22 -12 Q28 0 22 12Z" fill="#FF6F9C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><circle r="6" fill="#FF8FB1" stroke="${OUT}" stroke-width="3"/></g>`;
    case 'flower':
      return `<g transform="translate(58 38)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="7" ry="11" cy="-10" transform="rotate(${a})" fill="#FFF3B0" stroke="${OUT}" stroke-width="2.5"/>`).join('')}<circle r="6" fill="#FFB74D" stroke="${OUT}" stroke-width="2.5"/></g>`;
    case 'glasses':
      return `<g fill="none" stroke="#6FA8DC" stroke-width="4"><circle cx="72" cy="88" r="16" fill="rgba(255,255,255,.25)"/><circle cx="128" cy="88" r="16" fill="rgba(255,255,255,.25)"/><path d="M88 88 Q100 82 112 88"/></g>`;
    case 'scarf':
      return `<g><path d="M52 138 Q100 160 148 138 L150 152 Q100 172 50 152Z" fill="#FF8A80" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M126 150 L134 182 L118 180 L114 154Z" fill="#FF8A80" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M60 146 L70 150 M80 152 L90 154 M100 155 L110 154" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g>`;
    case 'headphones':
      return `<g><path d="M34 92 Q34 22 100 22 Q166 22 166 92" fill="none" stroke="#7E57C2" stroke-width="9" stroke-linecap="round"/><rect x="22" y="80" width="22" height="34" rx="10" fill="#9575CD" stroke="${OUT}" stroke-width="3"/><rect x="156" y="80" width="22" height="34" rx="10" fill="#9575CD" stroke="${OUT}" stroke-width="3"/></g>`;
    case 'partyhat':
      return `<g transform="translate(100 40) rotate(-12)"><path d="M-20 4 L0 -48 L20 4Z" fill="#81D4FA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M-12 -14 L10 -10 M-6 -30 L6 -28" stroke="#FFEB3B" stroke-width="4" stroke-linecap="round"/><circle cy="-50" r="7" fill="#FFEB3B" stroke="${OUT}" stroke-width="3"/></g>`;
    case 'crown':
      return `<g transform="translate(100 34)"><path d="M-30 10 L-34 -22 L-16 -6 L0 -28 L16 -6 L34 -22 L30 10Z" fill="#FFD54F" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-2" r="4.5" fill="#FF6F9C"/><circle cx="-18" cy="2" r="3.5" fill="#64B5F6"/><circle cx="18" cy="2" r="3.5" fill="#81C784"/></g>`;
    case 'gradcap':
      return `<g transform="translate(100 34)"><path d="M-26 -2 L-26 10 Q0 22 26 10 L26 -2Z" fill="#37474F" stroke="${OUT}" stroke-width="3"/><path d="M-46 -6 L0 -26 L46 -6 L0 14Z" fill="#455A64" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M0 -6 L34 2 L34 22" fill="none" stroke="#FFD54F" stroke-width="3"/><circle cx="34" cy="24" r="4" fill="#FFD54F"/></g>`;
    default: return '';
  }
}

/**
 * Render pig SVG.
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
    ? `<ellipse cx="100" cy="134" rx="5" ry="4" fill="#B04A68"/>`
    : mood === 'cheer' ? `<path d="M90 130 Q100 144 110 130Z" fill="#E0567E" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>`
      : `<path d="M92 131 Q100 138 108 131" class="pig-line" stroke-width="3"/>`;
  const arms = armsUp
    ? `<g class="pig-arms-up"><ellipse cx="44" cy="128" rx="11" ry="17" transform="rotate(35 44 128)" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/><ellipse cx="156" cy="128" rx="11" ry="17" transform="rotate(-35 156 128)" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/></g>`
    : `<ellipse cx="54" cy="160" rx="11" ry="15" transform="rotate(20 54 160)" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/><ellipse cx="146" cy="160" rx="11" ry="15" transform="rotate(-20 146 160)" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/>`;
  const book = mood === 'focus'
    ? `<g transform="translate(100 166)"><path d="M-34 -16 L0 -10 L0 16 L-34 10Z" fill="#FFF8E1" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M34 -16 L0 -10 L0 16 L34 10Z" fill="#FFF3C4" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M-26 -6 L-8 -3 M-26 2 L-8 5 M8 -3 L26 -6 M8 5 L26 2" stroke="#C9A96E" stroke-width="2"/></g>` : '';
  const extras = {
    sleep: `<g class="pig-zzz" fill="#9C7BC0" font-family="Arial Rounded MT Bold,Arial" font-weight="700"><text x="14" y="50" font-size="22">Z</text><text x="30" y="30" font-size="15">z</text></g>`,
    worried: `<path d="M152 62 Q160 74 152 80 Q144 74 152 62Z" fill="#90CAF9" stroke="${OUT}" stroke-width="2"/>`,
    cheer: `<g class="pig-sparkle" fill="#FFD54F" stroke="${OUT}" stroke-width="1.5"><path d="M24 50 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z"/><path d="M176 46 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>`,
    proud: `<g class="pig-sparkle" fill="#FF8FB1"><circle cx="30" cy="60" r="4"/><circle cx="172" cy="56" r="5"/></g>`,
  }[mood] || '';
  const accBehind = acc === 'headphones' ? '' : '';
  const accFront = accessory(acc);
  const scarfFirst = acc === 'scarf';
  return `<svg class="pig ${o.cls || ''} pig-mood-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Mochi">
  <style>.pig-line{fill:none;stroke:#3B2530;stroke-width:4;stroke-linecap:round}</style>
  ${accBehind}
  <ellipse cx="100" cy="194" rx="56" ry="6" fill="rgba(138,74,94,.12)"/>
  <g class="pig-body">
    <ellipse cx="72" cy="184" rx="15" ry="9" fill="${SKIN2}" stroke="${OUT}" stroke-width="4"/>
    <ellipse cx="128" cy="184" rx="15" ry="9" fill="${SKIN2}" stroke="${OUT}" stroke-width="4"/>
    <ellipse cx="100" cy="152" rx="56" ry="38" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/>
    <path d="M152 160 q14 -4 10 8 q-4 8 6 6" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
  </g>
  ${scarfFirst ? '' : arms}
  <g class="pig-head">
    <g class="pig-ear-l"><path d="M48 62 Q30 18 70 34 Q62 50 48 62Z" fill="${SKIN}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="M50 52 Q42 30 62 38Z" fill="${SNOUT}"/></g>
    <g class="pig-ear-r"><path d="M152 62 Q170 18 130 34 Q138 50 152 62Z" fill="${SKIN}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/><path d="M150 52 Q158 30 138 38Z" fill="${SNOUT}"/></g>
    <ellipse cx="100" cy="96" rx="68" ry="56" fill="${SKIN}" stroke="${OUT}" stroke-width="4"/>
    <path d="M86 46 Q92 40 98 46 M102 44 Q108 38 114 44" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="54" cy="112" rx="12" ry="7.5" fill="#FF8FAB" opacity=".55"/>
    <ellipse cx="146" cy="112" rx="12" ry="7.5" fill="#FF8FAB" opacity=".55"/>
    <g class="pig-eyes">${eyes(expr)}</g>
    <ellipse cx="100" cy="112" rx="23" ry="15" fill="${SNOUT}" stroke="${OUT}" stroke-width="4"/>
    <ellipse cx="92" cy="112" rx="4" ry="6" fill="#B04A68"/><ellipse cx="108" cy="112" rx="4" ry="6" fill="#B04A68"/>
    ${mouth}
  </g>
  ${scarfFirst ? accFront + arms : ''}
  ${book}
  ${scarfFirst ? '' : accFront}
  ${extras}
</svg>`;
}
