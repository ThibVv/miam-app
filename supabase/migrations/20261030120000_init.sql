-- Miam : schéma initial (foyer partagé, recettes, plannings, courses)

create extension if not exists pgcrypto with schema extensions;

-- Foyer ---------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  color text not null default '#2F5BD3',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Un utilisateur appartient à un seul foyer (suffisant pour le MVP)
create unique index household_members_one_per_user on public.household_members (user_id);

create or replace function public.is_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.my_household_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Déjà membre d''un foyer';
  end if;
  insert into households (name) values (p_name) returning id into hid;
  insert into household_members (household_id, user_id, display_name, color)
  values (hid, auth.uid(), p_display_name, '#2F5BD3');
  return hid;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Déjà membre d''un foyer';
  end if;
  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception 'Code d''invitation inconnu';
  end if;
  select count(*) into member_count from household_members where household_id = hid;
  insert into household_members (household_id, user_id, display_name, color)
  values (hid, auth.uid(), p_display_name, case when member_count = 1 then '#B8461B' else '#5B6CC0' end);
  return hid;
end;
$$;

-- Recettes ------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  name text not null,
  servings int not null default 4 check (servings > 0),
  prep_minutes int not null default 0 check (prep_minutes >= 0),
  cook_minutes int not null default 0 check (cook_minutes >= 0),
  fridge_days int not null default 3 check (fridge_days between 1 and 7),
  freezable boolean not null default false,
  tags text[] not null default '{}',
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_household_idx on public.recipes (household_id);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  name text not null,
  quantity numeric,
  unit text not null default '',
  aisle text not null default 'Autre'
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- station : plan (plan de travail), plaque, four, repos (frigo, marinade…)
create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  text text not null,
  station text not null default 'plan' check (station in ('plan', 'plaque', 'four', 'repos')),
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

-- day : 0 = lundi … 4 = vendredi
create table public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  chosen_by uuid references auth.users (id) on delete set null,
  day int not null check (day between 0 and 6),
  slot text not null check (slot in ('midi', 'soir')),
  storage text not null default 'frigo' check (storage in ('frigo', 'congelo')),
  unique (plan_id, day, slot)
);

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
  checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index shopping_items_plan_idx on public.shopping_items (plan_id);

-- Sécurité (RLS) ------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.meal_plans enable row level security;
alter table public.plan_meals enable row level security;
alter table public.shopping_items enable row level security;

create policy "membres lisent leur foyer" on public.households
  for select using (public.is_member(id));
create policy "membres renomment leur foyer" on public.households
  for update using (public.is_member(id));

create policy "membres voient le foyer" on public.household_members
  for select using (public.is_member(household_id));
create policy "chacun modifie son profil" on public.household_members
  for update using (user_id = auth.uid());

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

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.my_household_id() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- Liste de courses synchronisée en temps réel
alter table public.shopping_items replica identity full;
alter publication supabase_realtime add table public.shopping_items;
