// Velocity backend: Cloudflare Worker + one SQLite Durable Object. Replaces Firebase Auth and Firestore.
// Documents live in collections (JSON), queried with a Firestore-like filter language. Any signed-in user can use the
// workspace collections, which matches the original firestore.rules. Passwords are PBKDF2 hashes in a separate table.
import { DurableObject } from "cloudflare:workers";
const enc = new TextEncoder();
const H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: H });
const err = (s, code, message) => json({ error: { code, message } }, s);
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const COLS = new Set(["users", "projects", "tasks", "comments", "activity_logs", "notifications", "invitations", "test"]);
async function hmac(secret, text) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
}
async function pbkdf2(pw, salt) {
  const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, k, 256));
}
let _sec = null;
async function sec(env) { if (env.TOKEN_SECRET) return env.TOKEN_SECRET; if (!_sec) _sec = await hub(env).secret(); return _sec; }
async function makeToken(env, uid) { const body = b64(enc.encode(JSON.stringify({ u: uid, e: Date.now() + 30 * 864e5 }))); return body + "." + (await hmac(await sec(env), body)); }
async function readToken(env, req) {
  const a = req.headers.get("authorization") || ""; const t = a.startsWith("Bearer ") ? a.slice(7) : ""; const [body, sig] = t.split(".");
  if (!body || !sig || (await hmac(await sec(env), body)) !== sig) return null;
  try { const p = JSON.parse(new TextDecoder().decode(unb64(body))); return p.e > Date.now() ? p.u : null; } catch { return null; }
}
const hub = (env) => env.HUB.get(env.HUB.idFromName("main"));
const readJson = async (req) => { try { return await req.json(); } catch { return {}; } };

function getPath(o, p) { let v = o; for (const k of String(p).split(".")) { if (v == null) return undefined; v = v[k]; } return v; }
function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function test(doc, c) {
  if (c.t === "or") return c.cs.some((x) => test(doc, x));
  if (c.t === "and") return c.cs.every((x) => test(doc, x));
  const v = getPath(doc, c.f), w = c.v;
  switch (c.op) {
    case "==": return JSON.stringify(v) === JSON.stringify(w);
    case "!=": return JSON.stringify(v) !== JSON.stringify(w);
    case "<": return v != null && v < w; case "<=": return v != null && v <= w;
    case ">": return v != null && v > w; case ">=": return v != null && v >= w;
    case "array-contains": return Array.isArray(v) && v.some((x) => JSON.stringify(x) === JSON.stringify(w));
    case "array-contains-any": return Array.isArray(v) && Array.isArray(w) && v.some((x) => w.some((y) => JSON.stringify(x) === JSON.stringify(y)));
    case "in": return Array.isArray(w) && w.some((y) => JSON.stringify(v) === JSON.stringify(y));
    case "not-in": return Array.isArray(w) && !w.some((y) => JSON.stringify(v) === JSON.stringify(y));
  }
  return false;
}
function merge(a, b) { const o = { ...a }; for (const k of Object.keys(b)) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]; return o; }
function setPath(o, p, v) { const ks = p.split("."); let t = o; for (let i = 0; i < ks.length - 1; i++) { if (!t[ks[i]] || typeof t[ks[i]] !== "object") t[ks[i]] = {}; t = t[ks[i]]; } t[ks[ks.length - 1]] = v; }

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.rl = new Map();
    try { this.sql.exec("SELECT del_at FROM accounts LIMIT 1"); } catch { try { this.sql.exec("ALTER TABLE accounts ADD COLUMN del_at INTEGER"); } catch {} }
    if (ctx.storage.kv.get("schema_v") !== "2") {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS accounts(uid TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, photo TEXT, anon INTEGER DEFAULT 0, salt TEXT, hash TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(col, id));
CREATE TABLE IF NOT EXISTS revs(col TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0);`);
      ctx.storage.kv.put("schema_v", "2");
    }
  }
  one(q, ...a) { for (const r of this.sql.exec(q, ...a)) return r; return null; }
  all(q, ...a) { return [...this.sql.exec(q, ...a)]; }
  secret() { const r = this.one("SELECT v FROM kv WHERE k='sec'"); if (r) return r.v; const v = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join(""); this.sql.exec("INSERT INTO kv VALUES('sec', ?)", v); return v; }
  limited(key, max, ms) { const now = Date.now(), w = (this.rl.get(key) || []).filter((t) => now - t < ms); if (w.length >= max) { this.rl.set(key, w); return true; } w.push(now); this.rl.set(key, w); if (this.rl.size > 5000) this.rl.clear(); return false; }
  pub(a) { return { uid: a.uid, email: a.email || null, displayName: a.name || null, photoURL: a.photo || null, isAnonymous: !!a.anon, emailVerified: false, deletionScheduledAt: a.del_at || null }; }
  bump(col) { this.sql.exec("INSERT INTO revs(col, rev) VALUES(?, 1) ON CONFLICT(col) DO UPDATE SET rev = rev + 1", col); if (this._revs) this._revs.set(col, (this._revs.get(col) || 0) + 1); }
  rev(col) { if (!this._revs) { this._revs = new Map(); for (const r of this.sql.exec("SELECT col, rev FROM revs")) this._revs.set(r.col, r.rev); } return this._revs.get(col) || 0; }
  async register(b, ip) {
    if (this.limited("reg:" + ip, 8, 36e5)) return { error: [429, "auth/too-many-requests", "Too many sign-ups. Try again later."] };
    const email = str(b.email, 200).toLowerCase(), pw = typeof b.password === "string" ? b.password : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: [400, "auth/invalid-email", "Enter a valid email address."] };
    if (pw.length < 6 || pw.length > 200) return { error: [400, "auth/weak-password", "Password should be at least 6 characters."] };
    if (this.one("SELECT 1 AS x FROM accounts WHERE email = ?", email)) return { error: [409, "auth/email-already-in-use", "An account with this email already exists."] };
    const salt = crypto.getRandomValues(new Uint8Array(16)), uid = "u_" + [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, "0")).join("");
    this.sql.exec("INSERT INTO accounts(uid,email,name,salt,hash,created) VALUES(?,?,?,?,?,?)", uid, email, str(b.name, 80) || email.split("@")[0], b64(salt), await pbkdf2(pw, salt), Date.now());
    return { account: this.one("SELECT * FROM accounts WHERE uid = ?", uid) };
  }
  async login(b, ip) {
    if (this.limited("login:" + ip, 15, 15 * 6e4)) return { error: [429, "auth/too-many-requests", "Too many attempts. Try again in a few minutes."] };
    this.purge();
    const a = this.one("SELECT * FROM accounts WHERE email = ?", str(b.email, 200).toLowerCase());
    const bad = { error: [401, "auth/invalid-credential", "Incorrect email or password."] };
    if (!a || !a.hash) return bad;
    if ((await pbkdf2(String(b.password || ""), unb64(a.salt))) !== a.hash) return bad;
    return { account: a };
  }
  anon(ip) {
    if (this.limited("anon:" + ip, 10, 36e5)) return { error: [429, "auth/too-many-requests", "Too many guest sessions. Try again later."] };
    const uid = "g_" + [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, "0")).join("");
    this.sql.exec("INSERT INTO accounts(uid,anon,created) VALUES(?,1,?)", uid, Date.now());
    return { account: this.one("SELECT * FROM accounts WHERE uid = ?", uid) };
  }
  account(uid) { if (!this._acc) this._acc = new Map(); let a = this._acc.get(uid); if (a === undefined) { a = this.one("SELECT * FROM accounts WHERE uid = ?", uid); if (a) { if (this._acc.size > 500) this._acc.clear(); this._acc.set(uid, a); } } return a; }
  async profile(uid, b) { this._acc = null; if (typeof b.displayName === "string") this.sql.exec("UPDATE accounts SET name = ? WHERE uid = ?", str(b.displayName, 80), uid); if (typeof b.photoURL === "string") this.sql.exec("UPDATE accounts SET photo = ? WHERE uid = ?", str(b.photoURL, 500), uid); this._acc = null; return this.pub(this.account(uid)); }
  async password(uid, pw) {
    if (typeof pw !== "string" || pw.length < 6 || pw.length > 200) return { error: [400, "auth/weak-password", "Password should be at least 6 characters."] };
    this._acc = null; const salt = crypto.getRandomValues(new Uint8Array(16)); this.sql.exec("UPDATE accounts SET salt = ?, hash = ? WHERE uid = ?", b64(salt), await pbkdf2(pw, salt), uid); this._acc = null; return { ok: true };
  }
  async removeAccount(uid, pw) {
    if (this.limited("delacc:" + uid, 5, 6e5)) return { error: [429, "auth/too-many-requests", "Too many attempts. Wait a few minutes."] };
    const a = this.one("SELECT * FROM accounts WHERE uid = ?", uid);
    if (!a) return { error: [404, "auth/user-not-found", "Account not found."] };
    if (a.hash && (await pbkdf2(String(pw || ""), unb64(a.salt))) !== a.hash) return { error: [401, "auth/wrong-password", "Incorrect password."] };
    const at = a.del_at || Date.now() + 7 * 864e5;
    this.sql.exec("UPDATE accounts SET del_at = ? WHERE uid = ?", at, uid); this._acc = null;
    await this.arm();
    return { ok: true, scheduledFor: at };
  }
  exportData(uid) {
    const mine = (d) => ["createdBy", "assigneeId", "authorId", "ownerId", "userId", "uid", "id"].some((k) => d[k] === uid) || (Array.isArray(d.memberIds) && d.memberIds.includes(uid)), out = { exportedAt: new Date().toISOString() };
    for (const col of ["users", "projects", "tasks", "comments", "notifications", "activity_logs"]) {
      const rows = []; for (const r of this.sql.exec("SELECT data FROM docs WHERE col = ? LIMIT 20000", col)) { let d; try { d = JSON.parse(r.data); } catch { continue; } if (mine(d)) { rows.push(d); if (rows.length >= 5000) break; } }
      out[col] = rows;
    }
    return out;
  }
  restoreAccount(uid) { this.sql.exec("UPDATE accounts SET del_at = NULL WHERE uid = ?", uid); this._acc = null; return { ok: true }; }
  purge() {
    const due = this.all("SELECT uid FROM accounts WHERE del_at IS NOT NULL AND del_at <= ?", Date.now());
    for (const r of due) { this.sql.exec("DELETE FROM accounts WHERE uid = ?", r.uid); this.sql.exec("DELETE FROM docs WHERE col = 'users' AND id = ?", r.uid); }
    if (due.length) { this._acc = null; this.bump("users"); }
  }
  async arm() { const n = this.one("SELECT MIN(del_at) m FROM accounts WHERE del_at IS NOT NULL"); if (n && n.m) await this.ctx.storage.setAlarm(Math.max(n.m, Date.now() + 1000)); }
  async alarm() { this.purge(); await this.arm(); }
  rows(col) { return this.all("SELECT id, data FROM docs WHERE col = ?", col).map((r) => ({ id: r.id, data: JSON.parse(r.data) })); }
  get(col, id) { const r = this.one("SELECT data FROM docs WHERE col = ? AND id = ?", col, id); return r ? JSON.parse(r.data) : null; }
  query(col, cs, order, lim, since) {
    const rev = this.rev(col); if (since !== undefined && since === rev) return { unchanged: true, rev };
    let d = this.rows(col).filter((r) => cs.every((c) => test(r.data, c)));
    for (const o of [...(order || [])].reverse()) d.sort((a, b) => (o.dir === "desc" ? -1 : 1) * cmp(getPath(a.data, o.f), getPath(b.data, o.f)));
    if (lim) d = d.slice(0, lim);
    return { rev, docs: d };
  }
  write(col, id, data, mode) {
    const cur = this.get(col, id); let next;
    if (mode === "update") { if (!cur) return { error: [404, "not-found", "No document to update."] }; next = { ...cur }; for (const k of Object.keys(data)) setPath(next, k, data[k]); }
    else if (mode === "merge") next = merge(cur || {}, data); else next = data;
    const s = JSON.stringify(next); if (s.length > 200000) return { error: [413, "invalid-argument", "Document too large."] };
    if (!cur && this.one("SELECT COUNT(*) c FROM docs WHERE col = ?", col).c >= 20000) return { error: [429, "resource-exhausted", "Collection is full."] };
    this.sql.exec("INSERT INTO docs(col,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(col,id) DO UPDATE SET data = excluded.data, updated = excluded.updated", col, id, s, Date.now());
    this.bump(col); return { ok: true };
  }
  del(col, id) { this.sql.exec("DELETE FROM docs WHERE col = ? AND id = ?", col, id); this.bump(col); return { ok: true }; }
}

async function handle(req, env, url) {
  const p = url.pathname.replace(/\/+$/, ""), m = req.method, h = hub(env), ip = req.headers.get("CF-Connecting-IP") || "?";
  if (m !== "GET" && m !== "HEAD") { const o = req.headers.get("origin"); if (o && new URL(o).host !== url.host) return err(403, "forbidden", "Cross-origin request blocked."); }
  if (p === "/api/health") return json({ ok: true, runtime: "cloudflare-workers", store: "durable-object-sqlite" });
  if (p === "/api/auth/register" && m === "POST") { const r = await h.register(await readJson(req), ip); if (r.error) return err(...r.error); return json({ token: await makeToken(env, r.account.uid), user: await h.pub(r.account) }, 201); }
  if (p === "/api/auth/login" && m === "POST") { const r = await h.login(await readJson(req), ip); if (r.error) return err(...r.error); return json({ token: await makeToken(env, r.account.uid), user: await h.pub(r.account) }); }
  if (p === "/api/auth/anonymous" && m === "POST") { const r = await h.anon(ip); if (r.error) return err(...r.error); return json({ token: await makeToken(env, r.account.uid), user: await h.pub(r.account) }, 201); }
  if (p === "/api/send-invite") return json({ error: "Email delivery is not set up yet.", details: "Email delivery is not set up yet. Copy the invite link from Pending Invites and send it yourself." }, 501);
  const uid = await readToken(env, req);
  if (!uid) return err(401, "unauthenticated", "Please sign in.");
  const a = await h.account(uid); if (!a) return err(401, "unauthenticated", "Please sign in.");
  if (p === "/api/auth/me") return json({ user: await h.pub(a) });
  if (p === "/api/auth/profile" && m === "POST") return json({ user: await h.profile(uid, await readJson(req)) });
  if (p === "/api/auth/delete" && m === "POST") { const r = await h.removeAccount(uid, (await readJson(req)).password); return r.error ? err(...r.error) : json(r); }
  if (p === "/api/auth/export" && m === "GET") { if (await h.limited("exp:" + uid, 5, 36e5)) return err(429, "too-many-requests", "Too many exports. Try again later."); const d = await h.exportData(uid); return new Response(JSON.stringify(d, null, 2), { headers: { ...H, "content-disposition": 'attachment; filename="velocity-my-data.json"' } }); }
  if (p === "/api/auth/restore" && m === "POST") return json(await h.restoreAccount(uid));
  if (p === "/api/auth/password" && m === "POST") { try { const tb = JSON.parse(atob((req.headers.get("authorization") || "").slice(7).split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))); if (!a.anon && Date.now() - (tb.e - 30 * 864e5) > 36e5) return err(403, "auth/requires-recent-login", "Please sign in again to change your password."); } catch { return err(401, "unauthenticated", "Please sign in."); } const r = await h.password(uid, (await readJson(req)).password); return r.error ? err(...r.error) : json(r); }
  if (p.startsWith("/api/db/") && m === "POST") {
    const b = await readJson(req), col = str(b.col, 40); if (!COLS.has(col)) return err(400, "invalid-argument", "Unknown collection.");
    const id = str(String(b.id ?? ""), 200);
    if (col === "users" && p !== "/api/db/get" && p !== "/api/db/query" && id !== uid) { const me = await h.get("users", uid); if (!me || me.role !== "admin") return err(403, "permission-denied", "Only a workspace admin can change another user."); }
    if (col === "projects" && p !== "/api/db/get" && p !== "/api/db/query") {
      const cur = id ? await h.get("projects", id) : null;
      const isP = (d) => d && ((Array.isArray(d.memberIds) && d.memberIds.includes(uid)) || d.createdBy === uid);
      if (!cur && b.data && typeof b.data === "object" && p !== "/api/db/delete") b.data = { ...b.data, createdBy: uid };
      if (cur && !isP(cur)) {
        let ok = false;
        const d = b.data;
        if (p !== "/api/db/delete" && (p.endsWith("update") || b.merge) && d && typeof d === "object") {
          const keys = Object.keys(d).filter((k) => k !== "updatedAt");
          const okKeys = keys.length > 0 && keys.every((k) => k === "memberIds" || k === "members");
          const nm = Array.isArray(d.memberIds) ? d.memberIds : cur.memberIds || [];
          const memOk = nm.every((m) => m === uid || (cur.memberIds || []).includes(m));
          const mapOk = !d.members || (typeof d.members === "object" && Object.keys(d.members).every((k) => k === uid || (cur.members && k in cur.members)));
          if (okKeys && memOk && mapOk && nm.includes(uid)) {
            const me = a && a.email ? String(a.email).toLowerCase() : "";
            const inv = await h.query("invitations", [{ t: "w", f: "projectId", op: "==", v: id }], undefined, 200);
            ok = (inv.docs || []).some((x) => { const i = x.data || {}; return i.status === "pending" && ((me && i.inviteeEmail === me) || i.inviteeId === uid) && (i.inviterId === cur.createdBy || (cur.memberIds || []).includes(i.inviterId)); });
          }
        }
        if (!ok) return err(403, "permission-denied", "You are not a member of this project.");
      }
      if (cur && p === "/api/db/delete" && cur.createdBy && cur.createdBy !== uid) return err(403, "permission-denied", "Only the project owner can delete it.");
    }
    if ((col === "invitations" || col === "activity_logs") && p !== "/api/db/get" && p !== "/api/db/query") {
      const cur = id ? await h.get(col, id) : null;
      const me = a && a.email ? String(a.email).toLowerCase() : "";
      const key = col === "invitations" ? "inviterId" : "userId";
      if (!cur) { if (p !== "/api/db/delete" && b.data && typeof b.data === "object") b.data = { ...b.data, [key]: uid }; }
      else {
        const owner = cur[key] === uid;
        const invitee = col === "invitations" && ((me && cur.inviteeEmail === me) || cur.inviteeId === uid);
        const onlyStatus = invitee && p !== "/api/db/delete" && b.data && typeof b.data === "object" && Object.keys(b.data).every((k) => k === "status" || k === "respondedAt" || k === "updatedAt" || (k === "inviteeId" && b.data.inviteeId === uid));
        if (!owner && !onlyStatus) return err(403, "permission-denied", "You cannot change this item.");
        if (b.data && typeof b.data === "object" && owner && p !== "/api/db/delete") b.data = { ...b.data, [key]: uid };
      }
    }
    if ((col === "tasks" || col === "comments") && p !== "/api/db/get" && p !== "/api/db/query") {
      const cur = id ? await h.get(col, id) : null; const pid = (cur && cur.projectId) || (b.data && b.data.projectId);
      const proj = pid ? await h.get("projects", String(pid)) : null;
      if (proj && Array.isArray(proj.memberIds) && proj.memberIds.length && !proj.memberIds.includes(uid)) { const me = await h.get("users", uid); if (!me || me.role !== "admin") return err(403, "permission-denied", "You are not a member of this project."); }
    }
    if (p === "/api/db/get") { let d = await h.get(col, id); if (col === "notifications" && d && d.userId !== uid) d = null; return json({ exists: d !== null, data: d }); }
    if (p === "/api/db/query" && col === "notifications") { const r = await h.query(col, Array.isArray(b.cs) ? b.cs : [], b.order, Math.min(+b.limit || 0, 5000), typeof b.since === "number" ? b.since : undefined); if (r.docs) r.docs = r.docs.filter((x) => x.data && x.data.userId === uid); return json(r); }
    if (p === "/api/db/query" && col === "users") {
      const cs = Array.isArray(b.cs) ? b.cs : [];
      const r = await h.query(col, cs, b.order, Math.min(+b.limit || 0, 5000), undefined);
      if (!r.docs) return json(r);
      const pr = await h.query("projects", [], undefined, 5000);
      const peers = new Set([uid]);
      for (const x of pr.docs || []) { const d = x.data || {}; if ((Array.isArray(d.memberIds) && d.memberIds.includes(uid)) || d.createdBy === uid) { (d.memberIds || []).forEach((m) => peers.add(m)); if (d.createdBy) peers.add(d.createdBy); } }
      const emailLookup = cs.some((c) => c && c.t === "w" && c.f === "email" && c.op === "==");
      r.docs = r.docs.filter((x) => peers.has(x.id)).concat(emailLookup ? r.docs.filter((x) => !peers.has(x.id)).slice(0, 1).map((x) => ({ ...x, data: { id: x.id, name: (x.data || {}).name || "" } })) : []);
      return json(r);
    }
    if (p === "/api/db/query" && (col === "invitations" || col === "activity_logs")) {
      const r = await h.query(col, Array.isArray(b.cs) ? b.cs : [], b.order, Math.min(+b.limit || 0, 5000), undefined);
      if (!r.docs) return json(r);
      const me = a && a.email ? String(a.email).toLowerCase() : "";
      if (col === "invitations") { r.docs = r.docs.filter((x) => { const d = x.data || {}; return d.inviterId === uid || d.inviteeId === uid || (me && d.inviteeEmail === me); }); return json(r); }
      const pr = await h.query("projects", [], undefined, 5000);
      const mine = new Set((pr.docs || []).filter((x) => { const d = x.data || {}; return (Array.isArray(d.memberIds) && d.memberIds.includes(uid)) || d.createdBy === uid; }).map((x) => x.id));
      r.docs = r.docs.filter((x) => { const d = x.data || {}; return d.userId === uid || (d.projectId && mine.has(d.projectId)); });
      return json(r);
    }
    if (p === "/api/db/query" && (col === "projects" || col === "tasks" || col === "comments")) {
      const r = await h.query(col, Array.isArray(b.cs) ? b.cs : [], b.order, Math.min(+b.limit || 0, 5000), typeof b.since === "number" ? b.since : undefined);
      if (!r.docs) return json(r);
      const isMine = (d) => d && ((Array.isArray(d.memberIds) && d.memberIds.includes(uid)) || d.createdBy === uid);
      if (col === "projects") { r.docs = r.docs.filter((x) => isMine(x.data)); return json(r); }
      const pr = await h.query("projects", [], undefined, 5000);
      const mine = new Set((pr.docs || []).filter((x) => isMine(x.data)).map((x) => x.id));
      r.docs = r.docs.filter((x) => { const d = x.data || {}; return d.createdBy === uid || d.authorId === uid || (Array.isArray(d.assigneeIds) && d.assigneeIds.includes(uid)) || (d.projectId && mine.has(d.projectId)); });
      return json(r);
    }
    if (p === "/api/db/query") return json(await h.query(col, Array.isArray(b.cs) ? b.cs : [], b.order, Math.min(+b.limit || 0, 5000), typeof b.since === "number" ? b.since : undefined));
    if (p === "/api/db/set" || p === "/api/db/update") {
      if (!id || !b.data || typeof b.data !== "object") return err(400, "invalid-argument", "id and data are required.");
      if (col === "users" && id === uid) { const cur = await h.get("users", uid); const mode = p.endsWith("update") ? "update" : b.merge ? "merge" : "set"; if (mode === "set" || "role" in b.data) b.data = { ...b.data, role: (cur && cur.role) || "member" }; }
      const r = await h.write(col, id, b.data, p.endsWith("update") ? "update" : b.merge ? "merge" : "set"); return r.error ? err(...r.error) : json(r);
    }
    if (p === "/api/db/delete") { if (!id) return err(400, "invalid-argument", "id is required."); return json(await h.del(col, id)); }
  }
  return err(404, "not-found", "Route not found.");
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try { return await handle(req, env, url); } catch (e) { return err(500, "internal", "Something went wrong."); }
  },
};
