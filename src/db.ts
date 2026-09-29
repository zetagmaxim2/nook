import type { StoreName } from "./types";
const DB_NAME = "nook-local";
const VERSION = 1;
const stores: StoreName[] = [
  "novels",
  "chapters",
  "financeEntries",
  "financePlans",
  "habits",
  "habitCompletions",
  "counters",
  "passwords",
  "widgets",
  "settings",
];
let dbPromise: Promise<IDBDatabase> | null = null;
export function getDb() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        const make = (
          name: StoreName,
          indexes: [string, string, boolean?][] = [],
        ) => {
          if (!db.objectStoreNames.contains(name)) {
            const s = db.createObjectStore(name, {
              keyPath: name === "settings" ? "key" : "id",
            });
            indexes.forEach(([n, k, u]) =>
              s.createIndex(n, k, { unique: !!u }),
            );
          }
        };
        make("novels", [["updatedAt", "updatedAt"]]);
        make("chapters", [
          ["novelId", "novelId"],
          ["order", "order"],
        ]);
        make("financeEntries", [
          ["date", "date"],
          ["periodStart", "periodStart"],
        ]);
        make("financePlans", [["month", "month", true]]);
        make("habits", [["active", "active"]]);
        make("habitCompletions", [
          ["habitId", "habitId"],
          ["date", "date"],
        ]);
        make("counters", [
          ["type", "type"],
          ["date", "date"],
        ]);
        make("passwords", [["site", "site"]]);
        make("widgets", [["order", "order"]]);
        make("settings");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () =>
        reject(
          new Error(
            "Nook could not open local storage. Check Safari storage settings.",
          ),
        );
    });
  return dbPromise;
}
export async function all<T>(store: StoreName): Promise<T[]> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function get<T>(
  store: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function put<T>(store: StoreName, value: T): Promise<void> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}
export async function remove(
  store: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const r = db.transaction(store, "readwrite").objectStore(store).delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}
export async function replaceAll(data: Partial<Record<StoreName, unknown[]>>) {
  const db = await getDb();
  const tx = db.transaction(stores, "readwrite");
  for (const name of stores) {
    const s = tx.objectStore(name);
    s.clear();
    for (const item of data[name] ?? []) s.put(item);
  }
  return new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
export async function dump() {
  const result: Partial<Record<StoreName, unknown[]>> = {};
  for (const s of stores) result[s] = await all(s);
  return result;
}
export async function clearAll() {
  return replaceAll({});
}
export async function seed() {
  if (!(await all("habits")).length)
    await put("habits", {
      id: "habit-creatine",
      name: "Take creatine",
      icon: "⚡️",
      createdAt: new Date().toISOString(),
      active: true,
    });
  if (!(await all("widgets")).length)
    for (const [i, type] of [
      "finance",
      "habits",
      "counters",
      "novels",
    ].entries())
      await put("widgets", {
        id: `widget-${type}`,
        type,
        order: i,
        visible: true,
      });
}
