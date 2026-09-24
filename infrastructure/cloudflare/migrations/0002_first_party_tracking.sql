CREATE TABLE IF NOT EXISTS tracking_ingestion_events (
  site_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  event_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','processed','failed')),
  sdk_id TEXT NOT NULL,
  sdk_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  PRIMARY KEY (site_id, environment, event_id)
);

CREATE INDEX IF NOT EXISTS tracking_ingestion_received_idx
  ON tracking_ingestion_events(site_id, environment, received_at DESC);

CREATE TABLE IF NOT EXISTS tracking_hourly_aggregates (
  site_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  hour_start TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, environment, hour_start, event_key)
);

CREATE INDEX IF NOT EXISTS tracking_hourly_report_idx
  ON tracking_hourly_aggregates(site_id, environment, hour_start DESC);

CREATE TABLE IF NOT EXISTS tracking_health_counters (
  site_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  received_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  consent_restricted_count INTEGER NOT NULL DEFAULT 0,
  schema_error_count INTEGER NOT NULL DEFAULT 0,
  unknown_event_count INTEGER NOT NULL DEFAULT 0,
  processing_failure_count INTEGER NOT NULL DEFAULT 0,
  last_event_received_at TEXT,
  last_event_processed_at TEXT,
  last_sdk_id TEXT,
  last_sdk_version TEXT,
  last_contract_version TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, environment)
);
