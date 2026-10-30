import { getContext, getLatestPlan, getPantry, getRecipes } from "@/lib/data";
import { upcomingMonday } from "@/lib/week";
import type { Criteria } from "@/lib/types";
import { AppShell } from "@/components/ui";
import { GenerateForm } from "./GenerateForm";

export default async function GeneratePage() {
  const [{ people }, recipes, latest, pantry] = await Promise.all([getContext(), getRecipes(), getLatestPlan(), getPantry()]);
  const mains = recipes.filter((r) => r.category === "plat");
  const tags = [...new Set(mains.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "fr"));
  // 10 plats par semaine (midi + soir, lundi → vendredi), répartis entre les personnes
  const perPerson = Math.floor(10 / Math.max(people.length, 1));

  // On repart des critères de la dernière génération ; les envies par défaut viennent des préférences
  const previous = latest?.criteria as Partial<Criteria> | undefined;
  const initial: Criteria = {
    people: people.map(
      (p, i) =>
        previous?.people?.find((c) => c.personId === p.id) ?? {
          personId: p.id,
          count: perPerson + (i < 10 % Math.max(people.length, 1) ? 1 : 0),
          tags: p.likes,
        },
    ),
    maxMinutes: previous?.maxMinutes ?? 180,
    minTags: previous?.minTags ?? {},
    excludeIngredients: previous?.excludeIngredients ?? [],
    avoidRecentWeeks: previous?.avoidRecentWeeks ?? 3,
    shareIngredients: previous?.shareIngredients ?? true,
    usePantry: previous?.usePantry ?? true,
    extras: previous?.extras ?? {},
  };

  return (
    <AppShell>
      <GenerateForm
        people={people}
        tags={tags}
        initial={initial}
        weekStart={upcomingMonday()}
        recipeCount={mains.length}
        extrasAvailable={{ "petit-dej": recipes.filter((r) => r.category === "petit-dej").length, gouter: recipes.filter((r) => r.category === "gouter").length }}
        pantry={pantry}
      />
    </AppShell>
  );
}
