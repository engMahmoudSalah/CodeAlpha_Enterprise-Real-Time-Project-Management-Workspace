// Stand-in for firebase/auth backed by /api/auth/*. Same function names and error codes the app already handles.
const KEY = 'velocity_token';
type U = { uid: string; email: string | null; displayName: string | null; photoURL: string | null; isAnonymous: boolean; emailVerified: boolean; providerData: any[] };
const auth: { currentUser: U | null; ready: boolean } = { currentUser: null, ready: false };
const listeners = new Set<(u: U | null) => void>();
export const getToken = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const setToken = (t: string) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {} };
export class FbError extends Error { code: string; constructor(code: string, message: string) { super(message); this.code = code; } }
export async function api(path: string, body?: any, method = 'POST') {
  const t = getToken();
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = (j as any).error || {}; if (r.status === 401 && path !== '/api/auth/login') { setUser(null, ''); } throw new FbError(e.code || 'unknown', e.message || 'Request failed'); }
  return j;
}
const wrap = (u: any): U => ({ ...u, providerData: u.email ? [{ providerId: 'password', email: u.email }] : [] });
function setUser(u: any | null, token?: string) {
  if (token !== undefined) setToken(token);
  auth.currentUser = u ? wrap(u) : null; auth.ready = true;
  listeners.forEach((l) => l(auth.currentUser));
}
export function getAuth() { return auth; }
export class GoogleAuthProvider { addScope() {} setCustomParameters() {} }
export function onAuthStateChanged(_a: any, cb: (u: U | null) => void, _err?: any) {
  listeners.add(cb);
  if (auth.ready) setTimeout(() => cb(auth.currentUser), 0);
  else if (!getToken()) setTimeout(() => { if (!auth.ready) setUser(null); }, 0);
  else api('/api/auth/me', undefined, 'GET').then((j: any) => setUser(j.user)).catch(() => setUser(null, ''));
  return () => { listeners.delete(cb); };
}
export async function signInWithEmailAndPassword(_a: any, email: string, password: string) { const j: any = await api('/api/auth/login', { email, password }); setUser(j.user, j.token); return { user: auth.currentUser! }; }
export async function createUserWithEmailAndPassword(_a: any, email: string, password: string) { const j: any = await api('/api/auth/register', { email, password }); setUser(j.user, j.token); return { user: auth.currentUser! }; }
export async function signInAnonymously(_a?: any) { if (auth.currentUser) return { user: auth.currentUser }; const j: any = await api('/api/auth/anonymous', {}); setUser(j.user, j.token); return { user: auth.currentUser! }; }
export async function signInWithPopup(): Promise<never> { throw new FbError('auth/operation-not-supported-in-this-environment', 'Google sign-in is not available yet. Use email and password or continue as a guest.'); }
export async function signOut(_a?: any) { setUser(null, ''); }
export async function updateProfile(_u: any, p: { displayName?: string | null; photoURL?: string | null }) { const j: any = await api('/api/auth/profile', { displayName: p.displayName ?? undefined, photoURL: p.photoURL ?? undefined }); auth.currentUser = wrap(j.user); }
export async function updatePassword(_u: any, pw: string) { await api('/api/auth/password', { password: pw }); }
export async function sendPasswordResetEmail(): Promise<never> { throw new FbError('auth/operation-not-allowed', 'Password reset by email is not available yet. Change your password from your profile while signed in.'); }
export async function sendEmailVerification(): Promise<never> { throw new FbError('auth/operation-not-allowed', 'Email verification is not available yet.'); }
export type User = U;
