"use client";

import { useFestive } from "@/lib/festive";

const LIGHTS = ["#e8473b", "#f2c14e", "#4fa3e0", "#e8473b", "#7ccf6b", "#f2c14e", "#e86fb0", "#4fa3e0", "#e8473b", "#f2c14e", "#7ccf6b", "#e86fb0"];

/** Une boule de Noël : un reflet, une attache dorée, et elle se balance au bout de son fil. */
function Bauble({ left, length, color, size, delay }: { left: string; length: number; color: string; size: number; delay: number }) {
  return (
    <span
      className="absolute top-2 flex origin-top animate-[bauble-swing_3.4s_ease-in-out_infinite_alternate] flex-col items-center"
      style={{ left, animationDelay: `${delay}s` }}
    >
      <span className="w-px bg-[#b48a2c]" style={{ height: length }} />
      <span className="h-[5px] w-[7px] rounded-t-[2px] bg-[#d4a537]" />
      <span
        className="rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.18)]"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.85) 0 9%, ${color} 38%, color-mix(in srgb, ${color} 65%, black) 100%)`,
        }}
      />
    </span>
  );
}

/** En haut des pages : une guirlande de sapin lumineuse, et des boules qui pendent. */
export function FestiveTop() {
  const festive = useFestive();
  if (!festive) return null;
  return (
    <div aria-hidden className="pointer-events-none relative -mx-5 -mt-6 mb-1 h-[58px] overflow-visible">
      <svg viewBox="0 0 400 28" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-7 w-full">
        <path d="M0 4 Q50 22 100 6 T200 6 T300 6 T400 4" fill="none" stroke="#1d5c3f" strokeWidth="7" strokeLinecap="round" />
        <path d="M0 4 Q50 22 100 6 T200 6 T300 6 T400 4" fill="none" stroke="#2f7d55" strokeWidth="3" strokeDasharray="2 5" strokeLinecap="round" />
      </svg>
      {LIGHTS.map((color, i) => {
        const x = (i + 0.5) / LIGHTS.length;
        // Les ampoules suivent le creux de la guirlande
        const y = 4 + Math.abs(Math.sin(x * Math.PI * 4)) * 9;
        return (
          <span
            key={i}
            className="absolute size-[7px] animate-[twinkle_1.6s_ease-in-out_infinite_alternate] rounded-full"
            style={{ left: `calc(${x * 100}% - 3px)`, top: y, background: color, boxShadow: `0 0 6px 1px ${color}`, animationDelay: `${(i % 4) * 0.4}s` }}
          />
        );
      })}
      <Bauble left="9%" length={14} color="#c8323a" size={18} delay={0} />
      <Bauble left="31%" length={26} color="#d9a520" size={14} delay={0.8} />
      <Bauble left="58%" length={10} color="#2f5bd3" size={16} delay={0.3} />
      <Bauble left="79%" length={22} color="#1f7a4f" size={20} delay={1.2} />
      <Bauble left="93%" length={8} color="#c8323a" size={12} delay={0.6} />
    </div>
  );
}

/** Sur la barre du bas : de la neige posée, et une guirlande lumineuse qui clignote. */
export function NavGarland() {
  const festive = useFestive();
  if (!festive) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[13px] h-[18px]">
      <svg viewBox="0 0 400 18" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_-1px_2px_rgba(60,90,130,0.25)]">
        <path
          d="M0 18 L0 11 Q12 4 26 9 Q40 2 56 8 Q70 3 86 10 Q100 4 118 8 Q134 1 150 9 Q166 4 182 10 Q198 2 214 8 Q230 4 246 9 Q262 1 278 8 Q294 5 310 10 Q326 2 342 8 Q358 4 374 9 Q388 5 400 10 L400 18 Z"
          fill="#f8fbff"
          stroke="#cfdcea"
          strokeWidth="1"
        />
      </svg>
      <svg viewBox="0 0 400 10" preserveAspectRatio="none" className="absolute inset-x-0 top-[11px] h-2.5 w-full">
        <path d="M0 2 Q25 9 50 3 T100 3 T150 3 T200 3 T250 3 T300 3 T350 3 T400 2" fill="none" stroke="#1d5c3f" strokeWidth="1.5" />
      </svg>
      {Array.from({ length: 16 }, (_, i) => {
        const color = LIGHTS[i % LIGHTS.length];
        return (
          <span
            key={i}
            className="absolute top-[13px] size-[6px] animate-[twinkle_1.2s_ease-in-out_infinite_alternate] rounded-full"
            style={{ left: `${((i + 0.5) / 16) * 100}%`, background: color, boxShadow: `0 0 5px 1px ${color}`, animationDelay: `${(i % 3) * 0.35}s` }}
          />
        );
      })}
    </div>
  );
}
