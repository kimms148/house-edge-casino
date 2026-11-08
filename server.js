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
const GAMES = ['coin', 'rps', 'horse', 'snail', 'oddeven', 'baccarat', 'slot', 'crash', 'blackjack', 'roulette'];
const MAX_MULT = { coin: 1.95, rps: 1.95, horse: 40, snail: 40, oddeven: 1.95, baccarat: 9, slot: 500, crash: 100000, blackjack: 10, roulette: 36 };

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
  const ch = chatOf(u.sid);
  return { sid: u.sid, name: u.name, grade: u.grade, cls: u.cls, num: u.num, bal: u.bal, start: userStart(u), loan: loanSummary(u), lenders: lenderState(u), stats: u.stats, hist: u.hist.slice(-300), chat: ch && ch.open ? { open: true, msgs: ch.msgs } : null };
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
/* ---------------- settings, loans, stable, chat ---------------- */
// 대출 단계: 1차 10,000P 시간당 20%, 2차 50,000P 40%, 3차 100,000P 60% (단리, 각각 24시간 사용). 3차 이후는 없음.
// 대출소 세 곳. 빌리는 금액은 같고(1차 1만, 2차 5만, 3차 이후 10만), 이자율만 다르다. 각 대출소는 따로 센다.
const LOAN_AMOUNTS = [10000, 50000, 100000];
const LENDERS = [
  { k: 'gold', name: '골드브릿지 캐피탈', rates: [0.20, 0.40, 0.60] },
  { k: 'moon', name: '블랙문 크레딧', rates: [0.30, 0.50, 0.70] },
  { k: 'red', name: '레드라인 대부', rates: [0.40, 0.60, 0.80] },
];
const LENDER = Object.fromEntries(LENDERS.map(L => [L.k, L]));
const LOAN_TIERS = LOAN_AMOUNTS.map((amount, i) => ({ amount, rate: LENDERS[0].rates[i] }));
const LOAN_TERM = 24 * 3600 * 1000;
const lenderOf = l => l.lender || 'gold';
const loanCount = (u, k) => (u.loans || []).filter(l => !k || lenderOf(l) === k).length;
const lastLoanAt = (u, k) => { const l = (u.loans || []).filter(x => lenderOf(x) === (k || 'gold')).pop(); return l ? l.at : 0; };
const nextLoanAt = (u, k) => lastLoanAt(u, k) ? lastLoanAt(u, k) + LOAN_TERM : 0;
const activeLoans = u => Object.entries(u.loanBy || {}).filter(([, l]) => l).map(([k, l]) => Object.assign({ k }, l));
const debtOne = (l, now) => Math.floor(l.principal * (1 + (l.rate || 0.2) * Math.max(0, ((now || Date.now()) - l.at) / 3600000)));
// per-lender state the student's loan tab draws from
function lenderState(u) {
  return LENDERS.map(L => { const a = (u.loanBy || {})[L.k]; const cnt = loanCount(u, L.k);
    return { k: L.k, name: L.name, rates: L.rates, count: cnt, nextAt: nextLoanAt(u, L.k), active: a ? Object.assign({}, a, { debt: debtOne(a), expired: Date.now() - a.at > LOAN_TERM }) : null }; });
}
// one summary for screens that only need totals
function loanSummary(u) {
  const act = activeLoans(u); if (!act.length) return null;
  return { principal: act.reduce((s, l) => s + l.principal, 0), debt: act.reduce((s, l) => s + debtOne(l), 0), expired: act.some(l => Date.now() - l.at > LOAN_TERM), count: act.length,
    list: act.map(l => ({ k: l.k, name: LENDER[l.k].name, n: l.n, principal: l.principal, rate: l.rate, debt: debtOne(l), expired: Date.now() - l.at > LOAN_TERM })) };
}
const settings = () => Object.assign({ startBal: START }, DB.meta.settings || {});
const userStart = u => u.start || START;
function debtOf(u, now) { return activeLoans(u).reduce((s, l) => s + debtOne(l, now), 0); }
const loanExpired = u => activeLoans(u).some(l => Date.now() - l.at > LOAN_TERM);
const worth = u => u.bal - debtOf(u);
const rate = u => (worth(u) - userStart(u)) / Math.max(1, userStart(u)) * 100;

// 말·달팽이 공용 전적: 이기면 다음 판 승률이 내려가고, 지면 올라간다
const HORSES = ['번개발굽', '흑진주', '바람돌이', '적토마', '은하수', '꼬마별'];
const SNAILS = ['느림보', '끈적이', '총알', '껍데기왕'];
function freshStable() {
  const w = HORSES.map(() => Math.pow(0.35 + Math.random(), 2.2)); const sum = w.reduce((a, b) => a + b, 0);
  const horse = HORSES.map((name, i) => ({ name, p: w[i] / sum, runs: 0, wins: 0 }));
  normalize(horse, 0.04, 0.6);
  return { horse, snail: SNAILS.map(name => ({ name, p: 0.25, runs: 0, wins: 0 })) };
}
function normalize(list, lo, hi) {
  for (let k = 0; k < 4; k++) {
    for (const h of list) h.p = Math.min(hi, Math.max(lo, h.p));
    const t = list.reduce((a, h) => a + h.p, 0); for (const h of list) h.p /= t;
  }
}
function updateStable(kind, winner) {
  const list = DB.meta.stable && DB.meta.stable[kind]; if (!list || !(winner >= 0 && winner < list.length)) return;
  const w = list[winner]; const freed = w.p * 0.2; w.p -= freed;
  for (let i = 0; i < list.length; i++) { list[i].runs++; if (i !== winner) list[i].p += freed / (list.length - 1); }
  w.wins++;
  normalize(list, kind === 'horse' ? 0.04 : 0.08, 0.6);
  store.saveMeta('stable', DB.meta.stable);
  const out = JSON.stringify({ t: 'stable', stable: DB.meta.stable }); for (const c of conns) if (c.ws.readyState === 1) c.ws.send(out);
}

// 관리자 1:1 메시지
const chatOf = sid => DB.meta['chat:' + sid] || null;
function saveChat(sid, ch) { DB.meta['chat:' + sid] = ch; store.saveMeta('chat:' + sid, ch); }
function chatsForAdmin() {
  const out = {};
  for (const k of Object.keys(DB.meta)) if (k.startsWith('chat:')) { const sid = k.slice(5); const u = DB.users[sid]; if (u) out[sid] = Object.assign({ name: u.name, cls: u.cls, num: u.num, grade: u.grade }, DB.meta[k]); }
  return out;
}
function pushChat(sid) {
  const ch = chatOf(sid);
  for (const c of userConns(sid)) send(c, { t: 'chat', chat: ch ? { open: ch.open, msgs: ch.msgs } : null });
  const m = { t: 'chats', chats: chatsForAdmin() }; for (const c of admins()) send(c, m);
}

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
  for (const c of userConns(sid)) send(c, Object.assign({ t: 'bal', bal: u.bal, stats: u.stats, loan: loanSummary(u), lenders: lenderState(u) }, extra || {}));
}

// ranking: 반별 학생 순위 + 반 평균 수익률 순위
function rankData() {
  const byClass = {};
  for (let k = 1; k <= 7; k++) byClass[k] = [];
  for (const u of Object.values(DB.users)) byClass[u.cls] && byClass[u.cls].push({ sid: u.sid, name: u.name, grade: u.grade, cls: u.cls, num: u.num, bal: worth(u), debt: debtOf(u), rate: Math.round(rate(u) * 10) / 10, rounds: u.stats.rounds });
  const classes = [];
  for (let k = 1; k <= 7; k++) {
    const l = byClass[k].sort((a, b) => b.rate - a.rate || b.bal - a.bal || a.num - b.num);
    const avg = l.length ? Math.round(l.reduce((s, x) => s + x.rate, 0) / l.length * 10) / 10 : null;
    classes.push({ cls: k, n: l.length, avg, total: l.reduce((s, x) => s + x.bal, 0), top: l[0] ? { name: l[0].name, num: l[0].num, rate: l[0].rate } : null });
  }
  classes.sort((a, b) => (b.avg == null ? -1e9 : b.avg) - (a.avg == null ? -1e9 : a.avg) || a.cls - b.cls);
  // 전체 순위: 모든 반 학생을 수익률 순으로
  const all = [].concat(...Object.values(byClass)).sort((a, b) => b.rate - a.rate || b.bal - a.bal || a.cls - b.cls || a.num - b.num);
  return { t: 'rank', classes, byClass, all, at: Date.now() };
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
    sid: u.sid, name: u.name, grade: u.grade, cls: u.cls, num: u.num, bal: u.bal, start: userStart(u), loan: loanSummary(u), loanCount: loanCount(u), chatOpen: !!(chatOf(u.sid) && chatOf(u.sid).open), stats: { rounds: u.stats.rounds, wins: u.stats.wins, net: u.stats.net, wag: u.stats.wag, manip: u.stats.manip, md: u.stats.md },
    pending: u.pending ? { g: u.pending.g, bet: u.pending.bet } : null, online: online[u.sid] ? online[u.sid].n : 0, presence: online[u.sid] ? online[u.sid].presence : null,
    last: u.hist.length ? u.hist[u.hist.length - 1] : null, created: u.created,
    loanStats: (u.loansArchived || []).concat(u.loans || []).reduce((a, l) => { a.n++; a.lent += l.principal; if (l.repaidAt) { a.repaid += l.principal; a.interest += (l.paid || l.principal) - l.principal; } if (l.forgivenAt) a.forgiven += l.principal; return a; }, { n: 0, lent: 0, repaid: 0, interest: 0, forgiven: 0 }),
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

// 학생별 사건 기록 (관리자 지급·회수, 대출, 상환, 초기화, 비밀번호 변경 등). 게임 결과는 u.hist 에 따로 있다.
function logEv(u, kind, text, delta) {
  u.events = (u.events || []).concat([{ t: Date.now(), k: kind, x: text, d: delta || 0, b: u.bal }]);
  if (u.events.length > 300) u.events = u.events.slice(-300);
  pushLog(u.sid);
}
function userLogMsg(u) { return { t: 'userlog', sid: u.sid, hist: u.hist, events: u.events || [], stats: u.stats, bal: u.bal }; }
function pushLog(sid) { const u = DB.users[sid]; if (!u) return; const m = userLogMsg(u); for (const c of admins()) if (c.watch === sid) send(c, m); }
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
  if (c.admin) { send(c, usersMsg()); send(c, { t: 'mail', list: mailList() }); send(c, { t: 'chats', chats: chatsForAdmin() }); send(c, { t: 'settings', settings: settings() }); }
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
        send(c, { t: 'welcome', ver: (page(), VERSION), cfg: DB.meta.cfg || null, stable: DB.meta.stable, admin: !!(ok && p.admin), me: ok && p.sid ? publicUser(DB.users[p.sid]) : null, mymail: ok && p.sid ? myMail(p.sid) : [] });
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
        const sb = settings().startBal;
        const nu = { sid, name, grade: info.grade, cls: info.cls, num: info.num, salt, hash: hashPw(pw, salt), bal: sb, start: sb, stats: newStats(), hist: [], sessions: [], created: Date.now() };
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
        if (chatOf(u.sid) && chatOf(u.sid).open) return send(c, { t: 'betno', msg: '관리자와 대화 중에는 게임을 할 수 없습니다.' });
        const pz = (DB.meta.cfg && DB.meta.cfg.paused) || {};
        if (pz.all || (pz.games && pz.games[g])) return send(c, { t: 'betno', msg: pz.all ? '지금은 관리자가 모든 게임을 멈춰 두었습니다.' : '지금은 관리자가 이 게임을 멈춰 두었습니다.' });
        if (loanExpired(u)) return send(c, { t: 'betno', msg: '대출 사용 기간(24시간)이 끝났습니다. 대출 탭에서 갚아야 게임을 할 수 있습니다.', loan: true });
        if (bet > u.bal) return send(c, { t: 'betno', msg: '보유 포인트가 부족합니다.', bal: u.bal });
        u.bal -= bet; u.pending = { g, bet, conn: c.id, t: Date.now() };
        store.saveUser(u); send(c, { t: 'betok', bal: u.bal }); for (const o of userConns(u.sid)) if (o !== c) send(o, { t: 'bal', bal: u.bal, stats: u.stats });
        scheduleUsers();
        break;
      }
      case 'betadd': {
        if (!u || !u.pending || u.pending.g !== 'blackjack' || u.pending.added) return send(c, { t: 'betaddno', msg: '추가 베팅을 할 수 없습니다.' });
        const amt = Math.floor(+m.amount);
        if (!(amt >= 1) || amt > u.pending.bet || amt > u.bal) return send(c, { t: 'betaddno', msg: '더블을 하려면 같은 금액이 더 있어야 합니다.' });
        u.bal -= amt; u.pending.bet += amt; u.pending.added = true; store.saveUser(u);
        send(c, { t: 'betaddok', bal: u.bal, bet: u.pending.bet }); scheduleUsers();
        break;
      }
      case 'settle': {
        if (!u || !u.pending) return;
        const { g, bet } = u.pending;
        let pay = Math.max(0, Math.floor(+m.pay || 0));
        pay = Math.min(pay, Math.floor(bet * MAX_MULT[g]));
        u.bal += pay; u.pending = null;
        const h = record(u, g, bet, pay, !!m.manip, +m.d || 0);
        if ((g === 'horse' || g === 'snail') && Number.isInteger(m.winner)) updateStable(g, m.winner);
        store.saveUser(u); pushBal(u.sid, { h }); feedEvent(u, h); pushLog(u.sid); scheduleUsers(); scheduleRank();
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
      case 'loan': {
        if (!u) return;
        const L = LENDER[String(m.k || 'gold')]; if (!L) return;
        u.loanBy = u.loanBy || {};
        if (u.loanBy[L.k]) return send(c, { t: 'loanerr', msg: L.name + '에 갚지 않은 대출이 있습니다.' });
        if (u.bal >= 1 || u.pending) return send(c, { t: 'loanerr', msg: '포인트를 모두 잃었을 때만 대출을 받을 수 있습니다.' });
        if (Date.now() < nextLoanAt(u, L.k)) { const d = new Date(nextLoanAt(u, L.k)); return send(c, { t: 'loanerr', msg: L.name + '은(는) 하루에 한 번만 빌려줍니다. ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' 이후에 다시 빌릴 수 있습니다.' }); }
        const ti = Math.min(loanCount(u, L.k), LOAN_AMOUNTS.length - 1), amount = LOAN_AMOUNTS[ti], rate = L.rates[ti];
        const n = loanCount(u, L.k) + 1, at = Date.now();
        u.loanBy[L.k] = { principal: amount, rate, at, n }; u.bal += amount;
        u.loans = (u.loans || []).concat([{ lender: L.k, principal: amount, rate, at }]);
        logEv(u, 'loan', L.name + ' ' + n + '번째 대출 (시간당 ' + Math.round(rate * 100) + '%)', amount);
        store.saveUser(u); pushBal(u.sid, { loanMsg: L.name + '에서 ' + amount.toLocaleString() + 'P를 빌렸습니다. 24시간 안에 쓸 수 있고, 이자는 시간당 ' + Math.round(rate * 100) + '%입니다.' }); scheduleUsers(); scheduleRank();
        break;
      }
      case 'repay': {
        const L = LENDER[String(m.k || 'gold')]; if (!u || !L || !(u.loanBy || {})[L.k]) return;
        if (u.pending) return send(c, { t: 'loanerr', msg: '판이 끝난 뒤에 갚을 수 있습니다.' });
        const ln = u.loanBy[L.k], d = debtOne(ln);
        if (u.bal < d) return send(c, { t: 'loanerr', msg: L.name + '에 갚을 돈이 부족합니다. 필요한 금액 ' + d.toLocaleString() + 'P, 보유 ' + u.bal.toLocaleString() + 'P' });
        u.bal -= d; const last = (u.loans || []).filter(x => lenderOf(x) === L.k && x.at === ln.at).pop(); if (last) { last.repaidAt = Date.now(); last.paid = d; }
        u.loanBy[L.k] = null; logEv(u, 'repay', L.name + ' 상환 (원금 ' + ln.principal.toLocaleString() + 'P + 이자)', -d); store.saveUser(u); pushBal(u.sid, { loanMsg: L.name + '에 대출금과 이자 ' + d.toLocaleString() + 'P를 갚았습니다.' }); scheduleUsers(); scheduleRank();
        break;
      }
      case 'chat': {
        if (!u) return; const ch = chatOf(u.sid); if (!ch || !ch.open) return;
        const body = String(m.body || '').trim().slice(0, 500); if (!body) return;
        ch.msgs.push({ from: 'user', body, t: Date.now() }); if (ch.msgs.length > 200) ch.msgs = ch.msgs.slice(-200);
        ch.unread = (ch.unread || 0) + 1; saveChat(u.sid, ch); pushChat(u.sid);
        break;
      }
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
        if (m.op === 'userlog') { const lu = DB.users[String(m.sid || '')]; c.watch = lu ? lu.sid : null; if (lu) send(c, userLogMsg(lu)); return; }
        if (m.op === 'userlogclose') { c.watch = null; return; }
        if (m.op === 'mailreadall') {
          const touched = new Set();
          for (const mm of Object.values(DB.mail)) if (!mm.read) { mm.read = true; store.saveMail(mm); touched.add(mm.sid); }
          pushMail(); for (const sid of touched) for (const o of userConns(sid)) send(o, { t: 'mymail', mymail: myMail(sid) });
          return ack(true, touched.size ? '모든 건의를 읽음으로 표시했습니다.' : '안 읽은 건의가 없습니다.');
        }
        if (m.op === 'mailread' || m.op === 'maildel') {
          const mm = DB.mail[String(m.id || '')]; if (!mm) return ack(false, '없는 건의입니다.');
          if (m.op === 'mailread') { mm.read = !mm.read; store.saveMail(mm); } else { delete DB.mail[mm.id]; store.deleteMail(mm.id); }
          pushMail(); for (const o of userConns(mm.sid)) send(o, { t: 'mymail', mymail: myMail(mm.sid) });
          return;
        }
        if (m.op === 'settings') {
          const sb = Math.floor(+m.startBal); if (!(sb >= 0 && sb <= 1e9)) return ack(false, '가입 지급 포인트를 확인하세요.');
          DB.meta.settings = Object.assign({}, DB.meta.settings || {}, { startBal: sb }); store.saveMeta('settings', DB.meta.settings);
          for (const o of admins()) send(o, { t: 'settings', settings: settings() });
          return ack(true, '이제 새로 가입하는 학생은 ' + sb.toLocaleString() + 'P로 시작합니다.');
        }
        if (m.op === 'giveall') {
          const amt = Math.floor(+m.amount); const cls = +m.cls || 0; const take = !!m.take;
          if (!(amt > 0) || amt > 1e9) return ack(false, '금액을 확인하세요.');
          let n = 0;
          for (const x of Object.values(DB.users)) { if (cls && x.cls !== cls) continue; const b0 = x.bal; x.bal = take ? Math.max(0, x.bal - amt) : x.bal + amt; n++; logEv(x, take ? 'take' : 'give', (cls ? cls + '반' : '전체') + ' ' + (take ? '회수' : '지급'), x.bal - b0); store.saveUser(x); pushBal(x.sid, { by: 'admin', delta: x.bal - b0 }); }
          scheduleUsers(); scheduleRank();
          return ack(true, (cls ? cls + '반' : '전체') + ' ' + n + '명 ' + (take ? '회수' : '지급') + ': ' + amt.toLocaleString() + 'P씩');
        }
        if (m.op === 'stablereset') { DB.meta.stable = freshStable(); store.saveMeta('stable', DB.meta.stable); const out = { t: 'stable', stable: DB.meta.stable }; for (const o of conns) send(o, out); return ack(true, '말·달팽이 전적을 초기화했습니다.'); }
        if (m.op === 'chatseen') { const ch = chatOf(String(m.sid || '')); if (ch && ch.unread) { ch.unread = 0; saveChat(String(m.sid), ch); const out = { t: 'chats', chats: chatsForAdmin() }; for (const o of admins()) send(o, out); } return; }
        if (!tu) return ack(false, '없는 학생입니다.');
        if (m.op === 'chat') {
          const body = String(m.body || '').trim().slice(0, 500); if (!body) return;
          const ch = chatOf(tu.sid) || { open: false, msgs: [], unread: 0 };
          ch.open = true; ch.msgs.push({ from: 'admin', body, t: Date.now() }); if (ch.msgs.length > 200) ch.msgs = ch.msgs.slice(-200);
          saveChat(tu.sid, ch); pushChat(tu.sid); scheduleUsers(); return;
        }
        if (m.op === 'chatclose') {
          const ch = chatOf(tu.sid); if (!ch) return; ch.open = false; ch.unread = 0;
          ch.msgs.push({ from: 'system', body: '관리자가 대화를 끝냈습니다.', t: Date.now() });
          saveChat(tu.sid, ch); pushChat(tu.sid); scheduleUsers(); return ack(true, tu.name + ' 학생과의 대화를 끝냈습니다.');
        }
        // 대출 초기화: 지금 대출을 없애고, 단계(1차부터)와 하루 대기 시간도 처음으로 돌린다. 기록은 관리자 통계용으로 따로 보관.
        if (m.op === 'loanreset') {
          const cur = tu.loans || [];
          for (const l of cur) if (!l.repaidAt && !l.forgivenAt && activeLoans(tu).some(a => a.at === l.at)) l.forgivenAt = Date.now();
          tu.loansArchived = (tu.loansArchived || []).concat(cur).slice(-200); tu.loans = []; tu.loanBy = {}; tu.loan = null; logEv(tu, 'admin', '관리자가 대출 초기화', 0);
          store.saveUser(tu); pushBal(tu.sid, { by: 'admin', loanMsg: '관리자가 대출 기록을 초기화했습니다. 다음 대출은 1차 조건으로 바로 받을 수 있습니다.' }); scheduleUsers(); scheduleRank();
          return ack(true, tu.name + ' 학생의 대출을 초기화했습니다. (빚 없음, 다음 대출 1차부터)');
        }
        if (m.op === 'forgive') { const act = activeLoans(tu); if (!act.length) return ack(false, '대출이 없습니다.'); for (const l of tu.loans || []) if (!l.repaidAt && act.some(a => a.at === l.at)) l.forgivenAt = Date.now(); tu.loanBy = {}; tu.loan = null; logEv(tu, 'admin', '관리자가 대출 없앰', 0); store.saveUser(tu); pushBal(tu.sid, { by: 'admin' }); scheduleUsers(); scheduleRank(); return ack(true, tu.name + ' 학생의 대출을 없앴습니다.'); }
        const amt = Math.floor(+m.amount);
        if (m.op === 'add' || m.op === 'sub' || m.op === 'set') {
          if (!(amt >= 0) || amt > 1e12) return ack(false, '금액을 확인하세요.');
          const before = tu.bal;
          tu.bal = m.op === 'add' ? tu.bal + amt : m.op === 'sub' ? Math.max(0, tu.bal - amt) : amt;
          logEv(tu, m.op === 'add' ? 'give' : m.op === 'sub' ? 'take' : 'admin', m.op === 'add' ? '관리자 지급' : m.op === 'sub' ? '관리자 회수' : '관리자가 포인트 설정', tu.bal - before);
          store.saveUser(tu); pushBal(tu.sid, { by: 'admin', delta: tu.bal - before }); scheduleUsers(); scheduleRank();
          return ack(true, `${tu.name}: ${before.toLocaleString()}P → ${tu.bal.toLocaleString()}P`);
        }
        if (m.op === 'pw') {
          const pw = String(m.pw || ''); if (pw.length < 4) return ack(false, '새 비밀번호는 4자 이상이어야 합니다.');
          tu.salt = crypto.randomBytes(16).toString('hex'); tu.hash = hashPw(pw, tu.salt); tu.sessions = []; logEv(tu, 'admin', '관리자가 비밀번호 변경', 0);
          for (const [h, p] of tokens) if (p.sid === tu.sid) tokens.delete(h);
          store.saveUser(tu); return ack(true, `${tu.name} 비밀번호를 바꿨습니다.`);
        }
        if (m.op === 'del') {
          delete DB.users[tu.sid]; store.deleteUser(tu.sid); if (DB.meta['chat:' + tu.sid]) { delete DB.meta['chat:' + tu.sid]; store.saveMeta('chat:' + tu.sid, null); }
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

setInterval(() => { if (Object.values(DB.users).some(u => activeLoans(u).length)) { scheduleUsers(); scheduleRank(); } }, 60000);
setInterval(() => {
  for (const c of conns) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; try { c.ws.ping(); } catch (e) {} }
}, 25000);

(async () => {
  DB = await store.load();
  DB.users = DB.users || {}; DB.mail = DB.mail || {}; DB.meta = DB.meta || {};
  if (!DB.meta.stable || !DB.meta.stable.horse) { DB.meta.stable = freshStable(); store.saveMeta('stable', DB.meta.stable); }
  for (const u of Object.values(DB.users)) { if (u.loan) { u.loanBy = Object.assign({}, u.loanBy, { gold: u.loan }); u.loan = null; }
    u.pending = null; u.stats = Object.assign(newStats(), u.stats || {}); u.hist = u.hist || []; }
  server.listen(PORT, () => console.log(`house-edge listening on :${PORT} (storage: ${store.kind}, users: ${Object.keys(DB.users).length})`));
})().catch(e => { console.error(e); process.exit(1); });

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { try { await store.close(); } catch (e) {} process.exit(0); });
