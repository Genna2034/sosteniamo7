import { guard } from "@/components/page-guard";
import Link from "next/link";
import { requireProfile } from "@/lib/security/authz";
import { getAlertCenter } from "@/lib/queries";
import { closeAlertAction, recordAuthorityNotificationAction, runChecksAction } from "@/lib/actions/escalation";
import { ActionForm } from "@/components/forms/action-form";
import { RunChecksButton } from "@/components/forms/run-checks-button";
import { Empty, Field, PageHeader, Panel, Stamp } from "@/components/ui/primitives";
import { longDateTime, shortDate } from "@/lib/utils";
import { ALERT_LABEL, STATO_ESCALATION_LABEL } from "@/types/domain";

export const metadata = { title: "Alert e PER" };

async function AlertPage() {
  const profile = await requireProfile();
  const d = await getAlertCenter();
  const direttivo = profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER";
  const minore = (id: string) => d.minori.find(m => m.id === id);
  const aperte = d.escalations.filter(e => e.sla !== "CHIUSA"); const chiuse = d.escalations.filter(e => e.sla === "CHIUSA");
  return (
    <div>
      <PageHeader title="Alert e Protocollo di Riattivazione" lead="Gli alert gialli nascono dai controlli automatici (frequenza, contatti, revisioni, accordi). Le escalation rosse seguono il protocollo PER con tempi 4h / 12h / 24h / 48h."
        actions={direttivo ? <RunChecksButton action={runChecksAction} /> : null} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`Alert aperti (${d.alerts.length})`}>
          <div className="divide-y divide-[var(--line)]">{d.alerts.map(a => { const m = a.minori as unknown as { pseudonimo: string; codice_identificativo: string } | null; const t = a.territori as unknown as { codice: string } | null; const det = a.dettagli as Record<string, unknown>; return (
            <div key={a.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Stamp tone="ambra">{ALERT_LABEL[a.codice_alert] ?? a.codice_alert}</Stamp><span className="text-[var(--ink-3)]">{t?.codice} · {shortDate(a.timestamp_rilevamento)}</span></div>
              <div className="mt-1">{m ? <Link href={`/beneficiari/${a.minore_id}`} className="font-medium text-[var(--blu)]">{m.pseudonimo} · {m.codice_identificativo}</Link> : <span className="font-medium">Territorio {t?.codice}</span>}
                {det.frequenza_pct != null ? <span className="text-[var(--ink-2)]"> — frequenza {String(det.frequenza_pct)}% su {String(det.sessioni)} sessioni</span> : null}
                {det.giorni != null ? <span className="text-[var(--ink-2)]"> — revisione {Number(det.giorni) < 0 ? `scaduta da ${-Number(det.giorni)} giorni` : `tra ${String(det.giorni)} giorni`}</span> : null}
                {Array.isArray(det.mancanti) ? <span className="text-[var(--ink-2)]"> — mancano: {(det.mancanti as string[]).map(x => x.replaceAll("_", " ").toLowerCase()).join(", ")}</span> : null}</div>
              {direttivo ? <div className="mt-2"><ActionForm action={closeAlertAction} submitLabel="Chiudi" compact variant="secondary"><input type="hidden" name="alert_id" value={a.id} /><input name="note" className="field-input min-h-9 w-64" placeholder="Azione intrapresa" /></ActionForm></div> : null}
            </div>); })}
            {!d.alerts.length ? <Empty>Nessun alert aperto.</Empty> : null}</div>
        </Panel>
        <Panel title={`Escalation PER (${aperte.length} aperte, ${chiuse.length} chiuse)`}>
          <div className="divide-y divide-[var(--line)]">{[...aperte, ...chiuse].map(e => { const m = minore(e.minore_id); const ev = d.eventi.filter(x => x.escalation_id === e.id); return (
            <details key={e.id} className="px-4 py-3 text-sm" open={e.sla !== "CHIUSA"}>
              <summary className="cursor-pointer"><span className="mr-2"><Stamp tone={e.sla === "CHIUSA" ? "neutral" : e.sla === "IN_SLA" ? "ambra" : "rosso"}>{STATO_ESCALATION_LABEL[e.stato] ?? e.stato}</Stamp></span><Link href={`/beneficiari/${e.minore_id}`} className="font-medium text-[var(--blu)]">{m?.pseudonimo ?? "—"} · {m?.codice_identificativo}</Link> <span className="text-[var(--ink-3)]">{e.livello_gravita.replaceAll("_", " ").toLowerCase()} · aperta {longDateTime(e.timestamp_apertura)} · {e.sla === "IN_SLA" ? `${Math.round(Number(e.ore_trascorse))} h trascorse` : e.sla.replaceAll("_", " ").toLowerCase()}</span></summary>
              <ol className="mt-2 grid gap-1 border-l-2 border-[var(--line)] pl-3">{ev.map(x => { const u = x.profili_utenti as unknown as { nome: string; cognome: string } | null; return <li key={x.id}><span className="text-xs text-[var(--ink-3)]">{longDateTime(x.timestamp)} · {u ? `${u.cognome} ${u.nome}` : ""} · {x.tipo_evento.replaceAll("_", " ").toLowerCase()}{x.stato_successivo && x.stato_successivo !== x.stato_precedente ? ` → ${STATO_ESCALATION_LABEL[x.stato_successivo]}` : ""}</span><div>{x.descrizione}</div></li>; })}</ol>
              {direttivo && e.sla !== "CHIUSA" ? (<details className="mt-3"><summary className="cursor-pointer text-xs text-[var(--blu)]">Registra comunicazione istituzionale (Servizi Sociali / Procura)</summary><div className="mt-2"><ActionForm action={recordAuthorityNotificationAction} submitLabel="Registra">
                <input type="hidden" name="escalation_id" value={e.id} /><input type="hidden" name="data_ora_invio" value={new Date().toISOString()} />
                <div className="grid gap-2 sm:grid-cols-3"><Field label="Destinatario"><select name="destinatario" className="field-input"><option value="SERVIZI_SOCIALI">Servizi Sociali</option><option value="PROCURA">Procura</option><option value="ALTRA_AUTORITA">Altra autorità</option></select></Field><Field label="N. protocollo"><input name="numero_protocollo" className="field-input" required /></Field><Field label="Estremi PEC"><input name="estremi_pec" className="field-input" /></Field></div>
              </ActionForm></div></details>) : null}
            </details>); })}
            {!d.escalations.length ? <Empty>Nessuna escalation.</Empty> : null}</div>
        </Panel>
      </div>
    </div>
  );
}

export default guard(AlertPage);
