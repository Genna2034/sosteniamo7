"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/primitives";
import type { ActionResult } from "@/types/domain";

export function RunChecksButton({ action }: { action: () => Promise<ActionResult<Record<string, number>>> }) {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await action(); setMsg(r.ok ? `Nuovi alert: ${Object.values(r.data).reduce((a, b) => a + b, 0)}` : r.error); })}>{pending ? "Controllo…" : "Esegui controlli"}</Button>
      {msg ? <span className="text-xs text-[var(--ink-2)]">{msg}</span> : null}
    </div>
  );
}
