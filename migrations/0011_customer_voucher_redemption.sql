ALTER TABLE customer_vouchers ADD COLUMN used_at INTEGER;
ALTER TABLE customer_vouchers ADD COLUMN used_order_id TEXT;
CREATE INDEX customer_vouchers_customer ON customer_vouchers(customer_id, created_at DESC, id DESC);

CREATE TRIGGER customer_voucher_redemption_guard
BEFORE UPDATE ON customer_vouchers
WHEN OLD.used_at IS NOT NULL
  OR NEW.used_at IS NULL
  OR NEW.used_order_id IS NULL
  OR NEW.used_order_id LIKE 'TEST-%'
  OR NEW.used_at < OLD.created_at
  OR NEW.used_at > OLD.expires_at
  OR NEW.id IS NOT OLD.id
  OR NEW.code IS NOT OLD.code
  OR NEW.customer_id IS NOT OLD.customer_id
  OR NEW.source IS NOT OLD.source
  OR NEW.discount_percent IS NOT OLD.discount_percent
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.expires_at IS NOT OLD.expires_at
BEGIN SELECT RAISE(ABORT, 'INVALID_VOUCHER_REDEMPTION'); END;

CREATE TRIGGER customer_vouchers_no_delete BEFORE DELETE ON customer_vouchers
BEGIN SELECT RAISE(ABORT, 'VOUCHER_IMMUTABLE'); END;
