import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { weeksBetween } from "@/lib/week";
import type { Household, MealPlan, PantryItem, Person, Recipe, ShoppingItem } from "@/lib/types";

const RECIPE_SELECT = "*, recipe_ingredients(*), recipe_steps(*)";

function sortChildren(r: Recipe): Recipe {
  r.recipe_ingredients.sort((a, b) => a.position - b.position);
  r.recipe_steps.sort((a, b) => a.position - b.position);
  return r;
}

/** Utilisateur connecté, son foyer et les personnes du foyer. Redirige si l'un manque. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/connexion");

  const { data: me } = await supabase.from("household_people").select("id, household_id").eq("user_id", userId).maybeSingle();
  if (!me) redirect("/foyer/nouveau");

  const [{ data: household }, { data: people }] = await Promise.all([
    supabase.from("households").select("id, name, invite_code, equipment, burners").eq("id", me.household_id).single(),
    supabase.from("household_people").select("*").eq("household_id", me.household_id).order("position"),
  ]);

  return {
    supabase,
    userId,
    meId: me.id as string,
    household: household as Household,
    people: (people ?? []) as Person[],
  };
});

export async function getRecipes(): Promise<Recipe[]> {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("recipes").select(RECIPE_SELECT).eq("household_id", household.id).order("name");
  return ((data ?? []) as Recipe[]).map(sortChildren);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("recipes").select(RECIPE_SELECT).eq("id", id).maybeSingle();
  return data ? sortChildren(data as Recipe) : null;
}

/** Le planning le plus récent (celui de la semaine en cours ou à venir). */
export async function getLatestPlan(): Promise<MealPlan | null> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("meal_plans")
    .select("*, plan_meals(*)")
    .eq("household_id", household.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MealPlan) ?? null;
}

export async function getShoppingItems(planId: string): Promise<ShoppingItem[]> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("shopping_items").select("*").eq("plan_id", planId).order("name");
  return (data ?? []) as ShoppingItem[];
}

export async function getPantry(): Promise<PantryItem[]> {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("pantry_items").select("id, name").eq("household_id", household.id).order("created_at");
  return (data ?? []) as PantryItem[];
}

/** Pour chaque recette, nombre de semaines depuis son dernier passage au planning. */
export async function getWeeksSinceEaten(refWeek: string): Promise<Map<string, number>> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("meal_plans")
    .select("week_start, plan_meals(recipe_id)")
    .eq("household_id", household.id)
    .lt("week_start", refWeek);
  const out = new Map<string, number>();
  for (const plan of data ?? []) {
    const weeks = weeksBetween(plan.week_start, refWeek);
    for (const m of plan.plan_meals as { recipe_id: string }[]) {
      const prev = out.get(m.recipe_id);
      if (prev == null || weeks < prev) out.set(m.recipe_id, weeks);
    }
  }
  return out;
}
