import { z } from "zod";
import { optionalText, uuid } from "./common";

const stato = z.enum(["APERTO", "IN_VALUTAZIONE_12H", "PRESA_IN_CARICO_24H", "TAVOLO_48H", "RISOLTO", "CHIUSO"]);

export const createEscalationSchema = z.object({
  minore_id: uuid,
  livello_gravita: z.enum(["PER_EMERGENZA_ALTO", "MEDIO_RIPETUTO", "SALVAGUARDIA_MINORE"]),
  descrizione: z.string().trim().min(10).max(10000),
});

export const addEscalationEventSchema = z.object({
  escalation_id: uuid,
  tipo_evento: z.enum(["CAMBIO_STATO", "ASSEGNAZIONE_TASK", "CONVOCAZIONE_URGENZA", "REGISTRAZIONE_CONTATTO", "VERBALE_TAVOLO",
    "NOTIFICA_COORDINATORE", "ATTIVAZIONE_SPECIALISTA", "PIANO_URGENZA", "ATTIVAZIONE_TAVOLO"]),
  descrizione: z.string().trim().min(3).max(10000),
  stato_successivo: z.preprocess(v => (v === "" ? null : v), stato.nullable().optional()),
});

export const recordAuthorityNotificationSchema = z.object({
  escalation_id: uuid,
  destinatario: z.enum(["SERVIZI_SOCIALI", "PROCURA", "ALTRA_AUTORITA"]),
  data_ora_invio: z.string().datetime({ offset: true }),
  numero_protocollo: z.string().trim().min(1).max(250),
  estremi_pec: optionalText(1000),
});

export const closeAlertSchema = z.object({ alert_id: uuid, note: optionalText(1000) });
