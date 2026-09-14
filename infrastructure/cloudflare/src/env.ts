/** Minimal Cloudflare binding shapes used by the production adapter package.
 * The deployed Worker should compile against Cloudflare's generated runtime types.
 */
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
}
export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}
export interface R2BucketLike {
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: Record<string, unknown>): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpEtag?: string } | null>;
  delete(key: string): Promise<void>;
}
export interface QueueLike<T = unknown> { send(message: T, options?: Record<string, unknown>): Promise<void>; }
export interface QueueMessageLike<T = unknown> { body: T; ack(): void; retry(options?: { delaySeconds?: number }): void; }
export interface QueueMessageBatchLike<T = unknown> { messages: QueueMessageLike<T>[]; }
export interface ScheduledControllerLike { scheduledTime: number; cron: string; }
export interface RateLimiterLike { limit(input: { key: string }): Promise<{ success: boolean }> }

export type WorkerEnv = {
  DB: D1DatabaseLike;
  FILES: R2BucketLike;
  EVENTS: QueueLike<ProductionEvent>;
  PUBLIC_RATE_LIMITER: RateLimiterLike;
  ENVIRONMENT: "staging" | "production";
  CMS_ORIGIN: string;
  WORKSPACE_ORIGIN: string;
  PUBLIC_SITE_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  CONTRACTS_BASE_URL: string;
  TURNSTILE_SECRET_KEY: string;
  SERVICE_CREDENTIAL_SECRET: string;
  AUDIT_RETENTION_DAYS?: string;
  OUTBOX_RETENTION_DAYS?: string;
};

export type ProductionEvent = {
  id: string;
  type: string;
  idempotencyKey: string;
  occurredAt: string;
  organizationId?: string;
  workspaceId?: string;
  payload: Record<string, unknown>;
};
