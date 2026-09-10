import { z } from "zod";
import { uuid } from "./common";
export const createClinicalNoteSchema = z.object({
  minore_id: uuid,
  tipo_dato: z.enum(["SERVIZIO_ASCOLTO", "PSICOTERAPIA_DOMICILIARE", "RISCHIO_SAFEGUARDING", "PROCEDIMENTO_GIUDIZIARIO"]),
  note: z.string().trim().min(1).max(20000),
  data_colloquio: z.preprocess(v => (v === "" ? null : v), z.string().datetime({ offset: true }).nullable().optional()),
});
