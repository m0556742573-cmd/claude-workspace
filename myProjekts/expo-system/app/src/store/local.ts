// The phone's own copy: every lead and every note is saved here first, so the booth never waits for the network.
// Each keeps `synced: false` until the server has it; ids are made here, so sending twice stays one record.
import type { Lead } from '@expo/engine';

export interface LocalLead extends Lead {
  name: string;
  city?: string;
  personId?: string;
  typedPhone?: string;
  note: string;
  capturedAt: string;
  synced: boolean;
  /** He registered himself, from the code on the booth's sign. */
  self?: boolean;
}

export interface LocalNote {
  id: string;
  leadId: string;
  body: string;
  audio?: Blob;
  /** How long the recording is, to show it on the card. */
  seconds?: number;
  transcript?: string;
  createdAt: string;
  synced: boolean;
}

// A new name rather than a new version of the first one: an upgrade waits until every old tab of the site is
// closed, and the booth must never wait. What the first version held is copied over once.
// The demo (?demo) keeps its own copy: a visitor tried in the demo must never show up in the real booth on the same tablet.
const DEMO = new URLSearchParams(location.search).has('demo');
const DB = DEMO ? 'expo-booth-demo' : 'expo-booth-2';
const FIRST = 'expo-booth';
let conn: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  conn ??= new Promise<{ db: IDBDatabase; fresh: boolean }>((resolve, reject) => {
    let fresh = false;
    const attempt = (version?: number) => {
      const req = version ? indexedDB.open(DB, version) : indexedDB.open(DB);
      req.onupgradeneeded = () => {
        fresh = true;
        for (const s of ['leads', 'notes']) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // A copy that exists without its stores (opened elsewhere, half made): one version up, and they are made.
        if (!db.objectStoreNames.contains('leads') || !db.objectStoreNames.contains('notes')) { const v = db.version + 1; db.close(); attempt(v); return; }
        db.onversionchange = () => { db.close(); conn = null; };
        resolve({ db, fresh });
      };
      req.onerror = () => { conn = null; reject(req.error); };
    };
    attempt();
  }).then(({ db, fresh }) => {
    if (fresh && !DEMO) copyFirst(db).catch(() => {});
    if (!DEMO) dropDemo(db).catch(() => {});
    return db;
  });
  return conn;
}

/** Until the demo had its own copy it wrote into this one: its visitors (ids "demo-…") are taken out. */
async function dropDemo(db: IDBDatabase): Promise<void> {
  const leads = await new Promise<LocalLead[]>((resolve) => {
    const q = db.transaction('leads', 'readonly').objectStore('leads').getAll();
    q.onsuccess = () => resolve(q.result as LocalLead[]);
    q.onerror = () => resolve([]);
  });
  const demo = new Set(leads.filter((l) => l.personId?.startsWith('demo-')).map((l) => l.id));
  if (!demo.size) return;
  const notes = await new Promise<LocalNote[]>((resolve) => {
    const q = db.transaction('notes', 'readonly').objectStore('notes').getAll();
    q.onsuccess = () => resolve(q.result as LocalNote[]);
    q.onerror = () => resolve([]);
  });
  const tx = db.transaction(['leads', 'notes'], 'readwrite');
  for (const id of demo) tx.objectStore('leads').delete(id);
  for (const n of notes) if (demo.has(n.leadId)) tx.objectStore('notes').delete(n.id);
}

/** The leads of the first version, if this phone has any (opened at its own version, so nothing waits). */
async function copyFirst(db: IDBDatabase): Promise<void> {
  const old = await new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open(FIRST);
    req.onupgradeneeded = () => req.transaction?.abort(); // it was not there: do not create it
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    // An old tab may hold it in the middle of an upgrade; then it is skipped rather than waited for.
    setTimeout(() => resolve(null), 2000);
  });
  if (!old) return;
  try {
    if (!old.objectStoreNames.contains('leads')) return;
    const leads = await new Promise<LocalLead[]>((resolve) => {
      const r = old.transaction('leads', 'readonly').objectStore('leads').getAll();
      r.onsuccess = () => resolve(r.result as LocalLead[]);
      r.onerror = () => resolve([]);
    });
    const tx = db.transaction('leads', 'readwrite');
    for (const l of leads) tx.objectStore('leads').put({ ...l, note: l.note ?? '' });
    await new Promise((resolve) => { tx.oncomplete = tx.onerror = resolve; });
  } finally { old.close(); }
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const putLead = (l: LocalLead) => run('leads', 'readwrite', (s) => s.put(l));
export const dropLead = (id: string) => run('leads', 'readwrite', (s) => s.delete(id));
export const allLeads = () => run<LocalLead[]>('leads', 'readonly', (s) => s.getAll() as IDBRequest<LocalLead[]>)
  .then((ls) => ls.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));

export const putNote = (n: LocalNote) => run('notes', 'readwrite', (s) => s.put(n));
export const dropNote = (id: string) => run('notes', 'readwrite', (s) => s.delete(id));
export const allNotes = () => run<LocalNote[]>('notes', 'readonly', (s) => s.getAll() as IDBRequest<LocalNote[]>);

