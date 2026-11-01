"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getContext, getPantry, getPlanRecipes, getRecipes, getWeeksSinceEaten } from "@/lib/data";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { daysAfterCooking, generatePlan, pickExtras, pickReplacement, type GenerateInput } from "@/lib/planner/generate";
import { buildShoppingList, shoppingKey } from "@/lib/planner/shopping";
import { parseRecipeFromHtml } from "@/lib/import/parse-recipe";
import { fetchPublicPage } from "@/lib/import/fetch-page";
import { findPhoto, photosAvailable } from "@/lib/images/photo";
import type { Category, Criteria, PlanMeal, Recipe, RecipeChoice, RecipeDraft } from "@/lib/types";

export type FormState = { error?: string } | undefined;

// Authentification ------------------------------------------------------------

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  redirect("/");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: error.message };
  redirect("/foyer/nouveau");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

// Recettes (écriture) ---------------------------------------------------------

function recipeRow(householdId: string, authorId: string | null, d: RecipeDraft & { drive_id?: string }) {
  return {
    household_id: householdId,
    author_id: authorId,
    name: d.name.trim(),
    category: d.category,
    description: d.description?.trim() || null,
    servings: Math.max(1, Math.round(d.servings)),
    yield_label: d.yield_label?.trim() || null,
    prep_minutes: Math.max(0, Math.round(d.prep_minutes)),
    cook_minutes: Math.max(0, Math.round(d.cook_minutes)),
    rest_minutes: Math.max(0, Math.round(d.rest_minutes)),
    fridge_days: Math.min(7, Math.max(1, Math.round(d.fridge_days))),
    freezable: d.freezable,
    tags: [...new Set(d.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    equipment: d.equipment,
    source_url: d.source_url,
    drive_id: d.drive_id ?? null,
    notes: d.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function childRows(recipeId: string, d: RecipeDraft) {
  return {
    ingredients: d.recipe_ingredients
      .filter((i) => i.name.trim())
      .map((i, position) => ({
        recipe_id: recipeId,
        position,
        group_label: i.group_label?.trim() || null,
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit,
        aisle: i.aisle,
      })),
    steps: d.recipe_steps
      .filter((s) => s.text.trim())
      .map((s, position) => ({
        recipe_id: recipeId,
        position,
        text: s.text.trim(),
        station: s.station,
        duration_minutes: Math.max(1, Math.round(s.duration_minutes)),
        hands_busy: s.hands_busy,
      })),
  };
}

/** Insère plusieurs recettes en trois requêtes (recettes, ingrédients, étapes). */
async function insertRecipes(supabase: SupabaseClient, householdId: string, authorId: string | null, drafts: (RecipeDraft & { drive_id?: string })[]) {
  const { data, error } = await supabase
    .from("recipes")
    .insert(drafts.map((d) => recipeRow(householdId, authorId, d)))
    .select("id");
  if (error) throw error;
  const ingredients = [];
  const steps = [];
  for (let i = 0; i < drafts.length; i++) {
    const rows = childRows(data[i].id as string, drafts[i]);
    ingredients.push(...rows.ingredients);
    steps.push(...rows.steps);
  }
  if (ingredients.length) {
    const { error: e } = await supabase.from("recipe_ingredients").insert(ingredients);
    if (e) throw e;
  }
  if (steps.length) {
    const { error: e } = await supabase.from("recipe_steps").insert(steps);
    if (e) throw e;
  }
  return data.map((r) => r.id as string);
}

// Foyer -----------------------------------------------------------------------

export interface NewPerson {
  name: string;
  color: string;
  likes: string[];
  dislikes: string[];
}

export async function createHousehold(input: {
  name: string;
  people: NewPerson[];
  me: number;
  equipment: string[];
  burners: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Session expirée, reconnectez-vous." };
  if (!input.people.some((p) => p.name.trim())) return { error: "Ajoutez au moins une personne." };

  const { data: householdId, error } = await supabase.rpc("create_household", {
    p_name: input.name.trim() || "Notre foyer",
    p_people: input.people.map((p) => ({ ...p, name: p.name.trim() || "Sans nom" })),
    p_me: input.me,
    p_equipment: input.equipment,
    p_burners: input.burners,
  });
  if (error) return { error: error.message };

  try {
    await insertRecipes(supabase, householdId as string, userId, STARTER_RECIPES);
  } catch (e) {
    return { error: `Foyer créé, mais l'import des recettes a échoué : ${e instanceof Error ? e.message : e}` };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function previewHousehold(code: string): Promise<{ name?: string; people: { id: string; name: string; color: string }[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("household_preview", { p_code: code });
  if (error) return { people: [], error: error.message };
  const rows = (data ?? []) as { household_name: string; person_id: string; person_name: string; color: string }[];
  return { name: rows[0]?.household_name, people: rows.map((r) => ({ id: r.person_id, name: r.person_name, color: r.color })) };
}

export async function joinHousehold(code: string, personId: string | null, name: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", { p_code: code, p_person_id: personId, p_name: name });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function updateHousehold(patch: { name?: string; equipment?: string[]; burners?: number }) {
  const { supabase, household } = await getContext();
  await supabase.from("households").update(patch).eq("id", household.id);
  revalidatePath("/", "layout");
}

export async function savePerson(id: string, patch: Partial<NewPerson>) {
  const { supabase } = await getContext();
  await supabase.from("household_people").update(patch).eq("id", id);
  revalidatePath("/", "layout");
}

export async function addPerson(name: string) {
  const { supabase, household, people } = await getContext();
  const colors = ["#2F5BD3", "#B8461B", "#1F6B4A", "#7A4FB5", "#A3366B", "#8A6D1F"];
  await supabase.from("household_people").insert({
    household_id: household.id,
    name: name.trim() || "Nouvelle personne",
    color: colors[people.length % colors.length],
    position: people.length,
  });
  revalidatePath("/", "layout");
}

export async function removePerson(id: string) {
  const { supabase } = await getContext();
  // Une personne qui a un compte ne peut pas être retirée d'ici
  await supabase.from("household_people").delete().eq("id", id).is("user_id", null);
  revalidatePath("/", "layout");
}

// Recettes --------------------------------------------------------------------

export async function saveRecipe(draft: RecipeDraft, id?: string): Promise<{ id?: string; error?: string }> {
  const { supabase, household, userId } = await getContext();
  if (!draft.name.trim()) return { error: "Donnez un nom à la recette." };
  try {
    let recipeId = id;
    if (recipeId) {
      const { author_id: _author, household_id: _household, ...update } = recipeRow(household.id, userId, draft);
      void _author;
      void _household;
      const { error } = await supabase.from("recipes").update(update).eq("id", recipeId);
      if (error) throw error;
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
      const rows = childRows(recipeId, draft);
      if (rows.ingredients.length) await supabase.from("recipe_ingredients").insert(rows.ingredients);
      if (rows.steps.length) await supabase.from("recipe_steps").insert(rows.steps);
    } else {
      [recipeId] = await insertRecipes(supabase, household.id, userId, [draft]);
    }
    revalidatePath("/recettes");
    return { id: recipeId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}

export async function deleteRecipe(id: string) {
  const { supabase } = await getContext();
  await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/recettes");
  redirect("/recettes");
}

export async function importRecipe(url: string): Promise<{ draft?: RecipeDraft; error?: string }> {
  await getContext();
  try {
    const html = await fetchPublicPage(url);
    const draft = parseRecipeFromHtml(html, url);
    if (!draft) return { error: "Aucune recette lisible sur cette page." };
    return { draft };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import impossible." };
  }
}

// Photos des plats ------------------------------------------------------------

/**
 * Cherche une photo pour une recette et l'enregistre. `skip` passe à la
 * proposition suivante quand la première ne correspond pas au plat.
 */
export async function fetchRecipePhoto(recipeId: string, skip = 0): Promise<{ url?: string | null; error?: string }> {
  const { supabase } = await getContext();
  if (!photosAvailable()) return { error: "Les photos ne sont pas configurées : ajoutez UNSPLASH_ACCESS_KEY dans .env.local." };

  const { data: recipe } = await supabase.from("recipes").select("id, name").eq("id", recipeId).maybeSingle();
  if (!recipe) return { error: "Recette introuvable." };

  try {
    const photo = await findPhoto(recipe.name as string, skip);
    if (!photo) return { error: "Aucune photo trouvée pour ce plat." };
    const { error } = await supabase
      .from("recipes")
      .update({ image_url: photo.url, image_author: photo.author, image_source: photo.source })
      .eq("id", recipeId);
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { url: photo.url };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "rate-limited") return { error: "Quota horaire d'Unsplash atteint (50 requêtes), réessayez dans un moment." };
    if (code === "bad-key") return { error: "Clé Unsplash refusée : vérifiez UNSPLASH_ACCESS_KEY." };
    return { error: "Recherche de photo impossible." };
  }
}

/** Retire la photo d'une recette : on retrouve la vignette colorée. */
export async function removeRecipePhoto(recipeId: string) {
  const { supabase } = await getContext();
  await supabase.from("recipes").update({ image_url: null, image_author: null, image_source: null }).eq("id", recipeId);
  revalidatePath("/", "layout");
}

// Fonds de placard ------------------------------------------------------------

export async function addPantryItems(names: string[]) {
  const { supabase, household } = await getContext();
  const existing = new Set((await getPantry()).map((p) => p.name.toLowerCase()));
  const rows = [...new Set(names.map((n) => n.trim()).filter((n) => n && !existing.has(n.toLowerCase())))].map((name) => ({
    household_id: household.id,
    name,
  }));
  if (rows.length) await supabase.from("pantry_items").insert(rows);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

export async function removePantryItem(id: string) {
  const { supabase } = await getContext();
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

export async function clearPantry() {
  const { supabase, household } = await getContext();
  await supabase.from("pantry_items").delete().eq("household_id", household.id);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

// Planning --------------------------------------------------------------------

async function generationInput(criteria: Criteria, weekStart: string): Promise<GenerateInput> {
  const { household, people } = await getContext();
  const [recipes, weeksSinceEaten, pantry] = await Promise.all([getRecipes(), getWeeksSinceEaten(weekStart), getPantry()]);
  return {
    recipes,
    criteria,
    weeksSinceEaten,
    equipment: household.equipment,
    pantry: criteria.usePantry ? pantry.map((p) => p.name) : [],
    dislikes: people.flatMap((p) => p.dislikes),
  };
}

async function rebuildShopping(supabase: SupabaseClient, planId: string, meals: PlanMeal[], recipes: Recipe[]) {
  const { people } = await getContext();
  const [pantryItems, { data: existing }] = await Promise.all([
    getPantry(),
    supabase.from("shopping_items").select("id, name, unit, manual, checked").eq("plan_id", planId),
  ]);
  const pantry = pantryItems.map((p) => p.name);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const lines = buildShoppingList(meals, byId, Math.max(people.length, 1), pantry);
  const checkedKeys = new Set((existing ?? []).filter((e) => e.checked && !e.manual).map((e) => shoppingKey(e.name, e.unit)));

  await supabase.from("shopping_items").delete().eq("plan_id", planId).eq("manual", false);
  if (lines.length) {
    await supabase.from("shopping_items").insert(
      lines.map((l) => ({
        plan_id: planId,
        name: l.name,
        quantity: l.quantity,
        unit: l.unit,
        aisle: l.aisle,
        sources: l.sources,
        in_pantry: l.inPantry,
        // Ce qui est déjà au placard est coché d'office : on ne l'achète pas
        checked: l.inPantry || checkedKeys.has(l.key),
      })),
    );
  }
}

async function loadPlan(planId: string) {
  const { supabase } = await getContext();
  const { data: plan } = await supabase.from("meal_plans").select("*, plan_meals(*)").eq("id", planId).single();
  return plan as { id: string; week_start: string; criteria: Criteria; plan_meals: (PlanMeal & { id: string })[] } | null;
}

export async function generateWeek(criteria: Criteria, weekStart: string): Promise<{ warnings: string[]; error?: string }> {
  const { supabase, household, userId } = await getContext();
  const input = await generationInput(criteria, weekStart);
  const { meals, warnings } = generatePlan(input);
  if (!meals.length) return { warnings, error: "Aucune recette disponible : ajoutez-en d'abord." };

  await supabase.from("meal_plans").delete().eq("household_id", household.id).eq("week_start", weekStart);
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({ household_id: household.id, week_start: weekStart, criteria, created_by: userId })
    .select("id")
    .single();
  if (error) return { warnings, error: error.message };

  const { error: mealsError } = await supabase.from("plan_meals").insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
  if (mealsError) return { warnings, error: mealsError.message };
  await rebuildShopping(supabase, plan.id, meals, input.recipes);
  revalidatePath("/", "layout");
  return { warnings };
}

export async function swapMeal(planId: string, mealId: string) {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  if (!plan) return;
  const meal = plan.plan_meals.find((m) => m.id === mealId);
  if (!meal) return;

  const input = await generationInput(plan.criteria, plan.week_start);
  const current = input.recipes.find((r) => r.id === meal.recipe_id);
  const replacement = pickReplacement(
    input,
    plan.plan_meals.map((m) => m.recipe_id),
    meal.recipe_id,
    meal.person_id,
    meal.day,
    current?.category ?? "plat",
  );
  if (!replacement) return;

  const storage =
    meal.slot === "extra"
      ? replacement.freezable ? "congelo" : "frigo"
      : daysAfterCooking(meal.day) > replacement.fridge_days && replacement.freezable ? "congelo" : "frigo";
  await supabase.from("plan_meals").update({ recipe_id: replacement.id, storage }).eq("id", mealId);
  const updated = plan.plan_meals.map((m) => (m.id === mealId ? { ...m, recipe_id: replacement.id, storage } : m));
  await rebuildShopping(supabase, planId, updated as PlanMeal[], input.recipes);
  revalidatePath("/", "layout");
}

/** Le « + » : ajoute un petit-déj ou un goûter à la semaine. */
export async function addExtra(planId: string, category: Category) {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  if (!plan) return;
  const input = await generationInput({ ...plan.criteria, extras: { [category]: 1 } }, plan.week_start);
  const [extra] = pickExtras(input, plan.plan_meals.map((m) => m.recipe_id));
  if (!extra) return;
  await supabase.from("plan_meals").insert({ ...extra, plan_id: planId });
  await rebuildShopping(supabase, planId, [...plan.plan_meals, extra], input.recipes);
  revalidatePath("/", "layout");
}

export async function removeExtra(planId: string, mealId: string) {
  const { supabase } = await getContext();
  await supabase.from("plan_meals").delete().eq("id", mealId).eq("slot", "extra");
  const plan = await loadPlan(planId);
  if (plan) await rebuildShopping(supabase, planId, plan.plan_meals, await planRecipesOf(plan.plan_meals));
  revalidatePath("/", "layout");
}

// Choisir soi-même une recette ------------------------------------------------

/** Les recettes du foyer, en version légère : de quoi remplir le sélecteur sans tout charger. */
export async function recipeChoices(): Promise<RecipeChoice[]> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("recipes")
    .select("id, name, category, tags, servings, yield_label, prep_minutes, cook_minutes, fridge_days, freezable")
    .eq("household_id", household.id)
    .order("name");
  return (data ?? []) as RecipeChoice[];
}

function storageFor(recipe: { fridge_days: number; freezable: boolean }, day: number, slot: PlanMeal["slot"]) {
  if (slot === "extra") return recipe.freezable ? "congelo" : "frigo";
  return daysAfterCooking(day) > recipe.fridge_days && recipe.freezable ? "congelo" : "frigo";
}

async function planRecipesOf(meals: { recipe_id: string }[]): Promise<Recipe[]> {
  return getPlanRecipes([...new Set(meals.map((m) => m.recipe_id))]);
}

/** Remplace la recette d'un créneau par celle choisie à la main. */
export async function setMealRecipe(planId: string, mealId: string, recipeId: string): Promise<{ error?: string }> {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  const meal = plan?.plan_meals.find((m) => m.id === mealId);
  if (!plan || !meal) return { error: "Créneau introuvable." };
  const [recipe] = await getPlanRecipes([recipeId]);
  if (!recipe) return { error: "Recette introuvable." };

  const storage = storageFor(recipe, meal.day, meal.slot);
  const { error } = await supabase.from("plan_meals").update({ recipe_id: recipeId, storage }).eq("id", mealId);
  if (error) return { error: error.message };
  const updated = plan.plan_meals.map((m) => (m.id === mealId ? { ...m, recipe_id: recipeId, storage } : m));
  await rebuildShopping(supabase, planId, updated as PlanMeal[], await planRecipesOf(updated));
  revalidatePath("/", "layout");
  return {};
}

/** Ajoute une recette choisie à la main : sur un créneau libre, ou en extra. */
export async function addChosenRecipe(planId: string, recipeId: string, target: { day: number; slot: PlanMeal["slot"] }): Promise<{ error?: string }> {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  if (!plan) return { error: "Semaine introuvable." };
  const [recipe] = await getPlanRecipes([recipeId]);
  if (!recipe) return { error: "Recette introuvable." };
  if (target.slot !== "extra" && plan.plan_meals.some((m) => m.day === target.day && m.slot === target.slot)) {
    return { error: "Ce créneau est déjà pris." };
  }

  const meal = {
    recipe_id: recipeId,
    person_id: null,
    day: target.slot === "extra" ? 0 : target.day,
    slot: target.slot,
    storage: storageFor(recipe, target.day, target.slot),
  };
  const { error } = await supabase.from("plan_meals").insert({ ...meal, plan_id: planId });
  if (error) return { error: error.message };
  const updated = [...plan.plan_meals, meal];
  await rebuildShopping(supabase, planId, updated as PlanMeal[], await planRecipesOf(updated));
  revalidatePath("/", "layout");
  return {};
}

/** Retire un plat d'un créneau (laisse le créneau libre). */
export async function removeMeal(planId: string, mealId: string) {
  const { supabase } = await getContext();
  await supabase.from("plan_meals").delete().eq("id", mealId);
  const plan = await loadPlan(planId);
  if (plan) await rebuildShopping(supabase, planId, plan.plan_meals, await planRecipesOf(plan.plan_meals));
  revalidatePath("/", "layout");
}

// Courses ---------------------------------------------------------------------

export async function toggleShoppingItem(id: string, checked: boolean) {
  const { supabase, userId } = await getContext();
  await supabase
    .from("shopping_items")
    .update({ checked, checked_by: checked ? userId : null, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function addShoppingItem(planId: string, name: string) {
  const { supabase } = await getContext();
  if (!name.trim()) return;
  await supabase.from("shopping_items").insert({ plan_id: planId, name: name.trim(), manual: true, aisle: "Autre" });
}

export async function removeShoppingItem(id: string) {
  const { supabase } = await getContext();
  await supabase.from("shopping_items").delete().eq("id", id);
}
