"use client";

import Link from "next/link";
import { useTransition } from "react";
import { addNoelRecipe, removeNoelRecipe, setNoelDate, setNoelGuests, setNoelPortions } from "@/app/actions";
import { formatScale } from "@/lib/planner/shopping";
import { RecipePhoto } from "@/components/RecipePhoto";
import { ChevronRight, PlusIcon, TrashIcon } from "@/components/icons";

export interface NoelRecipe {
  id: string;
  name: string;
  servings: number;
  yield_label: string | null;
  image_url: string | null;
}

/** « 40 pièces » → « pièces » ; un plat se compte en parts. */
function unitOf(recipe: NoelRecipe) {
  return recipe.yield_label?.replace(/^\d+\s*/, "") || "parts";
}

/** Une fournée de biscuits se double par moitiés, un plat se règle part par part. */
function stepOf(recipe: NoelRecipe) {
  return recipe.yield_label ? Math.max(1, Math.round(recipe.servings / 2)) : 1;
}

function Stepper({ label, value, onChange, step = 1, min = 1, disabled }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; disabled?: boolean }) {
  return (
    <span className="flex shrink-0 items-center rounded-xl border border-line bg-surface">
      <button type="button" aria-label={`Moins de ${label}`} disabled={disabled || value - step < min} onClick={() => onChange(value - step)} className="size-10 text-lg text-brand disabled:opacity-40">
        −
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-sm font-bold">
        {value}
      </span>
      <button type="button" aria-label={`Plus de ${label}`} disabled={disabled} onClick={() => onChange(value + step)} className="size-10 text-lg text-brand disabled:opacity-40">
        +
      </button>
    </span>
  );
}

/** L'espace Noël : le menu (fournées de bredele, plats pour les invités), ses courses et sa préparation. */
export function NoelPlanner({
  planId,
  date,
  guests,
  chosen,
  available,
}: {
  planId: string | null;
  date: string | null;
  guests: number;
  chosen: { mealId: string; portions: number; recipe: NoelRecipe }[];
  available: NoelRecipe[];
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => void (await fn()));

  return (
    <>
      <header className="relative -mx-5 -mt-6 overflow-hidden bg-[#7a1f2b] px-5 pt-7 pb-6 text-white">
        <span aria-hidden className="pointer-events-none absolute -top-2 right-4 text-[64px] leading-none text-white/15">
          ❄
        </span>
        <span aria-hidden className="pointer-events-none absolute right-24 bottom-1 text-[28px] leading-none text-white/15">
          ❄
        </span>
        <span className="text-[13px] font-medium text-white/80">Bredele, plats de fête et leurs courses</span>
        <h1 className="font-display text-[34px] leading-tight font-bold tracking-[-0.5px]">Noël</h1>
      </header>

      {planId && (
        <section className="card flex flex-col gap-3 p-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Le repas</span>
            <input type="date" defaultValue={date ?? undefined} onChange={(e) => e.target.value && run(() => setNoelDate(planId, e.target.value))} className="field w-auto" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Invités</span>
              <span className="text-xs text-muted">Les plats suivent ; les fournées de biscuits non</span>
            </span>
            <Stepper label="invités" value={guests} onChange={(v) => run(() => setNoelGuests(planId, v))} disabled={pending} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Au menu{chosen.length ? ` · ${chosen.length}` : ""}</h2>
        {!chosen.length && <p className="rounded-[14px] bg-chip px-4 py-3 text-sm text-ink-2">Ajoutez ci-dessous les recettes de Noël à préparer : les courses et la préparation se font toutes seules.</p>}
        {chosen.map(({ mealId, portions, recipe }, i) => (
          <div key={mealId} className="card flex items-center gap-3 rounded-[14px] p-2.5">
            <RecipePhoto name={recipe.name} url={recipe.image_url} index={i} className="size-12 shrink-0 rounded-[10px]" glyph={18} sizes="48px" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={`/recettes/${recipe.id}`} className="truncate text-sm font-semibold hover:underline">
                {recipe.name}
              </Link>
              <span className="text-xs text-muted">
                {portions} {unitOf(recipe)} · <strong className="font-semibold text-ink">recette {formatScale(portions / recipe.servings)}</strong>
              </span>
            </div>
            {planId && <Stepper label={unitOf(recipe)} value={portions} step={stepOf(recipe)} min={stepOf(recipe)} onChange={(v) => run(() => setNoelPortions(planId, mealId, v))} disabled={pending} />}
            {planId && (
              <button type="button" onClick={() => run(() => removeNoelRecipe(planId, mealId))} disabled={pending} aria-label={`Retirer ${recipe.name} du menu`} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip">
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        ))}
      </section>

      {chosen.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/courses#noel" className="card flex min-h-14 items-center justify-between gap-2 rounded-[14px] px-3.5 text-sm font-semibold">
            <span>
              <span aria-hidden className="text-freeze">❄ </span>Courses
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link href="/prep?quoi=noel" className="card flex min-h-14 items-center justify-between gap-2 rounded-[14px] px-3.5 text-sm font-semibold">
            Préparation
            <ChevronRight size={18} />
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Recettes de Noël</h2>
        {!available.length && !chosen.length && (
          <p className="text-sm text-muted">
            Aucune recette de Noël pour l&apos;instant.{" "}
            <Link href="/recettes/nouvelle" className="font-semibold text-brand underline">
              Ajoutez-en une
            </Link>{" "}
            avec la catégorie « Noël ».
          </p>
        )}
        {!available.length && chosen.length > 0 && <p className="text-sm text-muted">Toutes vos recettes de Noël sont au menu.</p>}
        {available.map((recipe, i) => (
          <div key={recipe.id} className="card flex items-center gap-3 rounded-[14px] p-2.5">
            <RecipePhoto name={recipe.name} url={recipe.image_url} index={i + chosen.length} className="size-12 shrink-0 rounded-[10px]" glyph={18} sizes="48px" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link href={`/recettes/${recipe.id}`} className="truncate text-sm font-semibold hover:underline">
                {recipe.name}
              </Link>
              <span className="text-xs text-muted">{recipe.yield_label ? `Pour ${recipe.yield_label}` : `Pour ${recipe.servings} personnes`}</span>
            </div>
            <button
              type="button"
              onClick={() => run(() => addNoelRecipe(recipe.id))}
              disabled={pending}
              aria-label={`Ajouter ${recipe.name} au menu de Noël`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#7a1f2b] text-white active:scale-95 disabled:opacity-60"
            >
              <PlusIcon size={20} />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
