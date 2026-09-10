import { requireProfile } from "@/lib/security/authz";
import { getReferenceData } from "@/lib/queries";
import { signOutAction } from "@/lib/actions/auth";
import { Button, PageHeader, Panel } from "@/components/ui/primitives";
import { ROLE_LABEL } from "@/types/domain";

export const metadata = { title: "Profilo" };

export default async function ProfiloPage() {
  const profile = await requireProfile();
  const ref = await getReferenceData();
  const territorio = ref.territori.find(t => t.id === profile.territorio_id);
  const figura = ref.figure.find(f => f.id === profile.figura_id);
  const ente = ref.enti.find(e => e.codice === profile.ente_partner);
  return (
    <div>
      <PageHeader title={`${profile.nome} ${profile.cognome}`} lead={ROLE_LABEL[profile.ruolo]} />
      <Panel className="p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--ink-3)]">Territorio</dt><dd className="font-medium">{territorio ? `${territorio.nome} (${territorio.codice})` : "Tutti i territori"}</dd></div>
          <div><dt className="text-[var(--ink-3)]">Ente di appartenenza</dt><dd className="font-medium">{ente?.denominazione ?? "—"}</dd></div>
          <div><dt className="text-[var(--ink-3)]">Figura professionale per il timesheet</dt><dd className="font-medium">{figura?.descrizione ?? "Non impostata: chiedi al PM"}</dd></div>
          <div><dt className="text-[var(--ink-3)]">Stato</dt><dd className="font-medium">{profile.stato_attivo}</dd></div>
        </dl>
        <form action={signOutAction} className="mt-6"><Button variant="secondary">Esci dall&apos;applicazione</Button></form>
      </Panel>
    </div>
  );
}
