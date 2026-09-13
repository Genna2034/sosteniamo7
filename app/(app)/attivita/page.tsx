import Link from "next/link";
import { requireProfile } from "@/lib/security/authz";
import { listAttivita } from "@/lib/queries";
import { Button, Empty, PageHeader, Panel, Progress, Stamp, Territorio, td, th } from "@/components/ui/primitives";
import { coloreTerritorio } from "@/lib/territori";
import { hours, shortDate } from "@/lib/utils";
import { TIPO_ATTIVITA_LABEL } from "@/types/domain";

export const metadata = { title: "Attività e registri" };

export default async function AttivitaPage() {
  const profile = await requireProfile();
  const rows = await listAttivita();
  const canCreate = profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER";
  return (
    <div>
      <PageHeader title="Attività e registri" lead="Laboratori professionalizzanti, corsi sportivi, azioni di strada e servizio di ascolto. Ogni sessione ha un registro presenze: è la prova dell'attività ai fini della rendicontazione."
        actions={canCreate ? <Link href="/attivita/nuova"><Button>Programma attività</Button></Link> : null} />
      <Panel>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr><th className={th}>Attività</th><th className={th}>Tipo</th><th className={th}>Territorio</th><th className={th}>Ente</th><th className={th}>Periodo</th><th className={th}>Iscritti</th><th className={th}>Sessioni</th><th className={th}>Ore erogate / minime</th><th className={th}>Stato</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{rows.map(a => {
            const t = a.territori as unknown as { codice: string } | null;
            const sess = a.sessioni_attivita as unknown as Array<{ stato: string; minuti_erogati: number }>;
            const erogate = sess.filter(s => s.stato === "EROGATA").reduce((x, s) => x + s.minuti_erogati, 0) / 60;
            const sotto = a.stato === "CONCLUSA" && erogate < a.ore_minime_previste;
            return (
              <tr key={a.id} className="hover:bg-[var(--paper)]">
                <td className={td}><Link href={`/attivita/${a.id}`} className="font-medium text-[var(--blu)]">{a.titolo}</Link></td>
                <td className={td}>{TIPO_ATTIVITA_LABEL[a.tipo]}</td><td className={td}><Territorio codice={t?.codice} /></td><td className={td}>{a.ente_erogatore ?? "—"}</td>
                <td className={td}>{shortDate(a.data_inizio)} – {shortDate(a.data_fine)}</td>
                <td className={td}>{(a.iscrizioni_attivita as unknown[]).length}</td>
                <td className={td}>{sess.filter(s => s.stato === "EROGATA").length}/{sess.length}</td>
                <td className={td}><div className="min-w-28"><span className={sotto ? "text-[var(--rosso)] font-bold" : "font-bold"}>{hours(erogate)}</span> <span className="text-[var(--ink-3)]">/ {a.ore_minime_previste} h</span><div className="mt-1"><Progress value={erogate} max={Number(a.ore_minime_previste) || 1} tone={coloreTerritorio(t?.codice)} /></div></div></td>
                <td className={td}><Stamp tone={a.stato === "IN_CORSO" ? "verde" : a.stato === "CONCLUSA" ? "neutral" : "blu"}>{a.stato.toLowerCase()}</Stamp></td>
              </tr>); })}</tbody></table>
          {!rows.length ? <Empty>Nessuna attività programmata. Il capitolato richiede per territorio almeno due laboratori e due corsi sportivi da 8 ore minime ciascuno.</Empty> : null}</div>
      </Panel>
    </div>
  );
}
