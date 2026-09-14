import { guard } from "@/components/page-guard";
import Link from "next/link";
import { listMinori } from "@/lib/queries";
import { Empty, PageHeader, Panel, Stamp, td, th } from "@/components/ui/primitives";
import { shortDate } from "@/lib/utils";

export const metadata = { title: "Registro PIAE" };

async function PiaePage() {
  const rows = await listMinori();
  const items = rows.flatMap(r => (r.piae as unknown as Array<{ id: string; stato: string; data_scadenza_prossima_revisione: string }>).map(p => ({ ...p, minore: r })))
    .sort((a, b) => a.data_scadenza_prossima_revisione.localeCompare(b.data_scadenza_prossima_revisione));
  return (
    <div>
      <PageHeader title="Registro PIAE" lead="Tutti i piani individualizzati con la milestone di revisione a 60 giorni, dal più urgente." />
      <Panel><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Beneficiario</th><th className={th}>Territorio</th><th className={th}>Stato</th><th className={th}>Prossima revisione</th></tr></thead>
        <tbody className="divide-y divide-[var(--line)]">{items.map(p => { const late = new Date(p.data_scadenza_prossima_revisione) < new Date() && (p.stato === "ATTIVO" || p.stato === "IN_REVISIONE"); return (
          <tr key={p.id}><td className={td}><Link href={`/beneficiari/${p.minore.id}`} className="font-medium text-[var(--blu)]">{p.minore.pseudonimo}</Link> <span className="font-mono text-xs text-[var(--ink-3)]">{p.minore.codice_identificativo}</span></td><td className={td}>{(p.minore.territori as unknown as { codice: string } | null)?.codice}</td><td className={td}><Stamp tone={p.stato === "ATTIVO" ? "verde" : p.stato === "IN_REVISIONE" ? "ambra" : "neutral"}>{p.stato.replaceAll("_", " ").toLowerCase()}</Stamp></td><td className={td}><span className={late ? "font-semibold text-[var(--rosso)]" : ""}>{shortDate(p.data_scadenza_prossima_revisione)}</span></td></tr>); })}</tbody></table>
        {!items.length ? <Empty>Nessun PIAE.</Empty> : null}</div></Panel>
    </div>
  );
}

export default guard(PiaePage);
