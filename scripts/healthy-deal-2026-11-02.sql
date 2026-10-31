-- Date-specific import; revision guard prevents overwriting concurrent admin edits.
-- Nutrition is for soup + main, not for either dish individually.
UPDATE healthy_deal_settings
SET config_json = json_set(
  config_json,
  '$.overrides."2026-11-02"', json_object(
    'enabled', json('true'),
    'soup', json(COALESCE(json_extract(config_json, '$.overrides."2026-11-02".soup'), json_extract(config_json, '$.weekly."1".soup'), '{"name":"Supa-cremă a zilei","description":"","allergens":"","grams":null,"macros":null,"image":"default-soup"}')),
    'main', json_object(
      'name', 'Stir Fry de pui cu legume și orez cu lapte de cocos',
      'description', 'Fiecare meniu include supa-cremă a zilei și felul principal.

Ingrediente: Piept de pui, orez, ardei kapia, zucchini, lapte de cocos, vinete, morcov, sos asiatic cu soia, arahide, ceapă verde, usturoi, ghimbir, ulei, piper.

Valori nutriționale per meniu complet (supă + fel principal): 2.851 kJ / 682 kcal | Grăsimi 21,4 g (saturate 7,9 g) | Glucide 75,7 g (zaharuri 18,3 g) | Fibre 13,7 g | Proteine 47,3 g | Sare ~1,5 g',
      'allergens', 'GLUTEN, ȚELINĂ, SOIA, MOLUȘTE, PEȘTE, SUSAN, ARAHIDE.',
      'grams', NULL, 'macros', NULL,
      'image', COALESCE(json_extract(config_json, '$.overrides."2026-11-02".main.image'), json_extract(config_json, '$.weekly."1".main.image'), 'default-main')
    )
  ),
  '$.overrides."2026-11-03"', json_object(
    'enabled', json('true'),
    'soup', json(COALESCE(json_extract(config_json, '$.overrides."2026-11-03".soup'), json_extract(config_json, '$.weekly."2".soup'), '{"name":"Supa-cremă a zilei","description":"","allergens":"","grams":null,"macros":null,"image":"default-soup"}')),
    'main', json_object(
      'name', 'Piept de curcan cu ragu de linte roșie și sos de iaurt cu mărar și usturoi',
      'description', 'Fiecare meniu include supa-cremă a zilei și felul principal.

Ingrediente: Piept de curcan, sos de roșii, iaurt grecesc, linte roșie, morcov, țelină, ceapă, ardei kapia, ulei de măsline, stafide, nucă, usturoi, mărar, sare, piper.

Valori nutriționale per meniu complet (supă + fel principal): 2.628 kJ / 628 kcal | Grăsimi 21,8 g (saturate 5,8 g) | Glucide 57,0 g (zaharuri 18,8 g) | Fibre 15,8 g | Proteine 53,4 g | Sare ~1,3 g',
      'allergens', 'GLUTEN, ȚELINĂ, LAPTE, FRUCTE CU COAJĂ LEMNOASĂ (NUCI).',
      'grams', NULL, 'macros', NULL,
      'image', COALESCE(json_extract(config_json, '$.overrides."2026-11-03".main.image'), json_extract(config_json, '$.weekly."2".main.image'), 'default-main')
    )
  ),
  '$.overrides."2026-11-04"', json_object(
    'enabled', json('true'),
    'soup', json(COALESCE(json_extract(config_json, '$.overrides."2026-11-04".soup'), json_extract(config_json, '$.weekly."3".soup'), '{"name":"Supa-cremă a zilei","description":"","allergens":"","grams":null,"macros":null,"image":"default-soup"}')),
    'main', json_object(
      'name', 'Paste integrale cu ragu din carne de vită și mix de salată verde BIO cu dressing vinegretă de citrice',
      'description', 'Fiecare meniu include supa-cremă a zilei și felul principal.

Ingrediente: Paste integrale, mix de salată verde BIO, carne de vită, morcov, țelină, ceapă, ardei kapia, dressing vinegretă cu citrice.

Valori nutriționale per meniu complet (supă + fel principal): 2.814 kJ / 673 kcal | Grăsimi 21,9 g (saturate 4,4 g) | Glucide 91,2 g (zaharuri 15,9 g) | Fibre 19,3 g | Proteine 31,6 g | Sare ~0,9 g',
      'allergens', 'GLUTEN, ȚELINĂ, MUȘTAR.',
      'grams', NULL, 'macros', NULL,
      'image', COALESCE(json_extract(config_json, '$.overrides."2026-11-04".main.image'), json_extract(config_json, '$.weekly."3".main.image'), 'default-main')
    )
  ),
  '$.overrides."2026-11-05"', json_object(
    'enabled', json('true'),
    'soup', json(COALESCE(json_extract(config_json, '$.overrides."2026-11-05".soup'), json_extract(config_json, '$.weekly."4".soup'), '{"name":"Supa-cremă a zilei","description":"","allergens":"","grams":null,"macros":null,"image":"default-soup"}')),
    'main', json_object(
      'name', 'Piept de pui cu sote de quinoa și broccoli, salată de gulie cu sos de iaurt și mentă',
      'description', 'Fiecare meniu include supa-cremă a zilei și felul principal.

Ingrediente: Piept de pui, quinoa, broccoli, gulie, iaurt grecesc, ceapă verde, usturoi, pătrunjel, ulei de măsline, ardei iute, mentă, sare, piper.

Valori nutriționale per meniu complet (supă + fel principal): 2.914 kJ / 697 kcal | Grăsimi 22,8 g (saturate 6,4 g) | Glucide 65,8 g (zaharuri 14,2 g) | Fibre 17,7 g | Proteine 58,9 g | Sare ~1,6 g',
      'allergens', 'GLUTEN, ȚELINĂ, LAPTE.',
      'grams', NULL, 'macros', NULL,
      'image', COALESCE(json_extract(config_json, '$.overrides."2026-11-05".main.image'), json_extract(config_json, '$.weekly."4".main.image'), 'default-main')
    )
  ),
  '$.overrides."2026-11-06"', json_object(
    'enabled', json('true'),
    'soup', json(COALESCE(json_extract(config_json, '$.overrides."2026-11-06".soup'), json_extract(config_json, '$.weekly."5".soup'), '{"name":"Supa-cremă a zilei","description":"","allergens":"","grams":null,"macros":null,"image":"default-soup"}')),
    'main', json_object(
      'name', 'Păstrăv cu legume la grătar, mămăligă pe plită și sos de usturoi cu legume coapte',
      'description', 'Fiecare meniu include supa-cremă a zilei și felul principal.

Ingrediente: Păstrăv, mămăligă, ulei de măsline, usturoi, ardei kapia, ceapă roșie, roșii, sare, piper.

Valori nutriționale per meniu complet (supă + fel principal): 3.140 kJ / 751 kcal | Grăsimi 33,2 g (saturate 6,3 g) | Glucide 60,7 g (zaharuri 9,4 g) | Fibre 11,6 g | Proteine 56,8 g | Sare ~1,3 g',
      'allergens', 'GLUTEN, ȚELINĂ, PEȘTE.',
      'grams', NULL, 'macros', NULL,
      'image', COALESCE(json_extract(config_json, '$.overrides."2026-11-06".main.image'), json_extract(config_json, '$.weekly."5".main.image'), 'default-main')
    )
  )
), revision = revision + 1
WHERE id = 1 AND revision = 4 AND config_json IS NOT NULL;
