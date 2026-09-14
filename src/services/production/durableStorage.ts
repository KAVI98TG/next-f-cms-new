import { ProductionBackendClient } from "./httpClient";
import { readProductionRuntimeConfig } from "./runtime";

export type DurableStateDocument = {
  key: string;
  value: unknown;
  version: number;
  updatedAt: string;
};

export type DurableStateSnapshot = {
  documents: DurableStateDocument[];
  source: "d1";
};

export type DurableStateStatus = {
  mode: "local-prototype" | "production-api";
  initialized: boolean;
  pendingWrites: number;
  lastError?: string;
};

const runtime = readProductionRuntimeConfig();
const client = runtime.mode === "production-api" ? new ProductionBackendClient(runtime.apiBaseUrl) : undefined;
const values = new Map<string, unknown>();
const versions = new Map<string, number>();
const pendingByKey = new Map<string, Promise<void>>();
let initialized = runtime.mode === "local-prototype";
let initializationPromise: Promise<void> | undefined;
let lastError: string | undefined;

function emitStatus() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("nextf:durable-state", { detail: getDurableStateStatus() }));
}

function localRead<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function productionDefault<T>(seed: T): T {
  // Prototype collection fixtures must never silently become production records.
  // Configuration objects retain their code defaults until explicitly persisted.
  if (Array.isArray(seed)) return [] as T;
  return seed;
}

function enqueue(key: string, task: () => Promise<void>) {
  const previous = pendingByKey.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task).catch((error) => {
    lastError = error instanceof Error ? error.message : "Durable state write failed";
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nextf:durable-state-error", { detail: { key, message: lastError } }));
  }).finally(() => {
    if (pendingByKey.get(key) === next) pendingByKey.delete(key);
    emitStatus();
  });
  pendingByKey.set(key, next);
  emitStatus();
  return next;
}

async function persistValue(key: string, value: unknown) {
  if (!client) return;
  const result = await client.execute<{ key: string; version: number; updatedAt: string; replayed?: boolean }>({
    operation: "staff.state.document.put",
    kind: "command",
    input: { key, value, expectedVersion: versions.get(key) },
    idempotencyKey: `staff-state-put:${key}:${crypto.randomUUID()}`,
  });
  if (!result.ok) throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  versions.set(key, result.data.version);
}

async function persistDelete(key: string) {
  if (!client) return;
  const result = await client.execute<{ key: string; deleted: true; replayed?: boolean }>({
    operation: "staff.state.document.delete",
    kind: "command",
    input: { key, expectedVersion: versions.get(key) },
    idempotencyKey: `staff-state-delete:${key}:${crypto.randomUUID()}`,
  });
  if (!result.ok) throw new Error(`${result.problem.code}: ${result.problem.detail}`);
  versions.delete(key);
}

export async function initializeDurableStorage() {
  if (runtime.mode !== "production-api" || initialized) return;
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    if (!client) throw new Error("Production API client is unavailable");
    const result = await client.execute<DurableStateSnapshot>({ operation: "staff.state.snapshot.get", kind: "query", input: { prefix: "nextf." } });
    if (!result.ok) throw new Error(`${result.problem.code}: ${result.problem.detail}`);
    values.clear(); versions.clear();
    for (const document of result.data.documents) {
      values.set(document.key, document.value);
      versions.set(document.key, document.version);
    }
    initialized = true;
    lastError = undefined;
    emitStatus();
  })().catch((error) => {
    initializationPromise = undefined;
    initialized = false;
    lastError = error instanceof Error ? error.message : "Durable state initialization failed";
    emitStatus();
    throw error;
  });
  return initializationPromise;
}

export function readDurableValue<T>(key: string, seed: T): T {
  if (runtime.mode === "local-prototype") return localRead(key, seed);
  if (!initialized) throw new Error("Production durable state was read before initialization");
  return values.has(key) ? values.get(key) as T : productionDefault(seed);
}

export function writeDurableValue<T>(key: string, value: T): T {
  if (runtime.mode === "local-prototype") {
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
  if (!initialized) throw new Error("Production durable state was written before initialization");
  values.set(key, value);
  void enqueue(key, () => persistValue(key, value));
  return value;
}

export function removeDurableValue(key: string) {
  if (runtime.mode === "local-prototype") {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    return;
  }
  if (!initialized) throw new Error("Production durable state was mutated before initialization");
  values.delete(key);
  void enqueue(key, () => persistDelete(key));
}

export function exportDurableStorageRecords(prefix = "nextf."): Record<string, string> {
  if (runtime.mode === "local-prototype") {
    const records: Record<string, string> = {};
    if (typeof window === "undefined") return records;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) records[key] = raw;
    }
    return records;
  }
  const records: Record<string, string> = {};
  for (const [key, value] of values.entries()) if (key.startsWith(prefix)) records[key] = JSON.stringify(value);
  return records;
}

export function importDurableStorageRecords(records: Record<string, string>, prefix = "nextf.") {
  for (const [key, raw] of Object.entries(records)) {
    if (!key.startsWith(prefix)) continue;
    try { writeDurableValue(key, JSON.parse(raw) as unknown); } catch { /* malformed imported row is ignored by the caller's validation layer */ }
  }
}

export function getDurableStateStatus(): DurableStateStatus {
  return { mode: runtime.mode, initialized, pendingWrites: pendingByKey.size, ...(lastError ? { lastError } : {}) };
}

export async function flushDurableWrites() {
  await Promise.allSettled([...pendingByKey.values()]);
  if (lastError) throw new Error(lastError);
}

export function resetDurableStorageInitialization() {
  if (runtime.mode !== "production-api") return;
  initialized = false;
  initializationPromise = undefined;
  lastError = undefined;
  values.clear();
  versions.clear();
  emitStatus();
}
