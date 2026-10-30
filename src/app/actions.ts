"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getContext, getRecipes, getWeeksSinceEaten } from "@/lib/data";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { daysAfterCooking, generatePlan, pickReplacement } from "@/lib/planner/generate";
import { buildShoppingList, shoppingKey } from "@/lib/planner/shopping";
import { parseRecipeFromHtml } from "@/lib/import/parse-recipe";
import { fetchPublicPage } from "@/lib/import/fetch-page";
import type { Criteria, PlanMeal, Recipe, RecipeDraft } from "@/lib/types";

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

// Foyer -----------------------------------------------------------------------

async function insertRecipe(supabase: SupabaseClient, householdId: string, authorId: string | null, draft: RecipeDraft, id?: string) {
  const row = {
    household_id: householdId,
    author_id: authorId,
    name: draft.name.trim(),
    servings: draft.servings,
    prep_minutes: draft.prep_minutes,
    cook_minutes: draft.cook_minutes,
    fridge_days: draft.fridge_days,
    freezable: draft.freezable,
    tags: draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    source_url: draft.source_url,
    notes: draft.notes,
    updated_at: new Date().toISOString(),
  };

  let recipeId = id;
  if (recipeId) {
    const { author_id: _author, ...update } = row;
    void _author;
    const { error } = await supabase.from("recipes").update(update).eq("id", recipeId);
    if (error) throw error;
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
    await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
  } else {
    const { data, error } = await supabase.from("recipes").insert(row).select("id").single();
    if (error) throw error;
    recipeId = data.id as string;
  }

  const ingredients = draft.recipe_ingredients
    .filter((i) => i.name.trim())
    .map((i, position) => ({ recipe_id: recipeId, position, name: i.name.trim(), quantity: i.quantity, unit: i.unit, aisle: i.aisle }));
  const steps = draft.recipe_steps
    .filter((s) => s.text.trim())
    .map((s, position) => ({
      recipe_id: recipeId,
      position,
      text: s.text.trim(),
      station: s.station,
      duration_minutes: Math.max(1, Math.round(s.duration_minutes)),
      hands_busy: s.hands_busy,
    }));
  if (ingredients.length) {
    const { error } = await supabase.from("recipe_ingredients").insert(ingredients);
    if (error) throw error;
  }
  if (steps.length) {
    const { error } = await supabase.from("recipe_steps").insert(steps);
    if (error) throw error;
  }
  return recipeId!;
}

export async function createHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: householdId, error } = await supabase.rpc("create_household", {
    p_name: String(formData.get("name") || "Notre foyer"),
    p_display_name: String(formData.get("display_name")),
  });
  if (error) return { error: error.message };
  for (const draft of STARTER_RECIPES) {
    await insertRecipe(supabase, householdId as string, claims?.claims.sub ?? null, draft);
  }
  redirect("/");
}

export async function joinHousehold(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", {
    p_code: String(formData.get("code")),
    p_display_name: String(formData.get("display_name")),
  });
  if (error) return { error: error.message };
  redirect("/");
}

// Recettes --------------------------------------------------------------------

export async function saveRecipe(draft: RecipeDraft, id?: string): Promise<{ id?: string; error?: string }> {
  const { supabase, household, userId } = await getContext();
  if (!draft.name.trim()) return { error: "Donnez un nom à la recette." };
  try {
    const recipeId = await insertRecipe(supabase, household.id, userId, draft, id);
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

// Planning --------------------------------------------------------------------

async function rebuildShopping(supabase: SupabaseClient, planId: string, meals: PlanMeal[], recipes: Recipe[], portions: number) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const lines = buildShoppingList(meals, byId, portions);
  const { data: existing } = await supabase.from("shopping_items").select("id, name, unit, manual, checked").eq("plan_id", planId);
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
        checked: checkedKeys.has(l.key),
      })),
    );
  }
}

export async function generateWeek(criteria: Criteria, weekStart: string): Promise<{ warnings: string[]; error?: string }> {
  const { supabase, household, userId, members } = await getContext();
  const recipes = await getRecipes();
  const weeksSinceEaten = await getWeeksSinceEaten(weekStart);
  const { meals, warnings } = generatePlan({ recipes, criteria, weeksSinceEaten });
  if (!meals.length) return { warnings, error: "Aucune recette disponible : ajoutez-en d'abord." };

  await supabase.from("meal_plans").delete().eq("household_id", household.id).eq("week_start", weekStart);
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({ household_id: household.id, week_start: weekStart, criteria, created_by: userId })
    .select("id")
    .single();
  if (error) return { warnings, error: error.message };

  await supabase.from("plan_meals").insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
  await rebuildShopping(supabase, plan.id, meals, recipes, Math.max(members.length, 1));
  revalidatePath("/", "layout");
  return { warnings };
}

export async function swapMeal(planId: string, mealId: string) {
  const { supabase, members } = await getContext();
  const recipes = await getRecipes();
  const { data: plan } = await supabase.from("meal_plans").select("*, plan_meals(*)").eq("id", planId).single();
  if (!plan) return;
  const meals = plan.plan_meals as (PlanMeal & { id: string })[];
  const meal = meals.find((m) => m.id === mealId);
  if (!meal) return;

  const weeksSinceEaten = await getWeeksSinceEaten(plan.week_start);
  const replacement = pickReplacement(
    { recipes, criteria: plan.criteria as Criteria, weeksSinceEaten },
    meals.map((m) => m.recipe_id),
    meal.recipe_id,
    meal.chosen_by,
    meal.day,
  );
  if (!replacement) return;

  const storage = daysAfterCooking(meal.day) > replacement.fridge_days && replacement.freezable ? "congelo" : "frigo";
  await supabase.from("plan_meals").update({ recipe_id: replacement.id, storage }).eq("id", mealId);
  const updated = meals.map((m) => (m.id === mealId ? { ...m, recipe_id: replacement.id, storage } : m));
  await rebuildShopping(supabase, planId, updated as PlanMeal[], recipes, Math.max(members.length, 1));
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

// Profil ----------------------------------------------------------------------

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId, household } = await getContext();
  const { error } = await supabase
    .from("household_members")
    .update({ display_name: String(formData.get("display_name")), color: String(formData.get("color")) })
    .eq("household_id", household.id)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
