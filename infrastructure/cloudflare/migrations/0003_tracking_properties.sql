-- Phase 42: canonical core.site ownership and provisioned analytics state.
-- No property is inserted by this migration: provisioning requires validated manifest evidence.
CREATE TABLE IF NOT EXISTS core_sites (
  site_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS core_sites_organization_idx ON core_sites(organization_id, status);

CREATE TABLE IF NOT EXISTS site_manifest_validations (
  validation_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES core_sites(site_id),
  contract_version TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK(json_valid(manifest_json)),
  validator_version TEXT NOT NULL,
  validated_at TEXT NOT NULL,
  UNIQUE(site_id, manifest_sha256)
);

CREATE TABLE IF NOT EXISTS tracking_properties (
  property_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES core_sites(site_id),
  organization_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','provisioning','active','degraded','suspended','retired')),
  contract_version TEXT NOT NULL,
  tracking_configuration_ref TEXT NOT NULL,
  collector_policy_ref TEXT NOT NULL,
  manifest_validation_evidence_ref TEXT NOT NULL REFERENCES site_manifest_validations(validation_id),
  provisioned_at TEXT,
  last_reconciled_at TEXT,
  suspended_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tracking_property_one_per_site_idx ON tracking_properties(site_id) WHERE status != 'retired';
CREATE INDEX IF NOT EXISTS tracking_property_organization_idx ON tracking_properties(organization_id, status);

CREATE TABLE IF NOT EXISTS tracking_environment_bindings (
  binding_id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES tracking_properties(property_id),
  environment TEXT NOT NULL CHECK(environment IN ('development','preview','staging','production')),
  status TEXT NOT NULL CHECK(status IN ('pending-validation','ready','active','degraded','suspended','retired')),
  allowed_origins_json TEXT NOT NULL CHECK(json_valid(allowed_origins_json)),
  collector_api_id TEXT NOT NULL,
  sdk_id TEXT NOT NULL,
  sdk_version TEXT NOT NULL,
  envelope_version TEXT NOT NULL,
  reporting_enabled INTEGER NOT NULL CHECK(reporting_enabled IN (0,1)),
  event_keys_json TEXT NOT NULL CHECK(json_valid(event_keys_json)),
  consent_mode TEXT NOT NULL CHECK(consent_mode IN ('required','essential-only','disabled')),
  last_reconciled_at TEXT,
  UNIQUE(property_id, environment)
);
