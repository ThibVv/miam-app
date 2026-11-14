import Link from "next/link";
import { getContext, getLatestPlan, getNoelPlan, getPlanRecipes } from "@/lib/data";
import { stationCapacities } from "@/lib/equipment";
import { formatMinutes, groupedPrep, scheduleBatch } from "@/lib/planner/schedule";
import { cookedDishes } from "@/lib/planner/shopping";
import { cookingDay } from "@/lib/week";
import { AppShell, EmptyState, PageHeader } from "@/components/ui";
import { PrepGuide } from "./PrepGuide";

export default async function PrepPage({ searchParams }: PageProps<"/prep">) {
  const { quoi } = await searchParams;
  const [{ people, household }, week, noelPlan] = await Promise.all([getContext(), getLatestPlan(), getNoelPlan()]);
  const hasNoel = !!noelPlan?.plan_meals.length;
  const isNoel = quoi === "noel" && hasNoel;
  const plan = isNoel ? noelPlan : week;

  // Noël a sa propre préparation : on passe de l'une à l'autre sans quitter la page
  const tabs = hasNoel && (
    <div role="tablist" aria-label="Quelle préparation" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
      <Link href="/prep" replace role="tab" aria-selected={!isNoel} className={`flex min-h-10 items-center justify-center rounded-[9px] text-sm ${!isNoel ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}>
        Semaine
      </Link>
      <Link href="/prep?quoi=noel" replace role="tab" aria-selected={isNoel} className={`flex min-h-10 items-center justify-center rounded-[9px] text-sm ${isNoel ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}>
        <span aria-hidden className="mr-1 text-freeze">❄</span>Noël
      </Link>
    </div>
  );

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Batch cooking" />
        {tabs}
        <EmptyState title="Rien à préparer" text="Générez une semaine pour obtenir le guide de préparation optimisé." href="/generer" cta="Générer ma semaine" />
      </AppShell>
    );
  }

  const planRecipes = await getPlanRecipes([...new Set(plan.plan_meals.map((m) => m.recipe_id))]);
  const byId = new Map(planRecipes.map((r) => [r.id, r]));
  const cooks = people.map((p) => p.id);
  const capacities = stationCapacities(household.equipment, household.burners);
  const schedule = scheduleBatch(planRecipes, cooks, capacities);
  const solo = cooks.length > 1 ? scheduleBatch(planRecipes, [cooks[0]], capacities) : null;
  const prep = groupedPrep(
    cookedDishes(
      plan.plan_meals,
      byId,
      people.map((p) => p.id),
    ).map((d) => ({ recipe: d.recipe, scale: d.scale })),
  );
  const freezerMeals = plan.plan_meals.filter((m) => m.storage === "congelo").map((m) => byId.get(m.recipe_id)?.name).filter(Boolean) as string[];

  return (
    <AppShell>
      <PageHeader kicker={`${isNoel ? "Pour Noël" : cookingDay(plan.week_start)} · ${planRecipes.length} recettes`} title={isNoel ? "Préparation de Noël" : "Batch cooking"} />
      {tabs}

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

      <PrepGuide storageKey={`prep-${plan.id}`} schedule={schedule} people={people} groupedPrep={prep} freezerMeals={freezerMeals} />
    </AppShell>
  );
}
