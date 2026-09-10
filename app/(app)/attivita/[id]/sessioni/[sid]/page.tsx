import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/security/authz";
import { getRegistroSessione } from "@/lib/queries";
import { saveAttendanceSheetAction, setSessionStatusAction } from "@/lib/actions/attivita";
import { ActionForm } from "@/components/forms/action-form";
import { Empty, PageHeader, Panel, Stamp } from "@/components/ui/primitives";
import { shortDate } from "@/lib/utils";

export const metadata = { title: "Registro presenze" };

const OPZIONI = [["PRESENTE", "Presente"], ["RITARDO", "Ritardo"], ["ASSENTE_GIUSTIFICATO", "Ass. giust."], ["ASSENTE_INGIUSTIFICATO", "Assente"]] as const;

export default async function RegistroPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  const profile = await requireProfile();
  const d = await getRegistroSessione(sid);
  if (!d || d.sessione.attivita_id !== id) notFound();
  const s = d.sessione; const att = s.attivita as unknown as { titolo: string; territori: { codice: string } | null } | null;
  const canOperate = profile.ruolo !== "PROJECT_MANAGER" && profile.ruolo !== "AMMINISTRATIVO";
  const compilate = d.righe.filter(r => r.stato_presenza).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Registro del ${shortDate(s.data_sessione)}`} lead={<><Link href={`/attivita/${id}`} className="text-[var(--blu)]">{att?.titolo}</Link> · {String(s.ora_inizio).slice(0, 5)}–{String(s.ora_fine).slice(0, 5)} · {s.minuti_erogati} minuti · <Stamp tone={s.stato === "EROGATA" ? "verde" : "blu"}>{s.stato.toLowerCase()}</Stamp></>}
        actions={canOperate && s.stato !== "EROGATA" ? <ActionForm action={setSessionStatusAction} submitLabel="Segna come erogata" compact variant="secondary"><input type="hidden" name="sessione_id" value={s.id} /><input type="hidden" name="stato" value="EROGATA" /></ActionForm> : null} />
      <Panel title={`Presenze (${compilate}/${d.righe.length} compilate)`}>
        {d.righe.length ? (
          <ActionForm action={saveAttendanceSheetAction} submitLabel="Salva registro" pendingLabel="Salvataggio…" resetOnSuccess={false} className="p-4">
            <input type="hidden" name="sessione_id" value={s.id} />
            <div className="grid gap-3">
              {d.righe.map(r => (
                <fieldset key={r.minore_id} className="rounded-md border border-[var(--line)] p-3">
                  <legend className="px-1 text-sm font-semibold">{r.pseudonimo} <span className="font-mono text-xs font-normal text-[var(--ink-3)]">{r.codice_identificativo}</span></legend>
                  <div className="grid grid-cols-4 gap-2">
                    {OPZIONI.map(([v, l]) => (
                      <label key={v} className="presenza-opt"><input type="radio" name={`presenza__${r.minore_id}`} value={v} defaultChecked={r.stato_presenza === v} disabled={!canOperate} /><span data-v={v}>{l}</span></label>
                    ))}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
                    <input name={`minuti__${r.minore_id}`} type="number" min={0} max={1440} className="field-input" placeholder="minuti" defaultValue={r.minuti_frequentati ?? s.minuti_erogati} disabled={!canOperate} aria-label="Minuti frequentati" />
                    <input name={`note__${r.minore_id}`} className="field-input" placeholder="Nota educativa (facoltativa)" defaultValue={r.note_educatore ?? ""} disabled={!canOperate} aria-label="Nota" />
                  </div>
                </fieldset>
              ))}
            </div>
          </ActionForm>
        ) : <Empty>Nessun iscritto all&apos;attività: iscrivi i beneficiari dalla pagina dell&apos;attività prima di compilare il registro.</Empty>}
      </Panel>
      <p className="mt-3 text-xs text-[var(--ink-3)]">Il registro digitale integra il foglio firme cartaceo della sessione, che resta il giustificativo da conservare nel fascicolo di rendicontazione.</p>
    </div>
  );
}
