"use client";
import { Button } from "@/components/ui/primitives";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-bold">Qualcosa non ha funzionato</h1><p className="mt-2 text-sm text-[var(--ink-2)]">Riprova. Se il problema persiste segnala al Project Manager il codice {error.digest ?? "n.d."}.</p><Button className="mt-4" onClick={reset}>Riprova</Button></main>;
}
