"use client";
import { useEffect, useState } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { Button, Field, Panel } from "@/components/ui/primitives";
import type { ActionResult } from "@/types/domain";

type Row = { id: string; tipo_dato: string; data_colloquio: string | null; created_at: string };

// L3: elenco senza contenuti; la nota viene letta solo su richiesta esplicita via route auditata.
export function ClinicalPanel({ minoreId, action }: { minoreId: string; action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  async function load() {
    const r = await fetch(`/api/clinical-record?minore=${minoreId}`, { cache: "no-store" });
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => { load(); }, [minoreId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function reveal(id: string) {
    setLoading(id);
    const r = await fetch(`/api/clinical-record/${id}`, { cache: "no-store" });
    setLoading(null);
    if (r.ok) { const j = await r.json(); setOpen(o => ({ ...o, [id]: j.note })); }
    else setOpen(o => ({ ...o, [id]: "Accesso negato o record non disponibile." }));
  }
  return (
    <Panel title="Fascicolo riservato (L3)">
      <p className="px-4 pt-3 text-xs text-[var(--ink-3)]">Contenuti cifrati, visibili solo a psicologo e assistente sociale assegnati. Ogni apertura è registrata nell&apos;audit.</p>
      <div className="divide-y divide-[var(--line)]">
        {rows.map(r => (
          <div key={r.id} className="px-4 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2"><span>{r.tipo_dato.replaceAll("_", " ").toLowerCase()} · {new Date(r.data_colloquio ?? r.created_at).toLocaleDateString("it-IT")}</span>
              {open[r.id] == null ? <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => reveal(r.id)} disabled={loading === r.id}>{loading === r.id ? "Apertura…" : "Apri nota"}</Button> : null}</div>
            {open[r.id] != null ? <p className="mt-2 whitespace-pre-wrap rounded-md bg-[var(--paper)] p-3">{open[r.id]}</p> : null}
          </div>
        ))}
        {!rows.length ? <div className="px-4 py-4 text-sm text-[var(--ink-3)]">Nessuna nota riservata.</div> : null}
      </div>
      <div className="border-t border-[var(--line)] p-4">
        <ActionForm<undefined> action={async (p: ActionResult | null, fd: FormData) => { const r = await action(p, fd); if (r.ok) load(); return r; }} submitLabel="Salva nota cifrata">
          <input type="hidden" name="minore_id" value={minoreId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tipo"><select name="tipo_dato" className="field-input"><option value="SERVIZIO_ASCOLTO">Servizio di ascolto</option><option value="PSICOTERAPIA_DOMICILIARE">Psicoterapia domiciliare</option><option value="RISCHIO_SAFEGUARDING">Rischio / safeguarding</option><option value="PROCEDIMENTO_GIUDIZIARIO">Procedimento giudiziario</option></select></Field>
            <Field label="Data colloquio"><input name="data_colloquio_local" type="datetime-local" className="field-input" onChange={e => { const iso = e.target.value ? new Date(e.target.value).toISOString() : ""; (e.target.form?.elements.namedItem("data_colloquio") as HTMLInputElement).value = iso; }} /><input type="hidden" name="data_colloquio" /></Field>
          </div>
          <Field label="Nota"><textarea name="note" className="field-input" required /></Field>
        </ActionForm>
      </div>
    </Panel>
  );
}
