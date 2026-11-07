-- Miam : une photo par recette.
-- L'URL vient d'une banque d'images (Pexels) ; l'auteur et le lien sont gardés
-- parce que la licence demande de créditer la photo.
-- Ne supprime aucune donnée, peut être relancée sans risque.

alter table public.recipes add column if not exists image_url text;
alter table public.recipes add column if not exists image_author text;
alter table public.recipes add column if not exists image_source text;

comment on column public.recipes.image_url is 'Photo du plat (banque d''images ou vide)';
comment on column public.recipes.image_author is 'Auteur de la photo, à créditer';
comment on column public.recipes.image_source is 'Page de la photo chez la banque d''images';
