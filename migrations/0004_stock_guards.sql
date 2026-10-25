CREATE TRIGGER item_stock_mode_guard BEFORE UPDATE OF stock_quantity ON items
WHEN (OLD.stock_quantity IS NULL) <> (NEW.stock_quantity IS NULL)
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM test_order_stock s JOIN test_orders o ON o.number = s.order_number
    WHERE s.item_id = OLD.id AND o.preparation_status IN ('new', 'preparing', 'ready')
  ) THEN RAISE(ABORT, 'STOCK_MODE_CONFLICT') END;
END;

CREATE TRIGGER item_variant_stock_insert BEFORE INSERT ON items
WHEN instr(NEW.price, '/') > 0 AND NEW.stock_quantity IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'VARIANT_STOCK_NOT_SUPPORTED');
END;

CREATE TRIGGER item_variant_stock_update BEFORE UPDATE OF price, stock_quantity ON items
WHEN instr(NEW.price, '/') > 0 AND NEW.stock_quantity IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'VARIANT_STOCK_NOT_SUPPORTED');
END;
