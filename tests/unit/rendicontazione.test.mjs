import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregaPer, totale, confrontoQuoteRti } from "../../src/lib/rendicontazione.ts";

const righe = [
  { ore: 4, tariffa_oraria: 24.34, figura_codice: "EDU", figura_descrizione: "Educatore", ente_partner: "MDS", ente_denominazione: "Maestri di Strada", territorio_codice: "PNT", stato: "VIDIMATO" },
  { ore: "2.5", tariffa_oraria: "24.34", figura_codice: "EDU", figura_descrizione: "Educatore", ente_partner: "MDS", ente_denominazione: "Maestri di Strada", territorio_codice: "PNT", stato: "INVIATO" },
  { ore: 3, tariffa_oraria: 25.98, figura_codice: "COORD", figura_descrizione: "Coordinatore", ente_partner: "EMMANUEL", ente_denominazione: "Emmanuel", territorio_codice: "CAI", stato: "VIDIMATO" },
  { ore: 1, tariffa_oraria: 34.66, figura_codice: "PM", figura_descrizione: "PM", ente_partner: null, territorio_codice: null, stato: "RESPINTO" },
];

test("aggrega per figura con ore e valore, vidimato separato", () => {
  const a = aggregaPer(righe, "figura");
  const edu = a.find(x => x.chiave === "EDU");
  assert.equal(edu.ore, 6.5);
  assert.equal(edu.ore_vidimate, 4);
  assert.equal(edu.valore, 158.21);           // 6.5 × 24.34
  assert.equal(edu.valore_vidimato, 97.36);   // 4 × 24.34
  assert.equal(edu.righe, 2);
});

test("aggrega per ente e territorio con chiavi N/D", () => {
  const e = aggregaPer(righe, "ente");
  assert.deepEqual(e.map(x => x.chiave).sort(), ["EMMANUEL", "MDS", "N/D"]);
  const t = aggregaPer(righe, "territorio");
  assert.equal(t.find(x => x.chiave === "N/D").ore, 1);
});

test("totale somma e arrotonda a 2 decimali", () => {
  const tot = totale(aggregaPer(righe, "figura"));
  assert.equal(tot.ore, 10.5);
  assert.equal(tot.valore, 270.81); // 158.21 + 77.94 + 34.66
  assert.equal(tot.righe, 4);
});

test("confronto quote RTI calcola incidenza", () => {
  const q = confrontoQuoteRti(aggregaPer(righe, "ente"), [{ codice: "EMMANUEL", denominazione: "Emmanuel", quota_percentuale: 32 }, { codice: "MDS", denominazione: "MdS", quota_percentuale: "28" }]);
  const mds = q.find(x => x.codice === "MDS");
  assert.equal(mds.valore, 158.21);
  assert.equal(mds.quota_percentuale, 28);
  assert.ok(mds.incidenza_pct > 58 && mds.incidenza_pct < 59);
  assert.equal(q.find(x => x.codice === "EMMANUEL").valore, 77.94);
});

test("dataset vuoto", () => {
  assert.deepEqual(aggregaPer([], "figura"), []);
  assert.deepEqual(totale([]), { ore: 0, ore_vidimate: 0, valore: 0, valore_vidimato: 0, righe: 0 });
});
