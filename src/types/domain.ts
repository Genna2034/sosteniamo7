export type AppRole =
  | "PROJECT_MANAGER" | "COORDINATORE" | "EDUCATORE" | "PSICOLOGO"
  | "ASSISTENTE_SOCIALE" | "ALTRO_SPECIALISTA" | "AMMINISTRATIVO";

export type CaseAssignmentRole = "EDUCATORE_CASEMANAGER" | "PSICOLOGO" | "ASSISTENTE_SOCIALE" | "ALTRO_SPECIALISTA";

export interface CurrentProfile {
  id: string;
  nome: string;
  cognome: string;
  ruolo: AppRole;
  territorio_id: string | null;
  ente_partner: string | null;
  figura_id: string | null;
  stato_attivo: "ATTIVO" | "SOSPESO" | "DISABILITATO";
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

export const ROLE_LABEL: Record<AppRole, string> = {
  PROJECT_MANAGER: "Amministratore RTI (Emmanuel)",
  COORDINATORE: "Coordinatore di prossimità",
  EDUCATORE: "Educatore / case manager",
  PSICOLOGO: "Psicologo",
  ASSISTENTE_SOCIALE: "Assistente sociale",
  ALTRO_SPECIALISTA: "Esperto / tutor",
  AMMINISTRATIVO: "Amministrazione e rendicontazione",
};

export const TIPO_ATTIVITA_LABEL: Record<string, string> = {
  LABORATORIO_ARTIGIANO: "Laboratorio professionalizzante",
  CORSO_SPORTIVO: "Corso sportivo",
  AZIONE_DI_STRADA: "Azione di strada",
  ORIENTAMENTO: "Orientamento",
  STAGE_PEER: "Stage peer-to-peer",
  SERVIZIO_ASCOLTO: "Servizio di ascolto",
  ALTRO: "Altro",
};

export const PRESENZA_LABEL: Record<string, string> = {
  PRESENTE: "Presente",
  RITARDO: "In ritardo",
  ASSENTE_GIUSTIFICATO: "Assente giustificato",
  ASSENTE_INGIUSTIFICATO: "Assente",
};

export const ALERT_LABEL: Record<string, string> = {
  FREQ_SUB_70: "Frequenza sotto il 70%",
  MISSED_CONTACTS: "Tre contatti consecutivi non riusciti",
  SLA_REVISIONE_60D: "Revisione PIAE in scadenza",
  AOT_T30_INCOMPLETO: "Accordi territoriali incompleti a T+30",
  CONTATTI_SETTIMANA_INSUFFICIENTI: "Contatti settimanali insufficienti",
};

export const STATO_ESCALATION_LABEL: Record<string, string> = {
  APERTO: "Aperta (SLA 4h)",
  IN_VALUTAZIONE_12H: "In valutazione (12h)",
  PRESA_IN_CARICO_24H: "Presa in carico (24h)",
  TAVOLO_48H: "Tavolo attivato (48h)",
  RISOLTO: "Risolta",
  CHIUSO: "Chiusa",
};
