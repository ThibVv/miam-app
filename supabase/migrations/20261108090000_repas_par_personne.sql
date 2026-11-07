-- Miam : un repas peut être pour une seule personne ou pour plusieurs.
-- eaters = les personnes qui mangent ce plat à ce créneau ; vide = tout le foyer (semaines d'avant).
-- Un même créneau peut donc avoir plusieurs lignes : un plat pour l'un, un autre pour l'autre.
-- Ne supprime aucune donnée, peut être relancée sans risque.

alter table public.plan_meals add column if not exists eaters uuid[] not null default '{}';

drop index if exists public.plan_meals_slot_unique;
create index if not exists plan_meals_plan_day_idx on public.plan_meals (plan_id, day, slot);
