import { ingredientKey, normalizeUnit, roundForShopping } from "@/lib/units";
import type { PlanMeal, Recipe } from "@/lib/types";

export interface ShoppingLine {
  key: string;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  sources: string[];
  /** Déjà dans les fonds de placard */
  inPantry: boolean;
}

/** Combien de fois la recette est cuisinée : un plat est mis à l'échelle des portions, un extra est fait une fois. */
function scaleFor(meal: PlanMeal, recipe: Recipe, portionsPerMeal: number) {
  return meal.slot === "extra" ? 1 : portionsPerMeal / recipe.servings;
}

export function inPantry(name: string, pantry: string[]): boolean {
  const key = ingredientKey(name);
  return pantry.some((p) => {
    const pk = ingredientKey(p);
    // « riz » au placard couvre « riz basmati », mais « lait de coco » ne couvre pas « lait »
    return pk && (key === pk || key.startsWith(`${pk} `));
  });
}

/**
 * Additionne les ingrédients de toutes les recettes de la semaine,
 * mis à l'échelle du nombre de portions réellement cuisinées.
 */
export function buildShoppingList(meals: PlanMeal[], recipesById: Map<string, Recipe>, portionsPerMeal: number, pantry: string[] = []): ShoppingLine[] {
  const lines = new Map<string, ShoppingLine>();

  for (const meal of meals) {
    const recipe = recipesById.get(meal.recipe_id);
    if (!recipe) continue;
    const scale = scaleFor(meal, recipe, portionsPerMeal);

    for (const ing of recipe.recipe_ingredients) {
      const { unit, factor } = normalizeUnit(ing.unit);
      const key = `${ingredientKey(ing.name)}|${unit}`;
      const qty = ing.quantity == null ? null : ing.quantity * factor * scale;
      const line = lines.get(key);
      if (line) {
        line.quantity = line.quantity == null || qty == null ? (line.quantity ?? qty) : line.quantity + qty;
        if (!line.sources.includes(recipe.name)) line.sources.push(recipe.name);
      } else {
        lines.set(key, { key, name: ing.name, quantity: qty, unit, aisle: ing.aisle || "Autre", sources: [recipe.name], inPantry: inPantry(ing.name, pantry) });
      }
    }
  }

  return [...lines.values()]
    .map((l) => ({ ...l, quantity: l.quantity == null ? null : roundForShopping(l.quantity, l.unit) }))
    .sort((a, b) => a.aisle.localeCompare(b.aisle, "fr") || a.name.localeCompare(b.name, "fr"));
}

export function shoppingKey(name: string, unit: string) {
  return `${ingredientKey(name)}|${normalizeUnit(unit).unit}`;
}
