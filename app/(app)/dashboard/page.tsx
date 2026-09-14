import { guard } from "@/components/page-guard";
import Link from "next/link";
import { requireProfile } from "@/lib/security/authz";
import { getDashboard } from "@/lib/queries";
import { Empty, PageHeader, Panel, Stamp, Stat, Territorio, td, th } from "@/components/ui/primitives";
import { OggiView } from "./oggi";
import { FrequencyChart } from "@/components/dashboard/frequency-chart";
import { formatPercent, hours, shortDate } from "@/lib/utils";
import { ALERT_LABEL, ROLE_LABEL, STATO_ESCALATION_LABEL } from "@/types/domain";

export const metadata = { title: "Cruscotto" };

async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.ruolo !== "PROJECT_MANAGER" && profile.ruolo !== "AMMINISTRATIVO") return <OggiView profile={profile} />;
  const d = await getDashboard(profile);
  const sum = (k: string) => d.territori.reduce((t, x) => t + Number((x as Record<string, unknown>)[k] ?? 0), 0);
  const freqValues = d.territori.map(t => Number(t.frequenza_media_14gg)).filter(v => !Number.isNaN(v));
  const freqMedia = freqValues.length ? freqValues.reduce((a, b) => a + b, 0) / freqValues.length : null;
  const target = d.config?.target_beneficiari ?? 217;
  const scope = d.territori.length === 1 ? d.territori[0].nome : "sette territori";
  const giorniAllaFine = d.config ? Math.ceil((new Date(d.config.data_fine_erogazione).getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <PageHeader title="Cruscotto di progetto" lead={<>Vista {ROLE_LABEL[profile.ruolo].toLowerCase()} su {scope}. {giorniAllaFine != null ? (giorniAllaFine >= 0 ? `Mancano ${giorniAllaFine} giorni alla chiusura dell'erogazione (${shortDate(d.config?.data_fine_erogazione)}).` : `Erogazione chiusa il ${shortDate(d.config?.data_fine_erogazione)}: fase di rendicontazione.`) : null}</>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ragazzi in carico" value={sum("beneficiari_in_carico")} sub={`su ${target} previsti dal contratto`} tone="blu" progress={{ value: sum("beneficiari_in_carico"), max: target }} />
        <Stat label="PIAE attivi" value={sum("piae_attivi")} sub="Piani con contratto sociale e revisione a 60 giorni" tone="blu" />
        <Stat label="Frequenza media (14 giorni)" value={formatPercent(freqMedia)} sub={`Soglia di alert ${formatPercent(d.config?.soglia_frequenza ?? 70)}`} tone={freqMedia != null && freqMedia < (d.config?.soglia_frequenza ?? 70) ? "rosso" : "verde"} />
        <Stat label="Ore di attività erogate" value={hours(sum("ore_erogate"))} sub={`${sum("laboratori")} laboratori e ${sum("corsi_sportivi")} corsi sportivi (14 + 7 previsti)`} tone="verde" />
        <Stat label="Comunità educante" value={sum("risorse_mappate")} sub={`realtà su ${d.config?.target_risorse ?? 70} · ${sum("aot_attivi")} accordi AOT su 14`} tone="blu" progress={{ value: sum("risorse_mappate"), max: d.config?.target_risorse ?? 70 }} />
        <Stat label="Ore timesheet vidimate" value={hours(sum("ore_timesheet_vidimate"))} sub="Giustificativo rendicontabile" />
        <Stat label="Alert aperti" value={sum("alert_aperti")} sub="Frequenza, contatti, revisioni, AOT" tone={sum("alert_aperti") ? "ambra" : "neutral"} />
        <Stat label="Escalation aperte" value={sum("escalation_aperte")} sub="Protocollo PER: 4h / 12h / 24h / 48h" tone={sum("escalation_aperte") ? "rosso" : "neutral"} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Frequenza per territorio (ultimi 14 giorni)">
          <div className="p-4">
            {d.territori.some(t => t.frequenza_media_14gg != null)
              ? <FrequencyChart data={d.territori.map(t => ({ name: t.codice, value: t.frequenza_media_14gg == null ? null : Number(t.frequenza_media_14gg) }))} soglia={Number(d.config?.soglia_frequenza ?? 70)} />
              : <Empty>Nessuna presenza registrata negli ultimi 14 giorni. I dati compaiono appena i registri delle sessioni vengono compilati.</Empty>}
          </div>
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Territorio</th><th className={th}>Beneficiari</th><th className={th}>PIAE</th><th className={th}>Freq.</th><th className={th}>Lab.</th><th className={th}>Sport</th><th className={th}>Ore</th><th className={th}>AOT</th><th className={th}>Alert</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">
                {d.territori.map(t => (
                  <tr key={t.territorio_id}>
                    <td className={td}><Territorio codice={t.codice} nome={t.nome} /></td>
                    <td className={td}>{t.beneficiari_in_carico}</td><td className={td}>{t.piae_attivi}</td>
                    <td className={td}>{formatPercent(t.frequenza_media_14gg)}</td><td className={td}>{t.laboratori}</td><td className={td}>{t.corsi_sportivi}</td>
                    <td className={td}>{hours(t.ore_erogate)}</td><td className={td}>{t.aot_attivi}/2</td>
                    <td className={td}>{Number(t.alert_aperti) ? <Stamp tone="ambra">{t.alert_aperti}</Stamp> : <span className="text-[var(--ink-3)]">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Da gestire" aside={<Link href="/alert" className="text-sm text-[var(--blu)]">Centro alert</Link>}>
            <div className="divide-y divide-[var(--line)]">
              {d.escalations.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div><Stamp tone="rosso">PER</Stamp><div className="mt-1 text-sm font-medium">{STATO_ESCALATION_LABEL[e.stato] ?? e.stato}</div><div className="text-xs text-[var(--ink-3)]">{e.sla === "IN_SLA" ? "Entro SLA" : "SLA superato"} · aperta il {shortDate(e.timestamp_apertura)}</div></div>
                  <Link href={`/beneficiari/${e.minore_id}`} className="text-xs text-[var(--blu)]">Apri caso</Link>
                </div>
              ))}
              {d.alerts.map(a => {
                const m = a.minori as unknown as { pseudonimo: string; codice_identificativo: string } | null;
                return (
                  <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div><Stamp tone="ambra">Alert</Stamp><div className="mt-1 text-sm font-medium">{ALERT_LABEL[a.codice_alert] ?? a.codice_alert}</div><div className="text-xs text-[var(--ink-3)]">{m ? `${m.pseudonimo} · ${m.codice_identificativo}` : "Territorio"} · {shortDate(a.timestamp_rilevamento)}</div></div>
                    {a.minore_id ? <Link href={`/beneficiari/${a.minore_id}`} className="text-xs text-[var(--blu)]">Apri caso</Link> : <Link href="/rete" className="text-xs text-[var(--blu)]">Rete</Link>}
                  </div>
                );
              })}
              {!d.alerts.length && !d.escalations.length ? <Empty>Nessuna criticità aperta.</Empty> : null}
            </div>
          </Panel>
          <Panel title="Prossime revisioni PIAE">
            <div className="divide-y divide-[var(--line)]">
              {d.due.map(p => {
                const m = p.minori as unknown as { pseudonimo: string; codice_identificativo: string } | null;
                const late = new Date(p.data_scadenza_prossima_revisione) < new Date();
                return (
                  <Link key={p.id} href={`/beneficiari/${p.minore_id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[var(--paper)]">
                    <span>{m?.pseudonimo ?? "—"} <span className="text-[var(--ink-3)]">{m?.codice_identificativo}</span></span>
                    <Stamp tone={late ? "rosso" : "neutral"}>{shortDate(p.data_scadenza_prossima_revisione)}</Stamp>
                  </Link>
                );
              })}
              {!d.due.length ? <Empty>Nessun PIAE in scadenza.</Empty> : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default guard(DashboardPage);
