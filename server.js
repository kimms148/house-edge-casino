// 하우스 엣지 — 교육용 모의 카지노 서버
// 정적 페이지(public/app.html) + 실시간 WebSocket(/ws)
// - 플레이어는 자기 상태(presence)를 보내고, 관리자만 전체 플레이어 목록을 받는다.
// - 관리자는 ADMIN_PASSWORD 로 로그인하며, 로그인한 연결만 확률 설정(rig)과 명령(cmd)을 보낼 수 있다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PROD = process.env.NODE_ENV === 'production';
const APP = path.join(__dirname, 'public', 'app.html');

if (!ADMIN_PASSWORD) console.warn('[warn] ADMIN_PASSWORD 가 설정되지 않아 관리자 로그인이 비활성화됩니다.');

const HEAD = '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>' +
  '</head><body>';
let cached = null;
function page() {
  if (!cached || !PROD) cached = HEAD + fs.readFileSync(APP, 'utf8') + '</body></html>';
  return cached;
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html' || url === '/admin' || url === '/admin/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
    res.end(page());
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const clients = new Map();
let cfg = null; // 현재 확률 조작 설정 (메모리 보관, 서버 재시작 시 초기화)
let seq = 0;

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function peersMsg() {
  return { t: 'peers', peers: [...clients.values()].filter(c => c.pid).map(c => ({ peer: c.peer, pid: c.pid, presence: c.presence })) };
}
let timer = null;
function schedulePeers() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const msg = JSON.stringify(peersMsg());
    for (const c of clients.values()) if (c.admin && c.ws.readyState === 1) c.ws.send(msg);
  }, 200);
}

wss.on('connection', ws => {
  const c = { ws, peer: 'c' + (++seq).toString(36) + crypto.randomBytes(4).toString('hex'), pid: null, admin: false, presence: {}, fails: 0, alive: true };
  clients.set(ws, c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      c.pid = String(m.pid || c.peer).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || c.peer;
      send(ws, { t: 'welcome', peer: c.peer, cfg });
      schedulePeers();
    } else if (m.t === 'presence' && m.p && typeof m.p === 'object' && !Array.isArray(m.p)) {
      if (JSON.stringify(m.p).length <= 4096) { c.presence = m.p; schedulePeers(); }
    } else if (m.t === 'auth') {
      if (c.fails >= 5) { send(ws, { t: 'auth', ok: false, locked: true }); return; }
      const ok = !!ADMIN_PASSWORD && typeof m.pw === 'string' && safeEqual(m.pw, ADMIN_PASSWORD);
      if (ok) c.admin = true; else c.fails++;
      send(ws, { t: 'auth', ok });
      if (ok) send(ws, peersMsg());
    } else if (m.t === 'emit' && c.admin && (m.topic === 'rig' || m.topic === 'cmd')) {
      if (JSON.stringify(m.data || null).length > 16384) return;
      if (m.topic === 'rig') cfg = m.data;
      const out = JSON.stringify({ t: 'msg', topic: m.topic, data: m.data });
      for (const o of clients.values()) if (o.ws.readyState === 1) o.ws.send(out);
    }
  });
  ws.on('close', () => { clients.delete(ws); schedulePeers(); });
});

// 끊어진 연결 정리 + 프록시 유휴 타임아웃 방지
setInterval(() => {
  for (const c of clients.values()) {
    if (!c.alive) { c.ws.terminate(); continue; }
    c.alive = false; try { c.ws.ping(); } catch (e) {}
  }
}, 25000);

server.listen(PORT, () => console.log(`house-edge listening on :${PORT}`));
