CREATE TABLE IF NOT EXISTS categories (
  id        TEXT    PRIMARY KEY,
  group_id  TEXT    NOT NULL CHECK (group_id IN ('food', 'drinks')),
  label     TEXT    NOT NULL,
  label_en  TEXT,
  icon_key  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id             TEXT    PRIMARY KEY,
  category_id    TEXT    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  name_en        TEXT,
  description    TEXT    NOT NULL,
  description_en TEXT,
  price          TEXT    NOT NULL,
  image_key      TEXT,
  image_url      TEXT,
  tag            TEXT,
  calories       INTEGER,
  protein        TEXT,
  carbs          TEXT,
  fat            TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_visible     INTEGER NOT NULL DEFAULT 1
);
