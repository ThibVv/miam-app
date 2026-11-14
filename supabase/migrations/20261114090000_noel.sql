-- Miam : l'espace Noël.
-- Une catégorie de recettes « Noël », et un planning à part (kind = 'noel') avec ses invités,
-- sa liste de courses et sa préparation, qui ne se mélange pas à la semaine.
-- Ne supprime aucune donnée, peut être relancée sans risque.

alter table public.recipes drop constraint if exists recipes_category_check;
alter table public.recipes add constraint recipes_category_check check (category in ('plat', 'petit-dej', 'gouter', 'noel'));

alter table public.meal_plans add column if not exists kind text not null default 'semaine';
alter table public.meal_plans drop constraint if exists meal_plans_kind_check;
alter table public.meal_plans add constraint meal_plans_kind_check check (kind in ('semaine', 'noel'));
alter table public.meal_plans add column if not exists guests int;

-- Une semaine et Noël peuvent tomber à la même date : l'unicité se fait par type de planning
alter table public.meal_plans drop constraint if exists meal_plans_household_id_week_start_key;
create unique index if not exists meal_plans_household_kind_week_idx on public.meal_plans (household_id, kind, week_start);

-- Parts voulues pour une recette (80 bredele, 8 convives), à la place du calcul par mangeur
alter table public.plan_meals add column if not exists portions int check (portions is null or portions > 0);
