import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-bold">Pagina non trovata</h1><p className="mt-2 text-sm text-[var(--ink-2)]">Il record potrebbe non esistere o non essere visibile con il tuo profilo.</p><Link href="/dashboard" className="mt-4 inline-block text-[var(--blu)]">Torna al cruscotto</Link></main>;
}
