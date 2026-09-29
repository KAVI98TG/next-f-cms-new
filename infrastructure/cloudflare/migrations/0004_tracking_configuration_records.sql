-- Canonical Phase 9/41 configuration instances referenced by Phase 42 properties.
CREATE TABLE IF NOT EXISTS tracking_configuration_records (
  configuration_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES core_sites(site_id),
  record_json TEXT NOT NULL CHECK(json_valid(record_json)),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tracking_collector_policy_records (
  policy_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE REFERENCES core_sites(site_id),
  record_json TEXT NOT NULL CHECK(json_valid(record_json)),
  updated_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS tracking_property_configuration_refs_insert
BEFORE INSERT ON tracking_properties
BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tracking_configuration_records WHERE configuration_id=NEW.tracking_configuration_ref AND site_id=NEW.site_id)
    THEN RAISE(ABORT,'tracking configuration reference unresolved') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tracking_collector_policy_records WHERE policy_id=NEW.collector_policy_ref AND site_id=NEW.site_id)
    THEN RAISE(ABORT,'collector policy reference unresolved') END;
END;
