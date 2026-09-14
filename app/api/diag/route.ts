import { NextResponse } from "next/server";
import { requireProfile, requireRole } from "@/lib/security/authz";
import * as q from "@/lib/queries";
export const dynamic = "force-dynamic";

// Diagnostica per il PM: esegue ogni query di pagina e riporta l'eventuale errore reale (mai mostrato nelle pagine in produzione).
export async function GET() {
  let profile;
  try { profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER"]); }
  catch { return NextResponse.json({ error: "Solo l'amministratore RTI autenticato" }, { status: 403 }); }
  const oggi = new Date().toISOString().slice(0, 10);
  const checks: Record<string, () => Promise<unknown>> = {
    riferimenti: () => q.getReferenceData(), dashboard: () => q.getDashboard(profile!), beneficiari: () => q.listMinori(), attivita: () => q.listAttivita(),
    timesheet: () => q.getTimesheetData(profile!), rendicontazione: () => q.getRendicontazione("2026-08-04", oggi), report: () => q.getReport("2026-08-04", oggi),
    alert: () => q.getAlertCenter(), rete: () => q.getRete(), diario: () => q.getEducatorQuickData(),
  };
  const out: Record<string, string> = {};
  for (const [k, fn] of Object.entries(checks)) {
    try { await fn(); out[k] = "ok"; } catch (e) { out[k] = "ERRORE: " + (e instanceof Error ? e.message : JSON.stringify(e)); }
  }
  return NextResponse.json({ profilo: { ruolo: profile.ruolo, territorio: profile.territorio_id }, esiti: out }, { headers: { "cache-control": "no-store" } });
}
