INSERT INTO category_promotions(category_id, discount_percent)
SELECT id, 10 FROM categories
WHERE group_id = 'food' AND id <> 'sweet-no-regrets'
ON CONFLICT(category_id) DO UPDATE SET discount_percent = excluded.discount_percent;
