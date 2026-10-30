export type Station = "plan" | "plaque" | "four" | "repos";
export type Slot = "midi" | "soir";
export type Storage = "frigo" | "congelo";

export const STATIONS: { value: Station; label: string }[] = [
  { value: "plan", label: "Plan de travail" },
  { value: "plaque", label: "Plaque" },
  { value: "four", label: "Four" },
  { value: "repos", label: "Repos" },
];

export const AISLES = [
  "Fruits & légumes",
  "Boucherie & poisson",
  "Crèmerie",
  "Épicerie",
  "Surgelés",
  "Boulangerie",
  "Autre",
] as const;

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
export const SLOTS: Slot[] = ["midi", "soir"];

export interface Member {
  user_id: string;
  display_name: string;
  color: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
}

export interface Ingredient {
  id?: string;
  position: number;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
}

export interface Step {
  id?: string;
  position: number;
  text: string;
  station: Station;
  duration_minutes: number;
  hands_busy: boolean;
}

export interface Recipe {
  id: string;
  household_id: string;
  author_id: string | null;
  name: string;
  servings: number;
  prep_minutes: number;
  cook_minutes: number;
  fridge_days: number;
  freezable: boolean;
  tags: string[];
  source_url: string | null;
  notes: string | null;
  recipe_ingredients: Ingredient[];
  recipe_steps: Step[];
}

/** Recette sans identifiants base, utilisée pour la création, l'import et les recettes de départ. */
export type RecipeDraft = Omit<Recipe, "id" | "household_id" | "author_id">;

export interface PlanMeal {
  id?: string;
  recipe_id: string;
  chosen_by: string | null;
  day: number;
  slot: Slot;
  storage: Storage;
}

export interface MealPlan {
  id: string;
  household_id: string;
  week_start: string;
  criteria: Criteria;
  plan_meals: PlanMeal[];
}

export interface PersonCriteria {
  userId: string;
  count: number;
  /** Envies propres à la personne : un tag ou plusieurs */
  tags: string[];
}

export interface Criteria {
  people: PersonCriteria[];
  /** Temps de cuisine total visé pour le batch (minutes), null = peu importe */
  maxMinutes: number | null;
  /** Nombre minimum de recettes par tag, ex. { "végé": 3 } */
  minTags: Record<string, number>;
  excludeIngredients: string[];
  avoidRecentWeeks: number;
  shareIngredients: boolean;
}

export interface ShoppingItem {
  id: string;
  plan_id: string;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  sources: string[];
  manual: boolean;
  checked: boolean;
  checked_by: string | null;
}
