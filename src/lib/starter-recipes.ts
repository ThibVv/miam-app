import type { RecipeDraft } from "@/lib/types";
import data from "@/data/starter-recipes.json";

/**
 * Recettes ajoutées à la création d'un foyer : les fiches du Drive « Recettes »,
 * converties et catégorisées par scripts/build-starter-recipes.ts.
 */
export const STARTER_RECIPES = data as (RecipeDraft & { drive_id: string })[];
