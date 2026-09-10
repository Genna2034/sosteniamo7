import { csvResponse, periodo } from "@/lib/export";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { dal, al } = periodo(request.url);
  return csvResponse({
    roles: ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"], table: "partecipazioni", filename: `presenze_${dal}_${al}.csv`,
    headers: ["data_sessione", "ora_inizio", "ora_fine", "minuti_erogati", "territorio", "attivita", "tipo", "codice_identificativo", "stato_presenza", "minuti_frequentati"],
    load: async () => {
      const s = await createSupabaseServerClient();
      const { data, error } = await s.from("partecipazioni").select("stato_presenza,minuti_frequentati,minori(codice_identificativo),sessioni_attivita!inner(data_sessione,ora_inizio,ora_fine,minuti_erogati,attivita(titolo,tipo,territori(codice)))")
        .gte("sessioni_attivita.data_sessione", dal).lte("sessioni_attivita.data_sessione", al).limit(20000);
      if (error) throw error;
      type Row = { stato_presenza: string; minuti_frequentati: number | null; minori: { codice_identificativo: string } | null; sessioni_attivita: { data_sessione: string; ora_inizio: string; ora_fine: string; minuti_erogati: number; attivita: { titolo: string; tipo: string; territori: { codice: string } | null } | null } };
      return ((data ?? []) as unknown as Row[]).map(r => ({ data_sessione: r.sessioni_attivita.data_sessione, ora_inizio: r.sessioni_attivita.ora_inizio, ora_fine: r.sessioni_attivita.ora_fine, minuti_erogati: r.sessioni_attivita.minuti_erogati, territorio: r.sessioni_attivita.attivita?.territori?.codice, attivita: r.sessioni_attivita.attivita?.titolo, tipo: r.sessioni_attivita.attivita?.tipo, codice_identificativo: r.minori?.codice_identificativo, stato_presenza: r.stato_presenza, minuti_frequentati: r.minuti_frequentati }))
        .sort((a, b) => `${a.data_sessione}${a.attivita}`.localeCompare(`${b.data_sessione}${b.attivita}`));
    },
  });
}
