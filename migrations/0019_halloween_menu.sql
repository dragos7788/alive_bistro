INSERT OR IGNORE INTO categories (id, group_id, label, icon_key, sort_order)
SELECT 'halloween-special', 'food', 'Halloween Special Menu', 'fork-knife',
  COALESCE(MAX(sort_order) + 1, 0)
FROM categories
WHERE group_id = 'food';

INSERT OR IGNORE INTO items (
  id, category_id, name, name_en, description, description_en, price,
  calories, protein, carbs, fat, sort_order
) VALUES (
  'halloween-special--meniu-halloween',
  'halloween-special',
  'Meniu Halloween',
  'Halloween Menu',
  '510 g · Piept de rață cu piure de dovleac copt și sos de fructe de pădure (390 g), servit împreună cu tartă de dovleac (120 g).

Piept de rață: piept de rață, piure de dovleac și sos de fructe de pădure. Tartă de dovleac: fulgi de ovăz, piure de dovleac, bază de ovăz, ouă, cafea espresso, ulei de cocos, nucă, sirop de agave BIO, scorțișoară și sare.

Valori nutriționale pentru meniul complet: 1.246 kcal, proteine 65,4 g, glucide 102,6 g, grăsimi 61,9 g.

Alergeni: gluten, nuci, ouă, lapte, soia.',
  '510 g · Duck breast with roasted pumpkin purée and forest-fruit sauce (390 g), served with pumpkin tart (120 g).

Duck breast: duck breast, pumpkin purée and forest-fruit sauce. Pumpkin tart: oats, pumpkin purée, oat base, eggs, espresso coffee, coconut oil, walnuts, organic agave syrup, cinnamon and salt.

Nutrition for the full menu: 1,246 kcal, protein 65.4 g, carbohydrates 102.6 g, fat 61.9 g.

Allergens: gluten, walnuts, eggs, milk, soy.',
  '65 lei',
  1246, '65,4 g', '102,6 g', '61,9 g',
  0
);
