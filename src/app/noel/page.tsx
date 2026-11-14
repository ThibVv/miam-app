import { getContext, getNoelPlan, getRecipeSummaries } from "@/lib/data";
import { AppShell } from "@/components/ui";
import { NoelPlanner, type NoelRecipe } from "./NoelPlanner";

export default async function NoelPage() {
  const [{ people }, plan, recipes] = await Promise.all([getContext(), getNoelPlan(), getRecipeSummaries()]);
  const noel = recipes.filter((r) => r.category === "noel");
  const toChoice = (r: (typeof noel)[number]): NoelRecipe => ({ id: r.id, name: r.name, servings: r.servings, yield_label: r.yield_label, image_url: r.image_url });

  const chosen = (plan?.plan_meals ?? [])
    .map((m) => {
      const recipe = noel.find((r) => r.id === m.recipe_id) ?? recipes.find((r) => r.id === m.recipe_id);
      return recipe && m.id ? { mealId: m.id, portions: m.portions ?? recipe.servings, recipe: toChoice(recipe) } : null;
    })
    .filter((c) => c !== null);
  const available = noel.filter((r) => !chosen.some((c) => c.recipe.id === r.id)).map(toChoice);

  return (
    <AppShell>
      <NoelPlanner
        planId={plan?.id ?? null}
        date={plan?.week_start ?? null}
        guests={plan?.guests ?? Math.max(people.length, 1)}
        chosen={chosen}
        available={available}
      />
    </AppShell>
  );
}
