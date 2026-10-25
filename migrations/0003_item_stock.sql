ALTER TABLE items ADD COLUMN is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1));
ALTER TABLE items ADD COLUMN stock_quantity INTEGER CHECK (stock_quantity IS NULL OR (typeof(stock_quantity) = 'integer' AND stock_quantity >= 0 AND stock_quantity <= 1000000));
ALTER TABLE items ADD COLUMN show_stock INTEGER NOT NULL DEFAULT 0 CHECK (show_stock IN (0, 1));

CREATE TABLE test_order_stock (
  order_number TEXT NOT NULL REFERENCES test_orders(number),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_number, item_id)
);

CREATE TRIGGER test_order_stock_reserve BEFORE INSERT ON test_order_stock
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM items WHERE id = NEW.item_id AND is_visible = 1 AND is_available = 1
      AND (stock_quantity IS NULL OR stock_quantity >= NEW.quantity)
  ) THEN RAISE(ABORT, 'STOCK_UNAVAILABLE') END;
  UPDATE items SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.item_id AND stock_quantity IS NOT NULL;
END;

CREATE TRIGGER test_order_stock_restore AFTER UPDATE OF preparation_status ON test_orders
WHEN NEW.preparation_status = 'cancelled' AND OLD.preparation_status <> 'cancelled'
BEGIN
  UPDATE items SET stock_quantity = stock_quantity + (
    SELECT quantity FROM test_order_stock WHERE order_number = NEW.number AND item_id = items.id
  ) WHERE stock_quantity IS NOT NULL AND id IN (
    SELECT item_id FROM test_order_stock WHERE order_number = NEW.number
  );
END;
