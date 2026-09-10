import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSensitiveBytea } from "@/lib/security/crypto";
import { requireProfile } from "@/lib/security/authz";
export const dynamic = "force-dynamic";

// Lettura L3: la RPC verifica l'assegnazione e registra VIEW_SENSITIVE (o VIEW_SENSITIVE_DENIED) nell'audit.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireProfile();
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_clinical_record", { p_record_id: id });
    if (error) return NextResponse.json({ error: "Record non disponibile" }, { status: 404 });
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    return NextResponse.json({ id: record.id, minore_id: record.minore_id, tipo_dato: record.tipo_dato, data_colloquio: record.data_colloquio, created_at: record.created_at, note: decryptSensitiveBytea(record.note_cifrate) }, { headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sessione non valida" }, { status: 401 }); }
}
