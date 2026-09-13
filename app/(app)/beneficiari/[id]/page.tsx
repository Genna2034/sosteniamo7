import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/security/authz";
import { getMinore } from "@/lib/queries";
import { assignCaseAction, updateMinorAction } from "@/lib/actions/minori";
import { addPiaeGoalAction, createPiaeAction, createPiaeRevisionAction } from "@/lib/actions/piae";
import { createEscalationAction, addEscalationEventAction } from "@/lib/actions/escalation";
import { enrollAction } from "@/lib/actions/attivita";
import { createClinicalNoteAction } from "@/lib/actions/clinical";
import { ActionForm } from "@/components/forms/action-form";
import { ClinicalPanel } from "@/components/forms/clinical-panel";
import { Empty, Field, PageHeader, Panel, Stamp, Territorio, td, th } from "@/components/ui/primitives";
import { coloreTerritorio } from "@/lib/territori";
import { CheckCircle2, Circle } from "lucide-react";
import { formatPercent, longDateTime, shortDate, todayIso } from "@/lib/utils";
import { ALERT_LABEL, PRESENZA_LABEL, ROLE_LABEL, STATO_ESCALATION_LABEL } from "@/types/domain";

export const metadata = { title: "Scheda beneficiario" };

export default async function BeneficiarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const d = await getMinore(id);
  if (!d) notFound();
  const { minore } = d;
  const t = minore.territori as unknown as { codice: string; nome: string } | null;
  const piaeAttivo = d.piae.find(p => p.stato === "ATTIVO" || p.stato === "IN_REVISIONE");
  const isCoord = profile.ruolo === "COORDINATORE";
  // Chi vede la scheda ma non è PM/amministrativo è Coordinatore del territorio o operatore assegnato (RLS): può scrivere.
  const canWrite = profile.ruolo !== "PROJECT_MANAGER" && profile.ruolo !== "AMMINISTRATIVO";
  const isL3 = profile.ruolo === "PSICOLOGO" || profile.ruolo === "ASSISTENTE_SOCIALE";
  const presenzeTot = d.presenze.length; const presenti = d.presenze.filter(p => p.stato_presenza === "PRESENTE" || p.stato_presenza === "RITARDO").length;
  const educatori = d.operatori.filter(o => o.ruolo === "EDUCATORE");
  const specialisti = d.operatori.filter(o => o.ruolo === "PSICOLOGO" || o.ruolo === "ASSISTENTE_SOCIALE" || o.ruolo === "ALTRO_SPECIALISTA");

  // Cosa manca per un percorso "a norma": guida l'operatore invece di mostrare pannelli vuoti.
  const settimana = new Date(); settimana.setDate(settimana.getDate() - 7);
  const contattiSett = d.contatti.filter(c => c.esito === "RIUSCITO" && new Date(c.timestamp_contatto) >= settimana).length;
  const passi: Array<[string, boolean, string]> = [
    ["Equipe assegnata", d.assegnazioni.some(a => a.attiva), "Il Coordinatore assegna l'educatore case manager"],
    ["PIAE avviato", !!piaeAttivo, "Piano individualizzato entro 30 giorni dalla presa in carico"],
    ["Contratto sociale firmato", !!piaeAttivo?.contratto_sociale_firmato, "Impegno reciproco firmato con il ragazzo"],
    ["Tre obiettivi SMART", ((piaeAttivo?.piae_obiettivi as unknown[] | undefined)?.length ?? 0) >= 3, "Formativo, relazionale, di responsabilità"],
    ["Iscritto a un'attività", d.iscrizioni.some(i => i.attiva), "Laboratorio o corso sportivo del territorio"],
    ["2 contatti questa settimana", contattiSett >= 2, `${contattiSett} contatti riusciti negli ultimi 7 giorni`],
  ];
  const fatti = passi.filter(p => p[1]).length;
  const tone = coloreTerritorio(t?.codice);
  return (
    <div>
      <PageHeader title={minore.pseudonimo} kicker={<span className="flex flex-wrap items-center gap-2"><Territorio codice={t?.codice} nome={t?.nome} /><span className="font-mono text-xs text-[var(--ink-3)]">{minore.codice_identificativo}</span><Stamp tone={minore.stato === "IN_CARICO" ? "verde" : "ambra"}>{minore.stato.replaceAll("_", " ").toLowerCase()}</Stamp></span>}
        lead={<>In carico dal {shortDate(minore.data_presa_in_carico)}{piaeAttivo ? `, PIAE dal ${shortDate(piaeAttivo.data_inizio)}` : ""}.</>} />

      <div className="card card-tone mb-5 p-4" style={{ "--tone": tone } as React.CSSProperties}>
        <div className="flex items-center justify-between gap-3"><h2>Percorso: {fatti} passi su {passi.length}</h2><span className="text-xs font-semibold text-[var(--ink-3)]">{fatti === passi.length ? "tutto in ordine" : `${passi.length - fatti} da completare`}</span></div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {passi.map(([l, ok, h]) => <li key={l} className="flex items-start gap-2 text-sm">{ok ? <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" style={{ color: "var(--verde)" }} aria-hidden /> : <Circle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--ink-3)]" aria-hidden />}<span><span className={ok ? "font-semibold" : "font-semibold text-[var(--ink)]"}>{l}</span><span className="block text-xs text-[var(--ink-3)]">{h}</span></span></li>)}
        </ul>
      </div>

      {d.alerts.length ? (
        <div className="mb-5 grid gap-2">
          {d.alerts.map(a => <div key={a.id} className="rounded-md border border-[var(--ambra)] bg-[var(--ambra-soft)] px-4 py-2 text-sm"><strong>{ALERT_LABEL[a.codice_alert] ?? a.codice_alert}</strong> · rilevato il {shortDate(a.timestamp_rilevamento)} — <Link href="/alert" className="text-[var(--blu)]">gestisci</Link></div>)}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-5">
          <Panel title={piaeAttivo ? `PIAE v${piaeAttivo.versione}` : "PIAE"} aside={piaeAttivo ? <Stamp tone={new Date(piaeAttivo.data_scadenza_prossima_revisione) < new Date() ? "rosso" : "blu"}>revisione entro {shortDate(piaeAttivo.data_scadenza_prossima_revisione)}</Stamp> : null}>
            {piaeAttivo ? (
              <div className="p-4">
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div><dt className="text-[var(--ink-3)]">Avvio</dt><dd>{shortDate(piaeAttivo.data_inizio)}</dd></div>
                  <div><dt className="text-[var(--ink-3)]">Contratto sociale</dt><dd>{piaeAttivo.contratto_sociale_firmato ? `firmato il ${shortDate(piaeAttivo.data_firma_contratto)}` : <span className="text-[var(--ambra)]">da firmare</span>}</dd></div>
                  <div><dt className="text-[var(--ink-3)]">Revisioni</dt><dd>{(piaeAttivo.piae_revisioni as unknown[]).length}</dd></div>
                </dl>
                <h3 className="mt-4 text-sm font-semibold">Obiettivi SMART</h3>
                <ul className="mt-2 grid gap-2">
                  {(piaeAttivo.piae_obiettivi as Array<{ id: string; tipologia: string; descrizione_smart: string; target_mensile: string | null; stato: string }>).map(o => (
                    <li key={o.id} className="rounded-md border border-[var(--line)] p-3 text-sm"><Stamp tone="blu">{o.tipologia.toLowerCase()}</Stamp> <span className="ml-2">{o.descrizione_smart}</span>{o.target_mensile ? <div className="mt-1 text-xs text-[var(--ink-3)]">Target mensile: {o.target_mensile}</div> : null}</li>
                  ))}
                </ul>
                {!(piaeAttivo.piae_obiettivi as unknown[]).length ? <p className="mt-2 text-sm text-[var(--ink-3)]">Nessun obiettivo ancora definito: il PIAE ne prevede uno formativo, uno relazionale e uno di responsabilità.</p> : null}
                {canWrite ? (
                  <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--blu)]">Aggiungi obiettivo</summary>
                    <div className="mt-3"><ActionForm action={addPiaeGoalAction} submitLabel="Aggiungi obiettivo">
                      <input type="hidden" name="piae_id" value={piaeAttivo.id} />
                      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                        <Field label="Tipologia"><select name="tipologia" className="field-input"><option value="FORMATIVO">Formativo</option><option value="RELAZIONALE">Relazionale</option><option value="RESPONSABILITA">Responsabilità</option></select></Field>
                        <Field label="Target mensile"><input name="target_mensile" className="field-input" placeholder="es. almeno 70% di presenze" /></Field>
                      </div>
                      <Field label="Obiettivo (specifico, misurabile, con scadenza)"><textarea name="descrizione_smart" className="field-input" required minLength={10} /></Field>
                    </ActionForm></div>
                  </details>
                ) : null}
                {(piaeAttivo.piae_revisioni as Array<{ id: string; numero_revisione: number; data_effettuazione: string; esito: string; decisioni_strutturali: string; verbale_adattamento_pdca: string }>).length ? (
                  <div className="mt-4"><h3 className="text-sm font-semibold">Revisioni</h3>
                    <ul className="mt-2 grid gap-2">{(piaeAttivo.piae_revisioni as Array<{ id: string; numero_revisione: number; data_effettuazione: string; esito: string; decisioni_strutturali: string; verbale_adattamento_pdca: string }>).sort((a, b) => b.numero_revisione - a.numero_revisione).map(r => (
                      <li key={r.id} className="rounded-md border border-[var(--line)] p-3 text-sm"><div className="flex flex-wrap gap-2"><Stamp>n. {r.numero_revisione}</Stamp><Stamp tone="verde">{r.esito.toLowerCase()}</Stamp><span className="text-[var(--ink-3)]">{shortDate(r.data_effettuazione)} · {r.decisioni_strutturali.replaceAll("_", " ").toLowerCase()}</span></div><p className="mt-2 whitespace-pre-wrap">{r.verbale_adattamento_pdca}</p></li>
                    ))}</ul></div>
                ) : null}
                {isCoord ? (
                  <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--blu)]">Registra revisione a 60 giorni (PDCA)</summary>
                    <div className="mt-3"><ActionForm action={createPiaeRevisionAction} submitLabel="Registra revisione">
                      <input type="hidden" name="piae_id" value={piaeAttivo.id} />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Data"><input name="data_effettuazione" type="date" className="field-input" defaultValue={todayIso()} required /></Field>
                        <Field label="Esito"><select name="esito" className="field-input"><option value="CONFERMATO">Confermato</option><option value="ADATTATO">Adattato</option><option value="CONCLUSO">Concluso</option></select></Field>
                        <Field label="Decisione"><select name="decisioni_strutturali" className="field-input"><option value="NESSUNA">Nessuna</option><option value="RILANCIO">Rilancio</option><option value="CAMBIO_LABORATORIO">Cambio laboratorio</option><option value="INVIO_PSICOLOGO">Invio allo psicologo</option><option value="CHIUDI">Chiusura</option></select></Field>
                      </div>
                      <Field label="Verbale di adattamento (Plan · Do · Check · Act)"><textarea name="verbale_adattamento_pdca" className="field-input" required minLength={10} /></Field>
                    </ActionForm></div>
                  </details>
                ) : null}
              </div>
            ) : isCoord ? (
              <div className="p-4">
                <p className="text-sm text-[var(--ink-2)]">Nessun PIAE attivo. Avvialo indicando l&apos;educatore referente e, se già firmato, la data del contratto sociale.</p>
                <div className="mt-3"><ActionForm action={createPiaeAction} submitLabel="Avvia PIAE">
                  <input type="hidden" name="minore_id" value={minore.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Educatore referente"><select name="educatore_referente_id" className="field-input" required>{educatori.map(e => <option key={e.id} value={e.id}>{e.cognome} {e.nome}</option>)}</select></Field>
                    <Field label="Data di avvio"><input name="data_inizio" type="date" className="field-input" defaultValue={todayIso()} required /></Field>
                    <Field label="Contratto sociale firmato"><input name="contratto_sociale_firmato" type="checkbox" className="h-5 w-5" /></Field>
                    <Field label="Data firma"><input name="data_firma_contratto" type="date" className="field-input" /></Field>
                  </div>
                </ActionForm></div>
              </div>
            ) : <Empty>PIAE non ancora avviato dal Coordinatore.</Empty>}
          </Panel>

          <Panel title="Diario di bordo: contatti settimanali" aside={<Link href="/diario-rapido" className="text-sm text-[var(--blu)]">Registra dal diario rapido</Link>}>
            <div className="divide-y divide-[var(--line)]">
              {d.contatti.map(c => (
                <div key={c.id} className="px-4 py-2.5 text-sm"><div className="flex flex-wrap gap-2"><Stamp tone={c.esito === "RIUSCITO" ? "verde" : "ambra"}>{c.esito === "RIUSCITO" ? "riuscito" : "non raggiunto"}</Stamp><Stamp>{c.canale.replaceAll("_", " ").toLowerCase()}</Stamp><span className="text-[var(--ink-3)]">{longDateTime(c.timestamp_contatto)}{c.durata_minuti ? ` · ${c.durata_minuti} min` : ""}</span></div>{c.note_diario_bordo ? <p className="mt-1 whitespace-pre-wrap text-[var(--ink-2)]">{c.note_diario_bordo}</p> : null}</div>
              ))}
              {!d.contatti.length ? <Empty>Nessun contatto registrato. Lo standard è di almeno due contatti a settimana, uno in presenza.</Empty> : null}
            </div>
          </Panel>

          <Panel title="Presenze alle attività" aside={presenzeTot ? <Stamp tone="blu">{presenti}/{presenzeTot} · {formatPercent((presenti / presenzeTot) * 100)}</Stamp> : null}>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Data</th><th className={th}>Attività</th><th className={th}>Presenza</th><th className={th}>Minuti</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">{d.presenze.map(p => { const s = p.sessioni_attivita as unknown as { data_sessione: string; attivita: { titolo: string } | null } | null; return (
                <tr key={p.id}><td className={td}>{shortDate(s?.data_sessione)}</td><td className={td}>{s?.attivita?.titolo}</td><td className={td}><Stamp tone={p.stato_presenza === "PRESENTE" ? "verde" : p.stato_presenza === "RITARDO" ? "ambra" : "rosso"}>{PRESENZA_LABEL[p.stato_presenza]}</Stamp></td><td className={td}>{p.minuti_frequentati ?? "—"}</td></tr>); })}</tbody></table>
              {!d.presenze.length ? <Empty>Nessuna presenza. Iscrivi il beneficiario a un laboratorio o corso e compila il registro delle sessioni.</Empty> : null}</div>
            {canWrite && d.attivita.length ? (
              <div className="border-t border-[var(--line)] p-4"><ActionForm action={enrollAction} submitLabel="Iscrivi" compact>
                <input type="hidden" name="minore_id" value={minore.id} />
                <Field label="Iscrivi a un'attività del territorio" className="min-w-64"><select name="attivita_id" className="field-input">{d.attivita.filter(a => !d.iscrizioni.some(i => i.attiva && (i.attivita as unknown as { id: string } | null)?.id === a.id)).map(a => <option key={a.id} value={a.id}>{a.titolo}</option>)}</select></Field>
              </ActionForm></div>
            ) : null}
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel title="Equipe del caso">
            <div className="divide-y divide-[var(--line)]">{d.assegnazioni.filter(a => a.attiva).map(a => { const u = a.profili_utenti as unknown as { nome: string; cognome: string; ruolo: string } | null; return (
              <div key={a.id} className="px-4 py-2.5 text-sm"><div className="font-medium">{u ? `${u.cognome} ${u.nome}` : "—"}</div><div className="text-xs text-[var(--ink-3)]">{a.ruolo_nel_caso.replaceAll("_", " ").toLowerCase()} · dal {shortDate(a.data_inizio)}</div></div>); })}
              {!d.assegnazioni.some(a => a.attiva) ? <Empty>Nessun operatore assegnato.</Empty> : null}</div>
            {isCoord ? (
              <div className="border-t border-[var(--line)] p-4"><ActionForm action={assignCaseAction} submitLabel="Assegna" compact>
                <input type="hidden" name="minore_id" value={minore.id} />
                <Field label="Operatore" className="min-w-48"><select name="utente_id" className="field-input">{[...educatori, ...specialisti].map(o => <option key={o.id} value={o.id}>{o.cognome} {o.nome} · {ROLE_LABEL[o.ruolo as keyof typeof ROLE_LABEL]}</option>)}</select></Field>
                <Field label="Ruolo nel caso"><select name="ruolo_nel_caso" className="field-input"><option value="EDUCATORE_CASEMANAGER">Case manager</option><option value="PSICOLOGO">Psicologo</option><option value="ASSISTENTE_SOCIALE">Assistente sociale</option><option value="ALTRO_SPECIALISTA">Altro specialista</option></select></Field>
              </ActionForm></div>
            ) : null}
          </Panel>

          <Panel title="Escalation (PER)">
            <div className="divide-y divide-[var(--line)]">{d.escalation.map(e => (
              <div key={e.id} className="px-4 py-2.5 text-sm"><div className="flex flex-wrap gap-2"><Stamp tone={e.sla === "CHIUSA" ? "neutral" : e.sla === "IN_SLA" ? "ambra" : "rosso"}>{STATO_ESCALATION_LABEL[e.stato] ?? e.stato}</Stamp><span className="text-[var(--ink-3)]">{e.livello_gravita.replaceAll("_", " ").toLowerCase()} · {longDateTime(e.timestamp_apertura)}</span></div>
                {e.sla !== "CHIUSA" && canWrite ? (<details className="mt-2"><summary className="cursor-pointer text-xs text-[var(--blu)]">Aggiorna timeline</summary><div className="mt-2"><ActionForm action={addEscalationEventAction} submitLabel="Registra">
                  <input type="hidden" name="escalation_id" value={e.id} />
                  <div className="grid gap-2 sm:grid-cols-2"><Field label="Evento"><select name="tipo_evento" className="field-input"><option value="NOTIFICA_COORDINATORE">Notifica al Coordinatore</option><option value="ATTIVAZIONE_SPECIALISTA">Attivazione specialista</option><option value="PIANO_URGENZA">Piano d&apos;urgenza</option><option value="CONVOCAZIONE_URGENZA">Convocazione d&apos;urgenza</option><option value="ATTIVAZIONE_TAVOLO">Attivazione tavolo</option><option value="VERBALE_TAVOLO">Verbale del tavolo</option><option value="REGISTRAZIONE_CONTATTO">Contatto</option><option value="CAMBIO_STATO">Cambio stato</option></select></Field>
                  <Field label="Nuovo stato"><select name="stato_successivo" className="field-input" defaultValue=""><option value="">Invariato</option><option value="IN_VALUTAZIONE_12H">In valutazione (12h)</option><option value="PRESA_IN_CARICO_24H">Presa in carico (24h)</option><option value="TAVOLO_48H">Tavolo (48h)</option><option value="RISOLTO">Risolta</option><option value="CHIUSO">Chiusa</option></select></Field></div>
                  <Field label="Descrizione"><textarea name="descrizione" className="field-input" required /></Field></ActionForm></div></details>) : null}
              </div>))}
              {!d.escalation.length ? <Empty>Nessuna escalation.</Empty> : null}</div>
            {canWrite && !isL3 ? (<div className="border-t border-[var(--line)] p-4"><details><summary className="cursor-pointer text-sm font-medium text-[var(--rosso)]">Apri escalation</summary><div className="mt-3"><ActionForm action={createEscalationAction} submitLabel="Apri escalation" variant="danger">
              <input type="hidden" name="minore_id" value={minore.id} />
              <Field label="Gravità"><select name="livello_gravita" className="field-input"><option value="MEDIO_RIPETUTO">Media / ripetuta</option><option value="PER_EMERGENZA_ALTO">Alta / emergenza</option><option value="SALVAGUARDIA_MINORE">Salvaguardia del minore</option></select></Field>
              <Field label="Cosa è successo" hint="Fatti osservabili, senza valutazioni cliniche. Il Coordinatore viene notificato e ha 4 ore per la valutazione."><textarea name="descrizione" className="field-input" required minLength={10} /></Field>
            </ActionForm></div></details></div>) : null}
          </Panel>

          {isL3 ? <ClinicalPanel minoreId={minore.id} action={createClinicalNoteAction} /> : null}

          {isCoord ? (
            <Panel title="Stato del caso"><div className="p-4"><ActionForm action={updateMinorAction} submitLabel="Aggiorna" compact>
              <input type="hidden" name="id" value={minore.id} />
              <Field label="Stato"><select name="stato" className="field-input" defaultValue={minore.stato}><option value="IN_CARICO">In carico</option><option value="SOSPESO">Sospeso</option><option value="CONCLUSO">Concluso</option></select></Field>
              <Field label="Data conclusione"><input name="data_conclusione" type="date" className="field-input" defaultValue={minore.data_conclusione ?? ""} /></Field>
            </ActionForm></div></Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
