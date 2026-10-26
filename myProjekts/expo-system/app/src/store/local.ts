// The phone's own copy: every lead is saved here first, so the booth never waits for the network.
// A lead keeps `synced: false` until the server has it; the id is made here, so sending twice stays one lead.
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

const DB = 'expo-booth';
const STORE = 'leads';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const saveLead = (l: LocalLead) => run('readwrite', (s) => s.put(l));
export const allLeads = () => run<LocalLead[]>('readonly', (s) => s.getAll() as IDBRequest<LocalLead[]>)
  .then((ls) => ls.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
