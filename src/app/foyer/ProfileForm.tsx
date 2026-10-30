"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions";

const COLORS = ["#2F5BD3", "#B8461B", "#1F6B4A", "#7A4FB5", "#A3366B"];

export function ProfileForm({ displayName, color }: { displayName: string; color: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="card flex flex-col gap-3 p-4">
      <h2 className="section-title">Mon profil</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="label">Prénom</label>
        <input id="display_name" name="display_name" defaultValue={displayName} required className="field" />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">Couleur</legend>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <label key={c} className="relative flex size-11 cursor-pointer items-center justify-center">
              <input type="radio" name="color" value={c} defaultChecked={c.toLowerCase() === color.toLowerCase()} className="peer sr-only" />
              <span className="size-8 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand" style={{ background: c }} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-warn">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-secondary">Enregistrer</button>
    </form>
  );
}
