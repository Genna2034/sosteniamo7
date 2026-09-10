-- =============================================================================
-- SosteniAMO il Quartiere — piattaforma di monitoraggio e rendicontazione
-- Migration 0001: schema, sicurezza (RLS), audit, alert, KPI, rendicontazione
-- Bando S023/2025 — Città Metropolitana di Napoli — POC Legalità 2014-2020
-- CUP H69G25000020001 — CIG B8A12C555A
-- =============================================================================
-- Eseguire nell'SQL Editor di Supabase (o con supabase db push).
-- Idempotente per quanto possibile: usa IF NOT EXISTS e CREATE OR REPLACE.

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;

-- -----------------------------------------------------------------------------
-- 1. Enumerazioni
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum (
    'PROJECT_MANAGER','COORDINATORE','EDUCATORE','PSICOLOGO','ASSISTENTE_SOCIALE','ALTRO_SPECIALISTA','AMMINISTRATIVO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_utente as enum ('ATTIVO','SOSPESO','DISABILITATO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ruolo_caso as enum ('EDUCATORE_CASEMANAGER','PSICOLOGO','ASSISTENTE_SOCIALE','ALTRO_SPECIALISTA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_minore as enum ('IN_CARICO','SOSPESO','CONCLUSO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_piae as enum ('ATTIVO','IN_REVISIONE','CONCLUSO','SOSPESO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_attivita as enum (
    'LABORATORIO_ARTIGIANO','CORSO_SPORTIVO','AZIONE_DI_STRADA','ORIENTAMENTO','STAGE_PEER','SERVIZIO_ASCOLTO','ALTRO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_attivita as enum ('PROGRAMMATA','IN_CORSO','CONCLUSA','ANNULLATA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_sessione as enum ('PROGRAMMATA','EROGATA','ANNULLATA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_presenza as enum ('PRESENTE','ASSENTE_GIUSTIFICATO','ASSENTE_INGIUSTIFICATO','RITARDO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.canale_contatto as enum ('IN_PRESENZA','TELEFONICO','MESSAGGISTICA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.esito_contatto as enum ('RIUSCITO','NON_RAGGIUNTO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_timesheet as enum ('BOZZA','INVIATO','VIDIMATO','RESPINTO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.livello_alert as enum ('GIALLO','ROSSO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.livello_escalation as enum ('PER_EMERGENZA_ALTO','MEDIO_RIPETUTO','SALVAGUARDIA_MINORE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_escalation as enum ('APERTO','IN_VALUTAZIONE_12H','PRESA_IN_CARICO_24H','TAVOLO_48H','RISOLTO','CHIUSO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_evento_escalation as enum (
    'CAMBIO_STATO','ASSEGNAZIONE_TASK','CONVOCAZIONE_URGENZA','REGISTRAZIONE_CONTATTO','VERBALE_TAVOLO',
    'NOTIFICA_COORDINATORE','ATTIVAZIONE_SPECIALISTA','PIANO_URGENZA','ATTIVAZIONE_TAVOLO','NOTIFICA_AUTORITA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_dato_clinico as enum ('SERVIZIO_ASCOLTO','PSICOTERAPIA_DOMICILIARE','RISCHIO_SAFEGUARDING','PROCEDIMENTO_GIUDIZIARIO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_accordo as enum ('AOT_SERVIZI_SOCIALI','AOT_SCUOLE','PATTO_COLLABORAZIONE_EDUCATIVA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stato_accordo as enum ('BOZZA','ATTIVO','IN_RINNOVAZIONE','SCADUTO','RISOLTO');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabelle di configurazione
-- -----------------------------------------------------------------------------
create table if not exists public.territori (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  nome text not null,
  comune text,
  created_at timestamptz not null default now()
);

create table if not exists public.enti_partner (
  codice text primary key,
  denominazione text not null,
  ruolo_rti text not null,             -- MANDATARIA / MANDANTE
  quota_percentuale numeric(5,2) not null check (quota_percentuale >= 0 and quota_percentuale <= 100)
);

create table if not exists public.figure_professionali (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  descrizione text not null,
  tariffa_oraria numeric(8,2) not null check (tariffa_oraria >= 0),
  fonte_tariffa text,                  -- es. "Capitolato art. 7" o "Rimodulazione 23.07.2026"
  attiva boolean not null default true
);

create table if not exists public.configurazione_progetto (
  id boolean primary key default true check (id),
  titolo text not null default 'SosteniAMO il Quartiere',
  cup text not null default 'H69G25000020001',
  cig text not null default 'B8A12C555A',
  data_avvio date not null,
  data_fine_erogazione date not null,
  data_fine_progetto date not null,
  target_beneficiari integer not null default 217,
  target_risorse integer not null default 70,
  soglia_frequenza numeric(5,2) not null default 70,
  contatti_settimanali_minimi integer not null default 2,
  giorni_revisione_piae integer not null default 60,
  updated_at timestamptz not null default now(),
  check (data_fine_erogazione >= data_avvio and data_fine_progetto >= data_fine_erogazione)
);

-- -----------------------------------------------------------------------------
-- 3. Utenti
-- -----------------------------------------------------------------------------
create table if not exists public.profili_utenti (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cognome text not null,
  ruolo public.app_role not null,
  territorio_id uuid references public.territori(id),
  ente_partner text references public.enti_partner(codice),
  figura_id uuid references public.figure_professionali(id),
  qualifica text,
  stato_attivo public.stato_utente not null default 'ATTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ruolo = 'PROJECT_MANAGER' or ruolo = 'AMMINISTRATIVO' or territorio_id is not null)
);

-- -----------------------------------------------------------------------------
-- 4. Beneficiari e presa in carico
-- -----------------------------------------------------------------------------
create table if not exists public.minori (
  id uuid primary key default gen_random_uuid(),
  codice_identificativo text not null unique,
  territorio_id uuid not null references public.territori(id),
  pseudonimo text not null,
  data_nascita date,
  genere text,
  stato public.stato_minore not null default 'IN_CARICO',
  data_presa_in_carico date,
  data_conclusione date,
  note_l1 text,
  created_by uuid references public.profili_utenti(id),
  updated_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists minori_territorio_idx on public.minori(territorio_id);

create table if not exists public.assegnazioni_caso (
  id uuid primary key default gen_random_uuid(),
  minore_id uuid not null references public.minori(id) on delete cascade,
  utente_id uuid not null references public.profili_utenti(id),
  ruolo_nel_caso public.ruolo_caso not null,
  data_inizio date not null default current_date,
  data_fine date,
  attiva boolean not null default true,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  check (data_fine is null or data_fine >= data_inizio)
);
create index if not exists assegnazioni_utente_idx on public.assegnazioni_caso(utente_id) where attiva;
create index if not exists assegnazioni_minore_idx on public.assegnazioni_caso(minore_id) where attiva;
create unique index if not exists assegnazioni_un_casemanager
  on public.assegnazioni_caso(minore_id) where attiva and ruolo_nel_caso = 'EDUCATORE_CASEMANAGER';

create table if not exists public.assessment_multidimensionale (
  id uuid primary key default gen_random_uuid(),
  minore_id uuid not null references public.minori(id) on delete cascade,
  versione integer not null default 1,
  assistente_sociale_id uuid references public.profili_utenti(id),
  status_scolastico text,
  situazione_familiare text,
  competenze_informali text,
  fattori_rischio text,
  fattori_protezione text,
  validato_da_coordinatore boolean not null default false,
  validato_da uuid references public.profili_utenti(id),
  timestamp_validazione timestamptz,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  unique (minore_id, versione)
);

-- -----------------------------------------------------------------------------
-- 5. PIAE
-- -----------------------------------------------------------------------------
create table if not exists public.piae (
  id uuid primary key default gen_random_uuid(),
  minore_id uuid not null references public.minori(id) on delete cascade,
  versione integer not null default 1,
  educatore_referente_id uuid not null references public.profili_utenti(id),
  data_inizio date not null,
  data_scadenza_prossima_revisione date not null,
  stato public.stato_piae not null default 'ATTIVO',
  contratto_sociale_firmato boolean not null default false,
  data_firma_contratto date,
  created_by uuid references public.profili_utenti(id),
  updated_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (minore_id, versione),
  check (not contratto_sociale_firmato or data_firma_contratto is not null)
);
create unique index if not exists piae_un_operativo on public.piae(minore_id) where stato in ('ATTIVO','IN_REVISIONE');

create table if not exists public.piae_obiettivi (
  id uuid primary key default gen_random_uuid(),
  piae_id uuid not null references public.piae(id) on delete cascade,
  tipologia text not null check (tipologia in ('FORMATIVO','RELAZIONALE','RESPONSABILITA')),
  descrizione_smart text not null,
  target_mensile text,
  stato text not null default 'APERTO' check (stato in ('APERTO','RAGGIUNTO','RIVISTO')),
  created_at timestamptz not null default now()
);

create table if not exists public.piae_revisioni (
  id uuid primary key default gen_random_uuid(),
  piae_id uuid not null references public.piae(id) on delete cascade,
  numero_revisione integer not null,
  data_scadenza_prevista date not null,
  data_effettuazione date not null,
  coordinatore_id uuid not null references public.profili_utenti(id),
  verbale_adattamento_pdca text not null,
  decisioni_strutturali text not null check (decisioni_strutturali in ('RILANCIO','CAMBIO_LABORATORIO','INVIO_PSICOLOGO','CHIUDI','NESSUNA')),
  esito text not null check (esito in ('CONFERMATO','ADATTATO','CONCLUSO')),
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  unique (piae_id, numero_revisione)
);

create table if not exists public.contatti_settimanali (
  id uuid primary key default gen_random_uuid(),
  piae_id uuid not null references public.piae(id) on delete cascade,
  operatore_id uuid not null references public.profili_utenti(id),
  timestamp_contatto timestamptz not null,
  canale public.canale_contatto not null,
  durata_minuti integer check (durata_minuti between 0 and 1440),
  esito public.esito_contatto not null,
  note_diario_bordo text,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now()
);
create index if not exists contatti_piae_ts_idx on public.contatti_settimanali(piae_id, timestamp_contatto desc);

-- -----------------------------------------------------------------------------
-- 6. Rete territoriale (Mappa della Comunità Educante) e AOT
-- -----------------------------------------------------------------------------
create table if not exists public.rete_risorse (
  id uuid primary key default gen_random_uuid(),
  territorio_id uuid not null references public.territori(id),
  denominazione text not null,
  tipologia text not null check (tipologia in ('SCUOLA','SERVIZIO_SOCIALE','BOTTEGA','ASD','TERZO_SETTORE','IMPRESA','PARROCCHIA','ALTRO')),
  referente text,
  email text,
  telefono text,
  disponibilita_oraria text,
  esito_collaborazioni_note text,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  unique (territorio_id, denominazione)
);

create table if not exists public.accordi_rete (
  id uuid primary key default gen_random_uuid(),
  risorsa_id uuid not null references public.rete_risorse(id) on delete cascade,
  territorio_id uuid not null references public.territori(id),
  tipo_accordo public.tipo_accordo not null,
  protocollo_interno text,
  data_sottoscrizione date,
  data_scadenza date,
  coordinatore_firmatario_id uuid references public.profili_utenti(id),
  stato public.stato_accordo not null default 'BOZZA',
  documento_url text,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  check (data_scadenza is null or data_sottoscrizione is null or data_scadenza >= data_sottoscrizione)
);

-- -----------------------------------------------------------------------------
-- 7. Attività (laboratori, corsi sportivi, azioni), sessioni, presenze
-- -----------------------------------------------------------------------------
create table if not exists public.attivita (
  id uuid primary key default gen_random_uuid(),
  territorio_id uuid not null references public.territori(id),
  tipo public.tipo_attivita not null,
  titolo text not null,
  descrizione_offerta text,            -- dicitura della relazione tecnica cui l'edizione corrisponde
  ente_erogatore text references public.enti_partner(codice),
  risorsa_id uuid references public.rete_risorse(id),
  ore_minime_previste integer not null default 8 check (ore_minime_previste >= 0),
  data_inizio date,
  data_fine date,
  stato public.stato_attivita not null default 'PROGRAMMATA',
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  check (data_fine is null or data_inizio is null or data_fine >= data_inizio)
);
create index if not exists attivita_territorio_idx on public.attivita(territorio_id);

create table if not exists public.iscrizioni_attivita (
  id uuid primary key default gen_random_uuid(),
  attivita_id uuid not null references public.attivita(id) on delete cascade,
  minore_id uuid not null references public.minori(id) on delete cascade,
  data_iscrizione date not null default current_date,
  attiva boolean not null default true,
  created_by uuid references public.profili_utenti(id),
  unique (attivita_id, minore_id)
);

create table if not exists public.sessioni_attivita (
  id uuid primary key default gen_random_uuid(),
  attivita_id uuid not null references public.attivita(id) on delete cascade,
  data_sessione date not null,
  ora_inizio time not null,
  ora_fine time not null,
  minuti_erogati integer generated always as (
    greatest(0, (extract(epoch from (ora_fine - ora_inizio)) / 60)::integer)) stored,
  operatore_responsabile_id uuid references public.profili_utenti(id),
  luogo text,
  stato public.stato_sessione not null default 'PROGRAMMATA',
  note text,
  created_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  check (ora_fine > ora_inizio)
);
create index if not exists sessioni_attivita_idx on public.sessioni_attivita(attivita_id, data_sessione);

create table if not exists public.partecipazioni (
  id uuid primary key default gen_random_uuid(),
  sessione_id uuid not null references public.sessioni_attivita(id) on delete cascade,
  minore_id uuid not null references public.minori(id) on delete cascade,
  stato_presenza public.stato_presenza not null,
  minuti_frequentati integer check (minuti_frequentati between 0 and 1440),
  note_educatore text,
  created_by uuid references public.profili_utenti(id),
  updated_by uuid references public.profili_utenti(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sessione_id, minore_id)
);
create index if not exists partecipazioni_minore_idx on public.partecipazioni(minore_id);

-- -----------------------------------------------------------------------------
-- 8. Timesheet (giustificativo per la rendicontazione del personale)
-- -----------------------------------------------------------------------------
create table if not exists public.timesheet (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.profili_utenti(id),
  figura_id uuid not null references public.figure_professionali(id),
  territorio_id uuid references public.territori(id),
  data date not null,
  ore numeric(4,2) not null check (ore > 0 and ore <= 12),
  attivita_id uuid references public.attivita(id) on delete set null,
  sessione_id uuid references public.sessioni_attivita(id) on delete set null,
  descrizione text not null,
  stato public.stato_timesheet not null default 'INVIATO',
  vidimato_da uuid references public.profili_utenti(id),
  vidimato_il timestamptz,
  note_vidimazione text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists timesheet_utente_data_idx on public.timesheet(utente_id, data);
create index if not exists timesheet_territorio_idx on public.timesheet(territorio_id, data);

-- -----------------------------------------------------------------------------
-- 9. Alert automatici, escalation (PER)
-- -----------------------------------------------------------------------------
create table if not exists public.alert_automatici (
  id uuid primary key default gen_random_uuid(),
  codice_alert text not null check (codice_alert in ('FREQ_SUB_70','MISSED_CONTACTS','SLA_REVISIONE_60D','AOT_T30_INCOMPLETO','CONTATTI_SETTIMANA_INSUFFICIENTI')),
  livello public.livello_alert not null default 'GIALLO',
  minore_id uuid references public.minori(id) on delete cascade,
  territorio_id uuid references public.territori(id),
  timestamp_rilevamento timestamptz not null default now(),
  dettagli jsonb not null default '{}'::jsonb,
  risolto boolean not null default false,
  risolto_da uuid references public.profili_utenti(id),
  risolto_il timestamptz,
  note_chiusura text
);
create unique index if not exists alert_un_aperto on public.alert_automatici(codice_alert, coalesce(minore_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(territorio_id, '00000000-0000-0000-0000-000000000000'::uuid)) where not risolto;

create table if not exists public.escalation_cases (
  id uuid primary key default gen_random_uuid(),
  minore_id uuid not null references public.minori(id) on delete cascade,
  aperto_da_id uuid not null references public.profili_utenti(id),
  livello_gravita public.livello_escalation not null,
  stato public.stato_escalation not null default 'APERTO',
  timestamp_apertura timestamptz not null default now(),
  timestamp_chiusura timestamptz,
  flag_notifica_servizi_sociali boolean not null default false,
  flag_notifica_procura boolean not null default false,
  estremi_notifica_autorita text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.escalation_eventi (
  id uuid primary key default gen_random_uuid(),
  escalation_id uuid not null references public.escalation_cases(id) on delete cascade,
  tipo_evento public.tipo_evento_escalation not null,
  attore_id uuid not null references public.profili_utenti(id),
  "timestamp" timestamptz not null default now(),
  descrizione text not null,
  stato_precedente public.stato_escalation,
  stato_successivo public.stato_escalation
);

-- -----------------------------------------------------------------------------
-- 10. Fascicolo clinico riservato (L3) — cifrato a livello applicativo
-- -----------------------------------------------------------------------------
create table if not exists public.fascicolo_clinico_riservato (
  id uuid primary key default gen_random_uuid(),
  minore_id uuid not null references public.minori(id) on delete cascade,
  redatto_da uuid not null references public.profili_utenti(id),
  tipo_dato public.tipo_dato_clinico not null,
  note_cifrate bytea not null,
  data_colloquio timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 11. Audit log append-only
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  azione text not null,
  tabella text not null,
  record_id text,
  utente_id uuid,
  "timestamp" timestamptz not null default now(),
  diff_before jsonb,
  diff_after jsonb,
  reason_code text,
  request_id text,
  correlation_id text
);
create index if not exists audit_logs_ts_idx on public.audit_logs("timestamp" desc);
create index if not exists audit_logs_tabella_idx on public.audit_logs(tabella, record_id);

-- -----------------------------------------------------------------------------
-- 12. Funzioni di supporto (schema privato, security definer)
-- -----------------------------------------------------------------------------
create or replace function app_private.current_uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app_private.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select ruolo from public.profili_utenti where id = auth.uid() and stato_attivo = 'ATTIVO'
$$;

create or replace function app_private.current_territorio() returns uuid
language sql stable security definer set search_path = public as $$
  select territorio_id from public.profili_utenti where id = auth.uid() and stato_attivo = 'ATTIVO'
$$;

create or replace function app_private.is_pm() returns boolean
language sql stable as $$ select app_private.current_role() = 'PROJECT_MANAGER' $$;

create or replace function app_private.is_amministrativo() returns boolean
language sql stable as $$ select app_private.current_role() = 'AMMINISTRATIVO' $$;

create or replace function app_private.is_coordinatore_di(p_territorio uuid) returns boolean
language sql stable as $$
  select app_private.current_role() = 'COORDINATORE' and app_private.current_territorio() = p_territorio
$$;

create or replace function app_private.has_assignment(p_minore uuid, p_ruoli public.ruolo_caso[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assegnazioni_caso a
    where a.minore_id = p_minore and a.utente_id = auth.uid() and a.attiva
      and a.data_inizio <= current_date and (a.data_fine is null or a.data_fine >= current_date)
      and (p_ruoli is null or a.ruolo_nel_caso = any(p_ruoli))
  )
$$;

-- Accesso ai dati L1/L2 di un beneficiario: PM (lettura), Coordinatore del territorio, operatori assegnati.
create or replace function app_private.can_read_minor(p_minore uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when app_private.is_pm() then true
    when exists (select 1 from public.minori m where m.id = p_minore and app_private.is_coordinatore_di(m.territorio_id)) then true
    else app_private.has_assignment(p_minore)
  end
$$;

create or replace function app_private.can_write_minor(p_minore uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.minori m where m.id = p_minore and app_private.is_coordinatore_di(m.territorio_id)) then true
    else app_private.has_assignment(p_minore)
  end
$$;

create or replace function app_private.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- -----------------------------------------------------------------------------
-- 13. Audit trigger
-- -----------------------------------------------------------------------------
create or replace function app_private.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_before jsonb; v_after jsonb; v_id text;
begin
  if tg_op = 'INSERT' then
    v_after = to_jsonb(new); v_id = (to_jsonb(new)->>'id');
  elsif tg_op = 'UPDATE' then
    v_before = to_jsonb(old); v_after = to_jsonb(new); v_id = (to_jsonb(new)->>'id');
  else
    v_before = to_jsonb(old); v_id = (to_jsonb(old)->>'id');
  end if;
  -- Mai persistere il contenuto cifrato L3 nel diff.
  if tg_table_name = 'fascicolo_clinico_riservato' then
    v_before = v_before - 'note_cifrate'; v_after = v_after - 'note_cifrate';
  end if;
  insert into public.audit_logs(azione, tabella, record_id, utente_id, diff_before, diff_after)
  values (tg_op, tg_table_name, v_id, auth.uid(), v_before, v_after);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['minori','assegnazioni_caso','assessment_multidimensionale','piae','piae_obiettivi','piae_revisioni',
    'contatti_settimanali','rete_risorse','accordi_rete','attivita','iscrizioni_attivita','sessioni_attivita','partecipazioni',
    'timesheet','alert_automatici','escalation_cases','escalation_eventi','fascicolo_clinico_riservato','profili_utenti']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function app_private.audit_row()', t);
  end loop;
  foreach t in array array['minori','piae','partecipazioni','timesheet','escalation_cases','profili_utenti']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function app_private.set_updated_at()', t);
  end loop;
end $$;

-- Audit immutabile: nessuna modifica o cancellazione, neppure da trigger.
create or replace function app_private.deny_change() returns trigger
language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable before update or delete or truncate on public.audit_logs
  for each statement execute function app_private.deny_change();

-- -----------------------------------------------------------------------------
-- 14. Regole di dominio via trigger
-- -----------------------------------------------------------------------------
-- Timesheet: data nel perimetro di progetto; vidimazione solo da Coordinatore/PM; riga vidimata immutabile per l'operatore.
create or replace function app_private.timesheet_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg public.configurazione_progetto; r public.app_role;
begin
  select * into cfg from public.configurazione_progetto where id;
  r = app_private.current_role();
  if cfg.id is not null and (new.data < cfg.data_avvio or new.data > cfg.data_fine_progetto) then
    raise exception 'Data % fuori dal perimetro di progetto (% – %)', new.data, cfg.data_avvio, cfg.data_fine_progetto;
  end if;
  if tg_op = 'INSERT' then
    if new.stato in ('VIDIMATO','RESPINTO') then new.stato = 'INVIATO'; end if;
    new.vidimato_da = null; new.vidimato_il = null;
    return new;
  end if;
  -- UPDATE
  if new.utente_id <> old.utente_id then raise exception 'Il titolare della riga non può cambiare'; end if;
  if old.stato = 'VIDIMATO' and r not in ('PROJECT_MANAGER','COORDINATORE') then
    raise exception 'Riga già vidimata: modifica non consentita';
  end if;
  if new.stato is distinct from old.stato and new.stato in ('VIDIMATO','RESPINTO') then
    if r not in ('PROJECT_MANAGER','COORDINATORE') then
      raise exception 'Solo Coordinatore o PM possono vidimare';
    end if;
    if new.utente_id = auth.uid() then
      raise exception 'Non è possibile vidimare le proprie ore';
    end if;
    new.vidimato_da = auth.uid(); new.vidimato_il = now();
  end if;
  return new;
end $$;
drop trigger if exists timesheet_guard on public.timesheet;
create trigger timesheet_guard before insert or update on public.timesheet
  for each row execute function app_private.timesheet_guard();

-- Escalation: chiusura registra timestamp.
create or replace function app_private.escalation_close() returns trigger
language plpgsql as $$
begin
  if new.stato in ('RISOLTO','CHIUSO') and old.stato not in ('RISOLTO','CHIUSO') then new.timestamp_chiusura = now(); end if;
  return new;
end $$;
drop trigger if exists escalation_close on public.escalation_cases;
create trigger escalation_close before update on public.escalation_cases
  for each row execute function app_private.escalation_close();

-- Presenze: solo per beneficiari iscritti all'attività della sessione.
create or replace function app_private.partecipazione_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.sessioni_attivita s join public.iscrizioni_attivita i on i.attivita_id = s.attivita_id
    where s.id = new.sessione_id and i.minore_id = new.minore_id and i.attiva)
  then raise exception 'Beneficiario non iscritto a questa attività'; end if;
  return new;
end $$;
drop trigger if exists partecipazione_guard on public.partecipazioni;
create trigger partecipazione_guard before insert or update on public.partecipazioni
  for each row execute function app_private.partecipazione_guard();

-- -----------------------------------------------------------------------------
-- 15. Viste KPI e rendicontazione
-- -----------------------------------------------------------------------------
create or replace view public.v_frequenza_minore_14gg with (security_invoker = true) as
select m.id as minore_id, m.territorio_id,
  count(p.id) filter (where s.stato = 'EROGATA') as sessioni,
  count(p.id) filter (where s.stato = 'EROGATA' and p.stato_presenza in ('PRESENTE','RITARDO')) as presenze,
  case when count(p.id) filter (where s.stato = 'EROGATA') = 0 then null
       else round(100.0 * count(p.id) filter (where s.stato = 'EROGATA' and p.stato_presenza in ('PRESENTE','RITARDO'))
                  / count(p.id) filter (where s.stato = 'EROGATA'), 1) end as frequenza_pct
from public.minori m
left join public.partecipazioni p on p.minore_id = m.id
left join public.sessioni_attivita s on s.id = p.sessione_id and s.data_sessione >= current_date - 14
group by m.id, m.territorio_id;

create or replace view public.v_kpi_territorio with (security_invoker = true) as
select t.id as territorio_id, t.codice, t.nome,
  (select count(*) from public.minori m where m.territorio_id = t.id and m.stato = 'IN_CARICO') as beneficiari_in_carico,
  (select count(*) from public.piae p join public.minori m on m.id = p.minore_id where m.territorio_id = t.id and p.stato in ('ATTIVO','IN_REVISIONE')) as piae_attivi,
  (select round(avg(f.frequenza_pct),1) from public.v_frequenza_minore_14gg f where f.territorio_id = t.id) as frequenza_media_14gg,
  (select count(*) from public.attivita a where a.territorio_id = t.id and a.tipo = 'LABORATORIO_ARTIGIANO' and a.stato <> 'ANNULLATA') as laboratori,
  (select count(*) from public.attivita a where a.territorio_id = t.id and a.tipo = 'CORSO_SPORTIVO' and a.stato <> 'ANNULLATA') as corsi_sportivi,
  (select coalesce(sum(s.minuti_erogati),0)/60.0 from public.sessioni_attivita s join public.attivita a on a.id = s.attivita_id where a.territorio_id = t.id and s.stato = 'EROGATA') as ore_erogate,
  (select count(*) from public.rete_risorse r where r.territorio_id = t.id) as risorse_mappate,
  (select count(*) from public.accordi_rete ar where ar.territorio_id = t.id and ar.stato = 'ATTIVO') as aot_attivi,
  (select count(*) from public.alert_automatici al where al.territorio_id = t.id and not al.risolto) as alert_aperti,
  (select count(*) from public.escalation_cases e join public.minori m on m.id = e.minore_id where m.territorio_id = t.id and e.stato not in ('RISOLTO','CHIUSO')) as escalation_aperte,
  (select coalesce(sum(ts.ore),0) from public.timesheet ts where ts.territorio_id = t.id and ts.stato = 'VIDIMATO') as ore_timesheet_vidimate
from public.territori t;

create or replace view public.v_rendicontazione_ore with (security_invoker = true) as
select ts.id, ts.data, ts.ore, ts.stato, ts.descrizione,
  u.id as utente_id, u.nome, u.cognome, u.ente_partner, e.denominazione as ente_denominazione,
  f.codice as figura_codice, f.descrizione as figura_descrizione, f.tariffa_oraria,
  round(ts.ore * f.tariffa_oraria, 2) as valore_parametrico,
  t.codice as territorio_codice, t.nome as territorio_nome,
  a.titolo as attivita_titolo, a.tipo as attivita_tipo,
  ts.vidimato_da, ts.vidimato_il
from public.timesheet ts
join public.profili_utenti u on u.id = ts.utente_id
left join public.enti_partner e on e.codice = u.ente_partner
join public.figure_professionali f on f.id = ts.figura_id
left join public.territori t on t.id = ts.territorio_id
left join public.attivita a on a.id = ts.attivita_id;

create or replace view public.v_registro_sessione with (security_invoker = true) as
select s.id as sessione_id, s.attivita_id, s.data_sessione, s.ora_inizio, s.ora_fine, s.minuti_erogati, s.stato as stato_sessione,
  i.minore_id, m.codice_identificativo, m.pseudonimo,
  p.id as partecipazione_id, p.stato_presenza, p.minuti_frequentati, p.note_educatore
from public.sessioni_attivita s
join public.iscrizioni_attivita i on i.attivita_id = s.attivita_id and i.attiva
join public.minori m on m.id = i.minore_id
left join public.partecipazioni p on p.sessione_id = s.id and p.minore_id = i.minore_id;

create or replace view public.escalation_sla_status with (security_invoker = true) as
select e.id, e.minore_id, e.livello_gravita, e.stato, e.timestamp_apertura,
  extract(epoch from (coalesce(e.timestamp_chiusura, now()) - e.timestamp_apertura))/3600 as ore_trascorse,
  e.timestamp_apertura + interval '4 hours'  as scadenza_4h,
  e.timestamp_apertura + interval '12 hours' as scadenza_12h,
  e.timestamp_apertura + interval '24 hours' as scadenza_24h,
  e.timestamp_apertura + interval '48 hours' as scadenza_48h,
  case
    when e.stato in ('RISOLTO','CHIUSO') then 'CHIUSA'
    when e.stato = 'APERTO' and now() > e.timestamp_apertura + interval '4 hours' then 'SLA_4H_SUPERATO'
    when e.stato = 'IN_VALUTAZIONE_12H' and now() > e.timestamp_apertura + interval '12 hours' then 'SLA_12H_SUPERATO'
    when e.stato = 'PRESA_IN_CARICO_24H' and now() > e.timestamp_apertura + interval '24 hours' then 'SLA_24H_SUPERATO'
    when e.stato = 'TAVOLO_48H' and now() > e.timestamp_apertura + interval '48 hours' then 'SLA_48H_SUPERATO'
    else 'IN_SLA' end as sla
from public.escalation_cases e;

-- -----------------------------------------------------------------------------
-- 16. RPC pubbliche
-- -----------------------------------------------------------------------------
-- Evento di sicurezza esplicito (READ/EXPORT/VIEW_SENSITIVE...) registrato dal server applicativo.
create or replace function public.log_security_event(
  p_action text, p_table text, p_record_id text default null, p_reason_code text default null,
  p_request_id text default null, p_correlation_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_action not in ('READ','VIEW_SENSITIVE','EXPORT','PRINT','DOWNLOAD','ROLE_CHANGE','LOGIN','LOGOUT') then
    raise exception 'azione non ammessa: %', p_action;
  end if;
  insert into public.audit_logs(azione, tabella, record_id, utente_id, reason_code, request_id, correlation_id)
  values (p_action, p_table, p_record_id, auth.uid(), p_reason_code, p_request_id, p_correlation_id);
end $$;

-- Lettura L3: solo Psicologo / Assistente Sociale assegnati al caso. Ogni lettura è auditata.
create or replace function public.get_clinical_record(p_record_id uuid)
returns table (id uuid, minore_id uuid, redatto_da uuid, tipo_dato public.tipo_dato_clinico, note_cifrate text, data_colloquio timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare rec public.fascicolo_clinico_riservato; r public.app_role;
begin
  r = app_private.current_role();
  select * into rec from public.fascicolo_clinico_riservato f where f.id = p_record_id;
  if rec.id is null then raise exception 'record non disponibile'; end if;
  if r not in ('PSICOLOGO','ASSISTENTE_SOCIALE') or not app_private.has_assignment(rec.minore_id, array['PSICOLOGO','ASSISTENTE_SOCIALE']::public.ruolo_caso[]) then
    insert into public.audit_logs(azione, tabella, record_id, utente_id, reason_code)
    values ('VIEW_SENSITIVE_DENIED', 'fascicolo_clinico_riservato', p_record_id::text, auth.uid(), 'NOT_ASSIGNED');
    -- Nessuna eccezione: l'evento di audit deve persistere. Il chiamante tratta il set vuoto come accesso negato.
    return;
  end if;
  insert into public.audit_logs(azione, tabella, record_id, utente_id, reason_code)
  values ('VIEW_SENSITIVE', 'fascicolo_clinico_riservato', p_record_id::text, auth.uid(), 'RPC_GET_CLINICAL_RECORD');
  return query select rec.id, rec.minore_id, rec.redatto_da, rec.tipo_dato, encode(rec.note_cifrate, 'hex'), rec.data_colloquio, rec.created_at;
end $$;

create or replace function public.list_clinical_records(p_minore_id uuid)
returns table (id uuid, tipo_dato public.tipo_dato_clinico, data_colloquio timestamptz, created_at timestamptz, redatto_da uuid)
language plpgsql security definer set search_path = public as $$
declare r public.app_role;
begin
  r = app_private.current_role();
  if r not in ('PSICOLOGO','ASSISTENTE_SOCIALE') or not app_private.has_assignment(p_minore_id, array['PSICOLOGO','ASSISTENTE_SOCIALE']::public.ruolo_caso[]) then
    return;
  end if;
  return query select f.id, f.tipo_dato, f.data_colloquio, f.created_at, f.redatto_da
    from public.fascicolo_clinico_riservato f where f.minore_id = p_minore_id order by f.created_at desc;
end $$;

-- Chiusura esplicita di un alert (Coordinatore del territorio o PM).
create or replace function public.close_alert(p_alert_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a public.alert_automatici;
begin
  select * into a from public.alert_automatici where id = p_alert_id;
  if a.id is null then raise exception 'alert non trovato'; end if;
  if not (app_private.is_pm() or app_private.is_coordinatore_di(a.territorio_id)) then raise exception 'non autorizzato'; end if;
  update public.alert_automatici set risolto = true, risolto_da = auth.uid(), risolto_il = now(), note_chiusura = p_note where id = p_alert_id;
end $$;

-- Controlli periodici: genera/chiude gli alert gialli. Da schedulare (pg_cron) o invocare dal PM.
create or replace function public.run_periodic_checks() returns jsonb
language plpgsql security definer set search_path = public as $$
declare cfg public.configurazione_progetto; n_freq int := 0; n_miss int := 0; n_rev int := 0; n_aot int := 0; n_closed int := 0;
begin
  select * into cfg from public.configurazione_progetto where id;
  if cfg.id is null then return jsonb_build_object('error','configurazione_progetto mancante'); end if;

  -- FREQ_SUB_70: frequenza ultimi 14 giorni sotto soglia (con almeno 3 sessioni erogate).
  insert into public.alert_automatici(codice_alert, livello, minore_id, territorio_id, dettagli)
  select 'FREQ_SUB_70','GIALLO', f.minore_id, f.territorio_id,
         jsonb_build_object('frequenza_pct', f.frequenza_pct, 'sessioni', f.sessioni, 'soglia', cfg.soglia_frequenza)
  from public.v_frequenza_minore_14gg f join public.minori m on m.id = f.minore_id
  where m.stato = 'IN_CARICO' and f.sessioni >= 3 and f.frequenza_pct < cfg.soglia_frequenza
  on conflict do nothing;
  get diagnostics n_freq = row_count;

  -- MISSED_CONTACTS: ultimi 3 contatti consecutivi non raggiunti.
  insert into public.alert_automatici(codice_alert, livello, minore_id, territorio_id, dettagli)
  select 'MISSED_CONTACTS','GIALLO', p.minore_id, m.territorio_id, jsonb_build_object('piae_id', p.id)
  from public.piae p join public.minori m on m.id = p.minore_id
  where p.stato in ('ATTIVO','IN_REVISIONE') and (
    select bool_and(c.esito = 'NON_RAGGIUNTO') from (
      select esito from public.contatti_settimanali c where c.piae_id = p.id order by c.timestamp_contatto desc limit 3) c
  ) and (select count(*) from public.contatti_settimanali c where c.piae_id = p.id) >= 3
  on conflict do nothing;
  get diagnostics n_miss = row_count;

  -- SLA_REVISIONE_60D: revisione entro 10 giorni o scaduta.
  insert into public.alert_automatici(codice_alert, livello, minore_id, territorio_id, dettagli)
  select 'SLA_REVISIONE_60D','GIALLO', p.minore_id, m.territorio_id,
         jsonb_build_object('piae_id', p.id, 'scadenza', p.data_scadenza_prossima_revisione, 'giorni', p.data_scadenza_prossima_revisione - current_date)
  from public.piae p join public.minori m on m.id = p.minore_id
  where p.stato in ('ATTIVO','IN_REVISIONE') and p.data_scadenza_prossima_revisione <= current_date + 10
  on conflict do nothing;
  get diagnostics n_rev = row_count;

  -- AOT_T30_INCOMPLETO: a T+30 dall'avvio ogni territorio deve avere AOT Scuole e Servizi Sociali attivi.
  if current_date >= cfg.data_avvio + 30 then
    insert into public.alert_automatici(codice_alert, livello, territorio_id, dettagli)
    select 'AOT_T30_INCOMPLETO','GIALLO', t.id,
      jsonb_build_object('mancanti', (
        select jsonb_agg(x) from unnest(array['AOT_SCUOLE','AOT_SERVIZI_SOCIALI']) x
        where not exists (select 1 from public.accordi_rete ar where ar.territorio_id = t.id and ar.stato = 'ATTIVO' and ar.tipo_accordo::text = x)))
    from public.territori t
    where exists (select 1 from unnest(array['AOT_SCUOLE','AOT_SERVIZI_SOCIALI']) x
                  where not exists (select 1 from public.accordi_rete ar where ar.territorio_id = t.id and ar.stato = 'ATTIVO' and ar.tipo_accordo::text = x))
    on conflict do nothing;
    get diagnostics n_aot = row_count;
  end if;

  -- Chiusura automatica degli alert non più veri (SLA revisione superata da revisione registrata; frequenza risalita).
  update public.alert_automatici a set risolto = true, risolto_il = now(), note_chiusura = 'Chiuso automaticamente: condizione rientrata'
  where not a.risolto and a.codice_alert = 'FREQ_SUB_70'
    and exists (select 1 from public.v_frequenza_minore_14gg f where f.minore_id = a.minore_id and (f.frequenza_pct >= cfg.soglia_frequenza or f.sessioni < 3));
  get diagnostics n_closed = row_count;

  return jsonb_build_object('freq_sub_70', n_freq, 'missed_contacts', n_miss, 'sla_revisione', n_rev, 'aot_t30', n_aot, 'chiusi_auto', n_closed);
end $$;

-- Sintesi per il report al RUP: KPI complessivi e per territorio.
create or replace function public.report_sintesi(p_dal date, p_al date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if app_private.current_role() not in ('PROJECT_MANAGER','COORDINATORE','AMMINISTRATIVO') then raise exception 'non autorizzato'; end if;
  select jsonb_build_object(
    'periodo', jsonb_build_object('dal', p_dal, 'al', p_al),
    'beneficiari_in_carico', (select count(*) from public.minori where stato = 'IN_CARICO'),
    'beneficiari_totali', (select count(*) from public.minori),
    'piae_attivi', (select count(*) from public.piae where stato in ('ATTIVO','IN_REVISIONE')),
    'piae_con_contratto', (select count(*) from public.piae where contratto_sociale_firmato),
    'sessioni_erogate', (select count(*) from public.sessioni_attivita where stato = 'EROGATA' and data_sessione between p_dal and p_al),
    'ore_erogate', (select coalesce(sum(minuti_erogati),0)/60.0 from public.sessioni_attivita where stato = 'EROGATA' and data_sessione between p_dal and p_al),
    'presenze', (select count(*) from public.partecipazioni p join public.sessioni_attivita s on s.id = p.sessione_id where s.data_sessione between p_dal and p_al and p.stato_presenza in ('PRESENTE','RITARDO')),
    'presenze_attese', (select count(*) from public.partecipazioni p join public.sessioni_attivita s on s.id = p.sessione_id where s.data_sessione between p_dal and p_al and s.stato = 'EROGATA'),
    'contatti', (select count(*) from public.contatti_settimanali where timestamp_contatto::date between p_dal and p_al),
    'contatti_riusciti', (select count(*) from public.contatti_settimanali where timestamp_contatto::date between p_dal and p_al and esito = 'RIUSCITO'),
    'laboratori', (select count(*) from public.attivita where tipo = 'LABORATORIO_ARTIGIANO' and stato <> 'ANNULLATA'),
    'corsi_sportivi', (select count(*) from public.attivita where tipo = 'CORSO_SPORTIVO' and stato <> 'ANNULLATA'),
    'risorse_mappate', (select count(*) from public.rete_risorse),
    'aot_attivi', (select count(*) from public.accordi_rete where stato = 'ATTIVO'),
    'alert_aperti', (select count(*) from public.alert_automatici where not risolto),
    'escalation_aperte', (select count(*) from public.escalation_cases where stato not in ('RISOLTO','CHIUSO')),
    'ore_timesheet', (select coalesce(sum(ore),0) from public.timesheet where data between p_dal and p_al),
    'ore_timesheet_vidimate', (select coalesce(sum(ore),0) from public.timesheet where data between p_dal and p_al and stato = 'VIDIMATO'),
    'territori', (select coalesce(jsonb_agg(to_jsonb(k) order by k.codice), '[]'::jsonb) from public.v_kpi_territorio k)
  ) into v;
  return v;
end $$;

-- -----------------------------------------------------------------------------
-- 17. RLS
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['territori','enti_partner','figure_professionali','configurazione_progetto','profili_utenti','minori',
    'assegnazioni_caso','assessment_multidimensionale','piae','piae_obiettivi','piae_revisioni','contatti_settimanali',
    'rete_risorse','accordi_rete','attivita','iscrizioni_attivita','sessioni_attivita','partecipazioni','timesheet',
    'alert_automatici','escalation_cases','escalation_eventi','fascicolo_clinico_riservato','audit_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Tabelle di riferimento: lettura per tutti gli autenticati.
drop policy if exists territori_read on public.territori;
create policy territori_read on public.territori for select to authenticated using (true);
drop policy if exists enti_read on public.enti_partner;
create policy enti_read on public.enti_partner for select to authenticated using (true);
drop policy if exists figure_read on public.figure_professionali;
create policy figure_read on public.figure_professionali for select to authenticated using (true);
drop policy if exists cfg_read on public.configurazione_progetto;
create policy cfg_read on public.configurazione_progetto for select to authenticated using (true);
drop policy if exists cfg_write on public.configurazione_progetto;
create policy cfg_write on public.configurazione_progetto for update to authenticated using (app_private.is_pm()) with check (app_private.is_pm());

-- Profili: se stesso; PM/Amministrativo tutti; Coordinatore il proprio territorio; tutti vedono i colleghi del proprio territorio (nomi per registri).
drop policy if exists profili_read on public.profili_utenti;
create policy profili_read on public.profili_utenti for select to authenticated using (
  id = auth.uid() or app_private.is_pm() or app_private.is_amministrativo()
  or territorio_id = app_private.current_territorio());
drop policy if exists profili_update_self on public.profili_utenti;
create policy profili_update_self on public.profili_utenti for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and ruolo = (select ruolo from public.profili_utenti p where p.id = auth.uid()));

-- Minori
drop policy if exists minori_read on public.minori;
create policy minori_read on public.minori for select to authenticated using (app_private.can_read_minor(id));
drop policy if exists minori_insert on public.minori;
create policy minori_insert on public.minori for insert to authenticated with check (app_private.is_coordinatore_di(territorio_id));
drop policy if exists minori_update on public.minori;
create policy minori_update on public.minori for update to authenticated
  using (app_private.can_write_minor(id)) with check (app_private.can_write_minor(id));

-- Assegnazioni
drop policy if exists asseg_read on public.assegnazioni_caso;
create policy asseg_read on public.assegnazioni_caso for select to authenticated using (utente_id = auth.uid() or app_private.can_read_minor(minore_id));
drop policy if exists asseg_write on public.assegnazioni_caso;
create policy asseg_write on public.assegnazioni_caso for all to authenticated
  using (exists (select 1 from public.minori m where m.id = minore_id and app_private.is_coordinatore_di(m.territorio_id)))
  with check (exists (select 1 from public.minori m where m.id = minore_id and app_private.is_coordinatore_di(m.territorio_id)));

-- Assessment
drop policy if exists assess_read on public.assessment_multidimensionale;
create policy assess_read on public.assessment_multidimensionale for select to authenticated using (app_private.can_read_minor(minore_id));
drop policy if exists assess_write on public.assessment_multidimensionale;
create policy assess_write on public.assessment_multidimensionale for all to authenticated
  using (app_private.can_write_minor(minore_id)) with check (app_private.can_write_minor(minore_id));

-- PIAE e figli
drop policy if exists piae_read on public.piae;
create policy piae_read on public.piae for select to authenticated using (app_private.can_read_minor(minore_id));
drop policy if exists piae_write on public.piae;
create policy piae_write on public.piae for all to authenticated
  using (app_private.can_write_minor(minore_id)) with check (app_private.can_write_minor(minore_id));

drop policy if exists obiettivi_read on public.piae_obiettivi;
create policy obiettivi_read on public.piae_obiettivi for select to authenticated
  using (exists (select 1 from public.piae p where p.id = piae_id and app_private.can_read_minor(p.minore_id)));
drop policy if exists obiettivi_write on public.piae_obiettivi;
create policy obiettivi_write on public.piae_obiettivi for all to authenticated
  using (exists (select 1 from public.piae p where p.id = piae_id and app_private.can_write_minor(p.minore_id)))
  with check (exists (select 1 from public.piae p where p.id = piae_id and app_private.can_write_minor(p.minore_id)));

drop policy if exists revisioni_read on public.piae_revisioni;
create policy revisioni_read on public.piae_revisioni for select to authenticated
  using (exists (select 1 from public.piae p where p.id = piae_id and app_private.can_read_minor(p.minore_id)));
drop policy if exists revisioni_write on public.piae_revisioni;
create policy revisioni_write on public.piae_revisioni for insert to authenticated
  with check (exists (select 1 from public.piae p join public.minori m on m.id = p.minore_id where p.id = piae_id and app_private.is_coordinatore_di(m.territorio_id)));

drop policy if exists contatti_read on public.contatti_settimanali;
create policy contatti_read on public.contatti_settimanali for select to authenticated
  using (exists (select 1 from public.piae p where p.id = piae_id and app_private.can_read_minor(p.minore_id)));
drop policy if exists contatti_write on public.contatti_settimanali;
create policy contatti_write on public.contatti_settimanali for insert to authenticated
  with check (operatore_id = auth.uid() and exists (select 1 from public.piae p where p.id = piae_id and app_private.can_write_minor(p.minore_id)));

-- Rete e AOT: lettura per tutti (mappa condivisa), scrittura Coordinatore del territorio o PM.
drop policy if exists risorse_read on public.rete_risorse;
create policy risorse_read on public.rete_risorse for select to authenticated using (true);
drop policy if exists risorse_write on public.rete_risorse;
create policy risorse_write on public.rete_risorse for all to authenticated
  using (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id))
  with check (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id));
drop policy if exists accordi_read on public.accordi_rete;
create policy accordi_read on public.accordi_rete for select to authenticated using (true);
drop policy if exists accordi_write on public.accordi_rete;
create policy accordi_write on public.accordi_rete for all to authenticated
  using (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id))
  with check (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id));

-- Attività e sessioni: lettura per tutti gli autenticati (dato aggregato non nominativo); scrittura Coordinatore/PM; sessioni anche dall'operatore responsabile.
drop policy if exists attivita_read on public.attivita;
create policy attivita_read on public.attivita for select to authenticated using (true);
drop policy if exists attivita_write on public.attivita;
create policy attivita_write on public.attivita for all to authenticated
  using (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id))
  with check (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id));

drop policy if exists sessioni_read on public.sessioni_attivita;
create policy sessioni_read on public.sessioni_attivita for select to authenticated using (true);
drop policy if exists sessioni_write on public.sessioni_attivita;
create policy sessioni_write on public.sessioni_attivita for all to authenticated
  using (operatore_responsabile_id = auth.uid() or exists (select 1 from public.attivita a where a.id = attivita_id and (app_private.is_pm() or app_private.is_coordinatore_di(a.territorio_id))))
  with check (operatore_responsabile_id = auth.uid() or exists (select 1 from public.attivita a where a.id = attivita_id and (app_private.is_pm() or app_private.is_coordinatore_di(a.territorio_id))));

drop policy if exists iscrizioni_read on public.iscrizioni_attivita;
create policy iscrizioni_read on public.iscrizioni_attivita for select to authenticated
  using (app_private.can_read_minor(minore_id) or exists (select 1 from public.sessioni_attivita s where s.attivita_id = attivita_id and s.operatore_responsabile_id = auth.uid()));
drop policy if exists iscrizioni_write on public.iscrizioni_attivita;
create policy iscrizioni_write on public.iscrizioni_attivita for all to authenticated
  using (app_private.can_write_minor(minore_id)) with check (app_private.can_write_minor(minore_id));

-- Presenze: lettura chi accede al minore o l'operatore responsabile della sessione; scrittura idem.
drop policy if exists presenze_read on public.partecipazioni;
create policy presenze_read on public.partecipazioni for select to authenticated
  using (app_private.can_read_minor(minore_id) or exists (select 1 from public.sessioni_attivita s where s.id = sessione_id and s.operatore_responsabile_id = auth.uid()));
drop policy if exists presenze_write on public.partecipazioni;
create policy presenze_write on public.partecipazioni for all to authenticated
  using (app_private.can_write_minor(minore_id) or exists (select 1 from public.sessioni_attivita s where s.id = sessione_id and s.operatore_responsabile_id = auth.uid()))
  with check (app_private.can_write_minor(minore_id) or exists (select 1 from public.sessioni_attivita s where s.id = sessione_id and s.operatore_responsabile_id = auth.uid()));

-- Timesheet: proprie righe; Coordinatore il proprio territorio; PM e Amministrativo tutto.
drop policy if exists ts_read on public.timesheet;
create policy ts_read on public.timesheet for select to authenticated
  using (utente_id = auth.uid() or app_private.is_pm() or app_private.is_amministrativo() or app_private.is_coordinatore_di(territorio_id));
drop policy if exists ts_insert on public.timesheet;
create policy ts_insert on public.timesheet for insert to authenticated with check (utente_id = auth.uid());
drop policy if exists ts_update on public.timesheet;
create policy ts_update on public.timesheet for update to authenticated
  using (utente_id = auth.uid() or app_private.is_pm() or app_private.is_coordinatore_di(territorio_id))
  with check (utente_id = auth.uid() or app_private.is_pm() or app_private.is_coordinatore_di(territorio_id));
drop policy if exists ts_delete on public.timesheet;
create policy ts_delete on public.timesheet for delete to authenticated using (utente_id = auth.uid() and stato <> 'VIDIMATO');

-- Alert: lettura PM / Coordinatore territorio / operatore assegnato; chiusura via RPC.
drop policy if exists alert_read on public.alert_automatici;
create policy alert_read on public.alert_automatici for select to authenticated
  using (app_private.is_pm() or app_private.is_coordinatore_di(territorio_id) or (minore_id is not null and app_private.has_assignment(minore_id)));

-- Escalation
drop policy if exists esc_read on public.escalation_cases;
create policy esc_read on public.escalation_cases for select to authenticated using (app_private.can_read_minor(minore_id));
drop policy if exists esc_insert on public.escalation_cases;
create policy esc_insert on public.escalation_cases for insert to authenticated with check (aperto_da_id = auth.uid() and app_private.can_read_minor(minore_id) and not app_private.is_pm());
drop policy if exists esc_update on public.escalation_cases;
create policy esc_update on public.escalation_cases for update to authenticated
  using (app_private.can_write_minor(minore_id) or app_private.is_pm()) with check (app_private.can_write_minor(minore_id) or app_private.is_pm());
drop policy if exists esc_ev_read on public.escalation_eventi;
create policy esc_ev_read on public.escalation_eventi for select to authenticated
  using (exists (select 1 from public.escalation_cases e where e.id = escalation_id and app_private.can_read_minor(e.minore_id)));
drop policy if exists esc_ev_insert on public.escalation_eventi;
create policy esc_ev_insert on public.escalation_eventi for insert to authenticated
  with check (attore_id = auth.uid() and exists (select 1 from public.escalation_cases e where e.id = escalation_id and app_private.can_read_minor(e.minore_id)));

-- L3: scrittura solo Psicologo/AS assegnati; lettura esclusivamente via RPC (nessuna policy di select).
drop policy if exists l3_insert on public.fascicolo_clinico_riservato;
create policy l3_insert on public.fascicolo_clinico_riservato for insert to authenticated
  with check (redatto_da = auth.uid() and app_private.current_role() in ('PSICOLOGO','ASSISTENTE_SOCIALE')
              and app_private.has_assignment(minore_id, array['PSICOLOGO','ASSISTENTE_SOCIALE']::public.ruolo_caso[]));

-- Audit: lettura solo PM.
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using (app_private.is_pm());

-- -----------------------------------------------------------------------------
-- 18. Grant
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select on public.territori, public.enti_partner, public.figure_professionali, public.configurazione_progetto, public.audit_logs to authenticated;
grant update on public.configurazione_progetto to authenticated;
grant select, update on public.profili_utenti to authenticated;
grant select, insert, update on public.minori, public.assessment_multidimensionale, public.piae, public.piae_obiettivi,
  public.contatti_settimanali, public.rete_risorse, public.accordi_rete, public.attivita, public.sessioni_attivita,
  public.partecipazioni, public.escalation_cases to authenticated;
grant select, insert, update, delete on public.assegnazioni_caso, public.iscrizioni_attivita, public.timesheet to authenticated;
grant select, insert on public.piae_revisioni, public.escalation_eventi to authenticated;
grant insert on public.fascicolo_clinico_riservato to authenticated;
grant select on public.alert_automatici to authenticated;
grant select on public.v_frequenza_minore_14gg, public.v_kpi_territorio, public.v_rendicontazione_ore, public.v_registro_sessione, public.escalation_sla_status to authenticated;
grant execute on function public.log_security_event(text,text,text,text,text,text), public.get_clinical_record(uuid), public.list_clinical_records(uuid),
  public.close_alert(uuid,text), public.run_periodic_checks(), public.report_sintesi(date,date) to authenticated;
-- app_private non è esposto via PostgREST, ma le policy RLS ne invocano le funzioni: serve USAGE.
grant usage on schema app_private to authenticated;
revoke all on schema app_private from anon;
