-- Miam : photos de plats envoyées depuis le téléphone.
-- Un dossier par foyer dans le stockage Supabase ; seuls ses membres y ajoutent ou y suppriment.
-- Les photos sont publiques en lecture (adresse impossible à deviner), comme celles d'Unsplash.
-- Ne supprime aucune donnée, peut être relancée sans risque.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos du foyer : ajout" on storage.objects;
drop policy if exists "photos du foyer : suppression" on storage.objects;

create policy "photos du foyer : ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] in (select public.my_household_ids()::text));

create policy "photos du foyer : suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] in (select public.my_household_ids()::text));
