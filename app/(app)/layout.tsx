import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getProfileOrNull } from "@/lib/security/authz";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getProfileOrNull();
  if (!user) redirect("/login");
  if (!profile || profile.stato_attivo !== "ATTIVO") {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">Profilo non abilitato</h1>
        <p className="mt-2 text-sm text-[var(--ink-2)]">
          L&apos;account {user.email} è autenticato ma non ha un profilo attivo nel progetto. Chiedi al Project Manager di abilitarlo, indicando ruolo, territorio ed ente di appartenenza.
        </p>
        <form action={signOutAction} className="mt-5"><Button variant="secondary">Esci</Button></form>
      </main>
    );
  }
  return <AppShell profile={profile}>{children}</AppShell>;
}

export const dynamic = "force-dynamic";
