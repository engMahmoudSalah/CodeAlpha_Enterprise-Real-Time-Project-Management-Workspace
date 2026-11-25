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
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS accounts(uid TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, photo TEXT, anon INTEGER DEFAULT 0, salt TEXT, hash TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(col, id));
CREATE TABLE IF NOT EXISTS revs(col TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0);`);
  }
  one(q, ...a) { for (const r of this.sql.exec(q, ...a)) return r; return null; }
  all(q, ...a) { return [...this.sql.exec(q, ...a)]; }
  secret() { const r = this.one("SELECT v FROM kv WHERE k='sec'"); if (r) return r.v; const v = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join(""); this.sql.exec("INSERT INTO kv VALUES('sec', ?)", v); return v; }
  limited(key, max, ms) { const now = Date.now(), w = (this.rl.get(key) || []).filter((t) => now - t < ms); if (w.length >= max) { this.rl.set(key, w); return true; } w.push(now); this.rl.set(key, w); if (this.rl.size > 5000) this.rl.clear(); return false; }
  pub(a) { return { uid: a.uid, email: a.email || null, displayName: a.name || null, photoURL: a.photo || null, isAnonymous: !!a.anon, emailVerified: false }; }
  bump(col) { this.sql.exec("INSERT INTO revs(col, rev) VALUES(?, 1) ON CONFLICT(col) DO UPDATE SET rev = rev + 1", col); }
  rev(col) { const r = this.one("SELECT rev FROM revs WHERE col = ?", col); return r ? r.rev : 0; }
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
  account(uid) { return this.one("SELECT * FROM accounts WHERE uid = ?", uid); }
  async profile(uid, b) { if (typeof b.displayName === "string") this.sql.exec("UPDATE accounts SET name = ? WHERE uid = ?", str(b.displayName, 80), uid); if (typeof b.photoURL === "string") this.sql.exec("UPDATE accounts SET photo = ? WHERE uid = ?", str(b.photoURL, 500), uid); return this.pub(this.account(uid)); }
  async password(uid, pw) {
    if (typeof pw !== "string" || pw.length < 6 || pw.length > 200) return { error: [400, "auth/weak-password", "Password should be at least 6 characters."] };
    const salt = crypto.getRandomValues(new Uint8Array(16)); this.sql.exec("UPDATE accounts SET salt = ?, hash = ? WHERE uid = ?", b64(salt), await pbkdf2(pw, salt), uid); return { ok: true };
  }
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
  const uid = await readToken(env, req);
  if (!uid) return err(401, "unauthenticated", "Please sign in.");
  const a = await h.account(uid); if (!a) return err(401, "unauthenticated", "Please sign in.");
  if (p === "/api/auth/me") return json({ user: await h.pub(a) });
  if (p === "/api/auth/profile" && m === "POST") return json({ user: await h.profile(uid, await readJson(req)) });
  if (p === "/api/auth/password" && m === "POST") { const r = await h.password(uid, (await readJson(req)).password); return r.error ? err(...r.error) : json(r); }
  if (p.startsWith("/api/db/") && m === "POST") {
    const b = await readJson(req), col = str(b.col, 40); if (!COLS.has(col)) return err(400, "invalid-argument", "Unknown collection.");
    const id = str(String(b.id ?? ""), 200);
    if (p === "/api/db/get") { const d = await h.get(col, id); return json({ exists: d !== null, data: d }); }
    if (p === "/api/db/query") return json(await h.query(col, Array.isArray(b.cs) ? b.cs : [], b.order, Math.min(+b.limit || 0, 5000), typeof b.since === "number" ? b.since : undefined));
    if (p === "/api/db/set" || p === "/api/db/update") {
      if (!id || !b.data || typeof b.data !== "object") return err(400, "invalid-argument", "id and data are required.");
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
