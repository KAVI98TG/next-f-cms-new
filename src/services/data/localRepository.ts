import type { Repository, RepositoryRecord } from "./types";

export function createLocalRepository<T extends RepositoryRecord>(storageKey: string, seed: T[] = []): Repository<T> {
  const read = (): T[] => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      window.localStorage.setItem(storageKey, JSON.stringify(seed));
      return [...seed];
    }
    try { return JSON.parse(raw) as T[]; } catch { return [...seed]; }
  };
  const write = (records: T[]) => window.localStorage.setItem(storageKey, JSON.stringify(records));
  return {
    async list() { return read(); },
    async get(id) { return read().find((record) => record.id === id) ?? null; },
    async create(input) {
      const now = new Date().toISOString();
      const record = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as T;
      write([record, ...read()]);
      return record;
    },
    async update(id, input) {
      let updated: T | null = null;
      const records = read().map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...input, updatedAt: new Date().toISOString() } as T;
        return updated;
      });
      if (!updated) throw new Error(`Record ${id} not found`);
      write(records);
      return updated;
    },
    async remove(id) { write(read().filter((record) => record.id !== id)); },
  };
}
