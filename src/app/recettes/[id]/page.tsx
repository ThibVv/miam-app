import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext, getRecipe } from "@/lib/data";
import { deleteRecipe } from "@/app/actions";
import { STATIONS } from "@/lib/types";
import { formatQuantity } from "@/lib/units";
import { formatMinutes } from "@/lib/planner/schedule";
import { AppShell, Avatar } from "@/components/ui";
import { ChevronLeft, TrashIcon } from "@/components/icons";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function RecipePage({ params }: PageProps<"/recettes/[id]">) {
  const { id } = await params;
  const [{ members }, recipe] = await Promise.all([getContext(), getRecipe(id)]);
  if (!recipe) notFound();
  const author = members.find((m) => m.user_id === recipe.author_id);
  const stationLabel = Object.fromEntries(STATIONS.map((s) => [s.value, s.label]));

  return (
    <AppShell>
      <div className="-mx-2 -mt-3 flex items-center justify-between">
        <Link href="/recettes" aria-label="Retour aux recettes" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft />
        </Link>
        <Link href={`/recettes/${id}/modifier`} className="btn-secondary">Modifier</Link>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.5px]">{recipe.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {author && (
            <span className="flex items-center gap-1.5">
              <Avatar member={author} size={22} />
              {author.display_name}
            </span>
          )}
          <span>· {recipe.servings} parts · {formatMinutes(recipe.prep_minutes + recipe.cook_minutes)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-chip px-2.5 py-1 text-xs text-ink-2">Frigo {recipe.fridge_days} j</span>
          {recipe.freezable && <span className="rounded-full bg-freeze-soft px-2.5 py-1 text-xs text-freeze">Congélable</span>}
          {recipe.tags.map((t) => (
            <span key={t} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand-dark">{t}</span>
          ))}
        </div>
      </header>

      <section className="card flex flex-col p-4">
        <h2 className="section-title mb-2">Ingrédients · pour {recipe.servings}</h2>
        {recipe.recipe_ingredients.map((i) => (
          <div key={i.id} className="flex min-h-10 items-center gap-2.5 border-b border-line-soft last:border-0">
            <span className="w-24 shrink-0 text-sm font-semibold text-ink-2">{formatQuantity(i.quantity, i.unit)}</span>
            <span className="flex-1 text-[15px]">{i.name}</span>
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="section-title">Étapes</h2>
        {recipe.recipe_steps.map((s, idx) => (
          <div key={s.id} className="flex gap-2.5">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{idx + 1}</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-snug">{s.text}</p>
              <span className="flex flex-wrap gap-1.5">
                <span className="chip">{stationLabel[s.station]}</span>
                <span className="chip">{s.duration_minutes} min</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.hands_busy ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"}`}>
                  {s.hands_busy ? "Mains occupées" : "Mains libres"}
                </span>
              </span>
            </div>
          </div>
        ))}
      </section>

      {recipe.source_url && (
        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          Recette d&apos;origine
        </a>
      )}

      <form action={deleteRecipe.bind(null, id)}>
        <ConfirmSubmit message="Supprimer définitivement cette recette ?" className="btn-secondary w-full text-warn">
          <TrashIcon size={18} />
          Supprimer la recette
        </ConfirmSubmit>
      </form>
    </AppShell>
  );
}
