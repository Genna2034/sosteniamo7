import { test } from "node:test";
import assert from "node:assert/strict";
import { formToObject } from "../../src/lib/validation/common.ts";
import { createMinorSchema } from "../../src/lib/validation/minori.ts";
import { createTimesheetSchema } from "../../src/lib/validation/timesheet.ts";
import { createSessionSchema, recordAttendanceSchema } from "../../src/lib/validation/attivita.ts";
import { createPiaeSchema } from "../../src/lib/validation/piae.ts";
import { createAotSchema } from "../../src/lib/validation/rete.ts";

const U = "6b1f6e0e-3f1d-4b8c-9d6f-1a2b3c4d5e6f";

test("formToObject appiattisce e ignora i campi tecnici", () => {
  const fd = new FormData(); fd.set("a", "1"); fd.set("$ACTION_ID", "x"); fd.append("tag[]", "p"); fd.append("tag[]", "q");
  assert.deepEqual(formToObject(fd), { a: "1", tag: ["p", "q"] });
});

test("anagrafica: codice normalizzato, data obbligatoria, campi vuoti → null", () => {
  const v = createMinorSchema.parse({ codice_identificativo: "pnt-014", territorio_id: U, pseudonimo: "Giovane", data_presa_in_carico: "2026-09-01", data_nascita: "", genere: "M", note_l1: "  " });
  assert.equal(v.codice_identificativo, "PNT-014");
  assert.equal(v.data_nascita, null);
  assert.equal(v.note_l1, null);
  assert.throws(() => createMinorSchema.parse({ codice_identificativo: "PNT14", territorio_id: U, pseudonimo: "G", data_presa_in_carico: "2026-09-01" }));
});

test("timesheet: quarti d'ora, limiti, descrizione", () => {
  const v = createTimesheetSchema.parse({ figura_id: U, territorio_id: "", data: "2026-09-02", ore: "2.75", attivita_id: "", descrizione: "Conduzione sessione" });
  assert.equal(v.ore, 2.75); assert.equal(v.territorio_id, null); assert.equal(v.attivita_id, null);
  assert.throws(() => createTimesheetSchema.parse({ figura_id: U, data: "2026-09-02", ore: "2.3", descrizione: "Conduzione" }), /quarti/);
  assert.throws(() => createTimesheetSchema.parse({ figura_id: U, data: "2026-09-02", ore: "13", descrizione: "Conduzione" }), /Massimo/);
  assert.throws(() => createTimesheetSchema.parse({ figura_id: U, data: "2026-09-02", ore: "1", descrizione: "x" }));
});

test("sessione: fine dopo inizio", () => {
  assert.throws(() => createSessionSchema.parse({ attivita_id: U, data_sessione: "2026-09-02", ora_inizio: "17:00", ora_fine: "15:00" }), /fine/);
  const v = createSessionSchema.parse({ attivita_id: U, data_sessione: "2026-09-02", ora_inizio: "15:00", ora_fine: "17:00", operatore_responsabile_id: "" });
  assert.equal(v.operatore_responsabile_id, null);
});

test("presenza: stati ammessi e minuti coerciti", () => {
  const v = recordAttendanceSchema.parse({ sessione_id: U, minore_id: U, stato_presenza: "RITARDO", minuti_frequentati: "90" });
  assert.equal(v.minuti_frequentati, 90);
  assert.throws(() => recordAttendanceSchema.parse({ sessione_id: U, minore_id: U, stato_presenza: "BOH" }));
});

test("PIAE: contratto firmato richiede la data; checkbox HTML", () => {
  assert.throws(() => createPiaeSchema.parse({ minore_id: U, educatore_referente_id: U, data_inizio: "2026-09-01", contratto_sociale_firmato: "on", data_firma_contratto: "" }), /firma/);
  const v = createPiaeSchema.parse({ minore_id: U, educatore_referente_id: U, data_inizio: "2026-09-01" });
  assert.equal(v.contratto_sociale_firmato, false);
});

test("AOT: scadenza non prima della sottoscrizione", () => {
  assert.throws(() => createAotSchema.parse({ risorsa_id: U, territorio_id: U, tipo_accordo: "AOT_SCUOLE", stato: "ATTIVO", data_sottoscrizione: "2026-09-10", data_scadenza: "2026-09-01" }), /scadenza/);
});
