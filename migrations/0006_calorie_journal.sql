CREATE TABLE calorie_journal_entries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL CHECK (length(request_key) = 36),
  consumed_on TEXT NOT NULL CHECK (
    length(consumed_on) = 10
    AND consumed_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  food_name TEXT NOT NULL CHECK (length(food_name) BETWEEN 1 AND 100),
  servings REAL NOT NULL CHECK (servings > 0 AND servings <= 20),
  calories REAL NOT NULL CHECK (calories >= 0 AND calories <= 200000),
  protein REAL CHECK (protein IS NULL OR (protein >= 0 AND protein <= 20000)),
  carbs REAL CHECK (carbs IS NULL OR (carbs >= 0 AND carbs <= 20000)),
  fat REAL CHECK (fat IS NULL OR (fat >= 0 AND fat <= 20000)),
  created_at INTEGER NOT NULL
);

CREATE INDEX calorie_journal_customer_date
  ON calorie_journal_entries(customer_id, consumed_on, created_at);
CREATE UNIQUE INDEX calorie_journal_customer_request
  ON calorie_journal_entries(customer_id, request_key);

CREATE TABLE calorie_journal_goals (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  target_calories INTEGER NOT NULL DEFAULT 2000
    CHECK (typeof(target_calories) = 'integer' AND target_calories BETWEEN 500 AND 10000),
  updated_at INTEGER NOT NULL
);
