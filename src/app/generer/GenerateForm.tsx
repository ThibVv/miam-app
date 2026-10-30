"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateWeek } from "@/app/actions";
import type { Category, Criteria, PantryItem, Person, PersonCriteria } from "@/lib/types";
import { Avatar, PageHeader } from "@/components/ui";
import { DiceIcon } from "@/components/icons";
import { PantryEditor } from "@/components/PantryEditor";
import { formatWeekRange } from "@/lib/week";

const TIMES: { label: string; value: number | null }[] = [
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
  { label: "Peu importe", value: null },
];

const BALANCE_TAGS = ["végé", "poisson"];
const EXTRA_LABELS: Record<string, string> = { "petit-dej": "Petit-déj", gouter: "Goûter" };

function Stepper({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  name,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** Ce qu'on compte, pour les lecteurs d'écran (ex. « recettes pour Thibault ») */
  name: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Moins de ${name}`} className="size-11 rounded-xl border border-line bg-surface text-lg disabled:opacity-40">−</button>
      <span aria-live="polite" className="min-w-[44px] text-center text-sm font-semibold">{value} {label}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Plus de ${name}`} className="size-11 rounded-xl border border-line bg-surface text-lg disabled:opacity-40">+</button>
    </span>
  );
}

export function GenerateForm({
  people,
  tags,
  initial,
  weekStart: defaultWeek,
  recipeCount,
  extrasAvailable,
  pantry,
}: {
  people: Person[];
  tags: string[];
  initial: Criteria;
  weekStart: string;
  recipeCount: number;
  extrasAvailable: Partial<Record<Category, number>>;
  pantry: PantryItem[];
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criteria>(initial);
  const [weekStart, setWeekStart] = useState(defaultWeek);
  const [exclude, setExclude] = useState("");
  const [result, setResult] = useState<{ warnings: string[]; error?: string } | null>(null);
  const [pending, start] = useTransition();

  const total = criteria.people.reduce((n, p) => n + p.count, 0);
  const extrasTotal = Object.values(criteria.extras).reduce((n, v) => n + (v ?? 0), 0);
  const balanceTags = BALANCE_TAGS.filter((t) => tags.includes(t));
  const setPerson = (personId: string, patch: Partial<PersonCriteria>) =>
    setCriteria((c) => ({ ...c, people: c.people.map((p) => (p.personId === personId ? { ...p, ...patch } : p)) }));

  function addExclusion() {
    const v = exclude.trim().toLowerCase();
    if (v && !criteria.excludeIngredients.includes(v)) setCriteria((c) => ({ ...c, excludeIngredients: [...c.excludeIngredients, v] }));
    setExclude("");
  }

  function submit() {
    setResult(null);
    start(async () => {
      const res = await generateWeek(criteria, weekStart);
      if (!res.error && !res.warnings.length) {
        router.push("/");
        return;
      }
      setResult(res);
    });
  }

  return (
    <>
      <PageHeader kicker={`Semaine du ${formatWeekRange(weekStart)}`} title="Nouvelle semaine" />

      <section className="card flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Fonds de placard</h2>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            En tenir compte
            <input
              type="checkbox"
              checked={criteria.usePantry}
              onChange={(e) => setCriteria((c) => ({ ...c, usePantry: e.target.checked }))}
              className="size-5"
            />
          </label>
        </div>
        <PantryEditor items={pantry} compact />
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="section-title">Qui choisit quoi</h2>
        {people.map((person) => {
          const pc = criteria.people.find((p) => p.personId === person.id)!;
          return (
            <div key={person.id} className="flex flex-col gap-2 border-b border-line-soft pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[15px] font-medium">
                  <Avatar person={person} />
                  {person.name}
                </span>
                <Stepper value={pc.count} onChange={(v) => setPerson(person.id, { count: v })} label="plats" name={`plats pour ${person.name}`} />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Envies de ${person.name}`}>
                  {tags.map((t) => {
                    const on = pc.tags.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        aria-pressed={on}
                        onClick={() => setPerson(person.id, { tags: on ? pc.tags.filter((x) => x !== t) : [...pc.tags, t] })}
                        className={`min-h-8 rounded-full border px-2.5 text-xs font-medium ${
                          on ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <span className="text-xs text-muted">
          {total} plats × {people.length} portion{people.length > 1 ? "s" : ""} = {total * people.length} tups · {recipeCount} plats dans la bibliothèque
        </span>
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="section-title">En plus des repas</h2>
        {(["petit-dej", "gouter"] as const).map((cat) => (
          <div key={cat} className="flex items-center justify-between gap-2">
            <span className="flex flex-col">
              <span className="text-sm font-medium">{EXTRA_LABELS[cat]}</span>
              <span className="text-xs text-muted">{extrasAvailable[cat] ?? 0} recettes disponibles</span>
            </span>
            <Stepper
              value={criteria.extras[cat] ?? 0}
              onChange={(v) => setCriteria((c) => ({ ...c, extras: { ...c.extras, [cat]: v } }))}
              max={Math.min(3, extrasAvailable[cat] ?? 0)}
              label=""
              name={`recettes ${EXTRA_LABELS[cat]}`}
            />
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="section-title">Temps de cuisine max</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {TIMES.map((t) => {
            const on = criteria.maxMinutes === t.value;
            return (
              <button
                type="button"
                key={t.label}
                aria-pressed={on}
                onClick={() => setCriteria((c) => ({ ...c, maxMinutes: t.value }))}
                className={`min-h-11 rounded-xl border font-semibold ${t.value ? "text-sm" : "text-xs"} ${on ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {balanceTags.map((tag) => (
          <div key={tag} className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Au moins, en « {tag} »</span>
            <Stepper
              value={criteria.minTags[tag] ?? 0}
              onChange={(v) => setCriteria((c) => ({ ...c, minTags: { ...c.minTags, [tag]: v } }))}
              label=""
              name={`recettes « ${tag} » au minimum`}
            />
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="section-title">Exclure cette semaine</h2>
        <p className="text-xs text-muted">Les « n&apos;aime pas » de chacun sont déjà exclus (page Foyer).</p>
        <div className="flex flex-wrap gap-1.5">
          {criteria.excludeIngredients.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setCriteria((c) => ({ ...c, excludeIngredients: c.excludeIngredients.filter((x) => x !== e) }))}
              aria-label={`Ne plus exclure ${e}`}
              className="rounded-full bg-warn-soft px-2.5 py-1.5 text-[13px] text-warn"
            >
              {e} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor="exclude" className="sr-only">Ingrédient à exclure</label>
          <input
            id="exclude"
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExclusion()}
            placeholder="champignons, porc…"
            className="field"
          />
          <button type="button" onClick={addExclusion} className="btn-secondary shrink-0">Ajouter</button>
        </div>
      </section>

      <section className="card flex flex-col px-4 py-1.5">
        <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Éviter les répétitions</span>
            <span className="text-xs text-muted">Rien de planifié ces 3 dernières semaines</span>
          </span>
          <input
            type="checkbox"
            checked={criteria.avoidRecentWeeks > 0}
            onChange={(e) => setCriteria((c) => ({ ...c, avoidRecentWeeks: e.target.checked ? 3 : 0 }))}
            className="size-[22px]"
          />
        </label>
        <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Mutualiser les ingrédients</span>
            <span className="text-xs text-muted">Moins de restes, liste plus courte</span>
          </span>
          <input
            type="checkbox"
            checked={criteria.shareIngredients}
            onChange={(e) => setCriteria((c) => ({ ...c, shareIngredients: e.target.checked }))}
            className="size-[22px]"
          />
        </label>
        <label className="flex min-h-[52px] items-center justify-between gap-3">
          <span className="text-sm font-medium">Semaine commençant le</span>
          <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(e.target.value)} className="field w-auto" />
        </label>
      </section>

      {result && (
        <div role="status" className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 text-sm ${result.error ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"}`}>
          {result.error && <p>{result.error}</p>}
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {!result.error && (
            <Link href="/" className="font-semibold underline">
              Voir la semaine générée
            </Link>
          )}
        </div>
      )}

      <button type="button" onClick={submit} disabled={pending || total === 0} className="btn-primary">
        <DiceIcon size={20} />
        {pending ? "Génération…" : `Générer ma semaine${extrasTotal ? ` (+${extrasTotal} extra${extrasTotal > 1 ? "s" : ""})` : ""}`}
      </button>
    </>
  );
}
