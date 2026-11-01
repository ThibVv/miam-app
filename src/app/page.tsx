import Link from "next/link";
import { getContext, getLatestPlan, getPlanRecipes } from "@/lib/data";
import { DAYS, EXTRA_CATEGORIES, MEAL_SLOTS } from "@/lib/types";
import { stationCapacities } from "@/lib/equipment";
import { formatMinutes, scheduleBatch } from "@/lib/planner/schedule";
import { weekBalance } from "@/lib/nutrition/analyze";
import { dayNumber, formatWeekRange } from "@/lib/week";
import { AppShell, EmptyState, PageHeader, PeopleBadge } from "@/components/ui";
import { WeekBalanceCard } from "@/components/NutritionCard";
import { RecipePhoto } from "@/components/RecipePhoto";
import { ChevronRight } from "@/components/icons";
import { SwapButton } from "./SwapButton";
import { AddExtraButton, RemoveExtraButton } from "./ExtraButtons";
import { AddMealButton, ChooseExtraButton, ChooseMealButton } from "./MealActions";

const EXTRA_LABEL: Record<string, string> = { "petit-dej": "Petit-déj", gouter: "Goûter" };

export default async function WeekPage() {
  const [{ people, household }, plan] = await Promise.all([getContext(), getLatestPlan()]);
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

  // Seules les recettes du planning, pas toute la bibliothèque
  const planRecipes = await getPlanRecipes([...new Set(plan.plan_meals.map((m) => m.recipe_id))]);
  const byId = new Map(planRecipes.map((r) => [r.id, r]));
  const meals = plan.plan_meals.filter((m) => m.slot !== "extra");
  const extras = plan.plan_meals.filter((m) => m.slot === "extra");
  const schedule = scheduleBatch(planRecipes, people.map((p) => p.id), stationCapacities(household.equipment, household.burners));
  const days = DAYS.map((label, day) => ({
    label,
    day,
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

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Au menu</h2>
        <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
          {planRecipes.map((r, i) => (
            <Link
              key={r.id}
              href={`/recettes/${r.id}`}
              style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
              className="card rise w-[118px] shrink-0 overflow-hidden transition-transform active:scale-[0.98] hover:ring-2 hover:ring-brand-soft"
            >
              <RecipePhoto name={r.name} url={r.image_url} index={i} className="h-[78px] w-full" glyph={22} sizes="120px" />
              <span className="block p-2 text-xs leading-tight font-medium">
                <span className="line-clamp-2">{r.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

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
                      <span className="flex flex-1 items-center">
                        <AddMealButton planId={plan.id} day={d.day} slot={MEAL_SLOTS[i]} />
                      </span>
                    )}
                    {meal && (
                      <span className={`shrink-0 rounded-full px-[7px] py-0.5 text-[11px] ${meal.storage === "congelo" ? "bg-freeze-soft text-freeze" : "bg-chip text-[#4a5a50]"}`}>
                        {meal.storage === "congelo" ? "congélo" : "frigo"}
                      </span>
                    )}
                    {meal?.id && <ChooseMealButton planId={plan.id} mealId={meal.id} day={d.day} slot={MEAL_SLOTS[i]} />}
                    {meal?.id && <SwapButton planId={plan.id} mealId={meal.id} recipeName={recipe?.name ?? ""} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <WeekBalanceCard balance={weekBalance(planRecipes)} mealCount={meals.length} />

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
              {m.id && <ChooseMealButton planId={plan.id} mealId={m.id} day={0} slot="extra" />}
              {m.id && <SwapButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
              {m.id && <RemoveExtraButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
            </div>
          );
        })}
        <div className="flex gap-2">
          {EXTRA_CATEGORIES.map((c) => (
            <AddExtraButton key={c} planId={plan.id} category={c} label={EXTRA_LABEL[c]} />
          ))}
          <ChooseExtraButton planId={plan.id} />
        </div>
      </section>
    </AppShell>
  );
}
