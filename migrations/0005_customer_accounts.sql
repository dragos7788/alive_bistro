CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT REFERENCES customers(id),
  created_at INTEGER NOT NULL,
  CHECK (referred_by IS NULL OR referred_by <> id)
);

CREATE TRIGGER customers_referrer_immutable
BEFORE UPDATE OF referred_by ON customers
WHEN NEW.referred_by IS NOT OLD.referred_by
BEGIN SELECT RAISE(ABORT, 'REFERRER_IMMUTABLE'); END;

CREATE TABLE customer_identities (
  provider TEXT NOT NULL CHECK(provider IN ('google','facebook')),
  subject TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  PRIMARY KEY(provider, subject),
  UNIQUE(customer_id, provider)
);

CREATE TABLE customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX customer_sessions_expiry ON customer_sessions(expires_at);

CREATE TABLE customer_oauth (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google','facebook')),
  verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  referral_code TEXT,
  link_customer_id TEXT REFERENCES customers(id),
  expires_at INTEGER NOT NULL
);

-- Populated only by a future server-side verified BT iPay integration, never TEST orders.
CREATE TABLE loyalty_payments (
  payment_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE CHECK(order_id NOT LIKE 'TEST-%'),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  referrer_id TEXT REFERENCES customers(id),
  amount_bani INTEGER NOT NULL CHECK(typeof(amount_bani)='integer' AND amount_bani > 0 AND amount_bani <= 100000000),
  refunded_bani INTEGER NOT NULL DEFAULT 0 CHECK(typeof(refunded_bani)='integer' AND refunded_bani BETWEEN 0 AND amount_bani),
  created_at INTEGER NOT NULL,
  CHECK(referrer_id IS NULL OR referrer_id <> customer_id)
);

CREATE TABLE loyalty_ledger (
  id INTEGER PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES loyalty_payments(payment_id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  kind TEXT NOT NULL CHECK(kind IN ('purchase','referral')),
  points_delta INTEGER NOT NULL CHECK(typeof(points_delta)='integer' AND points_delta <> 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX loyalty_ledger_customer ON loyalty_ledger(customer_id, id);

CREATE TRIGGER loyalty_payment_referrer
BEFORE INSERT ON loyalty_payments
WHEN NEW.refunded_bani <> 0
  OR NEW.referrer_id IS NOT (SELECT referred_by FROM customers WHERE id=NEW.customer_id)
BEGIN SELECT RAISE(ABORT, 'INVALID_REFERRER'); END;

CREATE TRIGGER loyalty_payment_credit
AFTER INSERT ON loyalty_payments
BEGIN
  INSERT INTO loyalty_ledger(payment_id,customer_id,kind,points_delta,created_at)
    SELECT NEW.payment_id,NEW.customer_id,'purchase',NEW.amount_bani / 100,NEW.created_at
    WHERE NEW.amount_bani / 100 > 0;
  INSERT INTO loyalty_ledger(payment_id,customer_id,kind,points_delta,created_at)
    SELECT NEW.payment_id,NEW.referrer_id,'referral',NEW.amount_bani / 100,NEW.created_at
    WHERE NEW.referrer_id IS NOT NULL AND NEW.amount_bani / 100 > 0;
END;

CREATE TRIGGER loyalty_payment_immutable
BEFORE UPDATE ON loyalty_payments
WHEN NEW.payment_id IS NOT OLD.payment_id OR NEW.order_id IS NOT OLD.order_id
  OR NEW.customer_id IS NOT OLD.customer_id OR NEW.referrer_id IS NOT OLD.referrer_id
  OR NEW.amount_bani IS NOT OLD.amount_bani OR NEW.created_at IS NOT OLD.created_at
  OR NEW.refunded_bani < OLD.refunded_bani
BEGIN SELECT RAISE(ABORT, 'INVALID_PAYMENT_UPDATE'); END;

CREATE TRIGGER loyalty_payment_refund
AFTER UPDATE OF refunded_bani ON loyalty_payments
WHEN NEW.refunded_bani > OLD.refunded_bani
BEGIN
  INSERT INTO loyalty_ledger(payment_id,customer_id,kind,points_delta,created_at)
    SELECT NEW.payment_id,NEW.customer_id,'purchase',
      (NEW.amount_bani - NEW.refunded_bani) / 100 - (OLD.amount_bani - OLD.refunded_bani) / 100,
      unixepoch()
    WHERE (NEW.amount_bani - NEW.refunded_bani) / 100 <> (OLD.amount_bani - OLD.refunded_bani) / 100;
  INSERT INTO loyalty_ledger(payment_id,customer_id,kind,points_delta,created_at)
    SELECT NEW.payment_id,NEW.referrer_id,'referral',
      (NEW.amount_bani - NEW.refunded_bani) / 100 - (OLD.amount_bani - OLD.refunded_bani) / 100,
      unixepoch()
    WHERE NEW.referrer_id IS NOT NULL
      AND (NEW.amount_bani - NEW.refunded_bani) / 100 <> (OLD.amount_bani - OLD.refunded_bani) / 100;
END;

CREATE TRIGGER loyalty_ledger_no_update BEFORE UPDATE ON loyalty_ledger
BEGIN SELECT RAISE(ABORT, 'LEDGER_IMMUTABLE'); END;
CREATE TRIGGER loyalty_ledger_no_delete BEFORE DELETE ON loyalty_ledger
BEGIN SELECT RAISE(ABORT, 'LEDGER_IMMUTABLE'); END;
