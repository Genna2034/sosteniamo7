import { requireProfile, requireRole } from "@/lib/security/authz";
import { getReferenceData, getRete } from "@/lib/queries";
import { createActivityAction } from "@/lib/actions/attivita";
import { ActionForm } from "@/components/forms/action-form";
import { Field, PageHeader, Panel } from "@/components/ui/primitives";
import { TIPO_ATTIVITA_LABEL } from "@/types/domain";

export const metadata = { title: "Programma attività" };

export default async function NuovaAttivitaPage() {
  const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
  const [ref, rete] = await Promise.all([getReferenceData(), getRete()]);
  const territori = profile.ruolo === "COORDINATORE" ? ref.territori.filter(t => t.id === profile.territorio_id) : ref.territori;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Programma un'attività" lead="Il titolo è quello operativo; nella descrizione riporta la dicitura della relazione tecnica cui l'edizione corrisponde (es. «Freestyle rap e beatbox» per il laboratorio musicale), così la rendicontazione è tracciabile rispetto all'offerta." />
      <Panel className="p-4">
        <ActionForm action={createActivityAction} submitLabel="Programma attività">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Territorio"><select name="territorio_id" className="field-input" required>{territori.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.codice})</option>)}</select></Field>
            <Field label="Tipo"><select name="tipo" className="field-input">{Object.entries(TIPO_ATTIVITA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Titolo" className="sm:col-span-2"><input name="titolo" className="field-input" required placeholder="es. Laboratorio musicale – edizione Ponticelli" /></Field>
            <Field label="Corrispondenza con la relazione tecnica" className="sm:col-span-2"><textarea name="descrizione_offerta" className="field-input" placeholder="Dicitura e contenuti come da offerta" /></Field>
            <Field label="Ente erogatore (RTI)"><select name="ente_erogatore" className="field-input" defaultValue=""><option value="">Da definire</option>{ref.enti.map(e => <option key={e.codice} value={e.codice}>{e.denominazione}</option>)}</select></Field>
            <Field label="Ore minime previste" hint="Capitolato art. 4: almeno 8 ore per laboratorio e corso sportivo"><input name="ore_minime_previste" type="number" min={0} className="field-input" defaultValue={8} /></Field>
            <Field label="Inizio"><input name="data_inizio" type="date" className="field-input" /></Field>
            <Field label="Fine"><input name="data_fine" type="date" className="field-input" /></Field>
            <Field label="Realtà ospitante (mappa comunità educante)" className="sm:col-span-2"><select name="risorsa_id" className="field-input" defaultValue=""><option value="">Nessuna / sede propria</option>{rete.risorse.filter(r => territori.some(t => t.id === r.territorio_id)).map(r => <option key={r.id} value={r.id}>{r.denominazione}</option>)}</select></Field>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
