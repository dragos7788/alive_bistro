CREATE TABLE food_promotion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  discount_percent INTEGER NOT NULL DEFAULT 0
    CHECK (typeof(discount_percent) = 'integer' AND discount_percent BETWEEN 0 AND 99)
);
INSERT INTO food_promotion(id, discount_percent) VALUES (1, 0);
