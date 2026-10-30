import { ingredientKey } from "@/lib/units";
import type { Criteria, PlanMeal, Recipe, Slot } from "@/lib/types";

/** Ingrédients trop courants pour compter comme « mutualisés ». */
const STAPLES = new Set(["sel", "poivre", "huile", "huile d olive", "eau", "sucre", "beurre", "farine"]);

export interface Pick {
  recipeId: string;
  chosenBy: string | null;
}

export interface GenerateInput {
  recipes: Recipe[];
  criteria: Criteria;
  /** Nombre de semaines depuis la dernière fois que la recette a été planifiée */
  weeksSinceEaten: Map<string, number>;
  rng?: () => number;
}

export interface GenerateResult {
  meals: PlanMeal[];
  warnings: string[];
}

/** Créneaux de la semaine dans l'ordre : lundi midi, lundi soir, mardi midi… */
export function weekSlots(days = 5): { day: number; slot: Slot }[] {
  const out: { day: number; slot: Slot }[] = [];
  for (let day = 0; day < days; day++) {
    out.push({ day, slot: "midi" }, { day, slot: "soir" });
  }
  return out;
}

/** Jours écoulés depuis le batch du dimanche pour un créneau (lundi = 1). */
export function daysAfterCooking(day: number) {
  return day + 1;
}

/** Temps où il faut avoir les mains occupées, en minutes. */
export function activeMinutes(r: Recipe): number {
  const fromSteps = r.recipe_steps.filter((s) => s.hands_busy).reduce((sum, s) => sum + s.duration_minutes, 0);
  return fromSteps || r.prep_minutes;
}

function keysOf(r: Recipe): Set<string> {
  return new Set(r.recipe_ingredients.map((i) => ingredientKey(i.name)).filter((k) => !STAPLES.has(k)));
}

function hasTag(r: Recipe, tag: string) {
  const t = tag.toLowerCase();
  return r.tags.some((x) => x.toLowerCase() === t);
}

function isExcluded(r: Recipe, excluded: string[]) {
  if (!excluded.length) return false;
  const keys = [...keysOf(r)];
  return excluded.some((e) => {
    const ek = ingredientKey(e);
    return ek && keys.some((k) => k.includes(ek));
  });
}

interface ScoreContext {
  selected: Recipe[];
  criteria: Criteria;
  personTags: string[];
  weeksSinceEaten: Map<string, number>;
  lateSlotsNeeded: number;
  picksLeft: number;
  rng: () => number;
}

function score(r: Recipe, ctx: ScoreContext): number {
  const { selected, criteria } = ctx;
  let s = ctx.rng() * 1.5;

  for (const tag of ctx.personTags) if (hasTag(r, tag)) s += 2;

  for (const [tag, min] of Object.entries(criteria.minTags)) {
    const have = selected.filter((x) => hasTag(x, tag)).length;
    if (have < min && hasTag(r, tag)) s += 3;
  }

  if (criteria.shareIngredients && selected.length) {
    const mine = keysOf(r);
    const shared = new Set<string>();
    for (const other of selected) for (const k of keysOf(other)) if (mine.has(k)) shared.add(k);
    s += Math.min(shared.size, 3) * 0.6;
  }

  // Éviter deux plats trop proches (même ingrédient principal ou même type de plat, ex. deux chilis)
  const main = r.recipe_ingredients[0] && ingredientKey(r.recipe_ingredients[0].name);
  if (main && selected.some((x) => x.recipe_ingredients[0] && ingredientKey(x.recipe_ingredients[0].name) === main)) s -= 1.5;
  const kind = ingredientKey(r.name).split(" ")[0];
  if (selected.some((x) => ingredientKey(x.name).split(" ")[0] === kind)) s -= 6;

  if (criteria.maxMinutes) {
    const cooks = Math.max(criteria.people.length, 1);
    const used = selected.reduce((sum, x) => sum + activeMinutes(x), 0) / cooks;
    const budgetPerPick = (criteria.maxMinutes - used) / Math.max(ctx.picksLeft, 1);
    if (activeMinutes(r) / cooks > budgetPerPick) s -= 2;
  }

  // Les créneaux de jeudi/vendredi demandent des plats congelables ou qui tiennent
  const keepsLate = r.freezable || r.fridge_days >= 4;
  const lateHave = selected.filter((x) => x.freezable || x.fridge_days >= 4).length;
  if (keepsLate && lateHave < ctx.lateSlotsNeeded) s += ctx.picksLeft <= ctx.lateSlotsNeeded - lateHave ? 5 : 1;

  const weeks = ctx.weeksSinceEaten.get(r.id);
  if (weeks != null && weeks < criteria.avoidRecentWeeks) s -= 4;
  else if (weeks == null) s += 0.5; // jamais cuisinée : petit bonus nouveauté

  return s;
}

function choose(candidates: Recipe[], ctx: ScoreContext): Recipe | undefined {
  let best: Recipe | undefined;
  let bestScore = -Infinity;
  for (const r of candidates) {
    const sc = score(r, ctx);
    if (sc > bestScore) {
      bestScore = sc;
      best = r;
    }
  }
  return best;
}

function lateSlotsCount(total: number) {
  return weekSlots().slice(0, total).filter((s) => daysAfterCooking(s.day) >= 4).length;
}

/** Choisit les recettes de la semaine, à tour de rôle entre les personnes. */
export function pickRecipes({ recipes, criteria, weeksSinceEaten, rng = Math.random }: GenerateInput): { picks: Pick[]; warnings: string[] } {
  const warnings: string[] = [];
  const pool = recipes.filter((r) => !isExcluded(r, criteria.excludeIngredients));
  const total = criteria.people.reduce((n, p) => n + p.count, 0);
  if (pool.length < total) {
    warnings.push(`Seulement ${pool.length} recettes correspondent aux critères pour ${total} demandées : ajoutez des recettes ou assouplissez les exclusions.`);
  }

  const remaining = criteria.people.map((p) => ({ ...p, left: p.count }));
  const selected: Recipe[] = [];
  const picks: Pick[] = [];
  const lateSlotsNeeded = lateSlotsCount(Math.min(total, 10));

  while (remaining.some((p) => p.left > 0)) {
    for (const person of remaining) {
      if (person.left <= 0) continue;
      const candidates = pool.filter((r) => !selected.includes(r));
      const recipe = choose(candidates, {
        selected,
        criteria,
        personTags: person.tags,
        weeksSinceEaten,
        lateSlotsNeeded,
        picksLeft: total - selected.length,
        rng,
      });
      person.left--;
      if (!recipe) continue;
      selected.push(recipe);
      picks.push({ recipeId: recipe.id, chosenBy: person.userId });
    }
  }

  for (const [tag, min] of Object.entries(criteria.minTags)) {
    const have = selected.filter((r) => hasTag(r, tag)).length;
    if (have < min) warnings.push(`Seulement ${have} recette(s) « ${tag} » sur ${min} demandées.`);
  }

  return { picks, warnings };
}

/**
 * Répartit les recettes sur les créneaux : les plus périssables en début de semaine,
 * et tout ce qui dépasse sa durée au frigo part au congélateur.
 */
export function placeMeals(picks: Pick[], recipesById: Map<string, Recipe>): GenerateResult {
  const warnings: string[] = [];
  const shelfLife = (p: Pick) => {
    const r = recipesById.get(p.recipeId)!;
    return r.freezable ? 100 + r.fridge_days : r.fridge_days;
  };
  const sorted = [...picks].sort((a, b) => shelfLife(a) - shelfLife(b));
  const slots = weekSlots();
  const meals: PlanMeal[] = [];

  sorted.slice(0, slots.length).forEach((pick, i) => {
    const { day, slot } = slots[i];
    meals.push({ recipe_id: pick.recipeId, chosen_by: pick.chosenBy, day, slot, storage: "frigo" });
  });

  for (const meal of meals) {
    const r = recipesById.get(meal.recipe_id)!;
    if (daysAfterCooking(meal.day) > r.fridge_days) {
      if (r.freezable) meal.storage = "congelo";
      else warnings.push(`« ${r.name} » ne tient que ${r.fridge_days} j au frigo et n'est pas congelable.`);
    }
  }
  if (picks.length > slots.length) warnings.push(`${picks.length - slots.length} recette(s) en trop pour 10 créneaux.`);
  return { meals, warnings };
}

export function generatePlan(input: GenerateInput): GenerateResult {
  const { picks, warnings } = pickRecipes(input);
  const byId = new Map(input.recipes.map((r) => [r.id, r]));
  const placed = placeMeals(picks, byId);
  return { meals: placed.meals, warnings: [...warnings, ...placed.warnings] };
}

/** Le plat tient-il jusqu'à ce jour (au frigo, ou au congélateur) ? */
export function keepsUntil(r: Recipe, day: number) {
  return r.freezable || daysAfterCooking(day) <= r.fridge_days;
}

/** Propose une autre recette pour un créneau, sans toucher au reste de la semaine. */
export function pickReplacement(
  input: GenerateInput,
  currentRecipeIds: string[],
  replacedId: string,
  chosenBy: string | null,
  day: number,
): Recipe | undefined {
  const { recipes, criteria, weeksSinceEaten, rng = Math.random } = input;
  const selected = recipes.filter((r) => currentRecipeIds.includes(r.id) && r.id !== replacedId);
  const available = recipes.filter(
    (r) => !currentRecipeIds.includes(r.id) && !isExcluded(r, criteria.excludeIngredients),
  );
  // On ne propose un plat fragile que s'il n'existe aucune autre option pour ce jour-là
  const safe = available.filter((r) => keepsUntil(r, day));
  const candidates = safe.length ? safe : available;
  const person = criteria.people.find((p) => p.userId === chosenBy);
  return choose(candidates, {
    selected,
    criteria,
    personTags: person?.tags ?? [],
    weeksSinceEaten,
    lateSlotsNeeded: 0,
    picksLeft: 1,
    rng,
  });
}
