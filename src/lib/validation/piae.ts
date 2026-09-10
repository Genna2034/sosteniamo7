import { z } from "zod";
import { checkbox, isoDate, optionalDate, optionalText, uuid } from "./common";

export const createPiaeSchema = z.object({
  minore_id: uuid,
  educatore_referente_id: uuid,
  data_inizio: isoDate,
  contratto_sociale_firmato: checkbox.default(false),
  data_firma_contratto: optionalDate,
}).superRefine((v, ctx) => {
  if (v.contratto_sociale_firmato && !v.data_firma_contratto)
    ctx.addIssue({ code: "custom", path: ["data_firma_contratto"], message: "Indica la data di firma del contratto sociale" });
});

export const addPiaeGoalSchema = z.object({
  piae_id: uuid,
  tipologia: z.enum(["FORMATIVO", "RELAZIONALE", "RESPONSABILITA"]),
  descrizione_smart: z.string().trim().min(10, "Descrivi l'obiettivo in modo misurabile (almeno 10 caratteri)").max(4000),
  target_mensile: optionalText(1000),
});

export const createPiaeRevisionSchema = z.object({
  piae_id: uuid,
  data_effettuazione: isoDate,
  verbale_adattamento_pdca: z.string().trim().min(10).max(10000),
  decisioni_strutturali: z.enum(["RILANCIO", "CAMBIO_LABORATORIO", "INVIO_PSICOLOGO", "CHIUDI", "NESSUNA"]),
  esito: z.enum(["CONFERMATO", "ADATTATO", "CONCLUSO"]),
});
