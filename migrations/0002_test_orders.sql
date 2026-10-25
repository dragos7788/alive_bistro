CREATE TABLE IF NOT EXISTS test_orders (
  number TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'TEST' CHECK (mode = 'TEST'),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status = 'unpaid'),
  preparation_status TEXT NOT NULL DEFAULT 'new'
    CHECK (preparation_status IN ('new', 'preparing', 'ready', 'collected', 'cancelled')),
  created_at TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  total_bani INTEGER NOT NULL CHECK (total_bani > 0),
  lines_json TEXT NOT NULL CHECK (json_valid(lines_json))
);
CREATE INDEX IF NOT EXISTS idx_test_orders_created ON test_orders(created_at DESC);
