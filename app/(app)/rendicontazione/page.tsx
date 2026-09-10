import { requireProfile, requireRole } from "@/lib/security/authz";
import { getReferenceData, getRendicontazione } from "@/lib/queries";
import { aggregaPer, confrontoQuoteRti, totale, type RigaOre } from "@/lib/rendicontazione";
import { Button, Empty, PageHeader, Panel, td, th } from "@/components/ui/primitives";
import { euro, hours, shortDate } from "@/lib/utils";

export const metadata = { title: "Rendicontazione" };

export default async function RendicontazionePage({ searchParams }: { searchParams: Promise<{ dal?: string; al?: string }> }) {
  const profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"]);
  const sp = await searchParams; const ref = await getReferenceData();
  const dal = sp.dal ?? ref.config?.data_avvio ?? "2026-08-04"; const al = sp.al ?? ref.config?.data_fine_progetto ?? "2027-01-31";
  const righe = (await getRendicontazione(dal, al)) as unknown as RigaOre[];
  const perFigura = aggregaPer(righe, "figura"); const perEnte = aggregaPer(righe, "ente"); const perTerritorio = aggregaPer(righe, "territorio");
  const tot = totale(perFigura); const quote = confrontoQuoteRti(perEnte, ref.enti);
  const q = `dal=${dal}&al=${al}`;
  const Tab = ({ titolo, rows, colonna }: { titolo: string; rows: typeof perFigura; colonna: string }) => (
    <Panel title={titolo}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>{colonna}</th><th className={th}>Righe</th><th className={th}>Ore</th><th className={th}>di cui vidimate</th><th className={th}>Valore parametrico</th><th className={th}>di cui vidimato</th></tr></thead>
      <tbody className="divide-y divide-[var(--line)]">{rows.map(r => <tr key={r.chiave}><td className={td}><span className="font-medium">{r.descrizione}</span> <span className="text-xs text-[var(--ink-3)]">{r.chiave}</span></td><td className={td}>{r.righe}</td><td className={td}>{hours(r.ore)}</td><td className={td}>{hours(r.ore_vidimate)}</td><td className={td}>{euro(r.valore)}</td><td className={td}>{euro(r.valore_vidimato)}</td></tr>)}</tbody>
      {rows.length ? <tfoot><tr className="bg-[var(--paper)] font-semibold"><td className={td}>Totale</td><td className={td}>{tot.righe}</td><td className={td}>{hours(totale(rows).ore)}</td><td className={td}>{hours(totale(rows).ore_vidimate)}</td><td className={td}>{euro(totale(rows).valore)}</td><td className={td}>{euro(totale(rows).valore_vidimato)}</td></tr></tfoot> : null}</table>
      {!rows.length ? <Empty>Nessuna ora nel periodo.</Empty> : null}</div></Panel>
  );
  return (
    <div>
      <PageHeader title="Rendicontazione del personale" lead="Ore da timesheet valorizzate alle tariffe di progetto (valore parametrico). In rendicontazione si espone il costo effettivamente sostenuto da cedolini e fatture: questo prospetto serve a controllare la coerenza con il quadro economico e la ripartizione RTI."
        actions={<><a href={`/api/export/timesheet?${q}`}><Button variant="secondary">Esporta timesheet (CSV)</Button></a><a href={`/api/export/presenze?${q}`}><Button variant="secondary">Esporta presenze (CSV)</Button></a></>} />
      <form className="mb-5 flex flex-wrap items-end gap-2 no-print" method="get">
        <label className="grid gap-1 text-sm"><span>Dal</span><input type="date" name="dal" defaultValue={dal} className="field-input" /></label>
        <label className="grid gap-1 text-sm"><span>Al</span><input type="date" name="al" defaultValue={al} className="field-input" /></label>
        <Button type="submit" variant="secondary">Aggiorna periodo</Button>
        <span className="text-sm text-[var(--ink-3)]">Periodo {shortDate(dal)} – {shortDate(al)} · {tot.righe} righe · {hours(tot.ore)} · {euro(tot.valore)}</span>
      </form>
      <div className="grid gap-5">
        <Tab titolo="Per figura professionale" rows={perFigura} colonna="Figura" />
        <Panel title="Ripartizione RTI"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Ente</th><th className={th}>Quota contrattuale</th><th className={th}>Valore ore</th><th className={th}>Incidenza sul totale ore</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{quote.map(x => <tr key={x.codice}><td className={td}>{x.denominazione}</td><td className={td}>{x.quota_percentuale}%</td><td className={td}>{euro(x.valore)}</td><td className={td}><span className={Math.abs(x.incidenza_pct - x.quota_percentuale) > 10 ? "text-[var(--ambra)] font-semibold" : ""}>{x.incidenza_pct}%</span></td></tr>)}</tbody></table>
          <p className="px-4 py-3 text-xs text-[var(--ink-3)]">Le quote RTI si applicano all&apos;intero corrispettivo, non alle sole ore di personale: uno scostamento qui è un segnale da verificare, non un errore.</p></div></Panel>
        <Tab titolo="Per territorio" rows={perTerritorio} colonna="Territorio" />
        <Tab titolo="Per ente erogatore" rows={perEnte} colonna="Ente" />
      </div>
    </div>
  );
}
