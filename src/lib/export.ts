import "server-only";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { logSecurityEvent } from "@/lib/security/audit";
import { requireProfile, requireRole } from "@/lib/security/authz";
import type { AppRole } from "@/types/domain";

export async function csvResponse(opts: { roles: AppRole[]; table: string; filename: string; headers: string[]; load: () => Promise<Array<Record<string, unknown>>> }) {
  try {
    const profile = await requireProfile(); requireRole(profile, opts.roles);
    const rows = await opts.load();
    await logSecurityEvent({ action: "EXPORT", table: opts.table, reasonCode: `CSV:${rows.length}` });
    return new NextResponse(toCsv(opts.headers, rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${opts.filename}"`, "cache-control": "no-store" } });
  } catch (e) {
    const status = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Non autorizzato" : "Sessione non valida" }, { status });
  }
}

export function periodo(url: string) {
  const u = new URL(url);
  return { dal: u.searchParams.get("dal") ?? "2026-08-04", al: u.searchParams.get("al") ?? "2027-01-31" };
}
