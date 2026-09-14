import type { ReactNode } from "react";
import { getProfileOrNull } from "@/lib/security/authz";

// Cattura gli errori di rendering delle pagine e mostra il messaggio reale all'amministratore di Emmanuel
// (Next in produzione lo nasconde). Gli altri utenti vedono una spiegazione semplice.
export function guard<P>(page: (props: P) => Promise<ReactNode>) {
  return async function Guarded(props: P): Promise<ReactNode> {
    try { return await page(props); }
    catch (e) {
      const digest = (e as { digest?: string })?.digest ?? "";
      const msg0 = e instanceof Error ? e.message : "";
      if (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE" || /Dynamic server usage/.test(msg0)) throw e; // redirect(), notFound() e bailout dinamico devono passare
      console.error("[pagina]", e);
      const profile = await getProfileOrNull().catch(() => null);
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : JSON.stringify(e);
      return (
        <div className="card mx-auto max-w-2xl p-6">
          <h1 className="text-xl">Questa pagina non si è aperta</h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">I dati sono al sicuro. Riprova tra qualche istante; se succede ancora, segnala all'amministratore di Emmanuel.</p>
          {profile?.profile?.ruolo === "PROJECT_MANAGER" ? <pre className="mt-4 overflow-auto rounded-md bg-[var(--paper)] p-3 text-xs whitespace-pre-wrap">{msg}{e instanceof Error && e.stack ? "\n\n" + e.stack.split("\n").slice(0, 6).join("\n") : ""}</pre> : null}
        </div>
      );
    }
  };
}
