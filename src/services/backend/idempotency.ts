import type { BackendCommandName } from "./contracts";

export type IdempotencyState = "claimed" | "completed" | "failed";

export type IdempotencyRecord = {
  key: string;
  commandName: BackendCommandName;
  principalFingerprint: string;
  requestHash: string;
  state: IdempotencyState;
  responseReference?: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type IdempotencyClaimResult =
  | { outcome: "claimed"; record: IdempotencyRecord }
  | { outcome: "replay"; record: IdempotencyRecord }
  | { outcome: "conflict"; record: IdempotencyRecord };

export interface IdempotencyRepository {
  claim(input: { key: string; commandName: BackendCommandName; principalFingerprint: string; requestHash: string; ttlSeconds: number }): Promise<IdempotencyClaimResult>;
  complete(key: string, responseReference: string): Promise<void>;
  fail(key: string, failureCode: string): Promise<void>;
  get(key: string): Promise<IdempotencyRecord | undefined>;
}

export function principalFingerprint(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(":");
}

export function stableRequestFingerprint(value: unknown) {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
    return input;
  };
  return JSON.stringify(normalize(value));
}

/** Development-only implementation. Production must use a durable, atomic backend store. */
export class MemoryIdempotencyRepository implements IdempotencyRepository {
  private records = new Map<string, IdempotencyRecord>();

  async claim(input: { key: string; commandName: BackendCommandName; principalFingerprint: string; requestHash: string; ttlSeconds: number }): Promise<IdempotencyClaimResult> {
    const existing = this.records.get(input.key);
    if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
      if (existing.commandName === input.commandName && existing.principalFingerprint === input.principalFingerprint && existing.requestHash === input.requestHash) return { outcome: "replay", record: existing };
      return { outcome: "conflict", record: existing };
    }
    const timestamp = new Date().toISOString();
    const record: IdempotencyRecord = { ...input, state: "claimed", createdAt: timestamp, updatedAt: timestamp, expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString() };
    this.records.set(input.key, record);
    return { outcome: "claimed", record };
  }

  async complete(key: string, responseReference: string) {
    const record = this.records.get(key);
    if (record) this.records.set(key, { ...record, state: "completed", responseReference, updatedAt: new Date().toISOString() });
  }

  async fail(key: string, failureCode: string) {
    const record = this.records.get(key);
    if (record) this.records.set(key, { ...record, state: "failed", failureCode, updatedAt: new Date().toISOString() });
  }

  async get(key: string) { return this.records.get(key); }
}
