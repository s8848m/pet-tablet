// 펫 3종: 같은 부위 구조, 색·귀·꼬리만 다르다. 좌표계 viewBox 0 0 300 300, 발바닥 y=250.
const KINDS = {
  mochi: { body: '#fff7f0', line: '#d9b8a8', cheek: '#ffb6c1', ear: 'cat', tail: 'curl' },
  coco:  { body: '#c98b5b', line: '#8a5a33', cheek: '#f3a07a', ear: 'round', tail: 'stub' },
  pico:  { body: '#9fe3d4', line: '#3f9c8a', cheek: '#ffd166', ear: 'crest', tail: 'feather' },
};

const EARS = {
  cat: `<path d="M105 120 L95 70 L135 105 Z"/><path d="M195 120 L205 70 L165 105 Z"/>`,
  round: `<circle cx="105" cy="100" r="18"/><circle cx="195" cy="100" r="18"/>`,
  crest: `<path d="M150 80 C140 50 160 45 150 30 C165 55 175 60 150 80 Z"/>`,
};
const TAILS = {
  curl: `<path d="M205 215 C240 220 245 190 225 185" fill="none" stroke-width="10" stroke-linecap="round"/>`,
  stub: `<circle cx="212" cy="222" r="12"/>`,
  feather: `<path d="M208 215 L245 200 L240 225 Z"/>`,
};

// 표정 = 눈 + 입. data-face 값으로 CSS가 하나만 보이게 한다.
const EYES = {
  open: `<circle cx="130" cy="140" r="7"/><circle cx="170" cy="140" r="7"/><circle cx="132" cy="137" r="2.5" fill="#fff"/><circle cx="172" cy="137" r="2.5" fill="#fff"/>`,
  closed: `<path d="M120 142 Q130 135 140 142 M160 142 Q170 135 180 142" fill="none" stroke-width="4" stroke-linecap="round"/>`,
  happy: `<path d="M120 144 Q130 132 140 144 M160 144 Q170 132 180 144" fill="none" stroke-width="4" stroke-linecap="round"/>`,
  dizzy: `<path d="M123 133 L137 147 M137 133 L123 147 M163 133 L177 147 M177 133 L163 147" stroke-width="4" stroke-linecap="round"/>`,
  sad: `<circle cx="130" cy="142" r="6"/><circle cx="170" cy="142" r="6"/><path d="M118 128 L140 134 M182 128 L160 134" stroke-width="3" fill="none"/>`,
  cry: `<circle cx="130" cy="142" r="6"/><circle cx="170" cy="142" r="6"/><path d="M130 150 v14 M170 150 v14" stroke="#6cc3ff" stroke-width="4" stroke-linecap="round"/>`,
  surprised: `<circle cx="130" cy="140" r="10"/><circle cx="170" cy="140" r="10"/><circle cx="130" cy="140" r="4" fill="#fff"/><circle cx="170" cy="140" r="4" fill="#fff"/>`,
  sleepy: `<path d="M120 140 h20 M160 140 h20" stroke-width="5" stroke-linecap="round"/><circle cx="130" cy="144" r="4"/><circle cx="170" cy="144" r="4"/>`,
  sleep: `<path d="M120 140 h20 M160 140 h20" stroke-width="5" stroke-linecap="round"/>`,
  sparkle: `<path d="M130 130 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z M170 130 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>`,
};
const MOUTHS = {
  smile: `<path d="M138 165 Q150 175 162 165" fill="none" stroke-width="4" stroke-linecap="round"/>`,
  big: `<path d="M135 162 Q150 185 165 162 Z" fill="#c0392b"/>`,
  flat: `<path d="M140 168 h20" stroke-width="4" stroke-linecap="round"/>`,
  o: `<ellipse cx="150" cy="168" rx="7" ry="9" fill="#c0392b"/>`,
  frown: `<path d="M138 172 Q150 162 162 172" fill="none" stroke-width="4" stroke-linecap="round"/>`,
  wavy: `<path d="M136 168 q7 -6 14 0 t14 0" fill="none" stroke-width="4" stroke-linecap="round"/>`,
  tongue: `<path d="M138 165 Q150 175 162 165" fill="none" stroke-width="4"/><ellipse cx="152" cy="172" rx="5" ry="6" fill="#ff8aa0"/>`,
  sing: `<ellipse cx="150" cy="170" rx="9" ry="11" fill="#c0392b"/>`,
};
export const FACES = {
  normal: ['open', 'smile'], happy: ['happy', 'big'], closed: ['closed', 'smile'], laugh: ['closed', 'big'],
  dizzy: ['dizzy', 'wavy'], sad: ['sad', 'frown'], cry: ['cry', 'frown'], surprised: ['surprised', 'o'],
  sleepy: ['sleepy', 'flat'], sleep: ['sleep', 'flat'], smug: ['closed', 'tongue'], shy: ['happy', 'smile'],
  proud: ['sparkle', 'big'], grumpy: ['sad', 'flat'], sing: ['closed', 'sing'], full: ['closed', 'wavy'],
};

const PROPS = {
  ball: `<circle r="16" fill="#ff6b6b"/><path d="M-16 0 Q0 -8 16 0 Q0 8 -16 0" fill="#fff"/>`,
  bowl: `<path d="M-26 0 h52 l-8 18 h-36 Z" fill="#6c8ff5"/><ellipse rx="22" ry="7" fill="#f7e2b0"/>`,
  bowlEmpty: `<path d="M-26 0 h52 l-8 18 h-36 Z" fill="#6c8ff5"/><ellipse rx="22" ry="6" fill="#4a6ad0"/>`,
  toothbrush: `<rect x="-3" y="-30" width="6" height="40" rx="3" fill="#6cc3ff"/><rect x="-5" y="-32" width="10" height="10" fill="#fff"/>`,
  pencil: `<rect x="-3" y="-30" width="6" height="36" fill="#ffd166"/><path d="M-3 6 L0 14 L3 6 Z" fill="#444"/>`,
  book: `<rect x="-24" y="-16" width="48" height="32" rx="3" fill="#f06595"/><path d="M0 -16 v32" stroke="#fff" stroke-width="2"/>`,
  box: `<rect x="-28" y="-14" width="56" height="30" fill="#c9a26b"/><rect x="-30" y="-20" width="60" height="8" fill="#a67c4e"/>`,
  duck: `<ellipse rx="14" ry="10" fill="#ffd60a"/><circle cx="10" cy="-8" r="7" fill="#ffd60a"/><path d="M16 -8 l7 2 -7 3 Z" fill="#ff8c00"/>`,
  towel: `<path d="M-30 0 Q0 -22 30 0 v10 h-60 Z" fill="#fff" stroke="#9ad" stroke-width="2"/>`,
  rope: `<path d="M-40 -10 Q0 40 40 -10" fill="none" stroke="#b5651d" stroke-width="4"/>`,
  balloon: `<ellipse rx="14" ry="18" fill="#ff8fab"/><path d="M0 18 v22" stroke="#999" stroke-width="2"/>`,
  blocks: `<rect x="-24" y="-10" width="16" height="16" fill="#ff6b6b"/><rect x="-6" y="-10" width="16" height="16" fill="#4dabf7"/><rect x="12" y="-10" width="16" height="16" fill="#51cf66"/><rect x="-15" y="-26" width="16" height="16" fill="#ffd43b"/>`,
  blanket: `<path d="M-60 -10 Q0 -30 60 -10 v30 h-120 Z" fill="#a5d8ff" stroke="#74c0fc" stroke-width="2"/>`,
  doll: `<circle cy="-14" r="10" fill="#ffe0b3"/><rect x="-10" y="-4" width="20" height="24" rx="6" fill="#f783ac"/>`,
  mirror: `<ellipse rx="12" ry="15" fill="#dbe9ff" stroke="#c77dff" stroke-width="4"/><rect x="-3" y="15" width="6" height="14" fill="#c77dff"/>`,
  crown: `<path d="M-24 10 L-24 -12 L-10 0 L0 -16 L10 0 L24 -12 L24 10 Z" fill="#ffd700" stroke="#d4a800" stroke-width="2"/>`,
  medal: `<path d="M-6 -24 h12 v14 h-12 Z" fill="#e63946"/><circle cy="2" r="12" fill="#ffd700" stroke="#d4a800" stroke-width="2"/>`,
  trophy: `<path d="M-16 -22 h32 v14 q0 16 -16 16 q-16 0 -16 -16 Z" fill="#ffd700"/><rect x="-10" y="10" width="20" height="6" fill="#d4a800"/>`,
  gift: `<rect x="-18" y="-12" width="36" height="28" fill="#4dabf7"/><rect x="-20" y="-18" width="40" height="8" fill="#1971c2"/><path d="M0 -18 v34" stroke="#ffd43b" stroke-width="5"/>`,
  crayon: `<rect x="-3" y="-24" width="6" height="30" fill="#51cf66"/><path d="M-3 -24 L0 -30 L3 -24 Z" fill="#2b8a3e"/>`,
  wand: `<rect x="-2" y="-6" width="4" height="30" fill="#845ef7"/><circle cy="-12" r="8" fill="none" stroke="#845ef7" stroke-width="3"/>`,
};

export const PROP_IDS = Object.keys(PROPS);

export function petSvg(kind = 'mochi') {
  const k = KINDS[kind] || KINDS.mochi;
  const eyes = Object.entries(EYES).map(([n, p]) => `<g data-eyes="${n}" fill="#333" stroke="#333">${p}</g>`).join('');
  const mouths = Object.entries(MOUTHS).map(([n, p]) => `<g data-mouth="${n}" stroke="#333">${p}</g>`).join('');
  const symbols = Object.entries(PROPS).map(([n, p]) => `<symbol id="p-${n}" overflow="visible">${p}</symbol>`).join('');
  return `
<svg class="pet-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <defs>${symbols}</defs>
  <g data-slot="floor" transform="translate(150 252)"></g>
  <g class="pet" data-part="all" data-stage="baby" fill="${k.body}" stroke="${k.line}" stroke-width="3">
    <g data-part="tail" fill="${k.body}" stroke="${k.line}">${TAILS[k.tail]}</g>
    <g data-part="legs"><ellipse cx="128" cy="240" rx="18" ry="12"/><ellipse cx="172" cy="240" rx="18" ry="12"/></g>
    <g data-part="body"><ellipse cx="150" cy="200" rx="52" ry="48"/></g>
    <g data-part="armL" style="transform-origin:112px 185px"><ellipse cx="104" cy="200" rx="12" ry="22"/></g>
    <g data-part="armR" style="transform-origin:188px 185px"><ellipse cx="196" cy="200" rx="12" ry="22"/></g>
    <g data-part="head" style="transform-origin:150px 150px">
      ${EARS[k.ear]}
      <circle cx="150" cy="140" r="58"/>
      <circle cx="112" cy="158" r="9" fill="${k.cheek}" stroke="none"/><circle cx="188" cy="158" r="9" fill="${k.cheek}" stroke="none"/>
      <g data-part="eyes">${eyes}</g>
      <g data-part="mouth" fill="none">${mouths}</g>
      <g data-slot="head" transform="translate(150 78)"></g>
    </g>
    <g data-slot="handL" transform="translate(96 215)"></g>
    <g data-slot="handR" transform="translate(204 215)"></g>
    <g data-slot="front" transform="translate(150 225)"></g>
  </g>
  <g data-slot="above" transform="translate(150 60)"></g>
  <g data-part="fx"></g>
  <g data-part="bubble" transform="translate(215 70)" style="display:none">
    <rect x="-10" y="-22" width="90" height="44" rx="14" fill="#fff" stroke="#999" stroke-width="2"/>
    <path d="M0 18 L-12 36 L18 20 Z" fill="#fff" stroke="#999" stroke-width="2"/>
    <text x="35" y="6" text-anchor="middle" font-size="22" fill="#333" stroke="none"></text>
  </g>
</svg>`;
}
