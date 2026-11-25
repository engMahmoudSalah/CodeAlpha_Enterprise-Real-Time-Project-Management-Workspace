// Stand-in for firebase/firestore backed by /api/db/*. Live listeners poll cheaply (server skips the payload when nothing changed).
import { api } from './firebase-auth';
export type Firestore = { __db: true };
export const getFirestore = (..._a: any[]): Firestore => ({ __db: true });
const uid = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
export function collection(_db: any, name: string) { return { type: 'col', col: name, cs: [] as any[], order: [] as any[], lim: 0 }; }
export function doc(a: any, col?: string, id?: string) { if (a && a.type === 'col') { col = a.col; } return { type: 'doc', col: col!, id: id || uid(), path: `${col}/${id}` } as any; }
export const where = (f: string, op: string, v: any) => ({ k: 'c', c: { t: 'w', f, op, v } });
export const or = (...cs: any[]) => ({ k: 'c', c: { t: 'or', cs: cs.map((x) => x.c) } });
export const and = (...cs: any[]) => ({ k: 'c', c: { t: 'and', cs: cs.map((x) => x.c) } });
export const orderBy = (f: string, dir: string = 'asc') => ({ k: 'o', o: { f, dir } });
export const limit = (n: number) => ({ k: 'l', n });
export function query(q: any, ...cons: any[]) {
  const r = { ...q, cs: [...q.cs], order: [...q.order] };
  for (const c of cons) { if (c.k === 'c') r.cs.push(c.c); else if (c.k === 'o') r.order.push(c.o); else if (c.k === 'l') r.lim = c.n; }
  return r;
}
const fix = (c: any): any => (c.t === 'w' ? { f: c.f, op: c.op, v: c.v, t: 'w' } : { t: c.t, cs: c.cs.map(fix) });
const mkDoc = (col: string, id: string, data: any) => { const ref = { type: 'doc', col, id, path: `${col}/${id}` }; return { id, ref, exists: () => data !== null && data !== undefined, data: () => data }; };
const mkSnap = (col: string, docs: { id: string; data: any }[]) => { const ds = docs.map((d) => mkDoc(col, d.id, d.data)); return { docs: ds, size: ds.length, empty: ds.length === 0, forEach: (f: (d: any) => void) => ds.forEach(f) }; };
async function runQuery(q: any, since?: number) { return api('/api/db/query', { col: q.col, cs: q.cs.map(fix), order: q.order, limit: q.lim || 0, since }) as Promise<any>; }
const watchers = new Map<string, Set<() => void>>();
const kick = (col: string) => watchers.get(col)?.forEach((f) => f());
export async function getDoc(ref: any) { const j: any = await api('/api/db/get', { col: ref.col, id: ref.id }); return mkDoc(ref.col, ref.id, j.exists ? j.data : null); }
export const getDocFromServer = getDoc;
export async function getDocs(q: any) { const j = await runQuery(q); return mkSnap(q.col, j.docs); }
export async function setDoc(ref: any, data: any, opts?: { merge?: boolean }) { await api('/api/db/set', { col: ref.col, id: ref.id, data, merge: !!(opts && opts.merge) }); kick(ref.col); }
export async function updateDoc(ref: any, data: any) { await api('/api/db/update', { col: ref.col, id: ref.id, data }); kick(ref.col); }
export async function deleteDoc(ref: any) { await api('/api/db/delete', { col: ref.col, id: ref.id }); kick(ref.col); }
export function onSnapshot(target: any, next: (s: any) => void, error?: (e: any) => void) {
  let alive = true, rev: number | undefined, timer: any, busy = false, last = '';
  const col = target.col;
  const tick = async () => {
    if (!alive || busy) return; busy = true;
    try {
      if (target.type === 'doc') { const j: any = await api('/api/db/get', { col, id: target.id }); const s = JSON.stringify(j); if (s !== last) { last = s; next(mkDoc(col, target.id, j.exists ? j.data : null)); } }
      else { const j = await runQuery(target, rev); if (!j.unchanged) { rev = j.rev; next(mkSnap(col, j.docs)); } }
    } catch (e) { if (alive && error) error(e); }
    busy = false; if (alive) timer = setTimeout(tick, document.hidden ? 8000 : 2000);
  };
  const poke = () => { clearTimeout(timer); tick(); };
  if (!watchers.has(col)) watchers.set(col, new Set()); watchers.get(col)!.add(poke);
  tick();
  return () => { alive = false; clearTimeout(timer); watchers.get(col)?.delete(poke); };
}
