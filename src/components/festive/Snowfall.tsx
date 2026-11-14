"use client";

import { useEffect, useState } from "react";
import { useFestive } from "@/lib/festive";

/** Flocons fixes d'un rendu à l'autre : pas de hasard, donc rien qui diffère entre serveur et téléphone. */
const FLAKES = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((i * n * 9301 + 49297) % 233280) / 233280;
  return {
    left: r(7) * 100,
    size: 7 + r(11) * 13,
    duration: 6 + r(13) * 6,
    delay: -r(17) * 10,
    drift: (r(19) - 0.5) * 70,
    glyph: i % 3 === 0 ? "❄" : "●",
    opacity: 0.55 + r(23) * 0.45,
  };
});

/** Une neige qui tombe, par-dessus la page sans gêner les doigts. */
export function Snowfall({ className = "fixed inset-0 z-[45]" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="absolute -top-6 animate-[snow-fall_linear_infinite] text-[#9fbbe0] [text-shadow:0_0_3px_rgba(255,255,255,0.9)]"
          style={
            {
              left: `${f.left}%`,
              fontSize: f.glyph === "❄" ? f.size : f.size * 0.45,
              opacity: f.opacity,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              "--drift": `${f.drift}px`,
            } as React.CSSProperties
          }
        >
          {f.glyph}
        </span>
      ))}
    </div>
  );
}

const SESSION_KEY = "neige-ouverture";

/** À l'ouverture de l'app : quelques secondes de neige, une fois par ouverture. */
export function SnowOnOpen() {
  const festive = useFestive();
  const [falling, setFalling] = useState(false);

  useEffect(() => {
    if (!festive) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      seen = false;
    }
    if (seen) return;
    // Lancé après l'affichage : la neige n'existe que dans le téléphone
    const start = setTimeout(() => setFalling(true), 0);
    const stop = setTimeout(() => setFalling(false), 9000);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [festive]);

  return falling ? <Snowfall className="fixed inset-0 z-[45] animate-[snow-fade_9s_ease-in_forwards]" /> : null;
}
