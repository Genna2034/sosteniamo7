import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("territori").select("id", { head: true, count: "exact" });
    // Senza sessione la RLS non restituisce righe ma la connessione risponde: basta che non sia un errore di rete/config.
    if (error && !/permission|policy|JWT/i.test(error.message)) return NextResponse.json({ status: "not_ready" }, { status: 503 });
    return NextResponse.json({ status: "ready" });
  } catch { return NextResponse.json({ status: "not_ready" }, { status: 503 }); }
}
