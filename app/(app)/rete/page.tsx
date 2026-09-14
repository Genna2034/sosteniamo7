import { guard } from "@/components/page-guard";
import { requireProfile } from "@/lib/security/authz";
import { getRete } from "@/lib/queries";
import { createAotAction, createResourceAction } from "@/lib/actions/rete";
import { ActionForm } from "@/components/forms/action-form";
import { Button, Empty, Field, PageHeader, Panel, Stamp, td, th } from "@/components/ui/primitives";
import { shortDate } from "@/lib/utils";

export const metadata = { title: "Rete e accordi" };
const TIPI = { SCUOLA: "Scuola", SERVIZIO_SOCIALE: "Servizio sociale", BOTTEGA: "Bottega artigiana", ASD: "Associazione sportiva", TERZO_SETTORE: "Terzo settore", IMPRESA: "Impresa", PARROCCHIA: "Parrocchia / oratorio", ALTRO: "Altro" } as const;

async function RetePage() {
  const profile = await requireProfile();
  const d = await getRete();
  const direttivo = profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER";
  const territori = profile.ruolo === "COORDINATORE" ? d.territori.filter(t => t.id === profile.territorio_id) : d.territori;
  const accordiPer = new Map<string, typeof d.accordi>(); for (const a of d.accordi) accordiPer.set(a.risorsa_id, [...(accordiPer.get(a.risorsa_id) ?? []), a]);
  const copertura = d.territori.map(t => ({ t, scuole: d.accordi.some(a => a.territorio_id === t.id && a.tipo_accordo === "AOT_SCUOLE" && a.stato === "ATTIVO"), sociali: d.accordi.some(a => a.territorio_id === t.id && a.tipo_accordo === "AOT_SERVIZI_SOCIALI" && a.stato === "ATTIVO"), n: d.risorse.filter(r => r.territorio_id === t.id).length }));
  return (
    <div>
      <PageHeader title="Mappa della comunità educante" lead={`${d.risorse.length} realtà mappate su 70 previste; ${d.accordi.filter(a => a.stato === "ATTIVO").length} accordi attivi. Entro T+30 ogni territorio deve avere l'AOT con i Servizi Sociali e con le scuole.`}
        actions={direttivo ? <a href="/api/export/rete"><Button variant="secondary">Esporta mappa (CSV)</Button></a> : null} />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">{copertura.map(c => <div key={c.t.id} className="rounded-md border border-[var(--line)] bg-white p-3 text-sm"><div className="font-semibold">{c.t.codice}</div><div className="text-xs text-[var(--ink-3)]">{c.n} realtà</div><div className="mt-1 flex gap-1"><Stamp tone={c.sociali ? "verde" : "rosso"}>Sociali</Stamp><Stamp tone={c.scuole ? "verde" : "rosso"}>Scuole</Stamp></div></div>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Realtà del territorio">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Realtà</th><th className={th}>Tipo</th><th className={th}>Terr.</th><th className={th}>Referente</th><th className={th}>Accordi</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">{d.risorse.map(r => { const t = r.territori as unknown as { codice: string } | null; const acc = accordiPer.get(r.id) ?? []; return (
              <tr key={r.id}><td className={td}><div className="font-medium">{r.denominazione}</div><div className="text-xs text-[var(--ink-3)]">{r.email ?? r.telefono ?? ""}{r.disponibilita_oraria ? ` · ${r.disponibilita_oraria}` : ""}</div></td><td className={td}>{TIPI[r.tipologia as keyof typeof TIPI] ?? r.tipologia}</td><td className={td}>{t?.codice}</td><td className={td}>{r.referente ?? "—"}</td>
                <td className={td}>{acc.length ? acc.map(a => <div key={a.id}><Stamp tone={a.stato === "ATTIVO" ? "verde" : a.stato === "BOZZA" ? "ambra" : "neutral"}>{a.tipo_accordo.replaceAll("_", " ").toLowerCase()}</Stamp> <span className="text-xs text-[var(--ink-3)]">{a.protocollo_interno ?? ""} {shortDate(a.data_sottoscrizione)}</span></div>) : <span className="text-[var(--ink-3)]">nessuno</span>}</td></tr>); })}</tbody></table>
            {!d.risorse.length ? <Empty>Nessuna realtà mappata.</Empty> : null}</div>
        </Panel>
        {direttivo ? (
          <div className="grid gap-5">
            <Panel title="Aggiungi realtà"><div className="p-4"><ActionForm action={createResourceAction} submitLabel="Aggiungi alla mappa">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Territorio"><select name="territorio_id" className="field-input">{territori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></Field>
                <Field label="Tipo"><select name="tipologia" className="field-input">{Object.entries(TIPI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Denominazione" className="sm:col-span-2"><input name="denominazione" className="field-input" required /></Field>
                <Field label="Referente"><input name="referente" className="field-input" /></Field><Field label="Telefono"><input name="telefono" className="field-input" /></Field>
                <Field label="Email"><input name="email" type="email" className="field-input" /></Field><Field label="Disponibilità"><input name="disponibilita_oraria" className="field-input" placeholder="es. pomeriggio" /></Field>
              </div></ActionForm></div></Panel>
            <Panel title="Registra accordo (AOT / patto)"><div className="p-4"><ActionForm action={createAotAction} submitLabel="Registra accordo">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Territorio"><select name="territorio_id" className="field-input">{territori.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></Field>
                <Field label="Tipo"><select name="tipo_accordo" className="field-input"><option value="AOT_SERVIZI_SOCIALI">AOT Servizi Sociali</option><option value="AOT_SCUOLE">AOT Scuole</option><option value="PATTO_COLLABORAZIONE_EDUCATIVA">Patto di collaborazione educativa</option></select></Field>
                <Field label="Realtà" className="sm:col-span-2"><select name="risorsa_id" className="field-input" required>{d.risorse.filter(r => territori.some(t => t.id === r.territorio_id)).map(r => <option key={r.id} value={r.id}>{r.denominazione}</option>)}</select></Field>
                <Field label="Stato"><select name="stato" className="field-input" defaultValue="ATTIVO"><option value="BOZZA">Bozza</option><option value="ATTIVO">Attivo</option><option value="IN_RINNOVAZIONE">In rinnovo</option><option value="SCADUTO">Scaduto</option><option value="RISOLTO">Risolto</option></select></Field>
                <Field label="Protocollo"><input name="protocollo_interno" className="field-input" /></Field>
                <Field label="Sottoscrizione"><input name="data_sottoscrizione" type="date" className="field-input" /></Field><Field label="Scadenza"><input name="data_scadenza" type="date" className="field-input" /></Field>
                <Field label="Link al documento firmato" className="sm:col-span-2"><input name="documento_url" type="url" className="field-input" placeholder="https://…" /></Field>
              </div></ActionForm></div></Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default guard(RetePage);
