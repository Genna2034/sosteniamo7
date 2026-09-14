import { guard } from "@/components/page-guard";
import { requireProfile, requireRole } from "@/lib/security/authz";
import { getReferenceData, getReport } from "@/lib/queries";
import { Button, PageHeader, Panel, Stat, td, th } from "@/components/ui/primitives";
import { formatPercent, hours, shortDate } from "@/lib/utils";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = { title: "Report al RUP" };

function isoWeekAgo() { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }

async function ReportPage({ searchParams }: { searchParams: Promise<{ dal?: string; al?: string }> }) {
  const profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"]);
  const sp = await searchParams; const ref = await getReferenceData();
  const dal = sp.dal ?? isoWeekAgo(); const al = sp.al ?? new Date().toISOString().slice(0, 10);
  const r = await getReport(dal, al);
  const n = (k: string) => Number(r[k] ?? 0);
  const freq = n("presenze_attese") ? (n("presenze") / n("presenze_attese")) * 100 : null;
  return (
    <div>
      <PageHeader title="Report settimanale al RUP" lead={<>{ref.config?.titolo} · CUP {ref.config?.cup} · CIG {ref.config?.cig} · periodo {shortDate(dal)} – {shortDate(al)} · generato il {shortDate(new Date().toISOString())}</>}
        actions={<><form method="get" className="flex items-end gap-2"><label className="grid gap-1 text-sm"><span>Dal</span><input type="date" name="dal" defaultValue={dal} className="field-input" /></label><label className="grid gap-1 text-sm"><span>Al</span><input type="date" name="al" defaultValue={al} className="field-input" /></label><Button type="submit" variant="secondary">Aggiorna</Button></form><PrintButton /></>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Beneficiari in carico" value={n("beneficiari_in_carico")} sub={`su ${ref.config?.target_beneficiari ?? 217} contrattuali · ${n("beneficiari_totali")} presi in carico complessivamente`} tone="blu" />
        <Stat label="PIAE attivi" value={n("piae_attivi")} sub={`${n("piae_con_contratto")} con contratto sociale firmato`} tone="blu" />
        <Stat label="Sessioni erogate nel periodo" value={n("sessioni_erogate")} sub={hours(n("ore_erogate"))} tone="verde" />
        <Stat label="Frequenza nel periodo" value={formatPercent(freq)} sub={`${n("presenze")} presenze su ${n("presenze_attese")} attese`} tone={freq != null && freq < 70 ? "rosso" : "verde"} />
        <Stat label="Contatti educativi" value={n("contatti")} sub={`${n("contatti_riusciti")} riusciti`} />
        <Stat label="Laboratori / corsi" value={`${n("laboratori")} / ${n("corsi_sportivi")}`} sub="Attivi o conclusi sui sette territori" />
        <Stat label="Comunità educante" value={n("risorse_mappate")} sub={`realtà mappate · ${n("aot_attivi")} accordi attivi`} />
        <Stat label="Ore di personale" value={hours(n("ore_timesheet"))} sub={`${hours(n("ore_timesheet_vidimate"))} vidimate`} />
      </div>
      <Panel title="Dettaglio per territorio" className="mt-5">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Territorio</th><th className={th}>Beneficiari</th><th className={th}>PIAE</th><th className={th}>Freq. 14gg</th><th className={th}>Laboratori</th><th className={th}>Corsi</th><th className={th}>Ore erogate</th><th className={th}>Risorse</th><th className={th}>AOT</th><th className={th}>Alert</th><th className={th}>PER</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">{r.territori.map(t => <tr key={String(t.territorio_id)}><td className={td}>{String(t.nome)}</td><td className={td}>{String(t.beneficiari_in_carico)}</td><td className={td}>{String(t.piae_attivi)}</td><td className={td}>{formatPercent(t.frequenza_media_14gg as number | null)}</td><td className={td}>{String(t.laboratori)}</td><td className={td}>{String(t.corsi_sportivi)}</td><td className={td}>{hours(t.ore_erogate as number)}</td><td className={td}>{String(t.risorse_mappate)}</td><td className={td}>{String(t.aot_attivi)}/2</td><td className={td}>{String(t.alert_aperti)}</td><td className={td}>{String(t.escalation_aperte)}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Criticità e azioni" className="mt-5"><div className="p-4 text-sm"><p>Alert automatici aperti: <strong>{n("alert_aperti")}</strong>. Escalation PER aperte: <strong>{n("escalation_aperte")}</strong>.</p><p className="mt-2 text-[var(--ink-2)]">Il dettaglio nominativo non compare nel report: i casi sono identificati esclusivamente dal codice pseudonimo e sono consultabili nella piattaforma dai profili autorizzati.</p></div></Panel>
      <p className="mt-4 text-xs text-[var(--ink-3)]">Report prodotto dalla piattaforma di monitoraggio. Per il RUP: dott. Fabrizio Manasse, Città Metropolitana di Napoli – Direzione Fondi Comunitari. Mandataria RTI: Cooperativa Sociale Emmanuel.</p>
    </div>
  );
}

export default guard(ReportPage);
