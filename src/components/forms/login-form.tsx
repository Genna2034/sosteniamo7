"use client";
import { useActionState } from "react";
import { signInAction } from "@/lib/actions/auth";
import { Button, Field } from "@/components/ui/primitives";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="mt-5 grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" error={state && !state.ok ? state.fieldErrors?.email : undefined}>
        <input name="email" type="email" autoComplete="username" required className="field-input" inputMode="email" />
      </Field>
      <Field label="Password" error={state && !state.ok ? state.fieldErrors?.password : undefined}>
        <input name="password" type="password" autoComplete="current-password" required className="field-input" />
      </Field>
      {state && !state.ok && !state.fieldErrors ? <p role="alert" className="text-sm text-[var(--rosso)]">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Verifica in corso…" : "Entra"}</Button>
    </form>
  );
}
