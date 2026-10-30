ALTER TABLE customers ADD COLUMN deleted_at INTEGER
  CHECK(deleted_at IS NULL OR (typeof(deleted_at)='integer' AND deleted_at>=0));

-- Deletion is a single SQLite statement. Financial owners remain as sealed,
-- pseudonymous tombstones; their original accounting references never change.
-- Only cleanup of a deleted account may erase immutable personal records.
-- Ordinary mutations (including updates) retain their original guards.
DROP TRIGGER customer_marketing_consent_events_no_delete;
CREATE TRIGGER customer_marketing_consent_events_no_delete
BEFORE DELETE ON customer_marketing_consent_events
WHEN EXISTS (SELECT 1 FROM customers WHERE id=OLD.customer_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'MARKETING_CONSENT_IMMUTABLE'); END;

-- 0024 intentionally permits push-consent deletion for scheduled retention;
-- keep that policy and its existing immutable-update trigger unchanged.

DROP TRIGGER customer_vouchers_no_delete;
CREATE TRIGGER customer_vouchers_no_delete BEFORE DELETE ON customer_vouchers
WHEN EXISTS (SELECT 1 FROM customers WHERE id=OLD.customer_id)
BEGIN SELECT RAISE(ABORT, 'VOUCHER_IMMUTABLE'); END;

DROP TRIGGER customer_point_redemptions_no_delete;
CREATE TRIGGER customer_point_redemptions_no_delete BEFORE DELETE ON customer_point_redemptions
WHEN EXISTS (SELECT 1 FROM customers WHERE id=OLD.customer_id)
BEGIN SELECT RAISE(ABORT, 'POINT_REDEMPTION_IMMUTABLE'); END;

DROP TRIGGER customers_referrer_immutable;
CREATE TRIGGER customers_referrer_immutable
BEFORE UPDATE OF referred_by ON customers
WHEN NEW.referred_by IS NOT OLD.referred_by
  AND NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.referred_by IS NULL)
  AND (NEW.referred_by IS NOT NULL OR EXISTS (
    SELECT 1 FROM customers WHERE id=OLD.referred_by AND deleted_at IS NULL
  ))
BEGIN SELECT RAISE(ABORT, 'REFERRER_IMMUTABLE'); END;

-- Financial accounting remains immutable and refunds continue against the
-- same owner/referrer IDs. A tombstone is not a usable customer account.
CREATE TRIGGER customer_deletion_financial_guard BEFORE DELETE ON customers
WHEN EXISTS (SELECT 1 FROM loyalty_payments WHERE customer_id=OLD.id OR referrer_id=OLD.id)
  OR EXISTS (SELECT 1 FROM loyalty_ledger WHERE customer_id=OLD.id)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_HAS_FINANCIAL_RECORDS'); END;

-- TEST orders have no customer foreign key; only an exact normalized email
-- links them to an account. Names/phones are not safe account identifiers.
CREATE TRIGGER customer_deletion_order_guard BEFORE UPDATE OF deleted_at ON customers
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND OLD.email IS NOT NULL AND trim(OLD.email)<>''
  AND EXISTS (SELECT 1 FROM test_orders
    WHERE lower(trim(contact_email))=lower(trim(OLD.email))
      AND preparation_status NOT IN ('collected','cancelled'))
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_HAS_ACTIVE_ORDERS'); END;

CREATE TRIGGER customer_deletion_push_guard BEFORE UPDATE OF deleted_at ON customers
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM push_deliveries d
  JOIN customer_push_subscriptions s ON s.id=d.subscription_id
  WHERE s.customer_id=OLD.id AND d.status='sending')
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_PUSH_IN_FLIGHT'); END;

CREATE TRIGGER customer_tombstone_sealed BEFORE UPDATE ON customers
WHEN OLD.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;

CREATE TRIGGER customer_tombstone_shape BEFORE UPDATE OF deleted_at ON customers
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND (
  NEW.name<>'Client șters' OR NEW.email IS NOT NULL OR NEW.referred_by IS NOT NULL
  OR NEW.referral_code=OLD.referral_code OR NEW.created_at<>0
)
BEGIN SELECT RAISE(ABORT, 'INVALID_CUSTOMER_TOMBSTONE'); END;

CREATE TRIGGER customer_deletion_cleanup AFTER UPDATE OF deleted_at ON customers
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  -- Rebuild commercial line snapshots from an allowlist, dropping any extra
  -- address/contact/metadata fields, including nested ingredient metadata.
  UPDATE test_orders SET contact_name='Client șters',contact_phone='',contact_email='',
    request_hash='erased',
    lines_json=(SELECT json_group_array(json_object(
      'key',json_extract(line.value,'$.key'),
      'name',json_extract(line.value,'$.name'),
      'quantity',json_extract(line.value,'$.quantity'),
      'priceBani',json_extract(line.value,'$.priceBani'),
      'subtotalBani',json_extract(line.value,'$.subtotalBani'),
      'ingredients',json((SELECT json_group_array(json_object(
        'id',json_extract(ingredient.value,'$.id'),
        'amount',json_extract(ingredient.value,'$.amount'),
        'unit',json_extract(ingredient.value,'$.unit')
      )) FROM json_each(line.value,'$.ingredients') ingredient))
    )) FROM json_each(test_orders.lines_json) line)
    WHERE OLD.email IS NOT NULL AND trim(OLD.email)<>''
      AND lower(trim(contact_email))=lower(trim(OLD.email));

  DELETE FROM push_deliveries WHERE subscription_id IN (
    SELECT id FROM customer_push_subscriptions WHERE customer_id=OLD.id
  );
  DELETE FROM customer_push_subscriptions WHERE customer_id=OLD.id;
  UPDATE push_campaigns SET audience_key=(
    SELECT json_group_array(value) FROM json_each(push_campaigns.audience_key) WHERE value<>OLD.id
  ) WHERE audience_key<>'all' AND json_valid(audience_key)
    AND EXISTS (SELECT 1 FROM json_each(push_campaigns.audience_key) WHERE value=OLD.id);
  DELETE FROM customer_push_consent_events WHERE customer_id=OLD.id;
  DELETE FROM customer_marketing_consent_events WHERE customer_id=OLD.id;
  DELETE FROM customer_marketing_invitations WHERE customer_id=OLD.id;
  DELETE FROM customer_oauth WHERE link_customer_id=OLD.id OR referral_code=OLD.referral_code;
  DELETE FROM customer_sessions WHERE customer_id=OLD.id;
  DELETE FROM customer_identities WHERE customer_id=OLD.id;
  DELETE FROM calorie_journal_entries WHERE customer_id=OLD.id;
  DELETE FROM calorie_journal_goals WHERE customer_id=OLD.id;
  UPDATE customers SET referred_by=NULL WHERE referred_by=OLD.id AND deleted_at IS NULL;

  -- No financial owner: remove the parent before erasing guarded voucher
  -- records. Financial tombstones retain immutable vouchers/redemptions too.
  DELETE FROM customers WHERE id=OLD.id
    AND NOT EXISTS (SELECT 1 FROM loyalty_payments WHERE customer_id=OLD.id OR referrer_id=OLD.id)
    AND NOT EXISTS (SELECT 1 FROM loyalty_ledger WHERE customer_id=OLD.id);
  DELETE FROM customer_point_redemptions WHERE customer_id=OLD.id
    AND NOT EXISTS (SELECT 1 FROM customers WHERE id=OLD.id);
  DELETE FROM customer_vouchers WHERE customer_id=OLD.id
    AND NOT EXISTS (SELECT 1 FROM customers WHERE id=OLD.id);
END;

-- Prevent in-flight authenticated requests from resurrecting an erased
-- identity, session, subscription or journal after the deletion commits.
CREATE TRIGGER customer_deleted_identity BEFORE INSERT ON customer_identities
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_session BEFORE INSERT ON customer_sessions
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_oauth BEFORE INSERT ON customer_oauth
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.link_customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_push BEFORE INSERT ON customer_push_subscriptions
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_push_consent BEFORE INSERT ON customer_push_consent_events
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_email_consent BEFORE INSERT ON customer_marketing_consent_events
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_invitation BEFORE INSERT ON customer_marketing_invitations
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_journal BEFORE INSERT ON calorie_journal_entries
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_goal BEFORE INSERT ON calorie_journal_goals
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_voucher BEFORE INSERT ON customer_vouchers
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_referrer BEFORE INSERT ON customers
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.referred_by AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_payment BEFORE INSERT ON loyalty_payments
WHEN EXISTS (SELECT 1 FROM customers
  WHERE id IN (NEW.customer_id,NEW.referrer_id) AND deleted_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM loyalty_payments WHERE payment_id=NEW.payment_id)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
CREATE TRIGGER customer_deleted_voucher_redemption BEFORE UPDATE ON customer_vouchers
WHEN EXISTS (SELECT 1 FROM customers WHERE id=NEW.customer_id AND deleted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'CUSTOMER_DELETED'); END;
