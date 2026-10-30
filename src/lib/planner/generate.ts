import { ingredientKey } from "@/lib/units";
import { hasEquipmentFor } from "@/lib/equipment";
import { inPantry } from "@/lib/planner/shopping";
import { EXTRA_CATEGORIES, type Category, type Criteria, type PlanMeal, type Recipe, type Slot } from "@/lib/types";

/** Ingrédients trop courants pour compter comme « mutualisés ». */
const STAPLES = new Set(["sel", "poivre", "huile", "huile d olive", "eau", "sucre", "beurre", "farine", "sel et poivre", "huile d olive sel poivre"]);

export interface Pick {
  recipeId: string;
  personId: string | null;
}

export interface GenerateInput {
  recipes: Recipe[];
  criteria: Criteria;
  /** Nombre de semaines depuis la dernière fois que la recette a été planifiée */
  weeksSinceEaten: Map<string, number>;
  /** Matériel du foyer : les recettes qui demandent un appareil absent sont écartées */
  equipment?: string[];
  /** Fonds de placard à écouler en priorité */
  pantry?: string[];
  /** Ingrédients que quelqu'un du foyer n'aime pas */
  dislikes?: string[];
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

/** Le plat tient-il jusqu'à ce jour (au frigo, ou au congélateur) ? */
export function keepsUntil(r: Recipe, day: number) {
  return r.freezable || daysAfterCooking(day) <= r.fridge_days;
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

function matchesAny(r: Recipe, words: string[]) {
  if (!words.length) return false;
  const keys = [...keysOf(r)];
  return words.some((w) => {
    const wk = ingredientKey(w);
    return wk && keys.some((k) => k.includes(wk));
  });
}

/** Recettes utilisables : bonne catégorie, rien d'exclu, et le matériel nécessaire est là. */
export function eligibleRecipes(input: GenerateInput, category: Category): Recipe[] {
  const excluded = [...input.criteria.excludeIngredients, ...(input.dislikes ?? [])];
  return input.recipes.filter(
    (r) =>
      r.category === category &&
      !matchesAny(r, excluded) &&
      (!input.equipment || hasEquipmentFor(r.equipment, input.equipment)),
  );
}

function pantryUses(r: Recipe, pantry: string[]): number {
  if (!pantry.length) return 0;
  return pantry.filter((p) => r.recipe_ingredients.some((i) => inPantry(i.name, [p]))).length;
}

interface ScoreContext {
  selected: Recipe[];
  criteria: Criteria;
  personTags: string[];
  weeksSinceEaten: Map<string, number>;
  pantry: string[];
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

  // Écouler le placard compte autant que les envies : un ingrédient déjà là pèse lourd
  if (criteria.usePantry) s += Math.min(pantryUses(r, ctx.pantry), 3) * 5;

  // Éviter deux plats trop proches (même ingrédient principal ou même type de plat, ex. deux chilis)
  const main = r.recipe_ingredients[0] && ingredientKey(r.recipe_ingredients[0].name);
  if (main && selected.some((x) => x.recipe_ingredients[0] && ingredientKey(x.recipe_ingredients[0].name) === main)) s -= 1.5;
  const kind = ingredientKey(r.name).split(" ")[0];
  if (selected.some((x) => ingredientKey(x.name).split(" ")[0] === kind)) s -= 6;

  // Le four (souvent unique) est le goulot du batch : on évite d'empiler les plats au four
  const oven = (x: Recipe) => x.recipe_steps.filter((st) => st.station === "four").reduce((n, st) => n + st.duration_minutes, 0);
  const ovenBudget = (criteria.maxMinutes ?? 240) * 0.6;
  if (oven(r) > 0 && selected.reduce((n, x) => n + oven(x), 0) + oven(r) > ovenBudget) s -= 3;

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

/** Choisit les plats de la semaine, à tour de rôle entre les personnes. */
export function pickRecipes(input: GenerateInput): { picks: Pick[]; warnings: string[] } {
  const { criteria, weeksSinceEaten, rng = Math.random } = input;
  const warnings: string[] = [];
  const pool = eligibleRecipes(input, "plat");
  const total = criteria.people.reduce((n, p) => n + p.count, 0);
  if (pool.length < total) {
    warnings.push(`Seulement ${pool.length} plats correspondent (matériel, exclusions) pour ${total} demandés.`);
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
        pantry: input.pantry ?? [],
        lateSlotsNeeded,
        picksLeft: total - selected.length,
        rng,
      });
      person.left--;
      if (!recipe) continue;
      selected.push(recipe);
      picks.push({ recipeId: recipe.id, personId: person.personId });
    }
  }

  for (const [tag, min] of Object.entries(criteria.minTags)) {
    const have = selected.filter((r) => hasTag(r, tag)).length;
    if (have < min) warnings.push(`Seulement ${have} recette(s) « ${tag} » sur ${min} demandées.`);
  }

  return { picks, warnings };
}

/** Choisit les extras (petit-déj, goûter) demandés avec les « + ». */
export function pickExtras(input: GenerateInput, alreadyIds: string[] = []): PlanMeal[] {
  const { criteria, weeksSinceEaten, rng = Math.random } = input;
  const meals: PlanMeal[] = [];
  const taken = new Set(alreadyIds);
  for (const category of EXTRA_CATEGORIES) {
    const count = criteria.extras[category] ?? 0;
    for (let i = 0; i < count; i++) {
      const candidates = eligibleRecipes(input, category).filter((r) => !taken.has(r.id));
      const recipe = choose(candidates, {
        selected: [],
        criteria: { ...criteria, minTags: {}, maxMinutes: null },
        personTags: [],
        weeksSinceEaten,
        pantry: input.pantry ?? [],
        lateSlotsNeeded: 0,
        picksLeft: 1,
        rng,
      });
      if (!recipe) break;
      taken.add(recipe.id);
      meals.push({ recipe_id: recipe.id, person_id: null, day: 0, slot: "extra", storage: recipe.freezable ? "congelo" : "frigo" });
    }
  }
  return meals;
}

/**
 * Répartit les plats sur les créneaux : les plus périssables en début de semaine,
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
    meals.push({ recipe_id: pick.recipeId, person_id: pick.personId, day, slot, storage: "frigo" });
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
  const extras = pickExtras(input);
  return { meals: [...placed.meals, ...extras], warnings: [...warnings, ...placed.warnings] };
}

/** Propose une autre recette pour un créneau, sans toucher au reste de la semaine. */
export function pickReplacement(
  input: GenerateInput,
  currentRecipeIds: string[],
  replacedId: string,
  personId: string | null,
  day: number,
  category: Category = "plat",
): Recipe | undefined {
  const { recipes, criteria, weeksSinceEaten, rng = Math.random } = input;
  const selected = recipes.filter((r) => currentRecipeIds.includes(r.id) && r.id !== replacedId && r.category === category);
  const available = eligibleRecipes(input, category).filter((r) => !currentRecipeIds.includes(r.id));
  // On ne propose un plat fragile que s'il n'existe aucune autre option pour ce jour-là
  const safe = category === "plat" ? available.filter((r) => keepsUntil(r, day)) : available;
  const candidates = safe.length ? safe : available;
  const person = criteria.people.find((p) => p.personId === personId);
  return choose(candidates, {
    selected,
    criteria,
    personTags: person?.tags ?? [],
    weeksSinceEaten,
    pantry: input.pantry ?? [],
    lateSlotsNeeded: 0,
    picksLeft: 1,
    rng,
  });
}
