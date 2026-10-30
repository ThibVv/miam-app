-- Miam v2 : personnes du foyer (avec ou sans compte), matériel, fonds de placard,
-- catégories de recettes et extras (petit-déj / goûter).
-- ⚠️ Repart de zéro : supprime toutes les données de la v1 (foyers, recettes, plannings, courses).
-- Les comptes utilisateurs sont conservés.

drop table if exists public.shopping_items cascade;
drop table if exists public.plan_meals cascade;
drop table if exists public.meal_plans cascade;
drop table if exists public.recipe_steps cascade;
drop table if exists public.recipe_ingredients cascade;
drop table if exists public.recipes cascade;
drop table if exists public.household_members cascade;
drop table if exists public.pantry_items cascade;
drop table if exists public.household_people cascade;
drop table if exists public.households cascade;
drop function if exists public.create_household(text, text);
drop function if exists public.join_household(text, text);
drop function if exists public.is_member(uuid);
drop function if exists public.my_household_id();

-- Foyer ---------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  equipment text[] not null default '{}',
  burners int not null default 4 check (burners between 1 and 8),
  created_at timestamptz not null default now()
);

-- Une personne qui mange les repas ; user_id est rempli quand elle a un compte
create table public.household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  color text not null default '#2F5BD3',
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index household_people_household_idx on public.household_people (household_id);

create or replace function public.is_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_people
    where household_id = hid and user_id = auth.uid()
  );
$$;

/**
 * Crée le foyer et ses personnes. p_people : [{ "name", "color", "likes": [], "dislikes": [] }]
 * p_me : index (0…) de la personne qui correspond au compte connecté.
 */
create or replace function public.create_household(p_name text, p_people jsonb, p_me int, p_equipment text[], p_burners int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  person jsonb;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if exists (select 1 from household_people where user_id = auth.uid()) then
    raise exception 'Vous faites déjà partie d''un foyer';
  end if;
  if jsonb_array_length(p_people) = 0 then
    raise exception 'Ajoutez au moins une personne';
  end if;

  insert into households (name, equipment, burners) values (p_name, p_equipment, p_burners) returning id into hid;

  for person in select * from jsonb_array_elements(p_people) loop
    insert into household_people (household_id, user_id, name, color, likes, dislikes, position)
    values (
      hid,
      case when i = p_me then auth.uid() else null end,
      person ->> 'name',
      coalesce(person ->> 'color', '#2F5BD3'),
      coalesce(array(select jsonb_array_elements_text(person -> 'likes')), '{}'),
      coalesce(array(select jsonb_array_elements_text(person -> 'dislikes')), '{}'),
      i
    );
    i := i + 1;
  end loop;
  return hid;
end;
$$;

/** Personnes d'un foyer encore sans compte, pour choisir « qui je suis » en rejoignant. */
create or replace function public.household_preview(p_code text)
returns table (household_name text, person_id uuid, person_name text, color text)
language sql
security definer
set search_path = public
stable
as $$
  select h.name, p.id, p.name, p.color
  from households h
  join household_people p on p.household_id = h.id and p.user_id is null
  where h.invite_code = upper(trim(p_code))
  order by p.position;
$$;

/** Rejoint un foyer : soit en devenant une personne existante, soit en en créant une. */
create or replace function public.join_household(p_code text, p_person_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  next_pos int;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if exists (select 1 from household_people where user_id = auth.uid()) then
    raise exception 'Vous faites déjà partie d''un foyer';
  end if;
  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception 'Code d''invitation inconnu';
  end if;

  if p_person_id is not null then
    update household_people set user_id = auth.uid()
    where id = p_person_id and household_id = hid and user_id is null;
    if not found then
      raise exception 'Cette personne a déjà un compte';
    end if;
  else
    select coalesce(max(position), -1) + 1 into next_pos from household_people where household_id = hid;
    insert into household_people (household_id, user_id, name, color, position)
    values (hid, auth.uid(), coalesce(nullif(trim(p_name), ''), 'Moi'), '#B8461B', next_pos);
  end if;
  return hid;
end;
$$;

-- Fonds de placard ------------------------------------------------------------

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index pantry_items_household_idx on public.pantry_items (household_id);

-- Recettes ------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  name text not null,
  category text not null default 'plat' check (category in ('plat', 'petit-dej', 'gouter')),
  description text,
  servings int not null default 2 check (servings > 0),
  yield_label text,
  prep_minutes int not null default 0 check (prep_minutes >= 0),
  cook_minutes int not null default 0 check (cook_minutes >= 0),
  rest_minutes int not null default 0 check (rest_minutes >= 0),
  fridge_days int not null default 3 check (fridge_days between 1 and 7),
  freezable boolean not null default false,
  tags text[] not null default '{}',
  equipment text[] not null default '{}',
  source_url text,
  drive_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_household_idx on public.recipes (household_id);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  group_label text,
  name text not null,
  quantity numeric,
  unit text not null default '',
  aisle text not null default 'Autre'
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- station : plan, plaque, four, repos, ou un appareil (air-fryer, mijoteuse…)
create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  text text not null,
  station text not null default 'plan',
  duration_minutes int not null default 5 check (duration_minutes > 0),
  hands_busy boolean not null default true
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id);

-- Planning ------------------------------------------------------------------

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null,
  criteria jsonb not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, week_start)
);

-- day : 0 = lundi … 4 = vendredi ; slot « extra » = petit-déj / goûter en plus des repas
create table public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  person_id uuid references public.household_people (id) on delete set null,
  day int not null default 0 check (day between 0 and 6),
  slot text not null check (slot in ('midi', 'soir', 'extra')),
  storage text not null default 'frigo' check (storage in ('frigo', 'congelo'))
);

create unique index plan_meals_slot_unique on public.plan_meals (plan_id, day, slot) where slot <> 'extra';
create index plan_meals_plan_idx on public.plan_meals (plan_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text not null default '',
  aisle text not null default 'Autre',
  sources text[] not null default '{}',
  manual boolean not null default false,
  in_pantry boolean not null default false,
  checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index shopping_items_plan_idx on public.shopping_items (plan_id);

-- Sécurité (RLS) ------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_people enable row level security;
alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.meal_plans enable row level security;
alter table public.plan_meals enable row level security;
alter table public.shopping_items enable row level security;

create policy "membres lisent leur foyer" on public.households
  for select using (public.is_member(id));
create policy "membres modifient leur foyer" on public.households
  for update using (public.is_member(id));

create policy "personnes du foyer" on public.household_people
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "placard du foyer" on public.pantry_items
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "recettes du foyer" on public.recipes
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "ingrédients du foyer" on public.recipe_ingredients
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id)))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id)));

create policy "étapes du foyer" on public.recipe_steps
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id)))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and public.is_member(r.household_id)));

create policy "plannings du foyer" on public.meal_plans
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "repas du foyer" on public.plan_meals
  for all using (exists (select 1 from public.meal_plans p where p.id = plan_id and public.is_member(p.household_id)))
  with check (exists (select 1 from public.meal_plans p where p.id = plan_id and public.is_member(p.household_id)));

create policy "courses du foyer" on public.shopping_items
  for all using (exists (select 1 from public.meal_plans p where p.id = plan_id and public.is_member(p.household_id)))
  with check (exists (select 1 from public.meal_plans p where p.id = plan_id and public.is_member(p.household_id)));

grant execute on function public.create_household(text, jsonb, int, text[], int) to authenticated;
grant execute on function public.join_household(text, uuid, text) to authenticated;
grant execute on function public.household_preview(text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- Liste de courses synchronisée en temps réel
alter table public.shopping_items replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'shopping_items') then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end $$;
