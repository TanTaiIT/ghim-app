/*
 * Ảnh minh hoạ của bộ UI gốc, dựng lại thành chuỗi SVG cho `Picture.svg`. Chỉ dữ liệu mẫu (`./mock`)
 * dùng file này; khi backend có `add-media` thì xoá cả file.
 *
 * Mã màu trong file là điểm ảnh của tranh, không phải màu giao diện — chúng không thuộc `@/theme`
 * (HARD#8 nói về style của component, tranh là dữ liệu như một file .png).
 */

type Pair = readonly [string, string];

const SQUARE = '0 0 400 400';

/** Khung chung: nền chuyển dọc, mặt sàn sáng, gradient bóng đổ `#sh` cho vật đặt lên. */
function frame(bg: Pair, body: string, defs = ''): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SQUARE}"><defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>` +
    `<radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `${defs}</defs><rect width="400" height="400" fill="url(#bg)"/>` +
    `<path d="M0 300 Q200 286 400 300 V400 H0z" fill="#fff" opacity=".28"/>${body}</svg>`
  );
}

/** Cắt một vùng của tranh vuông — ảnh "chụp cận" trong gallery mà không cần vẽ tranh mới. */
export function zoom(svg: string, viewBox: string): string {
  return svg.replace(`viewBox="${SQUARE}"`, `viewBox="${viewBox}"`);
}

type PhoneTint = {
  bg: Pair;
  edge: string;
  body: readonly [string, string, string];
  module: Pair;
  ring: string;
  logo: string;
  scale: number;
  /** Bản Pro có ba ống kính xếp tam giác; bản thường hai ống kính chéo. */
  pro: boolean;
};

function phone(t: PhoneTint): string {
  const lens = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="17" fill="${t.ring}"/><circle cx="${x}" cy="${y}" r="14" fill="url(#ln)"/>` +
    `<circle cx="${x - 4}" cy="${y - 4}" r="3.92" fill="#9fb4ff" opacity=".35"/>`;
  const lenses = t.pro
    ? lens(162, 96) +
      lens(162, 130) +
      lens(193, 113) +
      '<circle cx="193" cy="86" r="5" fill="#f5f0dc"/>'
    : lens(163, 97) + lens(191, 125) + '<circle cx="192" cy="91" r="5" fill="#f5f0dc"/>';
  const defs =
    `<linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.body[0]}"/><stop offset=".55" stop-color="${t.body[1]}"/><stop offset="1" stop-color="${t.body[2]}"/></linearGradient>` +
    '<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="ln" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#4a5368"/><stop offset=".5" stop-color="#151821"/><stop offset="1" stop-color="#05060a"/></radialGradient>';
  const body =
    `<ellipse cx="200" cy="338" rx="${88 * t.scale}" ry="14" fill="url(#sh)"/>` +
    `<g transform="translate(200 200) rotate(-9) scale(${t.scale}) translate(-200 -200)">` +
    `<rect x="128" y="58" width="144" height="284" rx="32" fill="${t.edge}"/>` +
    '<rect x="131" y="60" width="138" height="279" rx="30" fill="url(#bd)"/>' +
    '<rect x="131" y="60" width="138" height="279" rx="30" fill="url(#gl)"/>' +
    `<rect x="141" y="70" width="72" height="80" rx="20" fill="${t.module[0]}" stroke="${t.module[1]}" stroke-width="1.5"/>` +
    lenses +
    `<circle cx="200" cy="232" r="13" fill="none" stroke="${t.logo}" stroke-width="2" opacity=".6"/></g>`;
  return frame(t.bg, body, defs);
}

function laptop(bg: Pair, screen: Pair, base: Pair, notch: string): string {
  const defs =
    `<linearGradient id="sc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${screen[0]}"/><stop offset="1" stop-color="${screen[1]}"/></linearGradient>` +
    `<linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>`;
  const body =
    '<ellipse cx="200" cy="300" rx="190" ry="16" fill="url(#sh)"/>' +
    '<rect x="72" y="72" width="256" height="182" rx="12" fill="#1c1f26"/>' +
    '<rect x="82" y="82" width="236" height="160" rx="4" fill="url(#sc)"/>' +
    '<path d="M82 200 C140 150 200 230 318 160 V242 H82z" fill="#fff" opacity=".18"/>' +
    '<path d="M82 225 C160 190 230 250 318 205 V242 H82z" fill="#fff" opacity=".14"/>' +
    '<rect x="186" y="82" width="28" height="6" rx="3" fill="#1c1f26"/>' +
    '<path d="M40 256 H360 L372 280 Q372 286 364 286 H36 Q28 286 28 280z" fill="url(#bs)"/>' +
    `<rect x="170" y="256" width="60" height="7" rx="3" fill="${notch}"/>` +
    '<path d="M40 256 H360" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>';
  return frame(bg, body, defs);
}

const headphones = frame(
  ['#f3eadf', '#e3d3bf'],
  '<ellipse cx="200" cy="335" rx="130" ry="15" fill="url(#sh)"/><g transform="rotate(-6 200 200)">' +
    '<path d="M110 220 C100 90 300 90 290 220" fill="none" stroke="#252629" stroke-width="22" stroke-linecap="round"/>' +
    '<path d="M110 220 C100 90 300 90 290 220" fill="none" stroke="#6b6c6f" stroke-width="6" stroke-linecap="round" opacity=".5" transform="translate(0 -6)"/>' +
    '<rect x="96" y="180" width="16" height="50" rx="6" fill="#252629"/><rect x="288" y="180" width="16" height="50" rx="6" fill="#252629"/>' +
    '<ellipse cx="108" cy="262" rx="46" ry="62" fill="#252629"/><ellipse cx="104" cy="258" rx="40" ry="56" fill="#3a3b40"/>' +
    '<ellipse cx="292" cy="262" rx="46" ry="62" fill="#252629"/><ellipse cx="296" cy="258" rx="40" ry="56" fill="#3a3b40"/>' +
    '<ellipse cx="92" cy="240" rx="10" ry="22" fill="#fff" opacity=".18"/><ellipse cx="284" cy="240" rx="10" ry="22" fill="#fff" opacity=".18"/>' +
    '<circle cx="300" cy="300" r="4" fill="#6b6c6f"/></g>',
);

const wheel = (x: number) =>
  `<circle cx="${x}" cy="290" r="44" fill="#22252b"/><circle cx="${x}" cy="290" r="24" fill="#8c939e"/><circle cx="${x}" cy="290" r="9" fill="#2d3138"/>`;

const scooter = frame(
  ['#e2efe9', '#c8dfd4'],
  '<ellipse cx="205" cy="335" rx="165" ry="14" fill="url(#sh)"/>' +
    wheel(110) +
    wheel(300) +
    '<path d="M62 262 C70 214 120 198 170 206 L232 210 C248 212 254 226 262 240 L282 262 Z" fill="#f2f0ec"/>' +
    '<path d="M66 252 C80 222 120 214 160 220 L150 248 Z" fill="#c8323a"/>' +
    '<path d="M118 196 C130 184 196 184 214 196 L210 208 L122 206 Z" fill="#2a2d33"/>' +
    '<path d="M262 240 L290 120 C292 110 304 106 312 112 L330 150 C336 166 334 200 320 230 L300 270 Z" fill="#f2f0ec"/>' +
    '<path d="M296 128 L318 132 L326 160 L300 168 Z" fill="#c8323a"/>' +
    '<path d="M300 112 L282 70" stroke="#2a2d33" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M262 74 L310 66" stroke="#2a2d33" stroke-width="9" stroke-linecap="round"/>' +
    '<ellipse cx="318" cy="96" rx="12" ry="9" fill="#fff6d6" stroke="#2a2d33" stroke-width="3"/>' +
    '<path d="M300 270 L300 290" stroke="#555b66" stroke-width="8"/>' +
    '<path d="M150 262 H270" stroke="#2a2d33" stroke-width="6" stroke-linecap="round" opacity=".4"/>',
);

const desk = frame(
  ['#f1e9de', '#e1d2bd'],
  '<ellipse cx="200" cy="330" rx="170" ry="12" fill="url(#sh)"/>' +
    '<rect x="46" y="190" width="308" height="20" rx="4" fill="url(#wd)"/>' +
    '<rect x="46" y="206" width="308" height="5" fill="#9c6f3d" opacity=".5"/>' +
    '<rect x="60" y="210" width="12" height="118" fill="#a87a45"/><rect x="328" y="210" width="12" height="118" fill="#a87a45"/>' +
    '<rect x="210" y="212" width="112" height="40" rx="3" fill="#cfa36c"/><rect x="250" y="228" width="32" height="5" rx="2.5" fill="#8a5f31"/>' +
    '<path d="M92 190 L104 118 L132 104" fill="none" stroke="#2f3a3a" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M120 96 L160 92 L150 122 Z" fill="#2f3a3a"/><ellipse cx="96" cy="188" rx="16" ry="4" fill="#2f3a3a"/>' +
    '<path d="M270 190 L276 160 H304 L310 190 Z" fill="#e8e2d6"/>' +
    '<path d="M290 160 C276 130 262 136 258 120 C274 122 286 134 290 150 C292 128 302 116 318 112 C312 130 300 140 292 160" fill="#4f8a5b"/>' +
    '<rect x="170" y="168" width="70" height="10" rx="2" fill="#3e6b8a"/><rect x="176" y="178" width="64" height="12" rx="2" fill="#d9b44a"/>',
  '<linearGradient id="wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c79a63"/><stop offset=".5" stop-color="#ddb47d"/><stop offset="1" stop-color="#b8864f"/></linearGradient>',
);

const ticks = (count: number, x0: number, step: number, y: number, h: number, fill: string) =>
  Array.from(
    { length: count },
    (_, i) => `<rect x="${x0 + i * step}" y="${y}" width="3" height="${h}" fill="${fill}"/>`,
  ).join('');

const camera = frame(
  ['#ebe6df', '#d9d0c4'],
  '<ellipse cx="200" cy="318" rx="150" ry="14" fill="url(#sh)"/>' +
    '<rect x="168" y="96" width="64" height="40" rx="8" fill="#c9ccd1"/>' +
    '<rect x="96" y="104" width="44" height="22" rx="5" fill="#b7bbc2"/><rect x="262" y="104" width="44" height="22" rx="5" fill="#b7bbc2"/>' +
    '<rect x="100" y="98" width="36" height="8" rx="3" fill="#8d929a"/><rect x="266" y="98" width="36" height="8" rx="3" fill="#8d929a"/>' +
    '<rect x="70" y="124" width="260" height="56" rx="10" fill="#dfe2e6"/>' +
    '<rect x="70" y="170" width="260" height="110" rx="12" fill="#2b2d31"/>' +
    '<rect x="70" y="124" width="260" height="56" rx="10" fill="#fff" opacity=".25"/>' +
    '<rect x="80" y="182" width="32" height="88" rx="10" fill="#202226"/>' +
    '<circle cx="200" cy="214" r="72" fill="#17181b"/><circle cx="200" cy="214" r="64" fill="#2a2c31"/>' +
    ticks(16, 138, 8.2, 150, 10, '#45484f') +
    '<circle cx="200" cy="214" r="46" fill="#0d0e11"/><circle cx="200" cy="214" r="34" fill="#1b2a44"/>' +
    '<circle cx="188" cy="202" r="10" fill="#7aa0ff" opacity=".35"/><circle cx="210" cy="226" r="5" fill="#c58bff" opacity=".35"/>' +
    '<circle cx="300" cy="140" r="6" fill="#c33"/>',
);

const lens = frame(
  ['#e1e9ec', '#c9d7dc'],
  '<ellipse cx="200" cy="320" rx="120" ry="13" fill="url(#sh)"/>' +
    '<rect x="120" y="150" width="160" height="150" rx="10" fill="#1f2125"/>' +
    ticks(21, 126, 7, 190, 56, '#33363c') +
    '<rect x="120" y="268" width="160" height="10" fill="#3b3e45"/>' +
    '<ellipse cx="200" cy="150" rx="80" ry="26" fill="#2a2c31"/><ellipse cx="200" cy="150" rx="66" ry="20" fill="#0c0d10"/>' +
    '<ellipse cx="200" cy="150" rx="48" ry="14" fill="#1b2a44"/><ellipse cx="186" cy="146" rx="14" ry="4" fill="#8fb0ff" opacity=".4"/>' +
    '<rect x="186" y="214" width="28" height="4" rx="2" fill="#d6d9de"/>',
);

const tripod = frame(
  ['#ece8f1', '#d8d1e3'],
  '<ellipse cx="200" cy="335" rx="150" ry="12" fill="url(#sh)"/>' +
    '<path d="M200 130 L110 330 M200 130 L290 330 M200 130 L205 336" stroke="#2b2e34" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M170 196 L150 240 M230 196 L250 240" stroke="#8b9099" stroke-width="12" stroke-linecap="round"/>' +
    '<rect x="178" y="112" width="44" height="26" rx="6" fill="#2b2e34"/><circle cx="200" cy="96" r="18" fill="#3a3e45"/>' +
    '<rect x="176" y="70" width="48" height="12" rx="4" fill="#2b2e34"/>' +
    '<path d="M222 104 L262 92" stroke="#c23b2a" stroke-width="7" stroke-linecap="round"/>',
);

/** Ảnh bìa nhóm — khổ ngang, khác khung vuông của tranh sản phẩm. */
const skyline =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 150" preserveAspectRatio="xMidYMid slice"><defs>' +
  '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3557"/><stop offset=".55" stop-color="#e07a5f"/><stop offset="1" stop-color="#f2cc8f"/></linearGradient></defs>' +
  '<rect width="390" height="150" fill="url(#s)"/><circle cx="292" cy="104" r="26" fill="#ffe2a8" opacity=".9"/>' +
  '<path d="M0 150 V112 H22 V96 H40 V118 H58 V84 H72 V70 H80 V84 H92 V120 H112 V100 H130 V124 H150 V92 H164 V108 H180 V128 H198 V60 L206 40 L214 60 V128 H232 V104 H252 V118 H270 V96 H288 V126 H306 V88 H324 V114 H344 V100 H362 V122 H390 V150z" fill="#16243a" opacity=".92"/>' +
  '<rect y="136" width="390" height="14" fill="#16243a"/>' +
  '<path d="M0 142 H390" stroke="#f2cc8f" stroke-opacity=".35" stroke-width="2" stroke-dasharray="14 10"/></svg>';

export const ART = {
  iphone13ProBlue: phone({
    bg: ['#e3ecf4', '#c9d8e6'],
    edge: '#6d8090',
    body: ['#b8cbdc', '#9db7cf', '#7a8ea1'],
    module: ['#90a8be', '#bfd0df'],
    ring: '#667686',
    logo: '#baccdd',
    scale: 1,
    pro: true,
  }),
  iphone13Pink: phone({
    bg: ['#f8ebe8', '#efd6d2'],
    edge: '#a98c89',
    body: ['#f5d8d4', '#f2c9c4', '#bc9c98'],
    module: ['#deb8b4', '#f6dbd8'],
    ring: '#9d827f',
    logo: '#f5d9d5',
    scale: 1,
    pro: false,
  }),
  iphone13MiniBlack: phone({
    bg: ['#ebe9e4', '#d8d5ce'],
    edge: '#282c31',
    body: ['#71747a', '#3a3f47', '#2d3137'],
    module: ['#353941', '#7e8287'],
    ring: '#25282e',
    logo: '#75787e',
    scale: 0.88,
    pro: false,
  }),
  iphone13ProMaxGold: phone({
    bg: ['#f6efe0', '#ead9bb'],
    edge: '#a29579',
    body: ['#eee1c4', '#e8d6ae', '#b4a687'],
    module: ['#d5c4a0', '#f0e4ca'],
    ring: '#968b71',
    logo: '#eee2c6',
    scale: 1.06,
    pro: true,
  }),
  iphone13White: phone({
    bg: ['#e3e9e7', '#cbd6d2'],
    edge: '#a8a8a5',
    body: ['#f4f4f1', '#f1f0ec', '#bbbbb8'],
    module: ['#dddcd9', '#f5f5f2'],
    ring: '#9c9c99',
    logo: '#f5f4f1',
    scale: 1,
    pro: false,
  }),
  iphone13Blue: phone({
    bg: ['#e2e9f6', '#c7d3ea'],
    edge: '#3f587d',
    body: ['#88a2c8', '#5b7fb3', '#46638b'],
    module: ['#5374a4', '#94abcd'],
    ring: '#3b5274',
    logo: '#8ca5c9',
    scale: 1,
    pro: false,
  }),
  macbookAirM1: laptop(
    ['#ebe8f3', '#d6d1e6'],
    ['#6a5cff', '#ff8a6b'],
    ['#babdc1', '#7a7d81'],
    '#727479',
  ),
  macbookAirM1Teal: laptop(
    ['#e6eef0', '#cddcdf'],
    ['#2bb5a0', '#6a8dff'],
    ['#dee1e4', '#9fa1a4'],
    '#949699',
  ),
  macbookProM1: laptop(
    ['#efe9e2', '#ddd2c4'],
    ['#ff7a59', '#ffcf5c'],
    ['#a9acb1', '#696c72'],
    '#62656a',
  ),
  macbookAirM2: laptop(
    ['#e4e8f0', '#cbd2e0'],
    ['#3a3fd6', '#9b5cff'],
    ['#6c7381', '#2c3342'],
    '#29303d',
  ),
  headphones,
  scooter,
  desk,
  camera,
  lens,
  tripod,
  skyline,
};
