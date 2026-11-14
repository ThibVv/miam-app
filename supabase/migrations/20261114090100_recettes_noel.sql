-- Miam : les recettes de Noël (bredele), transcrites du livre de recettes.
-- À lancer APRÈS 20261114090000_noel.sql (qui crée la catégorie « Noël »).
-- Généré par scripts/build-noel-sql.ts depuis scripts/data/noel.md, pour le foyer au code 08083A ;
-- peut être relancé sans doublon.

do $$
declare
  hid uuid;
  rid uuid;
begin
  select id into hid from public.households where invite_code = '08083A';
  if hid is null then
    raise exception 'Aucun foyer avec le code 08083A';
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Cannes de Saint-Nicolas au chocolat') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Cannes de Saint-Nicolas au chocolat', 'noel', 'Petits bredele au chocolat et à la noisette en forme de canne. Se gardent 2 à 3 semaines dans une boîte en fer.', 25, '25 pièces', 20, 20, 30, 7, false, array['bredele', 'noël']::text[], array['four', 'plaque']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Farine T45', 180, 'g', 'Épicerie sucrée'),
      (rid, 1, null, 'Beurre doux mou', 125, 'g', 'Crèmerie'),
      (rid, 2, null, 'Sucre glace', 75, 'g', 'Épicerie sucrée'),
      (rid, 3, null, 'Cacao non sucré en poudre', 20, 'g', 'Épicerie sucrée'),
      (rid, 4, null, 'Lait entier', 60, 'ml', 'Crèmerie'),
      (rid, 5, null, 'Chocolat noir pâtissier', 100, 'g', 'Épicerie sucrée'),
      (rid, 6, null, 'Noisettes concassées', 100, 'g', 'Épicerie sucrée');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Tamiser ensemble la farine et le cacao.', 'plan', 5, true),
      (rid, 1, 'Mélanger le beurre mou et le sucre glace jusqu''à obtenir une texture crémeuse.', 'plan', 5, true),
      (rid, 2, 'Ajouter le lait et mélanger, puis les poudres, et mélanger brièvement.', 'plan', 5, true),
      (rid, 3, 'Pocher de petites cannes à la poche à douille cannelée sur une plaque recouverte de papier cuisson : la pâte est ferme, il faut appuyer.', 'plan', 5, true),
      (rid, 4, 'Laisser reposer les cannes 30 min à température ambiante pour que le relief tienne à la cuisson.', 'repos', 30, false),
      (rid, 5, 'Préchauffer le four à 180 °C, chaleur tournante.', 'four', 2, true),
      (rid, 6, 'Enfourner pour environ 20 min.', 'four', 20, false),
      (rid, 7, 'Laisser refroidir sur une grille.', 'plan', 5, false),
      (rid, 8, 'Faire fondre le chocolat noir au bain-marie.', 'plaque', 5, true),
      (rid, 9, 'Tremper la pointe des cannes dans le chocolat et parsemer de noisettes concassées.', 'plan', 5, true),
      (rid, 10, 'Laisser sécher le chocolat 30 min.', 'repos', 30, false);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Sablés étoiles à la gelée de groseilles') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Sablés étoiles à la gelée de groseilles', 'noel', 'Sablés fondants garnis de gelée de groseille. Se gardent 1 à 2 semaines dans une boîte en fer.', 40, '40 pièces', 30, 15, 60, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Beurre doux mou', 180, 'g', 'Crèmerie'),
      (rid, 1, null, 'Sucre glace', 130, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Poudre de vanille', 0.5, 'c. à c.', 'Épicerie sucrée'),
      (rid, 3, null, 'Farine T45', 350, 'g', 'Épicerie sucrée'),
      (rid, 4, null, 'Œuf', 1, '', 'Crèmerie'),
      (rid, 5, null, 'Gelée de groseille', 1, 'pot', 'Épicerie sucrée'),
      (rid, 6, null, 'Sucre glace pour le montage', 1, 'c. à s.', 'Épicerie sucrée');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Mélanger le beurre, le sucre glace et la vanille jusqu''à obtenir une texture crémeuse, à la main ou au batteur avec la feuille.', 'plan', 5, true),
      (rid, 1, 'Ajouter l''œuf et bien mélanger.', 'plan', 5, true),
      (rid, 2, 'Incorporer la farine en dernier, sans trop travailler la pâte.', 'plan', 5, true),
      (rid, 3, 'Étaler la pâte entre deux feuilles de papier cuisson sur 3 à 4 mm.', 'plan', 5, true),
      (rid, 4, 'Réfrigérer la pâte 1 heure, jusqu''à ce qu''elle durcisse.', 'repos', 60, false),
      (rid, 5, 'Préchauffer le four à 180 °C, chaleur tournante.', 'four', 2, true),
      (rid, 6, 'Découper des étoiles à l''emporte-pièce ; évider la moitié d''entre elles avec un emporte-pièce plus petit.', 'plan', 5, true),
      (rid, 7, 'Déposer les sablés sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 8, 'Enfourner pour environ 15 min.', 'four', 15, false),
      (rid, 9, 'Laisser bien refroidir sur une grille.', 'plan', 5, true),
      (rid, 10, 'Déposer un peu de gelée de groseille au centre des étoiles pleines.', 'plan', 5, true),
      (rid, 11, 'Saupoudrer les étoiles évidées de sucre glace et les poser sur les étoiles garnies.', 'plan', 5, true);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Duchesses à la noix') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Duchesses à la noix', 'noel', 'Deux coques à la noix garnies d''une ganache au chocolat. Se gardent 1 semaine dans une boîte en fer.', 35, '35 pièces', 15, 12, 5, 7, false, array['bredele', 'noël']::text[], array['four', 'plaque']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Blancs d''œufs', 4, '', 'Crèmerie'),
      (rid, 1, null, 'Sucre', 125, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Noix fraîchement moulues', 125, 'g', 'Épicerie'),
      (rid, 3, null, 'Farine', 65, 'g', 'Épicerie sucrée'),
      (rid, 4, null, 'Beurre doux fondu', 100, 'g', 'Crèmerie'),
      (rid, 5, 'Pour la garniture', 'Chocolat noir', 100, 'g', 'Épicerie sucrée'),
      (rid, 6, 'Pour la garniture', 'Beurre', 50, 'g', 'Crèmerie'),
      (rid, 7, 'Pour la garniture', 'Crème fraîche', 50, 'g', 'Crèmerie'),
      (rid, 8, 'Pour la garniture', 'Rhum ou d''eau-de-vie de quetsches', 1, 'c. à s.', 'Autre');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Préchauffer le four à 180 °C, chaleur tournante.', 'four', 2, true),
      (rid, 1, 'Monter les blancs en neige en ajoutant le sucre en 3 ou 4 fois, jusqu''à une meringue ferme et brillante.', 'plan', 5, true),
      (rid, 2, 'Incorporer délicatement les noix moulues et la farine à la maryse, sans casser les blancs.', 'plan', 5, true),
      (rid, 3, 'Ajouter le beurre fondu et mélanger jusqu''à obtenir une pâte homogène.', 'plan', 5, true),
      (rid, 4, 'Pocher de petites boules d''environ 3 cm à la poche à douille lisse sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 5, 'Enfourner pour 12 min.', 'four', 12, false),
      (rid, 6, 'Laisser refroidir sur une grille.', 'plan', 5, false),
      (rid, 7, 'Ganache : faire fondre le chocolat, ajouter le beurre et mélanger, puis la crème fraîche et l''alcool.', 'plaque', 5, true),
      (rid, 8, 'Laisser figer la ganache quelques minutes.', 'repos', 5, false),
      (rid, 9, 'Pocher de la ganache sur la moitié des coques et refermer avec une deuxième coque.', 'plan', 5, true);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Petits biscuits alsaciens à la vanille') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Petits biscuits alsaciens à la vanille', 'noel', 'Boules fondantes à l''amande et à la vanille, cousines des Vanille Kipferl. Se gardent plusieurs semaines dans une boîte en fer.', 30, '30 pièces', 15, 15, 30, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Beurre frais', 250, 'g', 'Crèmerie'),
      (rid, 1, null, 'Farine T45', 280, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Sucre semoule', 70, 'g', 'Épicerie sucrée'),
      (rid, 3, null, 'Amandes en poudre', 100, 'g', 'Épicerie sucrée'),
      (rid, 4, null, 'Vanille', 1, 'gousse', 'Épicerie sucrée'),
      (rid, 5, null, 'Fleur de sel', 1, 'pincée', 'Épicerie sucrée'),
      (rid, 6, null, 'Sucre glace mélangé à de la vanille en poudre', 2, 'c. à s.', 'Épicerie sucrée');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Mélanger du bout des doigts tous les ingrédients, sauf le sucre glace.', 'plan', 5, true),
      (rid, 1, 'Former des boules d''environ 20 g et les disposer sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 2, 'Marquer le dessus de chaque boule avec une fourchette.', 'plan', 5, true),
      (rid, 3, 'Réserver les boules au frais pendant 30 min.', 'repos', 30, false),
      (rid, 4, 'Préchauffer le four à 200 °C.', 'four', 2, true),
      (rid, 5, 'Enfourner pour environ 15 min.', 'four', 15, false),
      (rid, 6, 'Laisser tiédir avant de les manipuler : elles sont très friables.', 'plan', 5, true),
      (rid, 7, 'Les disposer sur une grille de refroidissement.', 'plan', 5, true),
      (rid, 8, 'Saupoudrer de sucre glace vanillé.', 'plan', 5, true);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Anis bredele') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Anis bredele', 'noel', 'Petits biscuits à l''anis qui forment une collerette à la cuisson. Se gardent plusieurs semaines dans une boîte en fer.', 80, '80 pièces', 30, 8, 720, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Œufs entiers', 3, '', 'Crèmerie'),
      (rid, 1, null, 'Sucre semoule', 250, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Farine T45', 250, 'g', 'Épicerie sucrée'),
      (rid, 3, null, 'Grains d''anis vert', 1, 'c. à s.', 'Épicerie sucrée');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Fouetter énergiquement les œufs et le sucre au batteur électrique pendant 15 min.', 'plan', 15, true),
      (rid, 1, 'Tamiser la farine avec les grains d''anis.', 'plan', 5, true),
      (rid, 2, 'Incorporer la farine en pluie aux œufs montés, délicatement à la maryse.', 'plan', 5, true),
      (rid, 3, 'Pocher de petites boules d''environ 2 cm à la poche à douille lisse sur des plaques recouvertes de papier cuisson.', 'plan', 5, true),
      (rid, 4, 'Laisser sécher les bredele 12 heures à température ambiante : une petite croûte doit se former dessus.', 'repos', 720, false),
      (rid, 5, 'Le lendemain, préchauffer le four à 170 °C, chaleur statique.', 'four', 2, true),
      (rid, 6, 'Enfourner pour 8 min : le dessus reste clair et une collerette se forme dessous.', 'four', 8, false),
      (rid, 7, 'Laisser refroidir avant de les décoller.', 'plan', 5, false);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Damiers vanille et chocolat') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Damiers vanille et chocolat', 'noel', 'Sablés bicolores en damier. Se gardent 2 semaines dans une boîte en fer.', 25, '25 pièces', 45, 15, 120, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Farine T45', 250, 'g', 'Épicerie sucrée'),
      (rid, 1, null, 'Sel fin', 1, 'pincée', 'Épicerie'),
      (rid, 2, null, 'Levure chimique', 3, 'g', 'Épicerie sucrée'),
      (rid, 3, null, 'Sucre glace', 100, 'g', 'Épicerie sucrée'),
      (rid, 4, null, 'Beurre doux mou', 125, 'g', 'Crèmerie'),
      (rid, 5, null, 'Vanille en poudre', 1, 'pincée', 'Épicerie sucrée'),
      (rid, 6, null, 'Cacao en poudre non sucré', 30, 'g', 'Épicerie sucrée'),
      (rid, 7, null, 'Lait entier', 3, 'c. à s.', 'Crèmerie'),
      (rid, 8, null, 'Eau', 1, 'c. à s.', 'Autre');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Tamiser ensemble la farine et la levure.', 'plan', 5, true),
      (rid, 1, 'Crémer le beurre avec le sucre glace, la vanille et le sel.', 'plan', 5, true),
      (rid, 2, 'Ajouter la farine et la levure et malaxer ; si la pâte est trop sèche, ajouter 1 à 2 cuillères de lait.', 'plan', 5, true),
      (rid, 3, 'Séparer la pâte en deux, ajouter le cacao dans une moitié et malaxer.', 'plan', 5, true),
      (rid, 4, 'Étaler les deux pâtes en rectangles de même taille, d''environ 8 mm d''épaisseur.', 'plan', 5, true),
      (rid, 5, 'Réserver les pâtes au frais pendant 1 heure, jusqu''à ce qu''elles soient fermes.', 'repos', 60, false),
      (rid, 6, 'Humidifier une abaisse au pinceau et poser l''autre dessus, puis rectifier les bords au couteau.', 'plan', 5, true),
      (rid, 7, 'Découper des bandes d''environ 8 mm de large dans la longueur.', 'plan', 5, true),
      (rid, 8, 'Superposer les bandes par 4 en alternant les couleurs pour former un damier, en les collant avec un peu d''eau.', 'plan', 5, true),
      (rid, 9, 'Réserver le bloc au frais pendant 30 min.', 'repos', 30, false),
      (rid, 10, 'Préchauffer le four à 170 °C et mettre la plaque au congélateur en attendant.', 'four', 2, true),
      (rid, 11, 'Couper des tranches d''environ 8 mm et les déposer sur la plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 12, 'Enfourner pour environ 15 min.', 'four', 15, false),
      (rid, 13, 'Laisser refroidir sur une grille.', 'plan', 5, false);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Bonhommes de neige à la noix de coco') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Bonhommes de neige à la noix de coco', 'noel', 'Sablés à la noix de coco découpés en bonshommes de neige. Se gardent plusieurs semaines dans une boîte en fer.', 40, '40 pièces', 20, 15, 120, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Beurre doux mou', 125, 'g', 'Crèmerie'),
      (rid, 1, null, 'Sucre glace', 70, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Lait entier', 30, 'ml', 'Crèmerie'),
      (rid, 3, null, 'Blanc d''œuf', 1, '', 'Crèmerie'),
      (rid, 4, null, 'Vanille', 1, 'gousse', 'Épicerie sucrée'),
      (rid, 5, null, 'Farine', 170, 'g', 'Épicerie sucrée'),
      (rid, 6, null, 'Noix de coco râpée', 15, 'g', 'Épicerie'),
      (rid, 7, null, 'Noix de coco râpée pour le décor', 30, 'g', 'Épicerie'),
      (rid, 8, null, 'Jaune d''œuf', 1, '', 'Crèmerie'),
      (rid, 9, null, 'Lait pour la dorure', 1, 'c. à s.', 'Crèmerie');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Travailler le beurre en pommade avec le sucre glace et la vanille.', 'plan', 5, true),
      (rid, 1, 'Ajouter le lait et le blanc d''œuf, puis bien mélanger.', 'plan', 5, true),
      (rid, 2, 'Incorporer la farine et la noix de coco.', 'plan', 5, true),
      (rid, 3, 'Étaler la pâte entre deux feuilles de papier cuisson sur 4 à 5 mm.', 'plan', 5, true),
      (rid, 4, 'Réserver au frais pendant 2 heures, le temps que la pâte durcisse.', 'repos', 120, false),
      (rid, 5, 'Préchauffer le four à 180 °C, chaleur tournante.', 'four', 2, true),
      (rid, 6, 'Détailler des bonshommes de neige à l''emporte-pièce et les déposer sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 7, 'Dorer au pinceau avec le mélange jaune d''œuf et lait, puis saupoudrer généreusement de noix de coco.', 'plan', 5, true),
      (rid, 8, 'Enfourner pour environ 15 min.', 'four', 15, false),
      (rid, 9, 'Laisser refroidir sur une grille.', 'plan', 5, false);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Spritz à la noisette façon grand-mère') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Spritz à la noisette façon grand-mère', 'noel', 'Bredele sablés à la noisette en forme de S. Se gardent plusieurs semaines dans une boîte en fer.', 50, '50 pièces', 15, 32, 0, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Farine T45', 200, 'g', 'Épicerie sucrée'),
      (rid, 1, null, 'Sucre semoule', 125, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Noisettes entières', 100, 'g', 'Épicerie sucrée'),
      (rid, 3, null, 'Sel fin', 1, 'pincée', 'Épicerie'),
      (rid, 4, null, 'Beurre doux mou', 150, 'g', 'Crèmerie'),
      (rid, 5, null, 'Œuf', 1, '', 'Crèmerie');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Torréfier les noisettes au four à 160 °C pendant 20 min.', 'four', 20, false),
      (rid, 1, 'Les laisser refroidir entièrement, puis les mixer finement.', 'plan', 5, false),
      (rid, 2, 'Préchauffer le four à 180 °C, chaleur tournante.', 'four', 2, true),
      (rid, 3, 'Mélanger la farine, le sel, le sucre et les noisettes.', 'plan', 5, true),
      (rid, 4, 'Ajouter le beurre mou et malaxer.', 'plan', 5, true),
      (rid, 5, 'Incorporer l''œuf et mélanger jusqu''à obtenir une pâte homogène.', 'plan', 5, true),
      (rid, 6, 'Former des S ou des U avec une presse à biscuits, ou une poche à douille cannelée, sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 7, 'Enfourner pour environ 12 min : ils doivent être bien dorés.', 'four', 12, false),
      (rid, 8, 'Laisser refroidir sur une grille.', 'plan', 5, false);
  end if;

  if not exists (select 1 from public.recipes where household_id = hid and name = 'Zimtsterne') then
    insert into public.recipes (household_id, name, category, description, servings, yield_label, prep_minutes, cook_minutes, rest_minutes, fridge_days, freezable, tags, equipment, notes)
    values (hid, 'Zimtsterne', 'noel', 'Étoiles à la cannelle et aux amandes, glacées au blanc. Se gardent 2 à 3 semaines dans une boîte en fer.', 50, '50 pièces', 20, 8, 780, 7, false, array['bredele', 'noël']::text[], array['four']::text[], null)
    returning id into rid;
    insert into public.recipe_ingredients (recipe_id, position, group_label, name, quantity, unit, aisle) values
      (rid, 0, null, 'Amandes blanches en poudre', 500, 'g', 'Épicerie sucrée'),
      (rid, 1, null, 'Sucre glace', 450, 'g', 'Épicerie sucrée'),
      (rid, 2, null, 'Blancs d''œufs', 5, '', 'Crèmerie'),
      (rid, 3, null, 'Cannelle en poudre', 3, 'g', 'Autre'),
      (rid, 4, null, 'Kirsch', 2, 'cl', 'Autre'),
      (rid, 5, null, 'Sucre en poudre', 100, 'g', 'Épicerie sucrée');
    insert into public.recipe_steps (recipe_id, position, text, station, duration_minutes, hands_busy) values
      (rid, 0, 'Tamiser le sucre glace.', 'plan', 5, true),
      (rid, 1, 'Monter les blancs en neige ferme au batteur électrique.', 'plan', 5, true),
      (rid, 2, 'Ajouter le sucre glace en 2 ou 3 fois.', 'plan', 5, true),
      (rid, 3, 'Prélever une petite tasse de cette meringue pour le glaçage.', 'plan', 5, true),
      (rid, 4, 'Ajouter délicatement le kirsch et la moitié des amandes mélangées à la cannelle, puis le reste des amandes, et terminer à la spatule.', 'plan', 5, true),
      (rid, 5, 'Emballer la pâte dans du film alimentaire et la laisser reposer au frais 1 heure.', 'repos', 60, false),
      (rid, 6, 'Saupoudrer le plan de travail de sucre semoule et abaisser la pâte au rouleau sur 1 cm.', 'plan', 5, true),
      (rid, 7, 'Découper des étoiles en trempant l''emporte-pièce dans l''eau, et les poser sur une plaque recouverte de papier cuisson.', 'plan', 5, true),
      (rid, 8, 'Badigeonner le dessus des étoiles de glaçage au pinceau.', 'plan', 5, true),
      (rid, 9, 'Laisser sécher 12 heures à température ambiante.', 'repos', 720, false),
      (rid, 10, 'Le lendemain, préchauffer le four à 160 °C.', 'four', 2, true),
      (rid, 11, 'Enfourner pour 8 min : le glaçage ne doit pas colorer.', 'four', 8, false),
      (rid, 12, 'Laisser refroidir sur une grille.', 'plan', 5, false);
  end if;
end $$;
