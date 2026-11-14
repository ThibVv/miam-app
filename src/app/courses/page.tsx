import Link from "next/link";
import { getContext, getLatestPlan, getNoelPlan, getShoppingItems } from "@/lib/data";
import { formatWeekRange } from "@/lib/week";
import { AppShell, EmptyState, PageHeader } from "@/components/ui";
import { ShoppingList } from "./ShoppingList";

export default async function ShoppingPage() {
  const [{ people, userId }, plan, noel] = await Promise.all([getContext(), getLatestPlan(), getNoelPlan()]);
  const [items, noelItems] = await Promise.all([plan ? getShoppingItems(plan.id) : [], noel?.plan_meals.length ? getShoppingItems(noel.id) : []]);

  return (
    <AppShell>
      <PageHeader kicker={plan ? `Pour la semaine du ${formatWeekRange(plan.week_start)}` : undefined} title="Courses" />
      {plan ? (
        <ShoppingList planId={plan.id} initialItems={items} people={people} userId={userId} />
      ) : (
        <EmptyState title="Pas encore de liste" text="La liste de courses est créée automatiquement quand vous générez une semaine." href="/generer" cta="Générer ma semaine" />
      )}

      {noel && noel.plan_meals.length > 0 && (
        <section id="noel" className="mt-4 flex scroll-mt-4 flex-col gap-3.5">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-[-0.5px]">
              <span aria-hidden className="text-freeze">❄ </span>
              Courses de Noël
            </h2>
            <Link href="/noel" className="text-sm font-semibold text-brand">
              Menu de Noël
            </Link>
          </div>
          <ShoppingList planId={noel.id} initialItems={noelItems} people={people} userId={userId} noel />
        </section>
      )}
    </AppShell>
  );
}
