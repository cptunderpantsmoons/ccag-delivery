import { promises as fs } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch { /* ignore */ }
}

function filePath(collection: string) {
  return join(DATA_DIR, `${collection}.json`);
}

export async function readCollection<T>(collection: string): Promise<T[]> {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(collection), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeCollection<T>(collection: string, items: T[]) {
  await ensureDir();
  await fs.writeFile(filePath(collection), JSON.stringify(items, null, 2));
}

export async function getItem<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
  const items = await readCollection<T>(collection);
  return items.find((i) => i.id === id) ?? null;
}

export async function addItem<T extends { id: string }>(collection: string, item: T) {
  const items = await readCollection<T>(collection);
  items.push(item);
  await writeCollection(collection, items);
  return item;
}

export async function updateItem<T extends { id: string }>(collection: string, id: string, patch: Partial<T>) {
  const items = await readCollection<T>(collection);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch } as T;
  await writeCollection(collection, items);
  return items[idx];
}

export async function deleteItem<T extends { id: string }>(collection: string, id: string) {
  const items = await readCollection<T>(collection);
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeCollection(collection, filtered);
  return true;
}
