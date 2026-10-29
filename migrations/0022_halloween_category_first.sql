UPDATE categories
SET sort_order = sort_order + 1
WHERE group_id = 'food'
  AND sort_order < (
    SELECT sort_order FROM categories WHERE id = 'halloween-special'
  );

UPDATE categories
SET sort_order = 0
WHERE id = 'halloween-special';
