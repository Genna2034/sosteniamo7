import { LoginForm } from "@/components/forms/login-form";

export const metadata = { title: "Accesso" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; err?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ background: "linear-gradient(160deg, #0f5f6c 0%, #157a89 55%, #1f8a5a 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-white">
          <div className="text-2xl font-bold leading-tight">SosteniAMO<br />il Quartiere</div>
          <div className="mt-2 text-sm text-blue-200">Piattaforma di monitoraggio e rendicontazione · RTI Emmanuel, EITD, Maestri di Strada, Esculapio</div>
        </div>
        <div className="rounded-lg bg-white p-6">
          <h1 className="text-lg font-semibold">Accedi</h1>
          <p className="mt-1 text-sm text-[var(--ink-2)]">Usa le credenziali personali assegnate dal coordinamento. Gli account non si condividono.</p>
          {sp.err === "config" ? <p className="mt-3 rounded-md bg-[var(--ambra-soft)] p-3 text-sm text-[var(--ambra)]">Configurazione mancante: impostare NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.</p> : null}
          <LoginForm next={sp.next} />
        </div>
        <p className="mt-4 text-center text-xs text-blue-200">Ogni accesso e ogni lettura di dati riservati sono registrati nel log di audit del progetto.</p>
      </div>
    </main>
  );
}
