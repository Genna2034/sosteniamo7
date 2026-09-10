import { z } from "zod";
import { isoDate, optionalText, optionalUuid, uuid } from "./common";

export const createTimesheetSchema = z.object({
  figura_id: uuid,
  territorio_id: optionalUuid,
  data: isoDate,
  ore: z.coerce.number().min(0.25, "Minimo 15 minuti").max(12, "Massimo 12 ore al giorno").multipleOf(0.25, "Usa quarti d'ora (0,25)"),
  attivita_id: optionalUuid,
  descrizione: z.string().trim().min(5, "Descrivi l'attività svolta").max(1000),
});

export const reviewTimesheetSchema = z.object({
  id: uuid,
  stato: z.enum(["VIDIMATO", "RESPINTO"]),
  note_vidimazione: optionalText(1000),
});

export const deleteTimesheetSchema = z.object({ id: uuid });
