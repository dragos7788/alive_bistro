ALTER TABLE customer_oauth ADD COLUMN marketing_email_consent INTEGER NOT NULL DEFAULT 0
  CHECK(marketing_email_consent IN (0,1));

CREATE TABLE customer_marketing_consent_events (
  id INTEGER PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  channel TEXT NOT NULL CHECK(channel='email'),
  action TEXT NOT NULL CHECK(action IN ('granted','withdrawn')),
  source TEXT NOT NULL CHECK(source IN ('login','account')),
  notice_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX customer_marketing_consent_customer
  ON customer_marketing_consent_events(customer_id,channel,id DESC);

CREATE TRIGGER customer_marketing_consent_events_no_update
BEFORE UPDATE ON customer_marketing_consent_events
BEGIN SELECT RAISE(ABORT, 'MARKETING_CONSENT_IMMUTABLE'); END;
CREATE TRIGGER customer_marketing_consent_events_no_delete
BEFORE DELETE ON customer_marketing_consent_events
BEGIN SELECT RAISE(ABORT, 'MARKETING_CONSENT_IMMUTABLE'); END;
