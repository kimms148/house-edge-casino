// 앱 아이콘(PNG) 생성기 — 외부 라이브러리 없이 카지노 칩 모양을 그린다.
// 사용: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [17, 12, 13], RED = [140, 30, 26], BRASS = [216, 162, 63], BRASS2 = [245, 210, 126], DARK = [26, 18, 20], WHITE = [251, 246, 236];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4, p = px(x, y);
      raw[i] = p[0]; raw[i + 1] = p[1]; raw[i + 2] = p[2]; raw[i + 3] = p[3] == null ? 255 : p[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);

// scale: 칩 반지름 비율 (maskable 아이콘은 안전 영역 안에 들어가도록 작게)
function chip(size, scale, round) {
  const S = 4; // 슈퍼샘플링
  const c = size / 2, R = size / 2 * scale;
  function sample(x, y) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy) / R, a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    if (round && Math.hypot(dx, dy) > size / 2) return null;
    if (r > 1) return BG;
    if (r > 0.93) return BRASS;
    if (r > 0.70) { const seg = Math.floor(a / (Math.PI / 6)); return seg % 2 ? RED : BRASS2; }
    if (r > 0.64) return BRASS;
    if (r > 0.60) return DARK;
    // 가운데: 다이아몬드
    const d = Math.abs(dx) / R + Math.abs(dy) / (R * 1.25);
    if (d < 0.36) return mix(BRASS2, BRASS, (dy / R + 0.4) / 0.8 < 0 ? 0 : Math.min(1, (dy / R + 0.4) / 0.8));
    if (d < 0.40) return WHITE;
    return DARK;
  }
  return png(size, (x, y) => {
    let acc = [0, 0, 0], n = 0, alpha = 0;
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      const p = sample(x + (i + 0.5) / S, y + (j + 0.5) / S);
      if (p) { acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; n++; }
    }
    alpha = Math.round(255 * n / (S * S));
    return n ? [Math.round(acc[0] / n), Math.round(acc[1] / n), Math.round(acc[2] / n), alpha] : [0, 0, 0, 0];
  });
}

const out = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), chip(192, 0.9, false));
fs.writeFileSync(path.join(out, 'icon-512.png'), chip(512, 0.9, false));
fs.writeFileSync(path.join(out, 'maskable-512.png'), chip(512, 0.72, false));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), chip(180, 0.86, false));
fs.writeFileSync(path.join(out, 'favicon-32.png'), chip(32, 1, true));
console.log('icons written to', out);
