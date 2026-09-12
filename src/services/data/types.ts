export type RepositoryRecord = { id: string; createdAt: string; updatedAt: string };

export interface Repository<T extends RepositoryRecord> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, input: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T>;
  remove(id: string): Promise<void>;
}
