UPDATE categories
SET sort_order = sort_order + 1
WHERE group_id = 'food'
  AND sort_order > (
    SELECT sort_order FROM categories WHERE id = 'soup-of-the-day'
  );

UPDATE categories
SET sort_order = (
  SELECT sort_order + 1 FROM categories WHERE id = 'soup-of-the-day'
)
WHERE id = 'halloween-special';
