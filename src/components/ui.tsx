import Link from "next/link";
import type { Person } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3.5 px-5 pt-6 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}

export function PageHeader({ kicker, title, action }: { kicker?: string; title: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        {kicker && <span className="text-[13px] font-medium text-muted">{kicker}</span>}
        <h1 className="font-display text-[30px] leading-tight font-bold tracking-[-0.5px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Avatar({ person, size = 28 }: { person?: Pick<Person, "name" | "color">; size?: number }) {
  const initial = person?.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      title={person?.name}
      aria-label={person?.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: person?.color ?? "#5b645e" }}
    >
      {initial}
    </span>
  );
}

export function PeopleBadge({ people }: { people: Person[] }) {
  return (
    <Link href="/foyer" aria-label="Foyer, personnes et matériel" className="flex min-h-11 items-center">
      {people.map((p, i) => (
        <span key={p.id} className={`rounded-full border-2 border-ground ${i ? "-ml-2" : ""}`}>
          <Avatar person={p} size={34} />
        </span>
      ))}
    </Link>
  );
}

export function EmptyState({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="card flex flex-col items-start gap-3 p-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted">{text}</p>
      <Link href={href} className="btn-primary min-h-11 text-sm">
        {cta}
      </Link>
    </div>
  );
}
