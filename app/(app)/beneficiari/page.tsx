import Link from "next/link";
import { requireProfile } from "@/lib/security/authz";
import { listMinori } from "@/lib/queries";
import { Button, Empty, PageHeader, Panel, Stamp, Territorio, td, th } from "@/components/ui/primitives";
import { coloreTerritorio } from "@/lib/territori";
import { formatPercent, shortDate } from "@/lib/utils";

export const metadata = { title: "Beneficiari" };

export default async function BeneficiariPage() {
  const profile = await requireProfile();
  const rows = await listMinori();
  return (
    <div>
      <PageHeader title="I ragazzi" lead="Ogni ragazzo ha un codice e uno pseudonimo: sono gli unici riferimenti che circolano in registri, report ed export."
        actions={profile.ruolo === "COORDINATORE" ? <Link href="/beneficiari/nuovo"><Button>Prendi in carico</Button></Link> : null} />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Codice</th><th className={th}>Pseudonimo</th><th className={th}>Territorio</th><th className={th}>Stato</th><th className={th}>PIAE</th><th className={th}>Prossima revisione</th><th className={th}>Freq. 14gg</th><th className={th}>In carico dal</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {rows.map(r => {
                const t = r.territori as unknown as { codice: string } | null;
                const piae = (r.piae as unknown as Array<{ id: string; stato: string; data_scadenza_prossima_revisione: string }>).find(p => p.stato === "ATTIVO" || p.stato === "IN_REVISIONE");
                const f = r.v_frequenza_minore_14gg as unknown as Array<{ frequenza_pct: number | null; sessioni: number }> | { frequenza_pct: number | null; sessioni: number } | null;
                const freq = Array.isArray(f) ? f[0] : f;
                return (
                  <tr key={r.id} className="hover:bg-[var(--paper)]">
                    <td className={td}><Link href={`/beneficiari/${r.id}`} className="font-mono text-xs font-semibold text-[var(--ink-2)]">{r.codice_identificativo}</Link></td>
                    <td className={td}><Link href={`/beneficiari/${r.id}`} className="flex items-center gap-2 font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ background: coloreTerritorio(t?.codice) }}>{r.pseudonimo.slice(0, 1)}</span>{r.pseudonimo}</Link></td>
                    <td className={td}><Territorio codice={t?.codice} /></td>
                    <td className={td}><Stamp tone={r.stato === "IN_CARICO" ? "verde" : r.stato === "SOSPESO" ? "ambra" : "neutral"}>{r.stato.replaceAll("_", " ").toLowerCase()}</Stamp></td>
                    <td className={td}>{piae ? <Stamp tone="blu">attivo</Stamp> : <span className="text-[var(--ink-3)]">da avviare</span>}</td>
                    <td className={td}>{piae ? shortDate(piae.data_scadenza_prossima_revisione) : "—"}</td>
                    <td className={td}>{freq?.sessioni ? formatPercent(freq.frequenza_pct) : <span className="text-[var(--ink-3)]">n.d.</span>}</td>
                    <td className={td}>{shortDate(r.data_presa_in_carico)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? <Empty>Nessun beneficiario visibile con il tuo profilo. {profile.ruolo === "COORDINATORE" ? "Registra la prima presa in carico." : "Gli educatori vedono solo i casi loro assegnati dal Coordinatore."}</Empty> : null}
        </div>
      </Panel>
    </div>
  );
}
