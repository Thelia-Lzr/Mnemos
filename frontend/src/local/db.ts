import { AiConfig, Language, Message, Profile, Result, Word } from './model';

type Records = {
  ai: AiConfig | null;
  profile: Profile;
  words: Word[];
  results: Result[];
} & Record<`chat:${Language}`, Message[]>;

const storeName = 'records';
let connection: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mnemos-learning', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      resolve(db);
    };
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export async function read<K extends keyof Records>(key: K, initial: Records[K]): Promise<Records[K]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result ?? initial);
    request.onerror = () => reject(request.error);
  });
}

export async function write<K extends keyof Records>(key: K, value: Records[K]) {
  return update(key, value, () => value);
}

// Read and write in one transaction so multiple tabs cannot lose each other's updates.
export async function update<K extends keyof Records>(
  key: K, initial: Records[K], change: (value: Records[K]) => Records[K],
): Promise<Records[K]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    let next: Records[K];
    request.onsuccess = () => {
      try {
        next = change(request.result ?? initial);
        store.put(next, key);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(tx.error ?? new Error('本地保存失败，请重试。'));
  });
}
