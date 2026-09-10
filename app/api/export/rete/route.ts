import { csvResponse } from "@/lib/export";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return csvResponse({
    roles: ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"], table: "rete_risorse", filename: "mappa-comunita-educante.csv",
    headers: ["territorio", "denominazione", "tipologia", "referente", "email", "telefono", "disponibilita_oraria", "accordi"],
    load: async () => {
      const s = await createSupabaseServerClient();
      const { data, error } = await s.from("rete_risorse").select("denominazione,tipologia,referente,email,telefono,disponibilita_oraria,territori(codice),accordi_rete(tipo_accordo,stato)").order("denominazione").limit(2000);
      if (error) throw error;
      type Row = { denominazione: string; tipologia: string; referente: string | null; email: string | null; telefono: string | null; disponibilita_oraria: string | null; territori: { codice: string } | null; accordi_rete: Array<{ tipo_accordo: string; stato: string }> };
      return ((data ?? []) as unknown as Row[]).map(r => ({ territorio: r.territori?.codice, denominazione: r.denominazione, tipologia: r.tipologia, referente: r.referente, email: r.email, telefono: r.telefono, disponibilita_oraria: r.disponibilita_oraria, accordi: r.accordi_rete.map(a => `${a.tipo_accordo} (${a.stato})`).join(" | ") }));
    },
  });
}
