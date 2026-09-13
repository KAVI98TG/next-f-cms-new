PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_documents (
  namespace TEXT NOT NULL,
  id TEXT NOT NULL,
  organization_id TEXT,
  workspace_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY(namespace, id)
);
CREATE INDEX IF NOT EXISTS idx_app_documents_org ON app_documents(organization_id, namespace, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_documents_workspace ON app_documents(workspace_id, namespace, updated_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT PRIMARY KEY,
  command_name TEXT NOT NULL,
  principal_fingerprint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('claimed','completed','failed')),
  response_reference TEXT,
  failure_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_records(expires_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  principal_kind TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  organization_id TEXT,
  workspace_id TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_events(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_identity_bindings (
  access_subject TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  staff_user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  permissions_json TEXT NOT NULL CHECK(json_valid(permissions_json)),
  status TEXT NOT NULL CHECK(status IN ('active','suspended','revoked')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  organization_id TEXT,
  workspace_id TEXT,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  state TEXT NOT NULL CHECK(state IN ('pending','dispatched','failed')) DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_state ON outbox_events(state, created_at);

CREATE TABLE IF NOT EXISTS file_objects (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  organization_id TEXT,
  workspace_id TEXT,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes >= 0),
  sha256 TEXT,
  visibility TEXT NOT NULL CHECK(visibility IN ('internal','customer','public')),
  created_by_principal TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_workspace ON file_objects(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public_projection_snapshots (
  projection_key TEXT PRIMARY KEY,
  source_revision TEXT NOT NULL,
  etag TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  published_at TEXT NOT NULL,
  withdrawn_at TEXT
);
