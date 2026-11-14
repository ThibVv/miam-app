"use client";

import { useSyncExternalStore } from "react";

/** Réglage par téléphone : « off » coupe les décorations de Noël. */
const PREF_KEY = "decorations-noel";
const CHANGE_EVENT = "decorations-noel-change";

/** De novembre à l'Épiphanie : le temps des bredele et des marchés de Noël. */
export function inChristmasSeason(d = new Date()) {
  const month = d.getMonth();
  return month === 10 || month === 11 || (month === 0 && d.getDate() <= 6);
}

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Décorations affichées ? Côté serveur, jamais : elles apparaissent une fois l'app chargée. */
export function useFestive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => inChristmasSeason() && readPref(),
    () => false,
  );
}

/** Le réglage lui-même, pour l'interrupteur de la page Foyer. */
export function useFestivePref(): boolean {
  return useSyncExternalStore(subscribe, readPref, () => true);
}

export function setFestivePref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // stockage indisponible : le réglage ne tiendra que le temps de la page
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
