# Miam

Planificateur de batch cooking à deux : une bibliothèque de recettes partagée, une semaine générée selon vos critères (5 recettes chacun → 20 tups), la liste de courses fusionnée et synchronisée, et un guide de préparation optimisé pour cuisiner à deux le dimanche.

Stack : Next.js 16 (App Router, PWA installable) + Supabase (auth, Postgres avec RLS, Realtime).

## Démarrer en local

Prérequis : Node 22+, Docker Desktop lancé.

```bash
npm install
npm run db:start
```

`db:start` lance Supabase en local et applique les migrations de `supabase/migrations`. Copiez ensuite `.env.example` en `.env.local` et renseignez la **Publishable key** affichée par la commande (ou `npx supabase@2.122.0 status`).

```bash
npm run dev
```

L'app tourne sur http://localhost:3000. Le Studio Supabase (pour voir les tables) est sur http://127.0.0.1:54323.

1. Créez un compte, puis un foyer : 12 recettes de départ sont ajoutées.
2. Votre partenaire crée son compte et rejoint le foyer avec le code d'invitation (page Foyer, en touchant les avatars).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires (génération, courses, ordonnancement, import) |
| `npm run lint` | ESLint |
| `npm run build` | Build de production |
| `npm run db:reset` | Recrée la base locale depuis les migrations |

## Organisation

- `supabase/migrations/` : schéma, règles RLS (tout est cloisonné par foyer), fonctions `create_household` / `join_household`.
- `src/lib/planner/generate.ts` : choix des recettes (envies de chacun, minimum par tag, exclusions, anti-répétition, ingrédients mutualisés, temps max) puis placement sur la semaine (le plus périssable d'abord, congélo au-delà de la durée au frigo).
- `src/lib/planner/shopping.ts` : liste de courses fusionnée, unités normalisées (`src/lib/units.ts`), mise à l'échelle des portions.
- `src/lib/planner/schedule.ts` : ordonnancement du batch (four ×1, plaques ×4, cuisiniers aux mains libres pendant les cuissons passives), mise en place groupée.
- `src/lib/import/` : import d'une recette depuis un lien (JSON-LD schema.org), avec devinette du poste, de la durée et des mains occupées.
- `src/app/` : écrans (Semaine, Générer, Courses, Prep, Recettes, Foyer) et actions serveur (`actions.ts`).

## Mettre en ligne

Créez un projet sur supabase.com, appliquez les migrations (`npx supabase@2.122.0 link` puis `db push`), et déployez l'app (Vercel par exemple) avec les deux variables d'environnement du projet.
