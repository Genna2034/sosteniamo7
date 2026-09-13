import Link from "next/link";
import { BookOpenText, CalendarClock, Clock3, ClipboardCheck, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { CurrentProfile } from "@/types/domain";
import { getOggi } from "@/lib/queries";
import { Empty, Panel, Progress, Stamp, Territorio } from "@/components/ui/primitives";
import { coloreTerritorio } from "@/lib/territori";
import { formatPercent, hours, shortDate } from "@/lib/utils";
import { ALERT_LABEL, STATO_ESCALATION_LABEL } from "@/types/domain";

const giorni = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

export async function OggiView({ profile }: { profile: CurrentProfile }) {
  const d = await getOggi(profile);
  const now = new Date();
  const isCoord = profile.ruolo === "COORDINATORE";
  const mancanti = d.miei.filter(m => m.contatti < 2);
  const saluto = now.getHours() < 13 ? "Buongiorno" : now.getHours() < 18 ? "Buon pomeriggio" : "Buonasera";
  return (
    <div>
      <div className="mb-5">
        <div className="text-sm font-semibold text-[var(--ink-3)]">{giorni[now.getDay()]} {shortDate(d.oggi)}</div>
        <h1>{saluto}, {profile.nome}.</h1>
        <p className="mt-1.5 text-[15px] text-[var(--ink-2)]">
          {d.sessioni.length ? `${d.sessioni.length} ${d.sessioni.length === 1 ? "sessione in programma" : "sessioni in programma"}` : "Nessuna sessione in programma"}
          {d.miei.length ? ` · ${mancanti.length ? `${mancanti.length} ${mancanti.length === 1 ? "ragazzo" : "ragazzi"} ancora da sentire questa settimana` : "tutti i tuoi ragazzi sono stati sentiti questa settimana"}` : ""}
          {isCoord && d.daVidimare ? ` · ${d.daVidimare} ${d.daVidimare === 1 ? "riga di ore" : "righe di ore"} da vidimare` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/diario-rapido" className="action-tile bg-[var(--petrolio)]"><BookOpenText className="h-6 w-6 shrink-0" aria-hidden /><span>Registra contatto<small>diario rapido</small></span></Link>
        <Link href="/timesheet" className="action-tile bg-[#1f8a5a]"><Clock3 className="h-6 w-6 shrink-0" aria-hidden /><span>Segna le ore<small>{d.oreOggi ? `${hours(d.oreOggi)} già oggi` : "nessuna oggi"}</small></span></Link>
        <Link href="/attivita" className="action-tile bg-[#2f7bf0]"><CalendarClock className="h-6 w-6 shrink-0" aria-hidden /><span>Registri presenze<small>attività e sessioni</small></span></Link>
        {isCoord
          ? <Link href="/timesheet" className="action-tile bg-[#e0a400] !text-[#1a1a1a]"><ClipboardCheck className="h-6 w-6 shrink-0" aria-hidden /><span>Vidima ore<small>{d.daVidimare} in attesa</small></span></Link>
          : <Link href="/beneficiari" className="action-tile bg-[#e8603c]"><ClipboardCheck className="h-6 w-6 shrink-0" aria-hidden /><span>I miei ragazzi<small>{d.miei.length} in carico</small></span></Link>}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <div className="grid gap-5">
          <Panel title="Sessioni di oggi">
            <div className="divide-y divide-[var(--line)]">
              {d.sessioni.map(s => { const a = s.attivita as unknown as { titolo: string; territori: { codice: string; nome: string } | null } | null; const compilato = (s.partecipazioni as unknown[]).length > 0; return (
                <Link key={s.id} href={`/attivita/${s.attivita_id}/sessioni/${s.id}`} className="t-band flex items-center gap-3 px-4 py-3 hover:bg-[var(--paper)]" style={{ "--tone": coloreTerritorio(a?.territori?.codice) } as CSSProperties}>
                  <div className="w-14 shrink-0 text-center"><div className="text-lg font-extrabold leading-none tabular-nums">{String(s.ora_inizio).slice(0, 5)}</div><div className="text-[11px] text-[var(--ink-3)]">{String(s.ora_fine).slice(0, 5)}</div></div>
                  <div className="min-w-0 flex-1"><div className="truncate font-bold">{a?.titolo}</div><div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]"><Territorio codice={a?.territori?.codice} nome={a?.territori?.nome} />{s.luogo ? <span>{s.luogo}</span> : null}{s.stato === "EROGATA" ? <Stamp tone="verde">erogata</Stamp> : compilato ? <Stamp tone="blu">registro avviato</Stamp> : <Stamp tone="ambra">registro da compilare</Stamp>}</div></div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--ink-3)]" aria-hidden />
                </Link>); })}
              {!d.sessioni.length ? <Empty>Oggi non ci sono sessioni programmate nel tuo territorio.</Empty> : null}
            </div>
          </Panel>

          {d.miei.length ? (
            <Panel title="I tuoi ragazzi questa settimana" aside={<span className="text-xs text-[var(--ink-3)]">obiettivo: 2 contatti a settimana</span>}>
              <div className="grid gap-px sm:grid-cols-2">
                {[...d.miei].sort((a, b) => a.contatti - b.contatti).map(m => (
                  <Link key={m.id} href={`/beneficiari/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--paper)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white" style={{ background: coloreTerritorio(m.territori?.codice) }}>{m.pseudonimo.slice(0, 1)}</div>
                    <div className="min-w-0 flex-1"><div className="truncate font-bold">{m.pseudonimo} <span className="font-mono text-[11px] font-normal text-[var(--ink-3)]">{m.codice_identificativo}</span></div><div className="mt-1"><Progress value={m.contatti} max={2} tone={m.contatti >= 2 ? "var(--verde)" : m.contatti === 1 ? "#e0a400" : "var(--rosso)"} /></div></div>
                    <div className="text-xs font-bold tabular-nums" style={{ color: m.contatti >= 2 ? "var(--verde)" : "var(--ink-2)" }}>{m.contatti}/2</div>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="grid gap-5">
          {isCoord && d.kpi ? (
            <Panel title={`Il territorio: ${String(d.kpi.nome)}`} tone={coloreTerritorio(String(d.kpi.codice))}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 text-sm">
                {[["Ragazzi in carico", String(d.kpi.beneficiari_in_carico), "su 31 previsti", Number(d.kpi.beneficiari_in_carico), 31],
                  ["PIAE attivi", String(d.kpi.piae_attivi), "uno per ragazzo", Number(d.kpi.piae_attivi), Number(d.kpi.beneficiari_in_carico) || 1],
                  ["Frequenza 14 giorni", formatPercent(d.kpi.frequenza_media_14gg as number | null), "soglia 70%", Number(d.kpi.frequenza_media_14gg ?? 0), 100],
                  ["Ore erogate", hours(Number(d.kpi.ore_erogate)), `${d.kpi.laboratori} lab · ${d.kpi.corsi_sportivi} sport`, Number(d.kpi.ore_erogate), 32],
                  ["Comunità educante", String(d.kpi.risorse_mappate), "realtà su 10", Number(d.kpi.risorse_mappate), 10],
                  ["Accordi AOT", `${d.kpi.aot_attivi}/2`, "scuole e servizi sociali", Number(d.kpi.aot_attivi), 2],
                ].map(([l, v, s, val, max]) => (
                  <div key={String(l)}><div className="text-xs font-semibold text-[var(--ink-2)]">{l}</div><div className="text-xl font-extrabold tabular-nums">{v}</div><div className="my-1.5"><Progress value={Number(val)} max={Number(max)} tone={coloreTerritorio(String(d.kpi!.codice))} /></div><div className="text-[11px] text-[var(--ink-3)]">{s}</div></div>
                ))}
              </div>
            </Panel>
          ) : null}
          <Panel title="Da non perdere di vista" aside={<Link href="/alert" className="text-sm font-semibold text-[var(--petrolio)]">Tutti gli alert</Link>}>
            <div className="divide-y divide-[var(--line)]">
              {d.escalations.map(e => <Link key={e.id} href={`/beneficiari/${e.minore_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--paper)]"><Stamp tone="rosso">PER</Stamp><div className="min-w-0 flex-1 text-sm"><div className="font-bold">{STATO_ESCALATION_LABEL[e.stato] ?? e.stato}</div><div className="text-xs text-[var(--ink-3)]">{e.sla === "IN_SLA" ? "entro i tempi" : "tempi superati"} · dal {shortDate(e.timestamp_apertura)}</div></div><ChevronRight className="h-4 w-4 text-[var(--ink-3)]" aria-hidden /></Link>)}
              {d.alerts.map(a => { const m = a.minori as unknown as { pseudonimo: string } | null; return <Link key={a.id} href={a.minore_id ? `/beneficiari/${a.minore_id}` : "/rete"} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--paper)]"><Stamp tone="ambra">Alert</Stamp><div className="min-w-0 flex-1 text-sm"><div className="font-bold">{ALERT_LABEL[a.codice_alert] ?? a.codice_alert}</div><div className="text-xs text-[var(--ink-3)]">{m?.pseudonimo ?? "Territorio"} · {shortDate(a.timestamp_rilevamento)}</div></div><ChevronRight className="h-4 w-4 text-[var(--ink-3)]" aria-hidden /></Link>; })}
              {!d.alerts.length && !d.escalations.length ? <Empty>Tutto sotto controllo: nessun alert aperto.</Empty> : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
