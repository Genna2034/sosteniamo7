"use client";
import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/types/domain";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Props<T> = {
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  compact?: boolean;
};

// Form generico su Server Action: mostra esito, errori di campo e stato di invio.
export function ActionForm<T>({ action, children, submitLabel, pendingLabel = "Salvataggio…", className, resetOnSuccess = true, variant = "primary", compact }: Props<T>) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={cn(compact ? "flex flex-wrap items-end gap-2" : "grid gap-4", className)}>
      {children}
      <div className={cn(compact ? "" : "flex flex-wrap items-center gap-3")}>
        <Button type="submit" disabled={pending} variant={variant}>{pending ? pendingLabel : submitLabel}</Button>
        {state && !compact ? (
          <span role="status" className={cn("text-sm", state.ok ? "text-[var(--verde)]" : "text-[var(--rosso)]")}>
            {state.ok ? (state.message ?? "Salvato") : state.error}
          </span>
        ) : null}
      </div>
      {state && compact ? <span role="status" className={cn("basis-full text-xs", state.ok ? "text-[var(--verde)]" : "text-[var(--rosso)]")}>{state.ok ? (state.message ?? "Fatto") : state.error}</span> : null}
    </form>
  );
}
