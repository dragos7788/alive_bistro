CREATE TABLE commerce_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sales_enabled INTEGER NOT NULL CHECK (sales_enabled IN (0, 1))
);

INSERT INTO commerce_settings (id, sales_enabled) VALUES (1, 1);

CREATE TRIGGER test_orders_require_sales
BEFORE INSERT ON test_orders
WHEN COALESCE((SELECT sales_enabled FROM commerce_settings WHERE id = 1), 0) <> 1
BEGIN
  SELECT RAISE(ABORT, 'SALES_DISABLED');
END;
