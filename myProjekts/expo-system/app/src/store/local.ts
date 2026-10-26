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
const DB = 'expo-booth-2';
const FIRST = 'expo-booth';
let conn: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  conn ??= new Promise<{ db: IDBDatabase; fresh: boolean }>((resolve, reject) => {
    let fresh = false;
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      fresh = true;
      req.result.createObjectStore('leads', { keyPath: 'id' });
      req.result.createObjectStore('notes', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); conn = null; };
      resolve({ db, fresh });
    };
    req.onerror = () => { conn = null; reject(req.error); };
  }).then(({ db, fresh }) => { if (fresh) copyFirst(db).catch(() => {}); return db; });
  return conn;
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

