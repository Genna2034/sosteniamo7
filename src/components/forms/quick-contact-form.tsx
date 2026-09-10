"use client";
import { useState, useTransition } from "react";
import { MessageCircle, Phone, UserRound } from "lucide-react";
import { recordContactAction } from "@/lib/actions/contatti";
import { Button, Field, Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Canale = "IN_PRESENZA" | "TELEFONICO" | "MESSAGGISTICA";
const canali: Array<[Canale, typeof UserRound, string]> = [["IN_PRESENZA", UserRound, "In presenza"], ["TELEFONICO", Phone, "Telefonata"], ["MESSAGGISTICA", MessageCircle, "Messaggio"]];

export function QuickContactForm({ cases }: { cases: Array<{ minoreId: string; piaeId: string; label: string }> }) {
  const [selected, setSelected] = useState(cases[0]?.piaeId ?? "");
  const [canale, setCanale] = useState<Canale>("IN_PRESENZA");
  const [esito, setEsito] = useState<"RIUSCITO" | "NON_RAGGIUNTO">("RIUSCITO");
  const [durata, setDurata] = useState(15);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMessage(null);
    start(async () => {
      const res = await recordContactAction({ piae_id: selected, timestamp_contatto: new Date().toISOString(), canale, durata_minuti: durata, esito, note_diario_bordo: note || null });
      setMessage(res.ok ? { ok: true, text: "Contatto registrato nel diario di bordo." } : { ok: false, text: res.error });
      if (res.ok) setNote("");
    });
  }

  return (
    <Panel className="p-4 sm:p-5">
      <div className="grid gap-5">
        <Field label="Beneficiario"><select className="field-input" value={selected} onChange={e => setSelected(e.target.value)}>{cases.map(c => <option key={c.piaeId} value={c.piaeId}>{c.label}</option>)}</select></Field>
        <div><div className="mb-2 text-sm font-medium">Canale</div>
          <div className="grid grid-cols-3 gap-2">{canali.map(([v, Icon, l]) => (
            <button key={v} type="button" onClick={() => setCanale(v)} aria-pressed={canale === v} className={cn("min-h-20 rounded-lg border p-2 text-xs font-semibold", canale === v ? "border-[var(--blu)] bg-[var(--blu-soft)] text-[var(--blu)]" : "border-[var(--line)] bg-white text-[var(--ink-2)]")}><Icon className="mx-auto mb-1 h-5 w-5" aria-hidden />{l}</button>))}</div></div>
        <div><div className="mb-2 text-sm font-medium">Esito</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEsito("RIUSCITO")} aria-pressed={esito === "RIUSCITO"} className={cn("min-h-12 rounded-lg border font-semibold", esito === "RIUSCITO" ? "border-[var(--verde)] bg-[var(--verde-soft)] text-[var(--verde)]" : "border-[var(--line)]")}>Riuscito</button>
            <button type="button" onClick={() => setEsito("NON_RAGGIUNTO")} aria-pressed={esito === "NON_RAGGIUNTO"} className={cn("min-h-12 rounded-lg border font-semibold", esito === "NON_RAGGIUNTO" ? "border-[var(--ambra)] bg-[var(--ambra-soft)] text-[var(--ambra)]" : "border-[var(--line)]")}>Non raggiunto</button>
          </div></div>
        <Field label="Durata (minuti)"><input type="number" min={0} max={1440} className="field-input" value={durata} onChange={e => setDurata(Number(e.target.value))} /></Field>
        <Field label="Nota educativa" hint="Osservazioni operative. Niente informazioni cliniche o giudiziarie: quelle vanno nel fascicolo riservato dello specialista.">
          <textarea className="field-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Cosa è emerso, prossimo appuntamento…" /></Field>
        {message ? <p role="status" className={cn("rounded-md p-3 text-sm", message.ok ? "bg-[var(--verde-soft)] text-[var(--verde)]" : "bg-[var(--rosso-soft)] text-[var(--rosso)]")}>{message.text}</p> : null}
        <Button onClick={submit} disabled={pending || !selected} className="w-full">{pending ? "Registrazione…" : "Registra contatto"}</Button>
      </div>
    </Panel>
  );
}
