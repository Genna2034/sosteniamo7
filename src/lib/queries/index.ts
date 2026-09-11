import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/security/authz";
import type { CurrentProfile } from "@/types/domain";

// Nota: le query non filtrano per territorio salvo dove serve alla UI — la RLS è l'enforcement finale.

export async function getReferenceData() {
  const supabase = await createSupabaseServerClient();
  const [territori, figure, enti, cfg] = await Promise.all([
    supabase.from("territori").select("id,codice,nome").order("nome"),
    supabase.from("figure_professionali").select("id,codice,descrizione,tariffa_oraria").eq("attiva", true).order("descrizione"),
    supabase.from("enti_partner").select("codice,denominazione,ruolo_rti,quota_percentuale").order("quota_percentuale", { ascending: false }),
    supabase.from("configurazione_progetto").select("*").maybeSingle(),
  ]);
  return { territori: territori.data ?? [], figure: figure.data ?? [], enti: enti.data ?? [], config: cfg.data };
}

export async function getDashboard(profile: CurrentProfile) {
  const supabase = await createSupabaseServerClient();
  const [kpi, alerts, escalations, due, cfg] = await Promise.all([
    supabase.from("v_kpi_territorio").select("*").order("codice"),
    supabase.from("alert_automatici").select("id,codice_alert,livello,timestamp_rilevamento,dettagli,minore_id,territorio_id,minori(pseudonimo,codice_identificativo)").eq("risolto", false).order("timestamp_rilevamento", { ascending: false }).limit(10),
    supabase.from("escalation_sla_status").select("id,minore_id,livello_gravita,stato,timestamp_apertura,sla").neq("sla", "CHIUSA").order("timestamp_apertura").limit(10),
    supabase.from("piae").select("id,minore_id,data_scadenza_prossima_revisione,stato,minori(pseudonimo,codice_identificativo)").in("stato", ["ATTIVO", "IN_REVISIONE"]).order("data_scadenza_prossima_revisione").limit(8),
    supabase.from("configurazione_progetto").select("*").maybeSingle(),
  ]);
  const territori = (kpi.data ?? []).filter(k => profile.ruolo === "PROJECT_MANAGER" || profile.ruolo === "AMMINISTRATIVO" || k.territorio_id === profile.territorio_id);
  return { territori, alerts: alerts.data ?? [], escalations: escalations.data ?? [], due: due.data ?? [], config: cfg.data };
}

export async function listMinori() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("minori")
    .select("id,codice_identificativo,pseudonimo,stato,data_presa_in_carico,territorio_id,territori(codice,nome),piae(id,stato,data_scadenza_prossima_revisione)")
    .order("codice_identificativo").limit(400);
  if (error) throw error;
  const { data: freq } = await supabase.from("v_frequenza_minore_14gg").select("minore_id,frequenza_pct,sessioni");
  const byId = new Map((freq ?? []).map(f => [f.minore_id as string, f]));
  return (data ?? []).map(r => ({ ...r, v_frequenza_minore_14gg: byId.get(r.id) ? [byId.get(r.id)!] : [] }));
}

export async function getMinore(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: minore } = await supabase.from("minori").select("*,territori(codice,nome)").eq("id", id).maybeSingle();
  if (!minore) return null;
  const [assegnazioni, piae, contatti, presenze, escalation, iscrizioni, alerts, operatori, attivita] = await Promise.all([
    supabase.from("assegnazioni_caso").select("id,ruolo_nel_caso,attiva,data_inizio,data_fine,profili_utenti!assegnazioni_caso_utente_id_fkey(nome,cognome,ruolo)").eq("minore_id", id).order("attiva", { ascending: false }),
    supabase.from("piae").select("*,piae_obiettivi(*),piae_revisioni(*)").eq("minore_id", id).order("versione", { ascending: false }),
    supabase.from("contatti_settimanali").select("id,timestamp_contatto,canale,esito,durata_minuti,note_diario_bordo,piae_id").in("piae_id",
      (await supabase.from("piae").select("id").eq("minore_id", id)).data?.map(p => p.id) ?? ["00000000-0000-0000-0000-000000000000"]).order("timestamp_contatto", { ascending: false }).limit(30),
    supabase.from("partecipazioni").select("id,stato_presenza,minuti_frequentati,sessioni_attivita(data_sessione,attivita(titolo))").eq("minore_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("escalation_sla_status").select("*").eq("minore_id", id).order("timestamp_apertura", { ascending: false }),
    supabase.from("iscrizioni_attivita").select("id,attiva,attivita(id,titolo,tipo,stato)").eq("minore_id", id),
    supabase.from("alert_automatici").select("id,codice_alert,livello,timestamp_rilevamento,dettagli").eq("minore_id", id).eq("risolto", false),
    supabase.from("profili_utenti").select("id,nome,cognome,ruolo").eq("territorio_id", minore.territorio_id).eq("stato_attivo", "ATTIVO").order("cognome"),
    supabase.from("attivita").select("id,titolo,tipo,stato").eq("territorio_id", minore.territorio_id).neq("stato", "ANNULLATA").order("titolo"),
  ]);
  return { minore, assegnazioni: assegnazioni.data ?? [], piae: piae.data ?? [], contatti: contatti.data ?? [], presenze: presenze.data ?? [],
    escalation: escalation.data ?? [], iscrizioni: iscrizioni.data ?? [], alerts: alerts.data ?? [], operatori: operatori.data ?? [], attivita: attivita.data ?? [] };
}

export async function listAttivita() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("attivita")
    .select("id,titolo,tipo,stato,ente_erogatore,ore_minime_previste,data_inizio,data_fine,territorio_id,territori(codice,nome),sessioni_attivita(id,stato,minuti_erogati),iscrizioni_attivita(id)")
    .neq("stato", "ANNULLATA").order("data_inizio", { ascending: true }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function getAttivita(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: attivita } = await supabase.from("attivita").select("*,territori(codice,nome),rete_risorse(denominazione)").eq("id", id).maybeSingle();
  if (!attivita) return null;
  const [sessioni, iscritti, candidati, operatori] = await Promise.all([
    supabase.from("sessioni_attivita").select("id,data_sessione,ora_inizio,ora_fine,minuti_erogati,stato,luogo,operatore_responsabile_id,profili_utenti!sessioni_attivita_operatore_responsabile_id_fkey(nome,cognome),partecipazioni(stato_presenza)").eq("attivita_id", id).order("data_sessione"),
    supabase.from("iscrizioni_attivita").select("id,attiva,minore_id,minori(codice_identificativo,pseudonimo)").eq("attivita_id", id).eq("attiva", true),
    supabase.from("minori").select("id,codice_identificativo,pseudonimo").eq("territorio_id", attivita.territorio_id).eq("stato", "IN_CARICO").order("codice_identificativo"),
    supabase.from("profili_utenti").select("id,nome,cognome").eq("territorio_id", attivita.territorio_id).eq("stato_attivo", "ATTIVO").order("cognome"),
  ]);
  return { attivita, sessioni: sessioni.data ?? [], iscritti: iscritti.data ?? [], candidati: candidati.data ?? [], operatori: operatori.data ?? [] };
}

export async function getRegistroSessione(sessioneId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: sessione } = await supabase.from("sessioni_attivita").select("*,attivita(id,titolo,tipo,territorio_id,territori(codice,nome))").eq("id", sessioneId).maybeSingle();
  if (!sessione) return null;
  const { data: righe } = await supabase.from("v_registro_sessione").select("*").eq("sessione_id", sessioneId).order("codice_identificativo");
  return { sessione, righe: righe ?? [] };
}

export async function getTimesheetData(profile: CurrentProfile) {
  const supabase = await createSupabaseServerClient();
  const mine = supabase.from("v_rendicontazione_ore").select("*").eq("utente_id", profile.id).order("data", { ascending: false }).limit(200);
  const toReview = (profile.ruolo === "COORDINATORE" || profile.ruolo === "PROJECT_MANAGER")
    ? supabase.from("v_rendicontazione_ore").select("*").eq("stato", "INVIATO").neq("utente_id", profile.id).order("data", { ascending: false }).limit(200)
    : Promise.resolve({ data: [] as never[] });
  const attivita = supabase.from("attivita").select("id,titolo").neq("stato", "ANNULLATA").order("titolo");
  const [m, r, a] = await Promise.all([mine, toReview, attivita]);
  return { mine: m.data ?? [], toReview: (r as { data: unknown[] | null }).data ?? [], attivita: a.data ?? [] };
}

export async function getRendicontazione(dal: string, al: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("v_rendicontazione_ore").select("*").gte("data", dal).lte("data", al).order("data").limit(5000);
  if (error) throw error;
  return data ?? [];
}

export async function getReport(dal: string, al: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("report_sintesi", { p_dal: dal, p_al: al });
  if (error) throw error;
  return data as Record<string, unknown> & { territori: Array<Record<string, unknown>> };
}

export async function getAlertCenter() {
  const supabase = await createSupabaseServerClient();
  const [alerts, escalations] = await Promise.all([
    supabase.from("alert_automatici").select("id,codice_alert,livello,timestamp_rilevamento,dettagli,minore_id,territorio_id,minori(pseudonimo,codice_identificativo),territori(codice)").eq("risolto", false).order("timestamp_rilevamento", { ascending: false }).limit(100),
    supabase.from("escalation_sla_status").select("*").order("timestamp_apertura", { ascending: false }).limit(100),
  ]);
  const escIds = (escalations.data ?? []).map(e => e.id);
  const eventi = escIds.length ? (await supabase.from("escalation_eventi").select("id,escalation_id,tipo_evento,timestamp,descrizione,stato_precedente,stato_successivo,profili_utenti!escalation_eventi_attore_id_fkey(nome,cognome)").in("escalation_id", escIds).order("timestamp", { ascending: false })).data ?? [] : [];
  const minori = escIds.length ? (await supabase.from("minori").select("id,pseudonimo,codice_identificativo").in("id", (escalations.data ?? []).map(e => e.minore_id))).data ?? [] : [];
  return { alerts: alerts.data ?? [], escalations: escalations.data ?? [], eventi, minori };
}

export async function getRete() {
  const supabase = await createSupabaseServerClient();
  const [risorse, accordi, territori] = await Promise.all([
    supabase.from("rete_risorse").select("id,territorio_id,denominazione,tipologia,referente,email,telefono,disponibilita_oraria,territori(codice)").order("denominazione").limit(500),
    supabase.from("accordi_rete").select("id,risorsa_id,territorio_id,tipo_accordo,stato,data_sottoscrizione,data_scadenza,protocollo_interno,documento_url").order("data_sottoscrizione", { ascending: false }).limit(500),
    supabase.from("territori").select("id,codice,nome").order("nome"),
  ]);
  return { risorse: risorse.data ?? [], accordi: accordi.data ?? [], territori: territori.data ?? [] };
}

export async function getEducatorQuickData() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const { data: piae } = await supabase.from("piae").select("id,minore_id,minori(codice_identificativo,pseudonimo)").in("stato", ["ATTIVO", "IN_REVISIONE"]).order("minore_id");
  const { data: assignments } = await supabase.from("assegnazioni_caso").select("minore_id").eq("utente_id", profile.id).eq("attiva", true);
  const mine = new Set((assignments ?? []).map(a => a.minore_id));
  const cases = (piae ?? []).filter(p => profile.ruolo === "COORDINATORE" || mine.has(p.minore_id))
    .map(p => { const m = p.minori as unknown as { codice_identificativo: string; pseudonimo: string } | null; return { piaeId: p.id, minoreId: p.minore_id, label: `${m?.pseudonimo ?? "Beneficiario"} · ${m?.codice_identificativo ?? ""}` }; });
  return { profile, cases };
}
