ALTER TABLE items ADD COLUMN menu_component INTEGER NOT NULL DEFAULT 0
  CHECK (menu_component IN (0, 1));

INSERT OR IGNORE INTO items (
  id, category_id, name, name_en, description, description_en, price,
  calories, protein, carbs, fat, sort_order, menu_component
) VALUES (
  'halloween-special--tarta-de-dovleac',
  'halloween-special',
  'Tartă de dovleac',
  'Pumpkin Tart',
  '120 g · Fulgi de ovăz, piure de dovleac, bază de ovăz, ouă, cafea espresso, ulei de cocos, nucă, sirop de agave BIO, scorțișoară și sare.

Alergeni: gluten, nuci, ouă, lapte, soia.

Inclusă în meniul Halloween complet. Nu se comandă separat.',
  '120 g · Oats, pumpkin purée, oat base, eggs, espresso coffee, coconut oil, walnuts, organic agave syrup, cinnamon and salt.

Allergens: gluten, walnuts, eggs, milk, soy.

Included in the full Halloween menu. Not sold separately.',
  'Inclusă în meniu',
  489, '12,9 g', '58,6 g', '23,9 g',
  1, 1
);
