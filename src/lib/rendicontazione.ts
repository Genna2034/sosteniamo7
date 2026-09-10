// Calcoli puri per la rendicontazione del personale: nessuna dipendenza da Next o Supabase, testabili in isolamento.
export interface RigaOre {
  ore: number | string;
  tariffa_oraria: number | string;
  figura_codice: string;
  figura_descrizione: string;
  ente_partner: string | null;
  ente_denominazione?: string | null;
  territorio_codice?: string | null;
  stato: string;
}

export interface Aggregato { chiave: string; descrizione: string; ore: number; ore_vidimate: number; valore: number; valore_vidimato: number; righe: number }

function r2(n: number) { return Math.round(n * 100) / 100; }

export function aggregaPer(righe: RigaOre[], by: "figura" | "ente" | "territorio"): Aggregato[] {
  const map = new Map<string, Aggregato>();
  for (const r of righe) {
    const ore = Number(r.ore); const tar = Number(r.tariffa_oraria); const val = ore * tar;
    const [chiave, descrizione] =
      by === "figura" ? [r.figura_codice, r.figura_descrizione] :
      by === "ente" ? [r.ente_partner ?? "N/D", r.ente_denominazione ?? r.ente_partner ?? "Ente non indicato"] :
      [r.territorio_codice ?? "N/D", r.territorio_codice ?? "Territorio non indicato"];
    const a = map.get(chiave) ?? { chiave, descrizione, ore: 0, ore_vidimate: 0, valore: 0, valore_vidimato: 0, righe: 0 };
    a.ore += ore; a.valore += val; a.righe += 1;
    if (r.stato === "VIDIMATO") { a.ore_vidimate += ore; a.valore_vidimato += val; }
    map.set(chiave, a);
  }
  return [...map.values()].map(a => ({ ...a, ore: r2(a.ore), ore_vidimate: r2(a.ore_vidimate), valore: r2(a.valore), valore_vidimato: r2(a.valore_vidimato) }))
    .sort((x, y) => y.valore - x.valore);
}

export function totale(aggregati: Aggregato[]) {
  return aggregati.reduce((t, a) => ({
    ore: r2(t.ore + a.ore), ore_vidimate: r2(t.ore_vidimate + a.ore_vidimate),
    valore: r2(t.valore + a.valore), valore_vidimato: r2(t.valore_vidimato + a.valore_vidimato), righe: t.righe + a.righe,
  }), { ore: 0, ore_vidimate: 0, valore: 0, valore_vidimato: 0, righe: 0 });
}

// Quota RTI: confronta il valore rendicontato per ente con la ripartizione contrattuale.
export function confrontoQuoteRti(perEnte: Aggregato[], quote: Array<{ codice: string; denominazione: string; quota_percentuale: number | string }>) {
  const tot = totale(perEnte).valore;
  return quote.map(q => {
    const a = perEnte.find(x => x.chiave === q.codice);
    const valore = a?.valore ?? 0;
    return { codice: q.codice, denominazione: q.denominazione, quota_percentuale: Number(q.quota_percentuale), valore, incidenza_pct: tot ? r2((valore / tot) * 100) : 0 };
  });
}
