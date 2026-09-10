import { requireProfile } from "@/lib/security/authz";
import { getReferenceData, getTimesheetData } from "@/lib/queries";
import { createTimesheetAction, deleteTimesheetAction, reviewTimesheetAction } from "@/lib/actions/timesheet";
import { ActionForm } from "@/components/forms/action-form";
import { Empty, Field, PageHeader, Panel, Stamp, td, th } from "@/components/ui/primitives";
import { euro, hours, shortDate, todayIso } from "@/lib/utils";

export const metadata = { title: "Le mie ore" };

type Riga = { id: string; data: string; ore: number; stato: string; descrizione: string; nome: string; cognome: string; figura_descrizione: string; tariffa_oraria: number; valore_parametrico: number; territorio_codice: string | null; attivita_titolo: string | null; note_vidimazione?: string | null };

export default async function TimesheetPage() {
  const profile = await requireProfile();
  const [ref, d] = await Promise.all([getReferenceData(), getTimesheetData(profile)]);
  const mine = d.mine as Riga[]; const toReview = d.toReview as Riga[];
  const totMie = mine.reduce((t, r) => t + Number(r.ore), 0); const totVid = mine.filter(r => r.stato === "VIDIMATO").reduce((t, r) => t + Number(r.ore), 0);
  const cfg = ref.config;
  const tono = (s: string) => s === "VIDIMATO" ? "verde" : s === "RESPINTO" ? "rosso" : s === "INVIATO" ? "ambra" : "neutral";
  return (
    <div>
      <PageHeader title="Le mie ore" lead={<>Timesheet nominativo giornaliero: è il giustificativo delle ore di personale. Le ore vanno registrate il giorno stesso e vidimate dal Coordinatore. {cfg ? <>Periodo ammesso: {shortDate(cfg.data_avvio)} – {shortDate(cfg.data_fine_progetto)}; l&apos;erogazione si chiude il {shortDate(cfg.data_fine_erogazione)}.</> : null}</>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Registra ore">
          <div className="p-4">
            {!profile.figura_id ? <p className="mb-3 rounded-md bg-[var(--ambra-soft)] p-3 text-sm text-[var(--ambra)]">Il tuo profilo non ha una figura professionale impostata: scegli quella corretta o chiedi al PM di configurarla.</p> : null}
            <ActionForm action={createTimesheetAction} submitLabel="Invia per vidimazione">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data"><input name="data" type="date" className="field-input" defaultValue={todayIso()} min={cfg?.data_avvio} max={cfg?.data_fine_progetto} required /></Field>
                <Field label="Ore" hint="A quarti d'ora"><input name="ore" type="number" step={0.25} min={0.25} max={12} className="field-input" defaultValue={2} required /></Field>
                <Field label="Figura professionale" className="sm:col-span-2"><select name="figura_id" className="field-input" defaultValue={profile.figura_id ?? ""} required>{ref.figure.map(f => <option key={f.id} value={f.id}>{f.descrizione} — {euro(f.tariffa_oraria)}/h</option>)}</select></Field>
                <Field label="Territorio"><select name="territorio_id" className="field-input" defaultValue={profile.territorio_id ?? ""}><option value="">Trasversale</option>{ref.territori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></Field>
                <Field label="Attività collegata"><select name="attivita_id" className="field-input" defaultValue=""><option value="">Nessuna / trasversale</option>{d.attivita.map(a => <option key={a.id} value={a.id}>{a.titolo}</option>)}</select></Field>
              </div>
              <Field label="Descrizione dell'attività svolta" hint="Come sul timesheet cartaceo: cosa, dove, con chi."><textarea name="descrizione" className="field-input" required minLength={5} /></Field>
            </ActionForm>
          </div>
        </Panel>
        <div className="grid gap-5">
          <Panel title="Le mie registrazioni" aside={<span className="text-sm text-[var(--ink-2)]">{hours(totMie)} totali · {hours(totVid)} vidimate</span>}>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Data</th><th className={th}>Ore</th><th className={th}>Figura</th><th className={th}>Descrizione</th><th className={th}>Stato</th><th className={th}></th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">{mine.map(r => (
                <tr key={r.id}><td className={td}>{shortDate(r.data)}</td><td className={td}>{Number(r.ore).toLocaleString("it-IT")}</td><td className={td}>{r.figura_descrizione.split(" – ")[0]}</td><td className={td}>{r.descrizione}{r.attivita_titolo ? <div className="text-xs text-[var(--ink-3)]">{r.attivita_titolo}</div> : null}{r.note_vidimazione ? <div className="text-xs text-[var(--rosso)]">{r.note_vidimazione}</div> : null}</td>
                  <td className={td}><Stamp tone={tono(r.stato)}>{r.stato.toLowerCase()}</Stamp></td>
                  <td className={td}>{r.stato !== "VIDIMATO" ? <ActionForm action={deleteTimesheetAction} submitLabel="Elimina" compact variant="ghost"><input type="hidden" name="id" value={r.id} /></ActionForm> : null}</td></tr>))}</tbody></table>
              {!mine.length ? <Empty>Nessuna ora registrata.</Empty> : null}</div>
          </Panel>
          {(profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER") ? (
            <Panel title={`Da vidimare (${toReview.length})`}>
              <div className="divide-y divide-[var(--line)]">{toReview.map(r => (
                <div key={r.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
                  <div><div className="font-medium">{r.cognome} {r.nome} · {shortDate(r.data)} · {Number(r.ore).toLocaleString("it-IT")} h · {r.figura_descrizione.split(" – ")[0]}</div><div className="text-[var(--ink-2)]">{r.descrizione}</div><div className="text-xs text-[var(--ink-3)]">{r.territorio_codice ?? "trasversale"}{r.attivita_titolo ? ` · ${r.attivita_titolo}` : ""} · valore parametrico {euro(r.valore_parametrico)}</div></div>
                  <div className="flex gap-2">
                    <ActionForm action={reviewTimesheetAction} submitLabel="Vidima" compact><input type="hidden" name="id" value={r.id} /><input type="hidden" name="stato" value="VIDIMATO" /></ActionForm>
                    <ActionForm action={reviewTimesheetAction} submitLabel="Respingi" compact variant="secondary"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="stato" value="RESPINTO" /><input name="note_vidimazione" className="field-input min-h-9 w-36" placeholder="motivo" /></ActionForm>
                  </div>
                </div>))}
                {!toReview.length ? <Empty>Nessuna riga in attesa.</Empty> : null}</div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
