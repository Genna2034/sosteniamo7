import { guard } from "@/components/page-guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/security/authz";
import { getAttivita } from "@/lib/queries";
import { createSessionAction, enrollAction, updateActivityStatusAction } from "@/lib/actions/attivita";
import { ActionForm } from "@/components/forms/action-form";
import { Empty, Field, PageHeader, Panel, Stamp, td, th } from "@/components/ui/primitives";
import { hours, shortDate, todayIso } from "@/lib/utils";
import { TIPO_ATTIVITA_LABEL } from "@/types/domain";

export const metadata = { title: "Attività" };

async function AttivitaDettaglio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const d = await getAttivita(id);
  if (!d) notFound();
  const a = d.attivita; const t = a.territori as unknown as { codice: string; nome: string } | null;
  const erogate = d.sessioni.filter(s => s.stato === "EROGATA").reduce((x, s) => x + s.minuti_erogati, 0) / 60;
  const isDirettivo = profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER";
  const canOperate = profile.ruolo !== "PROJECT_MANAGER" && profile.ruolo !== "AMMINISTRATIVO";
  const iscrittiIds = new Set(d.iscritti.map(i => i.minore_id));
  return (
    <div>
      <PageHeader title={a.titolo} lead={<>{TIPO_ATTIVITA_LABEL[a.tipo]} · {t?.nome} · {a.ente_erogatore ?? "ente da definire"} · <Stamp tone={a.stato === "IN_CORSO" ? "verde" : "blu"}>{a.stato.toLowerCase()}</Stamp></>}
        actions={isDirettivo ? <ActionForm action={updateActivityStatusAction} submitLabel="Aggiorna stato" compact variant="secondary"><input type="hidden" name="id" value={a.id} /><select name="stato" className="field-input" defaultValue={a.stato}><option value="PROGRAMMATA">Programmata</option><option value="IN_CORSO">In corso</option><option value="CONCLUSA">Conclusa</option><option value="ANNULLATA">Annullata</option></select></ActionForm> : null} />
      {a.descrizione_offerta ? <p className="mb-5 rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm"><span className="text-[var(--ink-3)]">Relazione tecnica: </span>{a.descrizione_offerta}</p> : null}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Sessioni e registri" aside={<Stamp tone={erogate >= a.ore_minime_previste ? "verde" : "ambra"}>{hours(erogate)} erogate su {a.ore_minime_previste} minime</Stamp>}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Data</th><th className={th}>Orario</th><th className={th}>Conduttore</th><th className={th}>Presenze</th><th className={th}>Stato</th><th className={th}></th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{d.sessioni.map(s => { const op = s.profili_utenti as unknown as { nome: string; cognome: string } | null; const pres = (s.partecipazioni as unknown as Array<{ stato_presenza: string }>); const presenti = pres.filter(p => p.stato_presenza === "PRESENTE" || p.stato_presenza === "RITARDO").length; return (
              <tr key={s.id}><td className={td}>{shortDate(s.data_sessione)}</td><td className={td}>{String(s.ora_inizio).slice(0, 5)}–{String(s.ora_fine).slice(0, 5)}</td><td className={td}>{op ? `${op.cognome} ${op.nome}` : "—"}</td><td className={td}>{pres.length ? `${presenti}/${pres.length}` : <span className="text-[var(--ink-3)]">da compilare</span>}</td><td className={td}><Stamp tone={s.stato === "EROGATA" ? "verde" : s.stato === "ANNULLATA" ? "neutral" : "blu"}>{s.stato.toLowerCase()}</Stamp></td><td className={td}><Link href={`/attivita/${a.id}/sessioni/${s.id}`} className="text-[var(--blu)]">Registro</Link></td></tr>); })}</tbody></table>
            {!d.sessioni.length ? <Empty>Nessuna sessione. Programmane una e, il giorno stesso, compila il registro entro 24 ore.</Empty> : null}</div>
          {canOperate ? (
            <div className="border-t border-[var(--line)] p-4"><h3 className="mb-3 text-sm font-semibold">Programma sessione</h3>
              <ActionForm action={createSessionAction} submitLabel="Aggiungi sessione">
                <input type="hidden" name="attivita_id" value={a.id} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Data"><input name="data_sessione" type="date" className="field-input" defaultValue={todayIso()} required /></Field>
                  <Field label="Inizio"><input name="ora_inizio" type="time" className="field-input" defaultValue="15:00" required /></Field>
                  <Field label="Fine"><input name="ora_fine" type="time" className="field-input" defaultValue="17:00" required /></Field>
                  <Field label="Conduttore"><select name="operatore_responsabile_id" className="field-input" defaultValue={profile.id}>{d.operatori.map(o => <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>)}</select></Field>
                </div>
                <Field label="Luogo"><input name="luogo" className="field-input" placeholder="Sede, aula, campo" /></Field>
              </ActionForm></div>
          ) : null}
        </Panel>
        <Panel title={`Iscritti (${d.iscritti.length})`}>
          <div className="divide-y divide-[var(--line)]">{d.iscritti.map(i => { const m = i.minori as unknown as { codice_identificativo: string; pseudonimo: string } | null; return <Link key={i.id} href={`/beneficiari/${i.minore_id}`} className="flex justify-between px-4 py-2 text-sm hover:bg-[var(--paper)]"><span>{m?.pseudonimo}</span><span className="font-mono text-xs text-[var(--ink-3)]">{m?.codice_identificativo}</span></Link>; })}
            {!d.iscritti.length ? <Empty>Nessun iscritto. Lo standard operatori/utenti dichiarato in offerta è 1:8.</Empty> : null}</div>
          {canOperate && d.candidati.some(c => !iscrittiIds.has(c.id)) ? (
            <div className="border-t border-[var(--line)] p-4"><ActionForm action={enrollAction} submitLabel="Iscrivi" compact>
              <input type="hidden" name="attivita_id" value={a.id} />
              <Field label="Beneficiario" className="min-w-56"><select name="minore_id" className="field-input">{d.candidati.filter(c => !iscrittiIds.has(c.id)).map(c => <option key={c.id} value={c.id}>{c.pseudonimo} · {c.codice_identificativo}</option>)}</select></Field>
            </ActionForm></div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

export default guard(AttivitaDettaglio);
