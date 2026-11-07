# Miam — repères pour Claude Code

Planificateur de batch cooking pour un foyer : on cuisine le dimanche pour les
10 repas de la semaine (midi et soir, lundi à vendredi), à deux ou plus.

L'app résout quatre problèmes à la fois : choisir des plats qui plaisent à
chacun, **qu'ils tiennent jusqu'à vendredi**, en une seule liste de courses, et
dans une cuisine réelle (un four, quatre feux, deux paires de mains).

## Démarrer sur une nouvelle machine

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (voir ci-dessous)
npm run dev
```

`.env.local` n'est pas dans git (c'est voulu). Où retrouver les valeurs :

| Variable | Où la prendre |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | même page, **Publishable key** (jamais la `service_role`) |
| `UNSPLASH_ACCESS_KEY` | unsplash.com → Developers → votre application (facultatif) |

Les mêmes variables doivent exister côté **Vercel** (Settings → Environment
Variables) pour que l'app déployée fonctionne.

Les migrations SQL se passent à la main dans le **SQL Editor** de Supabase, dans
l'ordre des noms de fichiers de `supabase/migrations/`. Les photos envoyées depuis le téléphone vont dans le bucket
`recipe-photos` (un dossier par foyer), créé par `20261109090000_photos_perso.sql`. Celles qui commencent
par `v2_foyer_reel` repartent de zéro et **suppriment les données** ; les autres
s'ajoutent sans rien casser.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (port 3000) |
| `npm test` | tests unitaires (génération, courses, ordonnancement, parsing, nutrition) |
| `npm run lint` / `npm run build` | ESLint / build de production |
| `npx tsx@4.23.15 --tsconfig tsconfig.json scripts/check-nutrition.ts` | contrôle la table nutritionnelle (couverture, ingrédients inconnus, valeurs aberrantes) |
| `npx tsx@4.23.15 --tsconfig tsconfig.json scripts/build-starter-recipes.ts` | reconvertit les fiches du Drive en recettes de départ |

## Conventions

- **Tout est en français** : code, commentaires, noms de variables métier, UI.
- **Prettier, largeur 200** (`npx prettier --print-width 200 --end-of-line crlf`).
  Pas de fichier de config : ne pas lancer prettier sans ce réglage, sa valeur
  par défaut (80) casserait le style de tout le projet.
- Les commentaires expliquent **pourquoi**, pas quoi. Ils sont rares et vont droit au but.
- Mobile d'abord : `max-w-md` centré, cibles tactiles `min-h-11`, `aria-*` systématiques.
- Tailwind v4 avec `@theme` dans `globals.css` et des classes maison
  (`.card`, `.field`, `.btn-primary`, `.chip`, `.skeleton`, `.rise`).
- Les animations passent par les keyframes de `globals.css` et sont neutralisées
  sous `prefers-reduced-motion`.
- **Chaque mise à jour visible** ajoute une entrée en tête de `src/lib/changelog.ts`
  (id = date du jour, phrases pour quelqu'un qui ne code pas) : c'est l'encadré
  « Quoi de neuf » que chacun voit une fois en rouvrant l'app.

## Règles métier à connaître

- Le batch a lieu **le dimanche** : lundi = J+1, vendredi = J+5. Un plat tient
  s'il est congelable ou si `fridge_days >= jour + 1`.
- `plan_meals.day` va de 0 (lundi) à 4 (vendredi), `slot` vaut `midi`, `soir` ou
  `extra` (petit-déj et goûters, hors des 10 créneaux).
- **Une personne n'est pas un compte** : `household_people.user_id` est
  nullable. On planifie pour des mangeurs ; un compte vient se rattacher plus
  tard à une personne existante via le code d'invitation.
- Les quantités sont à l'échelle de `portions / recipe.servings`, sauf les
  extras, cuisinés une fois.
- Les aliments secs de la table nutritionnelle sont comptés **crus** (riz,
  pâtes, lentilles), les conserves **égouttées**.

## Organisation

- `src/lib/planner/` — `generate.ts` (choix des plats par score : envies, placard,
  matériel, anti-répétition, charge du four, équilibre nutritionnel), `schedule.ts`
  (ordonnancement glouton du batch par chemin critique), `shopping.ts` (fusion des
  ingrédients).
- `src/lib/nutrition/` — `foods.ts` est la table des valeurs pour 100 g (~230
  aliments, estimations assumées), `analyze.ts` en déduit les apports et les
  constats. Une recette aux quantités incomplètes n'affiche **aucun chiffre**.
- `src/lib/import/` — lecture des fiches du Drive (`parse-text-recipe.ts`) et des
  pages web en JSON-LD (`parse-recipe.ts`). `fetch-page.ts` protège du SSRF.
- `src/lib/images/photo.ts` — recherche d'une photo chez Unsplash, enregistrée
  une fois sur la recette. Aucune requête pendant la navigation.
- `src/app/actions.ts` — toutes les écritures passent par là.
- `src/lib/data.ts` — toutes les lectures. **Ne pas appeler `getRecipes()` depuis
  une page** : c'est toute la bibliothèque. Utiliser `getRecipeSummaries()`,
  `getPlanRecipes()` ou `getRecipeFacets()` selon le besoin, sinon la navigation
  redevient lente.

## État et limites connues

- Les photos Unsplash sont **approximatives** : l'index est anglophone, « dahl »
  ou « lasagnes » ne donnent rien et une requête peut renvoyer un plat voisin.
  Par défaut les recettes gardent leur vignette colorée ; la photo se choisit
  recette par recette, avec un bouton « Autre photo ».
- `getLatestPlan()` prend le `week_start` le plus grand : générer une semaine à
  l'avance masque la semaine en cours. Il n'y a pas d'historique navigable.
- Régénérer une semaine écrase l'ancienne et perd les cases cochées des courses
  (la préservation ne joue que pour l'échange et les extras).
- `savePerson` et `updateHousehold` passent le patch client directement à
  `update()`, sans filtrer les champs.
- Le générateur est glouton, sans retour arrière : `shareIngredients` mutualise
  peu.
