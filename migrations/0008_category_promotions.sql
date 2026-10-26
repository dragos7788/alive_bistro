CREATE TABLE category_promotions (
  category_id TEXT PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(discount_percent) = 'integer' AND discount_percent BETWEEN 0 AND 99)
);

CREATE TABLE performance_promotion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  discount_percent INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(discount_percent) = 'integer' AND discount_percent BETWEEN 0 AND 99)
);
INSERT INTO performance_promotion(id, discount_percent) VALUES (1, 0);
