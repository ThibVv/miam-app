import Link from "next/link";
import { getContext, getLatestPlan, getRecipes } from "@/lib/data";
import { DAYS, SLOTS } from "@/lib/types";
import { formatMinutes, scheduleBatch } from "@/lib/planner/schedule";
import { dayNumber, formatWeekRange } from "@/lib/week";
import { AppShell, EmptyState, MembersBadge, PageHeader } from "@/components/ui";
import { ChevronRight } from "@/components/icons";
import { SwapButton } from "./SwapButton";

export default async function WeekPage() {
  const [{ members }, plan, recipes] = await Promise.all([getContext(), getLatestPlan(), getRecipes()]);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const memberById = new Map(members.map((m) => [m.user_id, m]));

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Ma semaine" action={<MembersBadge members={members} />} />
        <EmptyState
          title="Aucune semaine planifiée"
          text={`Choisissez vos critères et Miam sélectionne ${members.length > 1 ? "5 recettes chacun" : "vos recettes"}, crée la liste de courses et le guide de préparation.`}
          href="/generer"
          cta="Générer ma semaine"
        />
      </AppShell>
    );
  }

  const planRecipes = [...new Set(plan.plan_meals.map((m) => m.recipe_id))].map((id) => byId.get(id)).filter((r) => r != null);
  const schedule = scheduleBatch(planRecipes, members.map((m) => m.user_id));
  const days = DAYS.map((label, day) => ({
    label,
    num: dayNumber(plan.week_start, day),
    meals: SLOTS.map((slot) => plan.plan_meals.find((m) => m.day === day && m.slot === slot)),
  }));

  return (
    <AppShell>
      <PageHeader kicker={`Semaine du ${formatWeekRange(plan.week_start)}`} title="Ma semaine" action={<MembersBadge members={members} />} />

      <div className="grid grid-cols-3 gap-1.5">
        {[
          [planRecipes.length, "recettes"],
          [plan.plan_meals.length * Math.max(members.length, 1), "tups"],
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
          <span className="text-xs text-[#d6eadf]">Ouvrir le guide · {members.length} cuisinier{members.length > 1 ? "s" : ""}</span>
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
                const chooser = meal?.chosen_by ? memberById.get(meal.chosen_by) : undefined;
                return (
                  <div key={i} className="flex min-h-9 items-center gap-2">
                    <span className="w-[30px] shrink-0 text-[11px] text-muted capitalize">{SLOTS[i]}</span>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: chooser?.color ?? "#a9b1ab" }} title={chooser ? `Choisi par ${chooser.display_name}` : undefined} />
                    {recipe ? (
                      <Link href={`/recettes/${recipe.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                        {recipe.name}
                      </Link>
                    ) : (
                      <span className="flex-1 text-sm text-muted">—</span>
                    )}
                    {meal && (
                      <span
                        className={`shrink-0 rounded-full px-[7px] py-0.5 text-[11px] ${
                          meal.storage === "congelo" ? "bg-freeze-soft text-freeze" : "bg-chip text-[#4a5a50]"
                        }`}
                      >
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
    </AppShell>
  );
}
