// What the booth needs to open without a network: the exhibitor, his setup and the community names (name and city
// only, as the booth holds them anyway). Kept after every load from the server, read when the server is out of reach.
// A database of its own, so the booth's copy of leads and notes never has to wait for an upgrade because of it.
const DB = 'expo-booth-cache';
let conn: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  conn ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
    req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); conn = null; }; resolve(req.result); };
    req.onerror = () => { conn = null; reject(req.error); };
  });
  return conn;
}

export async function keep(key: string, value: unknown): Promise<void> {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}

export async function kept<T>(key: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve) => {
    const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  });
}
