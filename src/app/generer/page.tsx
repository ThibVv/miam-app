import { getContext, getLatestPlan, getRecipes } from "@/lib/data";
import { upcomingMonday } from "@/lib/week";
import type { Criteria } from "@/lib/types";
import { AppShell } from "@/components/ui";
import { GenerateForm } from "./GenerateForm";

export default async function GeneratePage() {
  const [{ members }, recipes, latest] = await Promise.all([getContext(), getRecipes(), getLatestPlan()]);
  const tags = [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "fr"));
  const perPerson = members.length > 1 ? 5 : 10;

  // On repart des critères de la dernière génération, en gardant les membres actuels
  const previous = latest?.criteria as Criteria | undefined;
  const initial: Criteria = {
    people: members.map((m) => previous?.people.find((p) => p.userId === m.user_id) ?? { userId: m.user_id, count: perPerson, tags: [] }),
    maxMinutes: previous?.maxMinutes ?? 180,
    minTags: previous?.minTags ?? {},
    excludeIngredients: previous?.excludeIngredients ?? [],
    avoidRecentWeeks: previous?.avoidRecentWeeks ?? 3,
    shareIngredients: previous?.shareIngredients ?? true,
  };

  return (
    <AppShell>
      <GenerateForm members={members} tags={tags} initial={initial} weekStart={upcomingMonday()} recipeCount={recipes.length} />
    </AppShell>
  );
}
