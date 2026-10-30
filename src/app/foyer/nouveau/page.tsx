"use client";

import { useActionState } from "react";
import { createHousehold, joinHousehold } from "@/app/actions";

export default function NewHouseholdPage() {
  const [createState, create, creating] = useActionState(createHousehold, undefined);
  const [joinState, join, joining] = useActionState(joinHousehold, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Bienvenue</span>
        <h1 className="font-display text-[30px] font-bold tracking-[-0.5px]">Votre foyer</h1>
        <p className="text-sm text-muted">Le foyer regroupe vos recettes, plannings et listes de courses partagés.</p>
      </div>

      <form action={create} className="card flex flex-col gap-3 p-4">
        <h2 className="section-title">Créer un foyer</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-name" className="label">Votre prénom</label>
          <input id="c-name" name="display_name" required className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="h-name" className="label">Nom du foyer</label>
          <input id="h-name" name="name" placeholder="Notre foyer" className="field" />
        </div>
        <p className="text-xs text-muted">12 recettes de départ seront ajoutées pour tester tout de suite.</p>
        {createState?.error && <p role="alert" className="text-sm text-warn">{createState.error}</p>}
        <button type="submit" disabled={creating} className="btn-primary">Créer le foyer</button>
      </form>

      <form action={join} className="card flex flex-col gap-3 p-4">
        <h2 className="section-title">Rejoindre avec un code</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="j-name" className="label">Votre prénom</label>
          <input id="j-name" name="display_name" required className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="label">Code d&apos;invitation</label>
          <input id="code" name="code" required maxLength={6} className="field uppercase tracking-[3px]" />
        </div>
        {joinState?.error && <p role="alert" className="text-sm text-warn">{joinState.error}</p>}
        <button type="submit" disabled={joining} className="btn-secondary min-h-[52px] text-base">Rejoindre</button>
      </form>
    </main>
  );
}
