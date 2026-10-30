import Link from "next/link";
import { getContext, getLatestPlan, getRecipes } from "@/lib/data";
import { DAYS, EXTRA_CATEGORIES, MEAL_SLOTS } from "@/lib/types";
import { stationCapacities } from "@/lib/equipment";
import { formatMinutes, scheduleBatch } from "@/lib/planner/schedule";
import { dayNumber, formatWeekRange } from "@/lib/week";
import { AppShell, EmptyState, PageHeader, PeopleBadge } from "@/components/ui";
import { ChevronRight } from "@/components/icons";
import { SwapButton } from "./SwapButton";
import { AddExtraButton, RemoveExtraButton } from "./ExtraButtons";

const EXTRA_LABEL: Record<string, string> = { "petit-dej": "Petit-déj", gouter: "Goûter" };

export default async function WeekPage() {
  const [{ people, household }, plan, recipes] = await Promise.all([getContext(), getLatestPlan(), getRecipes()]);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const personById = new Map(people.map((p) => [p.id, p]));

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Ma semaine" action={<PeopleBadge people={people} />} />
        <EmptyState
          title="Aucune semaine planifiée"
          text="Notez vos fonds de placard, choisissez vos envies : Miam sélectionne les plats, crée la liste de courses et le guide de préparation."
          href="/generer"
          cta="Générer ma semaine"
        />
        <Link href="/placard" className="btn-secondary">Fonds de placard</Link>
      </AppShell>
    );
  }

  const meals = plan.plan_meals.filter((m) => m.slot !== "extra");
  const extras = plan.plan_meals.filter((m) => m.slot === "extra");
  const planRecipes = [...new Set(plan.plan_meals.map((m) => m.recipe_id))].map((id) => byId.get(id)).filter((r) => r != null);
  const schedule = scheduleBatch(planRecipes, people.map((p) => p.id), stationCapacities(household.equipment, household.burners));
  const days = DAYS.map((label, day) => ({
    label,
    num: dayNumber(plan.week_start, day),
    meals: MEAL_SLOTS.map((slot) => meals.find((m) => m.day === day && m.slot === slot)),
  }));

  return (
    <AppShell>
      <PageHeader kicker={`Semaine du ${formatWeekRange(plan.week_start)}`} title="Ma semaine" action={<PeopleBadge people={people} />} />

      <div className="grid grid-cols-3 gap-1.5">
        {[
          [meals.length, "plats"],
          [meals.length * Math.max(people.length, 1), "tups"],
          [formatMinutes(schedule.totalMinutes), "de prep"],
        ].map(([value, label]) => (
          <div key={label} className="card flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5">
            <span className="font-display text-xl font-bold">{value}</span>
            <span className="text-[11px] text-muted">{label}</span>
          </div>
        ))}
      </div>

      <Link href="/prep" className="flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-brand px-4 py-3 text-white hover:bg-brand-dark">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Batch cooking dimanche</span>
          <span className="text-xs text-[#d6eadf]">Ouvrir le guide · {people.length} cuisinier{people.length > 1 ? "s" : ""}</span>
        </span>
        <ChevronRight size={20} />
      </Link>

      <div className="flex flex-col gap-2">
        {days.map((d) => (
          <div key={d.label} className="card flex items-stretch gap-3 rounded-[14px] px-3 py-2.5">
            <div className="flex w-[38px] shrink-0 flex-col items-center justify-center border-r border-[#e4e7e1] pr-2.5">
              <span className="text-xs font-medium text-muted">{d.label.slice(0, 3)}</span>
              <span className="font-display text-xl font-bold">{d.num}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {d.meals.map((meal, i) => {
                const recipe = meal && byId.get(meal.recipe_id);
                const chooser = meal?.person_id ? personById.get(meal.person_id) : undefined;
                return (
                  <div key={i} className="flex min-h-9 items-center gap-2">
                    <span className="w-[30px] shrink-0 text-[11px] text-muted capitalize">{MEAL_SLOTS[i]}</span>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: chooser?.color ?? "#a9b1ab" }} title={chooser ? `Choisi pour ${chooser.name}` : undefined} />
                    {recipe ? (
                      <Link href={`/recettes/${recipe.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                        {recipe.name}
                      </Link>
                    ) : (
                      <span className="flex-1 text-sm text-muted">—</span>
                    )}
                    {meal && (
                      <span className={`shrink-0 rounded-full px-[7px] py-0.5 text-[11px] ${meal.storage === "congelo" ? "bg-freeze-soft text-freeze" : "bg-chip text-[#4a5a50]"}`}>
                        {meal.storage === "congelo" ? "congélo" : "frigo"}
                      </span>
                    )}
                    {meal?.id && <SwapButton planId={plan.id} mealId={meal.id} recipeName={recipe?.name ?? ""} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="section-title">En plus · petit-déj & goûter</h2>
        {extras.map((m) => {
          const recipe = byId.get(m.recipe_id);
          return (
            <div key={m.id} className="card flex min-h-12 items-center gap-2 rounded-[14px] px-3">
              <span className="shrink-0 rounded-full bg-[#f4ead8] px-2 py-0.5 text-[11px] text-[#6b4e12]">{recipe ? EXTRA_LABEL[recipe.category] : ""}</span>
              {recipe && (
                <Link href={`/recettes/${recipe.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {recipe.name}
                  {recipe.yield_label && <span className="font-normal text-muted"> · {recipe.yield_label}</span>}
                </Link>
              )}
              {m.id && <SwapButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
              {m.id && <RemoveExtraButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
            </div>
          );
        })}
        <div className="flex gap-2">
          {EXTRA_CATEGORIES.map((c) => (
            <AddExtraButton key={c} planId={plan.id} category={c} label={EXTRA_LABEL[c]} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
