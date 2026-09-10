import { z } from "zod";
import { optionalDate, optionalText, uuid } from "./common";

export const createResourceSchema = z.object({
  territorio_id: uuid,
  denominazione: z.string().trim().min(2).max(200),
  tipologia: z.enum(["SCUOLA", "SERVIZIO_SOCIALE", "BOTTEGA", "ASD", "TERZO_SETTORE", "IMPRESA", "PARROCCHIA", "ALTRO"]),
  referente: optionalText(200),
  email: z.preprocess(v => (v === "" ? null : v), z.string().email().nullable().optional()),
  telefono: optionalText(50),
  disponibilita_oraria: optionalText(300),
  esito_collaborazioni_note: optionalText(2000),
});

export const createAotSchema = z.object({
  risorsa_id: uuid,
  territorio_id: uuid,
  tipo_accordo: z.enum(["AOT_SERVIZI_SOCIALI", "AOT_SCUOLE", "PATTO_COLLABORAZIONE_EDUCATIVA"]),
  protocollo_interno: optionalText(500),
  data_sottoscrizione: optionalDate,
  data_scadenza: optionalDate,
  stato: z.enum(["BOZZA", "ATTIVO", "IN_RINNOVAZIONE", "SCADUTO", "RISOLTO"]),
  documento_url: z.preprocess(v => (v === "" ? null : v), z.string().url().max(2000).nullable().optional()),
}).refine(v => !v.data_scadenza || !v.data_sottoscrizione || v.data_scadenza >= v.data_sottoscrizione, { path: ["data_scadenza"], message: "La scadenza non può precedere la sottoscrizione" });
