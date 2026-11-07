"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LATEST_RELEASE, SEEN_KEY, unseenReleases, type Release } from "@/lib/changelog";

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return LATEST_RELEASE; // stockage indisponible (navigation privée) : on ne dérange pas
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_RELEASE);
  } catch {
    // stockage indisponible : l'encadré reviendra, sans gravité
  }
}

const noSubscription = () => () => {};

/** À l'ouverture après une mise à jour : ce qui a changé, une seule fois par téléphone. */
export function WhatsNew() {
  // Côté serveur, rien à montrer : le stockage n'existe que dans le téléphone
  const seen = useSyncExternalStore(noSubscription, readSeen, () => LATEST_RELEASE);
  const [closed, setClosed] = useState(false);
  const releases: Release[] = closed ? [] : unseenReleases(seen);

  if (!releases.length) return null;
  const close = () => {
    markSeen();
    setClosed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fermer" onClick={close} className="absolute inset-0 animate-[fade_0.2s_ease] bg-[#17201a]/45" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quoi-de-neuf"
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-ground px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(23,32,26,0.25)] animate-[slide-up_0.28s_cubic-bezier(0.22,0.8,0.3,1)] sm:rounded-[22px]"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-brand">Mise à jour</span>
          <h2 id="quoi-de-neuf" className="font-display text-2xl font-bold tracking-[-0.5px]">
            Quoi de neuf ?
          </h2>
        </div>
        {releases.map((r) => (
          <section key={r.id} className="card flex flex-col gap-2 p-4">
            <h3 className="text-[15px] font-semibold">{r.title}</h3>
            <ul className="flex flex-col gap-2">
              {r.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-snug text-ink-2">
                  <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" onClick={close} className="btn-primary">
          C&apos;est noté
        </button>
      </div>
    </div>
  );
}

/** Un nouveau foyer n'a rien à rattraper : on note les nouveautés comme vues. */
export function MarkReleasesSeen() {
  useEffect(markSeen, []);
  return null;
}
