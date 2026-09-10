import { z } from "zod";
import { optionalText, uuid } from "./common";

export const createContactSchema = z.object({
  piae_id: uuid,
  timestamp_contatto: z.string().datetime({ offset: true }),
  canale: z.enum(["IN_PRESENZA", "TELEFONICO", "MESSAGGISTICA"]),
  durata_minuti: z.coerce.number().int().min(0).max(1440).optional().nullable(),
  esito: z.enum(["RIUSCITO", "NON_RAGGIUNTO"]),
  note_diario_bordo: optionalText(6000),
});
