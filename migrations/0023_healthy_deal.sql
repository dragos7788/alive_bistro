CREATE TABLE healthy_deal_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT,
  revision INTEGER NOT NULL DEFAULT 0
);

INSERT INTO healthy_deal_settings (id) VALUES (1);

INSERT INTO categories (id, group_id, label, label_en, icon_key, sort_order)
VALUES ('healthy-deal', 'food', 'Healthy Deal', 'Healthy Deal', 'fork-knife', -1);
