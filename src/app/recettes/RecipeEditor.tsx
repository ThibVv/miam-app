"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importRecipe, saveRecipe } from "@/app/actions";
import { AISLES, STATIONS, type Ingredient, type RecipeDraft, type Station, type Step } from "@/lib/types";
import { UNIT_CHOICES } from "@/lib/units";
import { guessAisle } from "@/lib/import/parse-recipe";
import { ChevronLeft, LinkIcon, TrashIcon } from "@/components/icons";

const EMPTY: RecipeDraft = {
  name: "",
  servings: 4,
  prep_minutes: 15,
  cook_minutes: 20,
  fridge_days: 3,
  freezable: false,
  tags: [],
  source_url: null,
  notes: null,
  recipe_ingredients: [{ position: 0, name: "", quantity: null, unit: "", aisle: "Autre" }],
  recipe_steps: [{ position: 0, text: "", station: "plan", duration_minutes: 5, hands_busy: true }],
};

export function RecipeEditor({ initial, id }: { initial?: RecipeDraft; id?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<RecipeDraft>(initial ?? EMPTY);
  const [tagInput, setTagInput] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setIngredient = (i: number, patch: Partial<Ingredient>) =>
    set("recipe_ingredients", draft.recipe_ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setStep = (i: number, patch: Partial<Step>) =>
    set("recipe_steps", draft.recipe_steps.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
    setTagInput("");
  }

  function runImport() {
    setMessage(null);
    startTransition(async () => {
      const res = await importRecipe(importUrl);
      if (res.error || !res.draft) return setMessage(res.error ?? "Import impossible.");
      setDraft(res.draft);
      setShowImport(false);
      setMessage("Recette importée : vérifiez les étapes (poste, durée, mains occupées) avant d'enregistrer.");
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveRecipe(draft, id);
      if (res.error || !res.id) return setMessage(res.error ?? "Enregistrement impossible.");
      router.push(`/recettes/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex items-center justify-between px-3 pt-3.5 pb-1.5">
        <Link href={id ? `/recettes/${id}` : "/recettes"} aria-label="Retour" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft />
        </Link>
        <span className="text-[15px] font-semibold">{id ? "Modifier la recette" : "Nouvelle recette"}</span>
        <button onClick={() => setShowImport((v) => !v)} className="min-h-11 px-2.5 text-[13px] font-semibold text-brand">
          Importer
        </button>
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-1.5 pb-32">
        {showImport && (
          <section className="card flex flex-col gap-2 p-4">
            <label htmlFor="import-url" className="label">Lien d&apos;une recette (Marmiton, blog…)</label>
            <div className="flex gap-2">
              <input
                id="import-url"
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://…"
                className="field"
              />
              <button onClick={runImport} disabled={pending || !importUrl} className="btn-secondary shrink-0">
                <LinkIcon size={18} />
                Lire
              </button>
            </div>
          </section>
        )}

        {message && <p role="status" className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-dark">{message}</p>}

        <section className="card flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="label">Nom du plat</label>
            <input id="name" value={draft.name} onChange={(e) => set("name", e.target.value)} className="field" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberField id="servings" label="Portions" value={draft.servings} min={1} onChange={(v) => set("servings", v)} />
            <NumberField id="prep" label="Prépa (min)" value={draft.prep_minutes} onChange={(v) => set("prep_minutes", v)} />
            <NumberField id="cook" label="Cuisson (min)" value={draft.cook_minutes} onChange={(v) => set("cook_minutes", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fridge" className="label">Tient au frigo</label>
              <select id="fridge" value={draft.fridge_days} onChange={(e) => set("fridge_days", Number(e.target.value))} className="field">
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{d} jour{d > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <label className="flex min-h-11 items-center justify-between gap-2 self-end rounded-[10px] border border-line px-3 text-sm font-medium">
              Congélable
              <input type="checkbox" checked={draft.freezable} onChange={(e) => set("freezable", e.target.checked)} className="size-5" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {draft.tags.map((t) => (
              <button
                key={t}
                onClick={() => set("tags", draft.tags.filter((x) => x !== t))}
                aria-label={`Retirer le tag ${t}`}
                className="rounded-full bg-brand-soft px-2.5 py-1.5 text-[13px] text-brand-dark"
              >
                {t} ×
              </button>
            ))}
            <label className="sr-only" htmlFor="tag">Ajouter un tag</label>
            <input
              id="tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="+ tag (végé, épicé…)"
              className="min-h-8 w-40 rounded-full border border-dashed border-[#a9b1ab] px-2.5 text-[13px] outline-none"
            />
          </div>
        </section>

        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title mb-1">Ingrédients · pour {draft.servings}</h2>
          {draft.recipe_ingredients.map((ing, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-b border-line-soft pb-2.5">
              <div className="flex gap-1.5">
                <label className="sr-only" htmlFor={`q-${i}`}>Quantité</label>
                <input
                  id={`q-${i}`}
                  inputMode="decimal"
                  value={ing.quantity ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    setIngredient(i, { quantity: v === "" ? null : Number(v) || 0 });
                  }}
                  placeholder="Qté"
                  className="field w-16 px-2"
                />
                <label className="sr-only" htmlFor={`u-${i}`}>Unité</label>
                <select id={`u-${i}`} value={ing.unit} onChange={(e) => setIngredient(i, { unit: e.target.value })} className="field w-24 px-1.5">
                  {UNIT_CHOICES.map((u) => (
                    <option key={u} value={u}>{u || "pièce"}</option>
                  ))}
                  {!UNIT_CHOICES.includes(ing.unit) && <option value={ing.unit}>{ing.unit}</option>}
                </select>
                <label className="sr-only" htmlFor={`n-${i}`}>Ingrédient</label>
                <input
                  id={`n-${i}`}
                  value={ing.name}
                  onChange={(e) => setIngredient(i, { name: e.target.value })}
                  onBlur={(e) => ing.aisle === "Autre" && setIngredient(i, { aisle: guessAisle(e.target.value) })}
                  placeholder="Ingrédient"
                  className="field min-w-0 flex-1"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={`a-${i}`}>Rayon</label>
                <select id={`a-${i}`} value={ing.aisle} onChange={(e) => setIngredient(i, { aisle: e.target.value })} className="field min-h-9 flex-1 text-[13px] text-muted">
                  {AISLES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <button
                  onClick={() => set("recipe_ingredients", draft.recipe_ingredients.filter((_, j) => j !== i))}
                  aria-label="Supprimer l'ingrédient"
                  className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              set("recipe_ingredients", [...draft.recipe_ingredients, { position: draft.recipe_ingredients.length, name: "", quantity: null, unit: "", aisle: "Autre" }])
            }
            className="btn-dashed mt-1"
          >
            + Ajouter un ingrédient
          </button>
        </section>

        <section className="card flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="section-title">Étapes</h2>
            <p className="text-xs text-muted">Le poste, la durée et « mains libres » servent à optimiser le guide de batch cooking.</p>
          </div>
          {draft.recipe_steps.map((s, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="sr-only" htmlFor={`s-${i}`}>Étape {i + 1}</label>
                <textarea
                  id={`s-${i}`}
                  rows={2}
                  value={s.text}
                  onChange={(e) => setStep(i, { text: e.target.value })}
                  className="field py-2 leading-snug"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="sr-only" htmlFor={`st-${i}`}>Poste</label>
                  <select id={`st-${i}`} value={s.station} onChange={(e) => setStep(i, { station: e.target.value as Station })} className="field min-h-9 w-auto text-[13px]">
                    {STATIONS.map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[13px] text-muted">
                    <input
                      type="number"
                      min={1}
                      value={s.duration_minutes}
                      onChange={(e) => setStep(i, { duration_minutes: Number(e.target.value) || 1 })}
                      className="field min-h-9 w-16 px-2 text-[13px]"
                    />
                    min
                  </label>
                  <button
                    onClick={() => setStep(i, { hands_busy: !s.hands_busy })}
                    aria-pressed={!s.hands_busy}
                    className={`min-h-9 rounded-full px-3 text-xs font-medium ${s.hands_busy ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"}`}
                  >
                    {s.hands_busy ? "Mains occupées" : "Mains libres"}
                  </button>
                  <button
                    onClick={() => set("recipe_steps", draft.recipe_steps.filter((_, j) => j !== i))}
                    aria-label="Supprimer l'étape"
                    className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              set("recipe_steps", [...draft.recipe_steps, { position: draft.recipe_steps.length, text: "", station: "plan", duration_minutes: 5, hands_busy: true }])
            }
            className="btn-dashed"
          >
            + Ajouter une étape
          </button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ground px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <button onClick={save} disabled={pending} className="btn-primary w-full">
            {pending ? "Enregistrement…" : "Enregistrer la recette"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({ id, label, value, onChange, min = 0 }: { id: string; label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} className="field px-2.5" />
    </div>
  );
}
