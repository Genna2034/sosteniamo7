import { z } from "zod";
import { isoDate, optionalDate, optionalText, uuid } from "./common";

export const createMinorSchema = z.object({
  codice_identificativo: z.string().trim().toUpperCase().regex(/^[A-Z]{3}-\d{3,5}$/, "Formato atteso: TTT-000 (es. PNT-014)"),
  territorio_id: uuid,
  pseudonimo: z.string().trim().min(2).max(120),
  data_nascita: optionalDate,
  genere: z.enum(["M", "F", "ND"]).nullable().optional(),
  data_presa_in_carico: isoDate,
  note_l1: optionalText(2000),
});

export const updateMinorSchema = z.object({
  id: uuid,
  pseudonimo: z.string().trim().min(2).max(120).optional(),
  stato: z.enum(["IN_CARICO", "SOSPESO", "CONCLUSO"]).optional(),
  data_conclusione: optionalDate,
  note_l1: optionalText(2000),
});

export const assignCaseSchema = z.object({
  minore_id: uuid,
  utente_id: uuid,
  ruolo_nel_caso: z.enum(["EDUCATORE_CASEMANAGER", "PSICOLOGO", "ASSISTENTE_SOCIALE", "ALTRO_SPECIALISTA"]),
});
