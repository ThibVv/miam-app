import { getContext, getLatestPlan, getRecipes } from "@/lib/data";
import { formatMinutes, groupedPrep, scheduleBatch } from "@/lib/planner/schedule";
import { cookingDay } from "@/lib/week";
import { AppShell, EmptyState, PageHeader } from "@/components/ui";
import { PrepGuide } from "./PrepGuide";

export default async function PrepPage() {
  const [{ members }, plan, recipes] = await Promise.all([getContext(), getLatestPlan(), getRecipes()]);

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Batch cooking" />
        <EmptyState title="Rien à préparer" text="Générez une semaine pour obtenir le guide de préparation optimisé." href="/generer" cta="Générer ma semaine" />
      </AppShell>
    );
  }

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const planRecipes = [...new Set(plan.plan_meals.map((m) => m.recipe_id))].map((id) => byId.get(id)).filter((r) => r != null);
  const cooks = members.map((m) => m.user_id);
  const schedule = scheduleBatch(planRecipes, cooks);
  const solo = cooks.length > 1 ? scheduleBatch(planRecipes, [cooks[0]]) : null;
  const prep = groupedPrep(planRecipes, Math.max(members.length, 1));
  const freezerMeals = plan.plan_meals.filter((m) => m.storage === "congelo").map((m) => byId.get(m.recipe_id)?.name).filter(Boolean) as string[];

  return (
    <AppShell>
      <PageHeader kicker={`${cookingDay(plan.week_start)} · ${planRecipes.length} recettes`} title="Batch cooking" />

      <div className="flex gap-2">
        <div className="card flex flex-1 flex-col gap-0.5 rounded-[14px] px-3 py-2.5">
          <span className="text-xs text-muted">Durée estimée</span>
          <span className="font-display text-[22px] font-bold">{formatMinutes(schedule.totalMinutes)}</span>
        </div>
        {solo && (
          <div className="card flex flex-1 flex-col gap-0.5 rounded-[14px] px-3 py-2.5">
            <span className="text-xs text-muted">Seul·e</span>
            <span className="font-display text-[22px] font-bold text-[#6b746e] line-through">{formatMinutes(solo.totalMinutes)}</span>
          </div>
        )}
      </div>

      <PrepGuide
        storageKey={`prep-${plan.id}`}
        schedule={schedule}
        members={members}
        groupedPrep={prep}
        freezerMeals={freezerMeals}
      />
    </AppShell>
  );
}
