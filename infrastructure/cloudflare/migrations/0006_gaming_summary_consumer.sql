CREATE TABLE IF NOT EXISTS gaming_summary_snapshots (
  source_key TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gaming_summary_received
  ON gaming_summary_snapshots(received_at DESC);
