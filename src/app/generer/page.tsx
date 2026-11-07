import { getContext, getLatestPlan, getPantry, getRecipeFacets } from "@/lib/data";
import { upcomingMonday } from "@/lib/week";
import type { Criteria } from "@/lib/types";
import { AppShell } from "@/components/ui";
import { GenerateForm } from "./GenerateForm";

export default async function GeneratePage() {
  // Seuls les tags et les compteurs : la page n'affiche aucune recette
  const [{ people }, { tags, counts }, latest, pantry] = await Promise.all([getContext(), getRecipeFacets(), getLatestPlan(), getPantry()]);
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
        recipeCount={counts.plat}
        extrasAvailable={{ "petit-dej": counts["petit-dej"], gouter: counts.gouter }}
        pantry={pantry}
      />
    </AppShell>
  );
}
