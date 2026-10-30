-- Miam : règles d'accès (RLS) plus rapides.
-- Avant, chaque ligne lue (ingrédients, étapes…) relançait une sous-requête is_member().
-- Ici, le foyer de l'utilisateur est calculé une seule fois par requête.
-- Ne supprime aucune donnée.

create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.household_people where user_id = auth.uid();
$$;

grant execute on function public.my_household_ids() to authenticated;

drop policy if exists "membres lisent leur foyer" on public.households;
drop policy if exists "membres modifient leur foyer" on public.households;
drop policy if exists "personnes du foyer" on public.household_people;
drop policy if exists "placard du foyer" on public.pantry_items;
drop policy if exists "recettes du foyer" on public.recipes;
drop policy if exists "ingrédients du foyer" on public.recipe_ingredients;
drop policy if exists "étapes du foyer" on public.recipe_steps;
drop policy if exists "plannings du foyer" on public.meal_plans;
drop policy if exists "repas du foyer" on public.plan_meals;
drop policy if exists "courses du foyer" on public.shopping_items;

create policy "membres lisent leur foyer" on public.households
  for select using (id in (select public.my_household_ids()));
create policy "membres modifient leur foyer" on public.households
  for update using (id in (select public.my_household_ids()));

create policy "personnes du foyer" on public.household_people
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

create policy "placard du foyer" on public.pantry_items
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

create policy "recettes du foyer" on public.recipes
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

create policy "ingrédients du foyer" on public.recipe_ingredients
  for all using (recipe_id in (select r.id from public.recipes r where r.household_id in (select public.my_household_ids())))
  with check (recipe_id in (select r.id from public.recipes r where r.household_id in (select public.my_household_ids())));

create policy "étapes du foyer" on public.recipe_steps
  for all using (recipe_id in (select r.id from public.recipes r where r.household_id in (select public.my_household_ids())))
  with check (recipe_id in (select r.id from public.recipes r where r.household_id in (select public.my_household_ids())));

create policy "plannings du foyer" on public.meal_plans
  for all using (household_id in (select public.my_household_ids()))
  with check (household_id in (select public.my_household_ids()));

create policy "repas du foyer" on public.plan_meals
  for all using (plan_id in (select p.id from public.meal_plans p where p.household_id in (select public.my_household_ids())))
  with check (plan_id in (select p.id from public.meal_plans p where p.household_id in (select public.my_household_ids())));

create policy "courses du foyer" on public.shopping_items
  for all using (plan_id in (select p.id from public.meal_plans p where p.household_id in (select public.my_household_ids())))
  with check (plan_id in (select p.id from public.meal_plans p where p.household_id in (select public.my_household_ids())));
