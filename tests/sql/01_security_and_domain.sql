-- =============================================================================
-- Collaudo sicurezza e regole di dominio. Eseguire dopo 00_local_harness + migrations.
-- Ogni assert fallisce con messaggio esplicito. Uscita pulita = tutti i test superati.
-- =============================================================================
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Helper: esegue SQL impersonando un utente autenticato; ritorna 'OK' oppure 'ERR: <msg>'.
create or replace function pg_temp.run_as(p_uid uuid, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  begin
    execute p_sql;
  exception when others then
    execute 'reset role';
    return 'ERR: ' || sqlerrm;
  end;
  execute 'reset role';
  return 'OK';
end $$;

create or replace function pg_temp.count_as(p_uid uuid, p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  execute 'set local role authenticated';
  execute 'select count(*) from (' || p_sql || ') q' into n;
  execute 'reset role';
  return n;
end $$;

-- -----------------------------------------------------------------------------
-- Fixture
-- -----------------------------------------------------------------------------
create temp table ids (k text primary key, v uuid);
insert into ids select 'PNT', id from territori where codice = 'PNT';
insert into ids select 'CAI', id from territori where codice = 'CAI';
insert into ids values ('pm', gen_random_uuid()), ('coord_pnt', gen_random_uuid()), ('coord_cai', gen_random_uuid()),
  ('edu1', gen_random_uuid()), ('edu2', gen_random_uuid()), ('psy', gen_random_uuid()), ('amm', gen_random_uuid()), ('nobody', gen_random_uuid());

insert into auth.users(id, email) select v, k || '@test.invalid' from ids where k not in ('PNT','CAI');
insert into profili_utenti(id, nome, cognome, ruolo, territorio_id, ente_partner, figura_id, stato_attivo) values
  ((select v from ids where k='pm'), 'Luigi','Vanore','PROJECT_MANAGER', null, 'EMMANUEL', (select id from figure_professionali where codice='PM'), 'ATTIVO'),
  ((select v from ids where k='coord_pnt'), 'C','Pnt','COORDINATORE', (select v from ids where k='PNT'), 'EMMANUEL', (select id from figure_professionali where codice='COORD'), 'ATTIVO'),
  ((select v from ids where k='coord_cai'), 'C','Cai','COORDINATORE', (select v from ids where k='CAI'), 'EITD', (select id from figure_professionali where codice='COORD'), 'ATTIVO'),
  ((select v from ids where k='edu1'), 'E','Uno','EDUCATORE', (select v from ids where k='PNT'), 'MDS', (select id from figure_professionali where codice='EDU'), 'ATTIVO'),
  ((select v from ids where k='edu2'), 'E','Due','EDUCATORE', (select v from ids where k='PNT'), 'MDS', (select id from figure_professionali where codice='EDU'), 'ATTIVO'),
  ((select v from ids where k='psy'), 'P','Si','PSICOLOGO', (select v from ids where k='PNT'), 'ESCULAPIO', (select id from figure_professionali where codice='PSI'), 'ATTIVO'),
  ((select v from ids where k='amm'), 'A','Mm','AMMINISTRATIVO', null, 'EMMANUEL', (select id from figure_professionali where codice='AMM'), 'ATTIVO');

do $$
declare pm uuid := (select v from ids where k='pm'); cpnt uuid := (select v from ids where k='coord_pnt'); ccai uuid := (select v from ids where k='coord_cai');
        e1 uuid := (select v from ids where k='edu1'); e2 uuid := (select v from ids where k='edu2'); psy uuid := (select v from ids where k='psy');
        amm uuid := (select v from ids where k='amm'); nobody uuid := (select v from ids where k='nobody');
        pnt uuid := (select v from ids where k='PNT'); cai uuid := (select v from ids where k='CAI');
        r text; m1 uuid; piae1 uuid; act uuid; ses uuid; ts1 uuid; rec uuid; n bigint; alerts jsonb; esc uuid;
begin
  -- 1. Anagrafica: il Coordinatore inserisce solo nel proprio territorio.
  r := pg_temp.run_as(cpnt, format('insert into minori(codice_identificativo, territorio_id, pseudonimo, data_presa_in_carico) values (''PNT-001'', %L, ''Giovane 1'', current_date)', pnt));
  assert r = 'OK', 'T1a coord inserisce nel proprio territorio: ' || r;
  r := pg_temp.run_as(cpnt, format('insert into minori(codice_identificativo, territorio_id, pseudonimo) values (''CAI-999'', %L, ''X'')', cai));
  assert r like 'ERR:%', 'T1b coord NON deve inserire in altro territorio';
  r := pg_temp.run_as(e1, format('insert into minori(codice_identificativo, territorio_id, pseudonimo) values (''PNT-998'', %L, ''X'')', pnt));
  assert r like 'ERR:%', 'T1c educatore NON crea anagrafiche';
  select id into m1 from minori where codice_identificativo = 'PNT-001';

  -- 2. Visibilità cross-territorio e per assegnazione.
  assert pg_temp.count_as(ccai, 'select 1 from minori') = 0, 'T2a coord CAI non vede PNT';
  assert pg_temp.count_as(pm, 'select 1 from minori') = 1, 'T2b PM vede tutto';
  assert pg_temp.count_as(e1, 'select 1 from minori') = 0, 'T2c educatore non assegnato non vede';
  r := pg_temp.run_as(cpnt, format('insert into assegnazioni_caso(minore_id, utente_id, ruolo_nel_caso) values (%L, %L, ''EDUCATORE_CASEMANAGER'')', m1, e1));
  assert r = 'OK', 'T2d assegnazione: ' || r;
  assert pg_temp.count_as(e1, 'select 1 from minori') = 1, 'T2e educatore assegnato vede';
  assert pg_temp.count_as(e2, 'select 1 from minori') = 0, 'T2f altro educatore non vede';
  r := pg_temp.run_as(cpnt, format('insert into assegnazioni_caso(minore_id, utente_id, ruolo_nel_caso) values (%L, %L, ''EDUCATORE_CASEMANAGER'')', m1, e2));
  assert r like 'ERR:%', 'T2g un solo case manager attivo per beneficiario';
  r := pg_temp.run_as(nobody, 'select * from minori');
  assert pg_temp.count_as(nobody, 'select 1 from minori') = 0, 'T2h utente senza profilo non vede nulla';

  -- 3. PIAE e contatti.
  r := pg_temp.run_as(cpnt, format('insert into piae(minore_id, educatore_referente_id, data_inizio, data_scadenza_prossima_revisione, contratto_sociale_firmato, data_firma_contratto) values (%L, %L, current_date - 55, current_date + 5, true, current_date - 55)', m1, e1));
  assert r = 'OK', 'T3a PIAE: ' || r;
  select id into piae1 from piae where minore_id = m1;
  r := pg_temp.run_as(cpnt, format('insert into piae(minore_id, educatore_referente_id, data_inizio, data_scadenza_prossima_revisione, versione) values (%L, %L, current_date, current_date + 60, 2)', m1, e1));
  assert r like 'ERR:%', 'T3b un solo PIAE operativo';
  r := pg_temp.run_as(e1, format('insert into contatti_settimanali(piae_id, operatore_id, timestamp_contatto, canale, esito) values (%L, %L, now(), ''IN_PRESENZA'', ''RIUSCITO'')', piae1, e1));
  assert r = 'OK', 'T3c contatto educatore assegnato: ' || r;
  r := pg_temp.run_as(e2, format('insert into contatti_settimanali(piae_id, operatore_id, timestamp_contatto, canale, esito) values (%L, %L, now(), ''IN_PRESENZA'', ''RIUSCITO'')', piae1, e2));
  assert r like 'ERR:%', 'T3d contatto educatore NON assegnato negato';
  r := pg_temp.run_as(e1, format('insert into contatti_settimanali(piae_id, operatore_id, timestamp_contatto, canale, esito) values (%L, %L, now(), ''IN_PRESENZA'', ''RIUSCITO'')', piae1, e2));
  assert r like 'ERR:%', 'T3e operatore_id deve coincidere con chi scrive';

  -- 4. Attività, iscrizioni, sessioni, presenze.
  r := pg_temp.run_as(cpnt, format('insert into attivita(territorio_id, tipo, titolo, descrizione_offerta, ente_erogatore, ore_minime_previste, data_inizio, data_fine, stato) values (%L, ''LABORATORIO_ARTIGIANO'', ''Laboratorio musicale'', ''Freestyle rap e beatbox'', ''EMMANUEL'', 8, date ''2026-09-01'', date ''2026-09-30'', ''IN_CORSO'')', pnt));
  assert r = 'OK', 'T4a attività: ' || r;
  select id into act from attivita where titolo = 'Laboratorio musicale';
  r := pg_temp.run_as(ccai, format('insert into sessioni_attivita(attivita_id, data_sessione, ora_inizio, ora_fine) values (%L, date ''2026-09-02'', ''15:00'', ''17:00'')', act));
  assert r like 'ERR:%', 'T4b coord di altro territorio non crea sessioni';
  r := pg_temp.run_as(cpnt, format('insert into sessioni_attivita(attivita_id, data_sessione, ora_inizio, ora_fine, operatore_responsabile_id, stato) values (%L, date ''2026-09-02'', ''15:00'', ''17:00'', %L, ''EROGATA'')', act, e1));
  assert r = 'OK', 'T4c sessione: ' || r;
  select id into ses from sessioni_attivita where attivita_id = act;
  assert (select minuti_erogati from sessioni_attivita where id = ses) = 120, 'T4d minuti_erogati calcolati';
  r := pg_temp.run_as(e1, format('insert into partecipazioni(sessione_id, minore_id, stato_presenza, minuti_frequentati) values (%L, %L, ''PRESENTE'', 120)', ses, m1));
  assert r like 'ERR:%Beneficiario non iscritto%', 'T4e presenza senza iscrizione negata: ' || r;
  r := pg_temp.run_as(e1, format('insert into iscrizioni_attivita(attivita_id, minore_id) values (%L, %L)', act, m1));
  assert r = 'OK', 'T4f iscrizione da case manager: ' || r;
  r := pg_temp.run_as(e1, format('insert into partecipazioni(sessione_id, minore_id, stato_presenza, minuti_frequentati) values (%L, %L, ''PRESENTE'', 120)', ses, m1));
  assert r = 'OK', 'T4g presenza: ' || r;
  assert pg_temp.count_as(e1, 'select 1 from v_registro_sessione') = 1, 'T4h registro sessione visibile all''operatore';
  assert pg_temp.count_as(ccai, 'select 1 from v_registro_sessione') = 0, 'T4i registro non visibile ad altro territorio';

  -- 5. Timesheet.
  r := pg_temp.run_as(e1, format('insert into timesheet(utente_id, figura_id, territorio_id, data, ore, attivita_id, descrizione) values (%L, (select id from figure_professionali where codice=''EDU''), %L, date ''2026-09-02'', 4, %L, ''Conduzione sessione'')', e1, pnt, act));
  assert r = 'OK', 'T5a timesheet proprio: ' || r;
  select id into ts1 from timesheet where utente_id = e1;
  assert (select stato from timesheet where id = ts1) = 'INVIATO', 'T5b stato iniziale INVIATO';
  r := pg_temp.run_as(e1, format('insert into timesheet(utente_id, figura_id, territorio_id, data, ore, descrizione) values (%L, (select id from figure_professionali where codice=''EDU''), %L, date ''2026-09-02'', 2, ''X'')', e2, pnt));
  assert r like 'ERR:%', 'T5c non si inseriscono ore per altri';
  r := pg_temp.run_as(e1, format('insert into timesheet(utente_id, figura_id, territorio_id, data, ore, descrizione) values (%L, (select id from figure_professionali where codice=''EDU''), %L, date ''2026-07-15'', 2, ''X'')', e1, pnt));
  assert r like 'ERR:%fuori dal perimetro%', 'T5d data prima del contratto respinta: ' || r;
  r := pg_temp.run_as(e1, format('update timesheet set stato = ''VIDIMATO'' where id = %L', ts1));
  assert r like 'ERR:%', 'T5e l''operatore non vidima';
  r := pg_temp.run_as(ccai, format('update timesheet set stato = ''VIDIMATO'' where id = %L', ts1));
  assert (select stato from timesheet where id = ts1) = 'INVIATO', 'T5f coord altro territorio non vidima (RLS: 0 righe)';
  r := pg_temp.run_as(cpnt, format('update timesheet set stato = ''VIDIMATO'' where id = %L', ts1));
  assert r = 'OK' and (select stato from timesheet where id = ts1) = 'VIDIMATO', 'T5g coord del territorio vidima: ' || r;
  assert (select vidimato_da from timesheet where id = ts1) = cpnt, 'T5h vidimato_da valorizzato';
  r := pg_temp.run_as(e1, format('update timesheet set ore = 8 where id = %L', ts1));
  assert r like 'ERR:%già vidimata%', 'T5i riga vidimata immutabile per l''operatore: ' || r;
  r := pg_temp.run_as(e1, format('delete from timesheet where id = %L', ts1));
  assert (select count(*) from timesheet where id = ts1) = 1, 'T5j riga vidimata non cancellabile';
  assert pg_temp.count_as(amm, 'select 1 from v_rendicontazione_ore') = 1, 'T5k amministrativo legge la rendicontazione';
  assert (select valore_parametrico from v_rendicontazione_ore where id = ts1) = 97.36, 'T5l valore = 4 h x 24,34';
  assert pg_temp.count_as(e2, 'select 1 from timesheet') = 0, 'T5m un collega non vede le ore altrui';

  -- 6. Alert automatici (frequenza sotto soglia con 3 sessioni, revisione in scadenza, contatti mancati).
  perform pg_temp.run_as(cpnt, format('insert into sessioni_attivita(attivita_id, data_sessione, ora_inizio, ora_fine, operatore_responsabile_id, stato) values (%L, date ''2026-09-03'', ''15:00'', ''17:00'', %L, ''EROGATA''), (%L, date ''2026-09-04'', ''15:00'', ''17:00'', %L, ''EROGATA''), (%L, date ''2026-09-05'', ''15:00'', ''17:00'', %L, ''EROGATA'')', act, e1, act, e1, act, e1));
  perform pg_temp.run_as(e1, format('insert into partecipazioni(sessione_id, minore_id, stato_presenza, minuti_frequentati) select id, %L, ''ASSENTE_INGIUSTIFICATO'', 0 from sessioni_attivita where attivita_id = %L and id <> %L', m1, act, ses));
  -- le sessioni sono "recenti" rispetto a current_date solo se il collaudo gira in finestra; forziamo la data.
  update sessioni_attivita set data_sessione = current_date - 1 where attivita_id = act;
  perform pg_temp.run_as(e1, format('insert into contatti_settimanali(piae_id, operatore_id, timestamp_contatto, canale, esito) values (%L, %L, now() + interval ''1 minute'', ''TELEFONICO'', ''NON_RAGGIUNTO''), (%L, %L, now() + interval ''2 minute'', ''TELEFONICO'', ''NON_RAGGIUNTO''), (%L, %L, now() + interval ''3 minute'', ''MESSAGGISTICA'', ''NON_RAGGIUNTO'')', piae1, e1, piae1, e1, piae1, e1));
  perform set_config('request.jwt.claim.sub', pm::text, true);
  alerts := run_periodic_checks();
  assert (alerts->>'freq_sub_70')::int = 1, 'T6a FREQ_SUB_70 generato: ' || alerts::text;
  assert (alerts->>'missed_contacts')::int = 1, 'T6b MISSED_CONTACTS generato';
  assert (alerts->>'sla_revisione')::int = 1, 'T6c SLA_REVISIONE_60D generato';
  assert (alerts->>'aot_t30')::int = 7, 'T6c2 AOT_T30_INCOMPLETO su tutti i territori (siamo oltre T+30)';
  alerts := run_periodic_checks();
  assert (alerts->>'freq_sub_70')::int = 0, 'T6d idempotente';
  assert pg_temp.count_as(cpnt, 'select 1 from alert_automatici where not risolto') = 4, 'T6e coord vede i 3 alert del caso + AOT del territorio';
  assert pg_temp.count_as(ccai, 'select 1 from alert_automatici where not risolto') = 1, 'T6f coord CAI vede solo il proprio AOT';
  assert pg_temp.count_as(e1, 'select 1 from alert_automatici where not risolto') = 3, 'T6g case manager vede gli alert del proprio caso';
  r := pg_temp.run_as(e1, format('select close_alert(id, ''x'') from alert_automatici where codice_alert = ''FREQ_SUB_70'''));
  assert r like 'ERR:%non autorizzato%', 'T6h educatore non chiude alert: ' || r;
  r := pg_temp.run_as(cpnt, format('select close_alert(id, ''Presa in carico'') from alert_automatici where codice_alert = ''FREQ_SUB_70'''));
  assert r = 'OK' and (select count(*) from alert_automatici where not risolto and minore_id is not null) = 2, 'T6i coord chiude alert: ' || r;

  -- 7. Escalation e SLA.
  r := pg_temp.run_as(e1, format('insert into escalation_cases(minore_id, aperto_da_id, livello_gravita) values (%L, %L, ''PER_EMERGENZA_ALTO'')', m1, e1));
  assert r = 'OK', 'T7a apertura PER: ' || r;
  select id into esc from escalation_cases where minore_id = m1;
  assert (select sla from escalation_sla_status where id = esc) = 'IN_SLA', 'T7b SLA iniziale';
  r := pg_temp.run_as(cpnt, format('update escalation_cases set stato = ''RISOLTO'' where id = %L', esc));
  assert r = 'OK' and (select timestamp_chiusura from escalation_cases where id = esc) is not null, 'T7c chiusura registra timestamp';

  -- 8. L3: scrittura e lettura solo da specialista assegnato; audit VIEW_SENSITIVE.
  r := pg_temp.run_as(psy, format('insert into fascicolo_clinico_riservato(minore_id, redatto_da, tipo_dato, note_cifrate) values (%L, %L, ''SERVIZIO_ASCOLTO'', ''\x01aa''::bytea)', m1, psy));
  assert r like 'ERR:%', 'T8a psicologo NON assegnato non scrive L3';
  perform pg_temp.run_as(cpnt, format('insert into assegnazioni_caso(minore_id, utente_id, ruolo_nel_caso) values (%L, %L, ''PSICOLOGO'')', m1, psy));
  r := pg_temp.run_as(psy, format('insert into fascicolo_clinico_riservato(minore_id, redatto_da, tipo_dato, note_cifrate) values (%L, %L, ''SERVIZIO_ASCOLTO'', ''\x01aa''::bytea)', m1, psy));
  assert r = 'OK', 'T8b psicologo assegnato scrive L3: ' || r;
  select id into rec from fascicolo_clinico_riservato where minore_id = m1;
  r := pg_temp.run_as(psy, 'select * from fascicolo_clinico_riservato');
  assert r like 'ERR:%', 'T8c SELECT diretto su L3 revocato';
  assert pg_temp.count_as(psy, format('select * from get_clinical_record(%L)', rec)) = 1, 'T8d psicologo assegnato legge via RPC';
  assert pg_temp.count_as(e1, format('select * from get_clinical_record(%L)', rec)) = 0, 'T8e educatore negato su L3';
  assert pg_temp.count_as(pm, format('select * from get_clinical_record(%L)', rec)) = 0, 'T8f PM negato su L3 ordinario';
  assert (select count(*) from audit_logs where azione = 'VIEW_SENSITIVE' and record_id = rec::text) = 1, 'T8g audit VIEW_SENSITIVE';
  assert (select count(*) from audit_logs where azione = 'VIEW_SENSITIVE_DENIED' and record_id = rec::text) = 2, 'T8h audit tentativi negati';
  assert not exists (select 1 from audit_logs where tabella = 'fascicolo_clinico_riservato' and (diff_after ? 'note_cifrate')), 'T8i il diff di audit non contiene il cifrato';

  -- 9. Audit append-only e visibilità.
  r := pg_temp.run_as(pm, 'delete from audit_logs');
  assert r like 'ERR:%', 'T9a delete audit negato';
  begin
    update audit_logs set azione = 'X' where id = (select min(id) from audit_logs);
    raise exception 'T9b superuser non deve poter modificare audit';
  exception when others then
    assert sqlerrm like '%append-only%', 'T9b audit immutabile anche per superuser: ' || sqlerrm;
  end;
  assert pg_temp.count_as(pm, 'select 1 from audit_logs') > 10, 'T9c PM legge audit';
  assert pg_temp.count_as(cpnt, 'select 1 from audit_logs') = 0, 'T9d coord non legge audit';
  r := pg_temp.run_as(e1, 'select log_security_event(''EXPORT'', ''timesheet'', null, ''CSV'')');
  assert r = 'OK', 'T9e evento esplicito: ' || r;
  r := pg_temp.run_as(e1, 'select log_security_event(''DROP'', ''x'')');
  assert r like 'ERR:%', 'T9f azione non ammessa';

  -- 10. KPI e report.
  assert (select beneficiari_in_carico from v_kpi_territorio where codice = 'PNT') = 1, 'T10a KPI territorio';
  assert (select ore_erogate from v_kpi_territorio where codice = 'PNT') = 8, 'T10b ore erogate 4 sessioni x 2h';
  r := pg_temp.run_as(e1, 'select report_sintesi(current_date - 30, current_date)');
  assert r like 'ERR:%', 'T10c report non per educatori';
  perform set_config('request.jwt.claim.sub', pm::text, true);
  execute 'set local role authenticated';
  assert (report_sintesi(current_date - 30, current_date)->>'beneficiari_in_carico')::int = 1, 'T10d report PM';
  execute 'reset role';

  -- 11. Ruolo anon: nessun accesso.
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin
    perform * from minori; raise exception 'T11 anon non deve leggere';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise notice 'TUTTI I TEST SQL SUPERATI';
end $$;
