CREATE TABLE customer_push_consent_events (
  id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  action TEXT NOT NULL CHECK(action IN ('granted','withdrawn')),
  notice_version TEXT NOT NULL CHECK(notice_version='push-marketing-v1'),
  created_at INTEGER NOT NULL
);
CREATE INDEX customer_push_consent_customer ON customer_push_consent_events(customer_id,id DESC);
CREATE TRIGGER customer_push_consent_no_update BEFORE UPDATE ON customer_push_consent_events
BEGIN SELECT RAISE(ABORT, 'PUSH_CONSENT_IMMUTABLE'); END;
CREATE TRIGGER customer_push_consent_no_delete BEFORE DELETE ON customer_push_consent_events
BEGIN SELECT RAISE(ABORT, 'PUSH_CONSENT_IMMUTABLE'); END;

CREATE TABLE customer_push_subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX customer_push_subscriptions_customer ON customer_push_subscriptions(customer_id);
CREATE TRIGGER customer_push_subscription_owner BEFORE UPDATE OF customer_id ON customer_push_subscriptions
WHEN NEW.customer_id IS NOT OLD.customer_id
BEGIN SELECT RAISE(ABORT, 'PUSH_DEVICE_IN_USE'); END;

CREATE TABLE push_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);
CREATE TABLE push_deliveries (
  campaign_id TEXT NOT NULL REFERENCES push_campaigns(id),
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sending','accepted','failed','skipped','expired')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(campaign_id,subscription_id)
);
CREATE INDEX push_deliveries_pending ON push_deliveries(campaign_id,status);
