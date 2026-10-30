# Miam

Planificateur de batch cooking : une bibliothèque de recettes partagée (les fiches du Drive « Recettes »), une semaine générée selon les envies de chacun, le matériel du foyer et les fonds de placard, la liste de courses fusionnée et synchronisée, et un guide de préparation optimisé pour cuisiner à plusieurs le dimanche.

Stack : Next.js 16 (App Router, PWA installable) + Supabase (auth, Postgres avec RLS, Realtime).

## Démarrer

Prérequis : Node 22+ et un projet Supabase (en ligne, ou en local avec Docker et `npm run db:start`).

1. Dans le **SQL Editor** de Supabase, exécutez `supabase/migrations/20261031090000_v2_foyer_reel.sql` (il repart de zéro : il supprime toutes les données existantes, pas les comptes).
2. Dans **Authentication → Sign In / Providers → Email**, désactivez « Confirm email ».
3. Copiez `.env.example` en `.env.local` avec l'URL du projet et la **Publishable key**.

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:3000.

## Premier usage

1. Créer un compte, puis **Créer un foyer** : nombre de personnes, préférences de chacun (envies, « n'aime pas »), matériel de cuisine. Les 77 recettes du Drive sont ajoutées, déjà classées.
2. Les autres personnes créent leur compte, choisissent **Rejoindre**, saisissent le code d'invitation (page Foyer, en touchant les avatars) et se choisissent dans la liste.
3. Avant chaque semaine : noter les **fonds de placard**, puis **Générer**. Les petits-déj et goûters s'ajoutent avec les « + ».

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires (génération, courses, ordonnancement, lecture des fiches) |
| `npm run lint` | ESLint |
| `npm run build` | Build de production |
| `npx tsx@4.23.15 --tsconfig tsconfig.json scripts/build-starter-recipes.ts` | Reconvertit les fiches du Drive (`scripts/data/drive-recipes.json`) en recettes de départ |

## Organisation

- `supabase/migrations/` : schéma, règles RLS (tout est cloisonné par foyer), fonctions `create_household`, `household_preview`, `join_household`.
- `src/lib/import/parse-text-recipe.ts` : lecture d'une recette au format des fiches (« Pour 4 personnes · Conservation… », ingrédients avec sous-parties, étapes numérotées, conseils). Sert à l'import du Drive et au « Coller un texte » de l'éditeur.
- `src/lib/equipment.ts` : catalogue du matériel, postes de cuisson et capacités (nombre de feux, fours, appareils).
- `src/lib/planner/generate.ts` : choix des plats (envies, « n'aime pas », matériel disponible, fonds de placard, minimum par tag, anti-répétition, ingrédients mutualisés, charge du four) puis placement sur la semaine, et extras petit-déj / goûter.
- `src/lib/planner/shopping.ts` : liste de courses fusionnée, unités normalisées (`src/lib/units.ts`), fonds de placard cochés d'office.
- `src/lib/planner/schedule.ts` : ordonnancement du batch selon le matériel du foyer, cuisiniers aux mains libres pendant les cuissons passives, mise en place groupée.
- `src/app/` : écrans (Semaine, Générer, Placard, Courses, Prep, Recettes, Foyer) et actions serveur (`actions.ts`).

## Mettre en ligne (pour l'utiliser sur téléphone)

1. Poussez le dépôt sur GitHub, puis importez-le sur [vercel.com](https://vercel.com) avec les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Dans Supabase, **Authentication → URL Configuration** : mettez l'adresse Vercel dans « Site URL ».
3. Sur le téléphone, ouvrez l'adresse puis « Ajouter à l'écran d'accueil » : l'app s'ouvre comme une application.
