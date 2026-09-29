-- A failed optimistic-concurrency assertion aborts the entire D1 batch transaction.
CREATE TABLE IF NOT EXISTS tracking_write_preconditions (
  assertion_id TEXT PRIMARY KEY,
  valid INTEGER NOT NULL CHECK(valid = 1)
);
