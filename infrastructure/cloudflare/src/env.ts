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
  get(key: string, options?: { range?: { offset?: number; length?: number; suffix?: number } }): Promise<{ body: ReadableStream; size?: number; range?: { offset:number; length:number }; httpEtag?: string; httpMetadata?: { contentType?: string } } | null>;
  head(key: string): Promise<{ size: number; httpEtag?: string; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
}
export interface QueueLike<T = unknown> { send(message: T, options?: Record<string, unknown>): Promise<void>; }
export interface QueueMessageLike<T = unknown> { body: T; ack(): void; retry(options?: { delaySeconds?: number }): void; }
export interface QueueMessageBatchLike<T = unknown> { messages: QueueMessageLike<T>[]; }
export interface ScheduledControllerLike { scheduledTime: number; cron: string; }
export interface RateLimiterLike { limit(input: { key: string }): Promise<{ success: boolean }> }
export interface AnalyticsEngineDatasetLike { writeDataPoint(event: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void; }

export type WorkerEnv = {
  DB: D1DatabaseLike;
  FILES: R2BucketLike;
  MEDIA: R2BucketLike;
  EVENTS: QueueLike<ProductionEvent>;
  TRACKING_EVENTS: QueueLike<TrackingQueueMessage>;
  TRACKING_ANALYTICS: AnalyticsEngineDatasetLike;
  PUBLIC_RATE_LIMITER: RateLimiterLike;
  ENVIRONMENT: "staging" | "production";
  CMS_ORIGIN: string;
  WORKSPACE_ORIGIN: string;
  PUBLIC_SITE_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  CONTRACTS_BASE_URL: string;
  CHECKOUT_API_ORIGIN?: string;
  CHECKOUT_CONTRACT_RELEASE?: string;
  CHECKOUT_ADMIN_TOKEN?: string;
  CHECKOUT_SECRET_ADMIN_TOKEN?: string;
  GAMING_SUMMARY_INGEST_TOKEN?: string;
  MEDIA_ORIGIN?: string;
  TURNSTILE_SECRET_KEY: string;
  SERVICE_CREDENTIAL_SECRET: string;
  TRACKING_SERVER_TOKEN?: string;
  TRACKING_PROPERTY_ROUTING_ENABLED?: string;
  TRACKING_SITE_ID: string;
  TRACKING_ORGANIZATION_ID: string;
  TRACKING_ALLOWED_ORIGINS: string;
  TRACKING_EVENT_KEYS: string;
  TRACKING_CONTRACT_VERSION: string;
  TRACKING_ENVELOPE_VERSIONS: string;
  TRACKING_SDK_VERSIONS: string;
  NEXTF_MAIN_SITE_INGEST_TOKEN: string;
  AUDIT_RETENTION_DAYS?: string;
  OUTBOX_RETENTION_DAYS?: string;
};

export type TrackingQueueMessage = {
  kind: "first-party-tracking";
  batchId: string;
  receivedAt: string;
  siteId: string;
  organizationId: string;
  environment: "development" | "preview" | "staging" | "production";
  sdk: { sdkId: string; sdkVersion: string };
  event: {
    eventId: string;
    eventKey: string;
    occurredAt: string;
    schemaVersion: string;
    debug: boolean;
    context: Record<string, unknown>;
    properties: Record<string, unknown>;
    source: "browser" | "server";
  };
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