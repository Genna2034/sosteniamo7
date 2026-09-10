import { csvResponse, periodo } from "@/lib/export";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { dal, al } = periodo(request.url);
  return csvResponse({
    roles: ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"], table: "timesheet", filename: `timesheet_${dal}_${al}.csv`,
    headers: ["data", "cognome", "nome", "ente_partner", "figura_codice", "figura_descrizione", "territorio_codice", "attivita_titolo", "ore", "tariffa_oraria", "valore_parametrico", "stato", "descrizione", "vidimato_il"],
    load: async () => { const s = await createSupabaseServerClient(); const { data, error } = await s.from("v_rendicontazione_ore").select("*").gte("data", dal).lte("data", al).order("data").order("cognome").limit(10000); if (error) throw error; return data ?? []; },
  });
}
