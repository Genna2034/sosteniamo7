import { z } from "zod";
import { isoDate, optionalDate, optionalText, optionalUuid, uuid } from "./common";

export const createActivitySchema = z.object({
  territorio_id: uuid,
  tipo: z.enum(["LABORATORIO_ARTIGIANO", "CORSO_SPORTIVO", "AZIONE_DI_STRADA", "ORIENTAMENTO", "STAGE_PEER", "SERVIZIO_ASCOLTO", "ALTRO"]),
  titolo: z.string().trim().min(3).max(200),
  descrizione_offerta: optionalText(2000),
  ente_erogatore: z.preprocess(v => (v === "" ? null : v), z.enum(["EMMANUEL", "EITD", "MDS", "ESCULAPIO"]).nullable().optional()),
  risorsa_id: optionalUuid,
  ore_minime_previste: z.coerce.number().int().min(0).max(1000).default(8),
  data_inizio: optionalDate,
  data_fine: optionalDate,
}).refine(v => !v.data_inizio || !v.data_fine || v.data_fine >= v.data_inizio, { path: ["data_fine"], message: "La fine non può precedere l'inizio" });

export const updateActivityStatusSchema = z.object({
  id: uuid,
  stato: z.enum(["PROGRAMMATA", "IN_CORSO", "CONCLUSA", "ANNULLATA"]),
});

export const createSessionSchema = z.object({
  attivita_id: uuid,
  data_sessione: isoDate,
  ora_inizio: z.string().regex(/^\d{2}:\d{2}$/),
  ora_fine: z.string().regex(/^\d{2}:\d{2}$/),
  operatore_responsabile_id: optionalUuid,
  luogo: optionalText(300),
  note: optionalText(2000),
}).refine(v => v.ora_fine > v.ora_inizio, { path: ["ora_fine"], message: "L'ora di fine deve seguire quella di inizio" });

export const setSessionStatusSchema = z.object({ sessione_id: uuid, stato: z.enum(["PROGRAMMATA", "EROGATA", "ANNULLATA"]) });

export const enrollSchema = z.object({ attivita_id: uuid, minore_id: uuid });

export const recordAttendanceSchema = z.object({
  sessione_id: uuid,
  minore_id: uuid,
  stato_presenza: z.enum(["PRESENTE", "ASSENTE_GIUSTIFICATO", "ASSENTE_INGIUSTIFICATO", "RITARDO"]),
  minuti_frequentati: z.coerce.number().int().min(0).max(1440).optional().nullable(),
  note_educatore: optionalText(3000),
});
