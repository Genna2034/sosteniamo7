import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/security/authz";
export const dynamic = "force-dynamic";

// Elenco (senza contenuti) delle note L3 di un beneficiario: vuoto se il profilo non è lo specialista assegnato.
export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const minore = request.nextUrl.searchParams.get("minore");
    if (!minore) return NextResponse.json([], { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("list_clinical_records", { p_minore_id: minore });
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data ?? [], { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sessione non valida" }, { status: 401 }); }
}
