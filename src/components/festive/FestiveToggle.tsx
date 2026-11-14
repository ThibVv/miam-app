"use client";

import { inChristmasSeason, setFestivePref, useFestivePref } from "@/lib/festive";

/** Page Foyer : couper (ou remettre) les décorations de Noël sur ce téléphone. */
export function FestiveToggle() {
  const on = useFestivePref();
  if (!inChristmasSeason()) return null;
  return (
    <label className="card flex min-h-14 items-center justify-between gap-3 px-4 py-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          <span aria-hidden className="text-freeze">❄ </span>Décorations de Noël
        </span>
        <span className="text-xs text-muted">Neige, guirlande et boules, sur ce téléphone</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => setFestivePref(e.target.checked)} className="size-[22px]" />
    </label>
  );
}
