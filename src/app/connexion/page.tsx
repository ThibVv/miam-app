"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions";
import { LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [stateIn, actionIn, pendingIn] = useActionState(signIn, undefined);
  const [stateUp, actionUp, pendingUp] = useActionState(signUp, undefined);
  const error = mode === "in" ? stateIn?.error : stateUp?.error;
  const pending = pendingIn || pendingUp;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="rise flex flex-col items-center gap-2 py-2 text-brand">
        <LogoMark size={76} />
        <h1 className="font-display text-[40px] leading-none font-bold tracking-[-1px] text-ink">Miam</h1>
        <span className="text-[13px] font-medium text-muted">Le batch cooking, à deux, sans y penser</span>
      </div>

      <div role="tablist" aria-label="Connexion ou inscription" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-[9px] text-sm ${mode === m ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
          >
            {m === "in" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form action={mode === "in" ? actionIn : actionUp} className="card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="label">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className="field"
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary">
          {mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
    </main>
  );
}
