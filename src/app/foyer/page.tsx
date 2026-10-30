import { getContext } from "@/lib/data";
import { signOut } from "@/app/actions";
import { AppShell, Avatar, PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export default async function HouseholdPage() {
  const { household, members, userId } = await getContext();
  const me = members.find((m) => m.user_id === userId)!;

  return (
    <AppShell>
      <PageHeader kicker="Foyer" title={household.name} />

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="section-title">Membres</h2>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 text-[15px] font-medium">
            <Avatar member={m} />
            {m.display_name}
            {m.user_id === userId && <span className="text-xs text-muted">(vous)</span>}
          </div>
        ))}
        {members.length < 2 && (
          <div className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark">
            Invitez votre partenaire : à l&apos;inscription, il ou elle choisit « Rejoindre » et saisit le code{" "}
            <strong className="tracking-[2px]">{household.invite_code}</strong>.
          </div>
        )}
        {members.length >= 2 && (
          <p className="text-xs text-muted">Code d&apos;invitation : <span className="tracking-[2px]">{household.invite_code}</span></p>
        )}
      </section>

      <ProfileForm displayName={me.display_name} color={me.color} />

      <form action={signOut}>
        <button type="submit" className="btn-secondary w-full">Se déconnecter</button>
      </form>
    </AppShell>
  );
}
