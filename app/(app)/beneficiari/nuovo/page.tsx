import { guard } from "@/components/page-guard";
import { requireProfile, requireRole } from "@/lib/security/authz";
import { getReferenceData } from "@/lib/queries";
import { createMinorAction } from "@/lib/actions/minori";
import { ActionForm } from "@/components/forms/action-form";
import { Field, PageHeader, Panel } from "@/components/ui/primitives";
import { todayIso } from "@/lib/utils";

export const metadata = { title: "Nuova presa in carico" };

async function NuovoBeneficiarioPage() {
  const profile = await requireProfile(); requireRole(profile, ["COORDINATORE"]);
  const ref = await getReferenceData();
  const territorio = ref.territori.find(t => t.id === profile.territorio_id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuova presa in carico" lead="Nessun dato identificativo diretto: nome, indirizzo e contatti restano nella scheda cartacea custodita dal Coordinatore. Qui si registrano solo codice, pseudonimo e dati necessari al monitoraggio." />
      <Panel className="p-4">
        <ActionForm action={createMinorAction} submitLabel="Registra beneficiario" resetOnSuccess>
          <input type="hidden" name="territorio_id" value={profile.territorio_id ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Codice identificativo" hint={`Formato ${territorio?.codice ?? "TTT"}-001, progressivo per territorio`}>
              <input name="codice_identificativo" className="field-input" placeholder={`${territorio?.codice ?? "TTT"}-001`} required pattern="[A-Za-z]{3}-[0-9]{3,5}" />
            </Field>
            <Field label="Pseudonimo" hint="Un nome di fantasia scelto con il ragazzo o la ragazza">
              <input name="pseudonimo" className="field-input" required minLength={2} />
            </Field>
            <Field label="Data di presa in carico"><input name="data_presa_in_carico" type="date" className="field-input" defaultValue={todayIso()} required /></Field>
            <Field label="Anno e mese di nascita" hint="Serve solo a verificare la fascia 16-18"><input name="data_nascita" type="date" className="field-input" /></Field>
            <Field label="Genere">
              <select name="genere" className="field-input" defaultValue=""><option value="">Non indicato</option><option value="M">M</option><option value="F">F</option><option value="ND">Altro / non dichiarato</option></select>
            </Field>
            <Field label="Territorio"><input className="field-input" value={territorio ? `${territorio.nome} (${territorio.codice})` : ""} disabled readOnly /></Field>
          </div>
          <Field label="Note di primo contatto (L1)" hint="Come è avvenuto l'aggancio, chi ha segnalato, disponibilità. Niente dati sanitari o giudiziari.">
            <textarea name="note_l1" className="field-input" />
          </Field>
        </ActionForm>
      </Panel>
    </div>
  );
}

export default guard(NuovoBeneficiarioPage);
