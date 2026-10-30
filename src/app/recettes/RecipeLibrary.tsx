"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Member, Recipe } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { SearchIcon } from "@/components/icons";
import { formatMinutes } from "@/lib/planner/schedule";

const TINTS = ["#E7DCC8", "#D9E6DA", "#F1D9CC", "#DCE3F2", "#E9E2C9", "#E2D9E8"];

type Filter = { kind: "all" } | { kind: "author"; id: string } | { kind: "tag"; tag: string } | { kind: "freezable" };

export function RecipeLibrary({ recipes, members, userId }: { recipes: Recipe[]; members: Member[]; userId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const byId = new Map(members.map((m) => [m.user_id, m]));

  const filters: { label: string; value: Filter }[] = [
    { label: "Toutes", value: { kind: "all" } },
    ...members.map((m) => ({
      label: m.user_id === userId ? "Les miennes" : `De ${m.display_name}`,
      value: { kind: "author", id: m.user_id } as Filter,
    })),
    { label: "Végé", value: { kind: "tag", tag: "végé" } },
    { label: "Congélable", value: { kind: "freezable" } },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (filter.kind === "author" && r.author_id !== filter.id) return false;
      if (filter.kind === "tag" && !r.tags.includes(filter.tag)) return false;
      if (filter.kind === "freezable" && !r.freezable) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)) ||
        r.recipe_ingredients.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [recipes, filter, query]);

  return (
    <>
      <label className="flex min-h-[46px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 focus-within:border-brand">
        <SearchIcon size={18} />
        <span className="sr-only">Rechercher une recette</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Plat, ingrédient, tag…"
          className="flex-1 bg-transparent text-[15px] outline-none"
        />
      </label>

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {filters.map((f) => {
          const active = JSON.stringify(f.value) === JSON.stringify(filter);
          return (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-[13px] ${
                active ? "border-brand bg-brand font-semibold text-white" : "border-line bg-surface font-medium text-ink-2"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && <p className="py-8 text-center text-sm text-muted">Aucune recette ne correspond.</p>}

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((r, i) => {
          const total = r.prep_minutes + r.cook_minutes;
          return (
            <Link key={r.id} href={`/recettes/${r.id}`} className="card flex flex-col overflow-hidden hover:ring-2 hover:ring-brand-soft">
              <div className="flex h-24 items-end justify-between p-2" style={{ background: TINTS[i % TINTS.length] }}>
                <span className="flex flex-wrap gap-1">
                  {r.tags.slice(0, 2).map((t) => (
                    <span key={t} className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-ink-2">{t}</span>
                  ))}
                </span>
                <Avatar member={r.author_id ? byId.get(r.author_id) : undefined} size={24} />
              </div>
              <div className="flex flex-col gap-1 p-2.5 pb-3">
                <h3 className="text-sm leading-tight font-semibold">{r.name}</h3>
                <span className="text-xs text-muted">
                  {total ? formatMinutes(total) : "—"} · {r.servings} parts · {r.freezable ? "congélo" : `frigo ${r.fridge_days} j`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
