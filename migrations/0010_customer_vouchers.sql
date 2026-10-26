CREATE TABLE customer_vouchers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  source TEXT NOT NULL CHECK(source IN ('welcome','points')),
  discount_percent INTEGER NOT NULL CHECK(discount_percent=10),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at)
);
CREATE UNIQUE INDEX customer_vouchers_welcome ON customer_vouchers(customer_id)
  WHERE source='welcome';

CREATE TABLE customer_point_redemptions (
  id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  voucher_id TEXT NOT NULL UNIQUE REFERENCES customer_vouchers(id),
  points_spent INTEGER NOT NULL CHECK(points_spent=1000),
  created_at INTEGER NOT NULL
);
CREATE INDEX customer_point_redemptions_customer ON customer_point_redemptions(customer_id, id);

CREATE TRIGGER customer_point_redemption_balance
BEFORE INSERT ON customer_point_redemptions
WHEN NEW.points_spent <> 1000
  OR NOT EXISTS (
    SELECT 1 FROM customer_vouchers
    WHERE id=NEW.voucher_id AND customer_id=NEW.customer_id AND source='points'
  )
  OR COALESCE((SELECT SUM(points_delta) FROM loyalty_ledger WHERE customer_id=NEW.customer_id),0)
    - COALESCE((SELECT SUM(points_spent) FROM customer_point_redemptions WHERE customer_id=NEW.customer_id),0)
    < NEW.points_spent
BEGIN SELECT RAISE(ABORT, 'INSUFFICIENT_POINTS'); END;

CREATE TRIGGER customer_point_redemptions_no_update BEFORE UPDATE ON customer_point_redemptions
BEGIN SELECT RAISE(ABORT, 'POINT_REDEMPTION_IMMUTABLE'); END;
CREATE TRIGGER customer_point_redemptions_no_delete BEFORE DELETE ON customer_point_redemptions
BEGIN SELECT RAISE(ABORT, 'POINT_REDEMPTION_IMMUTABLE'); END;

CREATE TRIGGER customer_welcome_voucher
AFTER INSERT ON customers
BEGIN
  INSERT INTO customer_vouchers(id,code,customer_id,source,discount_percent,created_at,expires_at)
    VALUES (lower(hex(randomblob(16))), 'ALIVE-' || upper(hex(randomblob(8))),
      NEW.id, 'welcome', 10, unixepoch(), unixepoch() + 2592000);
END;

INSERT INTO customer_vouchers(id,code,customer_id,source,discount_percent,created_at,expires_at)
  SELECT lower(hex(randomblob(16))), 'ALIVE-' || upper(hex(randomblob(8))),
    id, 'welcome', 10, unixepoch(), unixepoch() + 2592000
  FROM customers
  WHERE NOT EXISTS (
    SELECT 1 FROM customer_vouchers WHERE customer_id=customers.id AND source='welcome'
  );
