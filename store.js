// 저장소: DATABASE_URL 이 있으면 Postgres, 없으면 data/db.json 파일.
// 서버 시작 시 전부 메모리로 읽고, 바뀐 항목만 조금 늦춰서 기록한다.
const fs = require('fs');
const path = require('path');

function fileStore() {
  const dir = path.join(__dirname, 'data');
  const file = path.join(dir, 'db.json');
  let db = { users: {}, mail: {}, meta: {} };
  let timer = null;
  const flush = () => {
    timer = null;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(db));
    fs.renameSync(file + '.tmp', file);
  };
  const later = () => { if (!timer) timer = setTimeout(flush, 500); };
  return {
    kind: 'file',
    async load() { try { db = Object.assign(db, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) {} return db; },
    saveUser(u) { db.users[u.sid] = u; later(); },
    deleteUser(sid) { delete db.users[sid]; later(); },
    saveMail(m) { db.mail[m.id] = m; later(); },
    deleteMail(id) { delete db.mail[id]; later(); },
    saveMeta(k, v) { db.meta[k] = v; later(); },
    async close() { if (timer) { clearTimeout(timer); flush(); } },
  };
}

function pgStore(url) {
  const { Pool } = require('pg');
  // Render 내부 주소(호스트에 점 없음)와 localhost 는 SSL 없이, 외부 주소는 SSL 로 연결
  const host = new URL(url).hostname;
  const plain = !host.includes('.') || host === '127.0.0.1' || host === 'localhost';
  const pool = new Pool({ connectionString: url, ssl: plain ? false : { rejectUnauthorized: false }, max: 4 });
  const pending = new Map(); // key -> fn
  let timer = null;
  const flush = async () => {
    timer = null;
    const jobs = [...pending.values()]; pending.clear();
    for (const j of jobs) { try { await j(); } catch (e) { console.error('[db]', e.message); } }
  };
  const later = (key, fn) => { pending.set(key, fn); if (!timer) timer = setTimeout(flush, 400); };
  return {
    kind: 'postgres',
    async load() {
      await pool.query('create table if not exists users (sid text primary key, data jsonb not null)');
      await pool.query('create table if not exists mail (id text primary key, data jsonb not null)');
      await pool.query('create table if not exists meta (k text primary key, v jsonb)');
      const db = { users: {}, mail: {}, meta: {} };
      for (const r of (await pool.query('select sid, data from users')).rows) db.users[r.sid] = r.data;
      for (const r of (await pool.query('select id, data from mail')).rows) db.mail[r.id] = r.data;
      for (const r of (await pool.query('select k, v from meta')).rows) db.meta[r.k] = r.v;
      return db;
    },
    saveUser(u) { const d = JSON.stringify(u); later('u:' + u.sid, () => pool.query('insert into users (sid, data) values ($1, $2) on conflict (sid) do update set data = excluded.data', [u.sid, d])); },
    deleteUser(sid) { later('u:' + sid, () => pool.query('delete from users where sid = $1', [sid])); },
    saveMail(m) { const d = JSON.stringify(m); later('m:' + m.id, () => pool.query('insert into mail (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [m.id, d])); },
    deleteMail(id) { later('m:' + id, () => pool.query('delete from mail where id = $1', [id])); },
    saveMeta(k, v) { const d = JSON.stringify(v); later('k:' + k, () => pool.query('insert into meta (k, v) values ($1, $2) on conflict (k) do update set v = excluded.v', [k, d])); },
    async close() { if (timer) { clearTimeout(timer); await flush(); } await pool.end(); },
  };
}

module.exports = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : fileStore();
