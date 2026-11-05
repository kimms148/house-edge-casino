// 하우스 엣지 — 교육용 모의 카지노 서버
// - 학번/이름/비밀번호로 회원가입, 포인트와 기록은 서버(DB)에 저장
// - 반별 수익률 랭킹, 건의함(관리자 우편함)
// - 관리자(아이디 manager)는 실시간 관찰, 확률 조작, 자산 지급·회수
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const store = require('./store');

const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const MANAGER_ID = process.env.MANAGER_ID || 'manager';
const MANAGER_PW = process.env.MANAGER_PW || 'manager';
const START = 10000;
const APP = path.join(__dirname, 'public', 'app.html');
const GAMES = ['coin', 'rps', 'horse', 'snail', 'oddeven', 'baccarat', 'slot', 'crash'];
const MAX_MULT = { coin: 1.95, rps: 1.95, horse: 200, snail: 3.8, oddeven: 1.95, baccarat: 9, slot: 500, crash: 100000 };

/* ---------------- http ---------------- */
const HEAD = '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0d0e0f">' +
  '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">' +
  '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">' +
  '<meta name="apple-mobile-web-app-title" content="하우스 엣지"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' +
  '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>' +
  '</head><body>';
// 배포 버전: 페이지·서비스 워커 내용의 해시. 설치한 앱도 이 값이 바뀌면 스스로 새로 고친다.
let VERSION = '';
let cachedPage = null;
function page() {
  if (cachedPage && PROD) return cachedPage;
  const body = fs.readFileSync(APP, 'utf8');
  VERSION = crypto.createHash('sha256').update(body + fs.readFileSync(path.join(__dirname, 'public', 'sw.js'), 'utf8')).digest('hex').slice(0, 12);
  cachedPage = HEAD.replace('<head>', `<head><meta name="app-version" content="${VERSION}">`) + body + '</body></html>';
  return cachedPage;
}
page();
const STATIC = {
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/favicon.ico': ['icons/favicon-32.png', 'image/png'],
};
for (const f of ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png']) STATIC['/icons/' + f] = ['icons/' + f, 'image/png'];

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/version') { page(); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ v: VERSION })); return; }
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
    res.end(page()); return;
  }
  if (url === '/admin' || url === '/admin/') { res.writeHead(302, { location: '/' }); res.end(); return; }
  if (STATIC[url]) {
    const [file, type] = STATIC[url];
    fs.readFile(path.join(__dirname, 'public', file), (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': type, 'x-content-type-options': 'nosniff', 'cache-control': url === '/sw.js' ? 'no-cache' : 'public, max-age=86400' });
      res.end(buf);
    });
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found');
});

/* ---------------- data ---------------- */
let DB = { users: {}, mail: {}, meta: {} };
const tokens = new Map(); // tokenHash -> {sid} | {admin:true}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function eqHex(a, b) { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function eqStr(a, b) { return eqHex(sha(a), sha(b)); }

// 학번 5자리: [학년][반 2자리][번호 2자리] — 20319 = 2학년 3반 19번
function parseSid(sid) {
  if (!/^\d{5}$/.test(sid)) return null;
  const grade = +sid[0], cls = +sid.slice(1, 3), num = +sid.slice(3, 5);
  if (grade < 1 || cls < 1 || cls > 7 || num < 1 || num > 19) return null;
  return { grade, cls, num };
}
function newStats() { const g = {}; for (const k of GAMES) g[k] = { n: 0, w: 0, net: 0, wag: 0 }; return { rounds: 0, wins: 0, net: 0, wag: 0, manip: 0, md: 0, games: g }; }
function publicUser(u) {
  return { sid: u.sid, name: u.name, grade: u.grade, cls: u.cls, num: u.num, bal: u.bal, stats: u.stats, hist: u.hist.slice(-300) };
}
function issueToken(payload) {
  const t = crypto.randomBytes(24).toString('base64url');
  tokens.set(sha(t), payload);
  if (payload.sid) { const u = DB.users[payload.sid]; u.sessions = (u.sessions || []).concat([sha(t)]).slice(-6); store.saveUser(u); }
  if (payload.admin) { DB.meta.adminSessions = (DB.meta.adminSessions || []).concat([sha(t)]).slice(-10); store.saveMeta('adminSessions', DB.meta.adminSessions); }
  return t;
}
function resolveToken(t) {
  if (typeof t !== 'string' || t.length > 100) return null;
  const h = sha(t);
  if (tokens.has(h)) return tokens.get(h);
  if ((DB.meta.adminSessions || []).includes(h)) { const p = { admin: true }; tokens.set(h, p); return p; }
  for (const u of Object.values(DB.users)) if ((u.sessions || []).includes(h)) { const p = { sid: u.sid }; tokens.set(h, p); return p; }
  return null;
}
const rate = u => (u.bal - START) / START * 100;

/* ---------------- sockets ---------------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const conns = new Set();
let seq = 0;
const send = (c, m) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); };
const userConns = sid => [...conns].filter(c => c.sid === sid);
const admins = () => [...conns].filter(c => c.admin);
const authed = () => [...conns].filter(c => c.admin || c.sid);

function pushBal(sid, extra) {
  const u = DB.users[sid]; if (!u) return;
  for (const c of userConns(sid)) send(c, Object.assign({ t: 'bal', bal: u.bal, stats: u.stats }, extra || {}));
}

// ranking: 반별 학생 순위 + 반 평균 수익률 순위
function rankData() {
  const byClass = {};
  for (let k = 1; k <= 7; k++) byClass[k] = [];
  for (const u of Object.values(DB.users)) byClass[u.cls] && byClass[u.cls].push({ sid: u.sid, name: u.name, grade: u.grade, num: u.num, bal: u.bal, rate: Math.round(rate(u) * 10) / 10, rounds: u.stats.rounds });
  const classes = [];
  for (let k = 1; k <= 7; k++) {
    const l = byClass[k].sort((a, b) => b.rate - a.rate || b.bal - a.bal || a.num - b.num);
    const avg = l.length ? Math.round(l.reduce((s, x) => s + x.rate, 0) / l.length * 10) / 10 : null;
    classes.push({ cls: k, n: l.length, avg, total: l.reduce((s, x) => s + x.bal, 0), top: l[0] ? { name: l[0].name, num: l[0].num, rate: l[0].rate } : null });
  }
  classes.sort((a, b) => (b.avg == null ? -1e9 : b.avg) - (a.avg == null ? -1e9 : a.avg) || a.cls - b.cls);
  return { t: 'rank', classes, byClass, at: Date.now() };
}
let rankTimer = null;
function scheduleRank() {
  if (rankTimer) return;
  rankTimer = setTimeout(() => { rankTimer = null; const m = JSON.stringify(rankData()); for (const c of authed()) if (c.ws.readyState === 1) c.ws.send(m); }, 1500);
}

// admin: 모든 가입자(접속 여부와 진행 중인 판 포함)
function usersMsg() {
  const online = {};
  for (const c of conns) if (c.sid) { const o = online[c.sid] || (online[c.sid] = { n: 0, presence: {} }); o.n++; if (c.presence && (c.presence.st === 'play' || !o.presence.game)) o.presence = c.presence; }
  const users = Object.values(DB.users).map(u => ({
    sid: u.sid, name: u.name, grade: u.grade, cls: u.cls, num: u.num, bal: u.bal, stats: { rounds: u.stats.rounds, wins: u.stats.wins, net: u.stats.net, wag: u.stats.wag, manip: u.stats.manip, md: u.stats.md },
    pending: u.pending ? { g: u.pending.g, bet: u.pending.bet } : null, online: online[u.sid] ? online[u.sid].n : 0, presence: online[u.sid] ? online[u.sid].presence : null,
    last: u.hist.length ? u.hist[u.hist.length - 1] : null, created: u.created,
  })).sort((a, b) => b.online - a.online || a.cls - b.cls || a.num - b.num);
  return { t: 'users', users };
}
let usersTimer = null;
function scheduleUsers() {
  if (usersTimer) return;
  usersTimer = setTimeout(() => { usersTimer = null; const m = JSON.stringify(usersMsg()); for (const c of admins()) if (c.ws.readyState === 1) c.ws.send(m); }, 250);
}
const mailList = () => Object.values(DB.mail).sort((a, b) => b.t - a.t);
function pushMail() { const m = { t: 'mail', list: mailList() }; for (const c of admins()) send(c, m); }
const myMail = sid => mailList().filter(m => m.sid === sid).slice(0, 30).map(m => ({ id: m.id, body: m.body, t: m.t, read: !!m.read }));

function feedEvent(u, h) { const m = { t: 'feed', e: { t: h.t, sid: u.sid, name: u.name, cls: u.cls, num: u.num, g: h.g, b: h.b, p: h.p, m: h.m || 0 } }; for (const c of admins()) send(c, m); }

function record(u, g, bet, pay, manip, d) {
  const h = { g, b: bet, p: pay, t: Date.now() }; if (manip) { h.m = 1; h.d = Math.round(d || 0); }
  const st = u.stats, gs = st.games[g] || (st.games[g] = { n: 0, w: 0, net: 0, wag: 0 });
  st.rounds++; st.wag += bet; st.net += pay - bet; if (pay > bet) st.wins++;
  gs.n++; gs.wag += bet; gs.net += pay - bet; if (pay > bet) gs.w++;
  if (manip) { st.manip++; st.md += h.d || 0; }
  u.hist.push(h); if (u.hist.length > 300) u.hist = u.hist.slice(-300);
  return h;
}

function login(c, payload) {
  c.admin = !!payload.admin; c.sid = payload.sid || null;
  if (c.admin) { send(c, usersMsg()); send(c, { t: 'mail', list: mailList() }); }
  send(c, rankData());
  scheduleUsers();
}

wss.on('connection', ws => {
  const c = { ws, id: 'c' + (++seq), sid: null, admin: false, presence: null, alive: true, fails: 0, last: 0 };
  conns.add(c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    const u = c.sid ? DB.users[c.sid] : null;
    switch (m.t) {
      case 'hello': {
        const p = m.token ? resolveToken(m.token) : null;
        const ok = p && (p.admin || DB.users[p.sid]);
        send(c, { t: 'welcome', ver: (page(), VERSION), cfg: DB.meta.cfg || null, admin: !!(ok && p.admin), me: ok && p.sid ? publicUser(DB.users[p.sid]) : null, mymail: ok && p.sid ? myMail(p.sid) : [] });
        if (ok) login(c, p);
        break;
      }
      case 'signup': {
        const sid = String(m.sid || '').trim(), name = String(m.name || '').trim(), pw = String(m.pw || '');
        const info = parseSid(sid);
        if (!info) return send(c, { t: 'autherr', where: 'signup', msg: '학번을 확인하세요. 5자리(예: 20319)이고 반은 1~7반, 번호는 1~19번이어야 합니다.' });
        if (!/^[가-힣A-Za-z ]{2,12}$/.test(name)) return send(c, { t: 'autherr', where: 'signup', msg: '이름은 한글 또는 영문 2~12자로 입력하세요.' });
        if (pw.length < 4 || pw.length > 64) return send(c, { t: 'autherr', where: 'signup', msg: '비밀번호는 4자 이상이어야 합니다.' });
        if (DB.users[sid]) return send(c, { t: 'autherr', where: 'signup', msg: '이미 가입된 학번입니다. 로그인하세요.' });
        const salt = crypto.randomBytes(16).toString('hex');
        const nu = { sid, name, grade: info.grade, cls: info.cls, num: info.num, salt, hash: hashPw(pw, salt), bal: START, stats: newStats(), hist: [], sessions: [], created: Date.now() };
        DB.users[sid] = nu; store.saveUser(nu);
        const token = issueToken({ sid });
        send(c, { t: 'authok', token, admin: false, me: publicUser(nu), mymail: [] });
        login(c, { sid }); scheduleRank();
        break;
      }
      case 'login': {
        if (c.fails >= 10) return send(c, { t: 'autherr', where: 'login', msg: '시도 횟수를 넘었습니다. 페이지를 새로 고친 뒤 다시 시도하세요.' });
        const id = String(m.id || '').trim(), pw = String(m.pw || '');
        if (eqStr(id, MANAGER_ID) && eqStr(pw, MANAGER_PW)) {
          const token = issueToken({ admin: true });
          send(c, { t: 'authok', token, admin: true, me: null });
          login(c, { admin: true }); return;
        }
        const tu = DB.users[id];
        if (!tu || !eqHex(hashPw(pw, tu.salt), tu.hash)) { c.fails++; return send(c, { t: 'autherr', where: 'login', msg: '학번 또는 비밀번호가 맞지 않습니다.' }); }
        const token = issueToken({ sid: id });
        send(c, { t: 'authok', token, admin: false, me: publicUser(tu), mymail: myMail(id) });
        login(c, { sid: id });
        break;
      }
      case 'logout': {
        if (typeof m.token === 'string') {
          const h = sha(m.token); tokens.delete(h);
          if (u) { u.sessions = (u.sessions || []).filter(x => x !== h); store.saveUser(u); }
          if (c.admin) { DB.meta.adminSessions = (DB.meta.adminSessions || []).filter(x => x !== h); store.saveMeta('adminSessions', DB.meta.adminSessions); }
        }
        c.sid = null; c.admin = false; c.presence = null; scheduleUsers();
        break;
      }
      case 'presence': {
        if (!u || !m.p || typeof m.p !== 'object' || JSON.stringify(m.p).length > 2048) return;
        c.presence = m.p; scheduleUsers();
        break;
      }
      case 'bet': {
        if (!u) return;
        const bet = Math.floor(+m.bet), g = String(m.g);
        if (!GAMES.includes(g) || !(bet >= 1)) return send(c, { t: 'betno', msg: '베팅 금액을 확인하세요.' });
        if (u.pending) return send(c, { t: 'betno', msg: '다른 창에서 진행 중인 판이 있습니다.' });
        if (bet > u.bal) return send(c, { t: 'betno', msg: '보유 포인트가 부족합니다.', bal: u.bal });
        u.bal -= bet; u.pending = { g, bet, conn: c.id, t: Date.now() };
        store.saveUser(u); send(c, { t: 'betok', bal: u.bal }); for (const o of userConns(u.sid)) if (o !== c) send(o, { t: 'bal', bal: u.bal, stats: u.stats });
        scheduleUsers();
        break;
      }
      case 'settle': {
        if (!u || !u.pending) return;
        const { g, bet } = u.pending;
        let pay = Math.max(0, Math.floor(+m.pay || 0));
        pay = Math.min(pay, Math.floor(bet * MAX_MULT[g]));
        u.bal += pay; u.pending = null;
        const h = record(u, g, bet, pay, !!m.manip, +m.d || 0);
        store.saveUser(u); pushBal(u.sid, { h }); feedEvent(u, h); scheduleUsers(); scheduleRank();
        break;
      }
      case 'mail': {
        if (!u) return;
        const body = String(m.body || '').trim().slice(0, 1000);
        if (!body) return;
        if (Date.now() - c.last < 3000) return send(c, { t: 'mailerr', msg: '잠시 후 다시 보내 주세요.' });
        c.last = Date.now();
        const mm = { id: crypto.randomBytes(8).toString('hex'), sid: u.sid, name: u.name, cls: u.cls, num: u.num, grade: u.grade, body, t: Date.now(), read: false };
        DB.mail[mm.id] = mm; store.saveMail(mm);
        send(c, { t: 'mailok', mymail: myMail(u.sid) }); pushMail();
        break;
      }
      case 'rank': send(c, rankData()); break;
      // ---- admin only ----
      case 'emit': {
        if (!c.admin || (m.topic !== 'rig' && m.topic !== 'cmd')) return;
        if (JSON.stringify(m.data || null).length > 16384) return;
        if (m.topic === 'rig') { DB.meta.cfg = m.data; store.saveMeta('cfg', m.data); const out = { t: 'msg', topic: 'rig', data: m.data }; for (const o of conns) send(o, out); }
        else { const to = m.data && m.data.to; const out = { t: 'msg', topic: 'cmd', data: m.data }; for (const o of conns) if (o.sid && (to === 'all' || o.sid === to)) send(o, out); }
        break;
      }
      case 'adm': {
        if (!c.admin) return;
        const tu = DB.users[String(m.sid || '')];
        const ack = (ok, msg) => send(c, { t: 'admack', ok, msg });
        if (m.op === 'mailread' || m.op === 'maildel') {
          const mm = DB.mail[String(m.id || '')]; if (!mm) return ack(false, '없는 건의입니다.');
          if (m.op === 'mailread') { mm.read = !mm.read; store.saveMail(mm); } else { delete DB.mail[mm.id]; store.deleteMail(mm.id); }
          pushMail(); for (const o of userConns(mm.sid)) send(o, { t: 'mymail', mymail: myMail(mm.sid) });
          return;
        }
        if (!tu) return ack(false, '없는 학생입니다.');
        const amt = Math.floor(+m.amount);
        if (m.op === 'add' || m.op === 'sub' || m.op === 'set') {
          if (!(amt >= 0) || amt > 1e12) return ack(false, '금액을 확인하세요.');
          const before = tu.bal;
          tu.bal = m.op === 'add' ? tu.bal + amt : m.op === 'sub' ? Math.max(0, tu.bal - amt) : amt;
          store.saveUser(tu); pushBal(tu.sid, { by: 'admin' }); scheduleUsers(); scheduleRank();
          return ack(true, `${tu.name}: ${before.toLocaleString()}P → ${tu.bal.toLocaleString()}P`);
        }
        if (m.op === 'pw') {
          const pw = String(m.pw || ''); if (pw.length < 4) return ack(false, '새 비밀번호는 4자 이상이어야 합니다.');
          tu.salt = crypto.randomBytes(16).toString('hex'); tu.hash = hashPw(pw, tu.salt); tu.sessions = [];
          for (const [h, p] of tokens) if (p.sid === tu.sid) tokens.delete(h);
          store.saveUser(tu); return ack(true, `${tu.name} 비밀번호를 바꿨습니다.`);
        }
        if (m.op === 'del') {
          delete DB.users[tu.sid]; store.deleteUser(tu.sid);
          for (const [h, p] of tokens) if (p.sid === tu.sid) tokens.delete(h);
          for (const o of userConns(tu.sid)) { send(o, { t: 'kicked' }); o.sid = null; }
          scheduleUsers(); scheduleRank(); return ack(true, `${tu.name} 계정을 삭제했습니다.`);
        }
        break;
      }
    }
  });
  ws.on('close', () => {
    conns.delete(c);
    // 진행 중이던 판의 창을 닫으면 그 판은 진 것으로 처리
    const u = c.sid && DB.users[c.sid];
    if (u && u.pending && u.pending.conn === c.id) {
      const { g, bet } = u.pending; u.pending = null;
      const h = record(u, g, bet, 0, false, 0); store.saveUser(u); feedEvent(u, h); scheduleRank();
    }
    scheduleUsers();
  });
});

setInterval(() => {
  for (const c of conns) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; try { c.ws.ping(); } catch (e) {} }
}, 25000);

(async () => {
  DB = await store.load();
  DB.users = DB.users || {}; DB.mail = DB.mail || {}; DB.meta = DB.meta || {};
  for (const u of Object.values(DB.users)) { u.pending = null; u.stats = Object.assign(newStats(), u.stats || {}); u.hist = u.hist || []; }
  server.listen(PORT, () => console.log(`house-edge listening on :${PORT} (storage: ${store.kind}, users: ${Object.keys(DB.users).length})`));
})().catch(e => { console.error(e); process.exit(1); });

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { try { await store.close(); } catch (e) {} process.exit(0); });
