-- =============================================================================
-- Migration 0002: dati di base del progetto (non personali)
-- Sette territori, RTI, figure professionali con tariffe, configurazione.
-- =============================================================================
insert into public.territori (codice, nome, comune) values
  ('SGV','San Giovanni a Teduccio','Napoli'),
  ('PNT','Ponticelli','Napoli'),
  ('AFR','Afragola','Afragola'),
  ('CAI','Caivano','Caivano'),
  ('CDC','Castello di Cisterna','Castello di Cisterna'),
  ('GIU','Giugliano in Campania','Giugliano in Campania'),
  ('MAR','Marigliano','Marigliano')
on conflict (codice) do update set nome = excluded.nome, comune = excluded.comune;

insert into public.enti_partner (codice, denominazione, ruolo_rti, quota_percentuale) values
  ('EMMANUEL','Cooperativa Sociale Emmanuel','MANDATARIA',32),
  ('EITD','E.I.T.D. S.r.l.','MANDANTE',30),
  ('MDS','Associazione Maestri di Strada Onlus','MANDANTE',28),
  ('ESCULAPIO','Esculapio Cooperativa Sociale','MANDANTE',10)
on conflict (codice) do update set denominazione = excluded.denominazione, ruolo_rti = excluded.ruolo_rti, quota_percentuale = excluded.quota_percentuale;

-- Tariffe orarie: art. 7 Capitolato (figure obbligatorie) e quadro economico rimodulato (audizione 23.07.2026).
insert into public.figure_professionali (codice, descrizione, tariffa_oraria, fonte_tariffa) values
  ('PM','Project Manager certificato UNI 11648:2022 – Referente unico (SPOC)',34.66,'Capitolato art. 7'),
  ('COORD','Coordinatore Equipe di Prossimità',25.98,'Capitolato art. 7'),
  ('EDU','Educatore professionale / case manager',24.34,'Capitolato art. 7'),
  ('AS','Assistente sociale di equipe',24.34,'Capitolato art. 7'),
  ('ISTR_SPORT','Istruttore sportivo – corsi obbligatori art. 4.8',24.34,'Capitolato art. 7'),
  ('AMM','Addetto amministrativo di progetto – segreteria e supporto alla rendicontazione',22.36,'Capitolato art. 7'),
  ('ICT','Esperto informatico – piattaforma digitale, cruscotto KPI, database risorse',24.34,'Capitolato art. 7'),
  ('PSI','Psicologo di equipe – Servizio di Ascolto (art. 4.8)',48.00,'Quadro economico rimodulato'),
  ('PSI_SUP','Psicologo supervisore esterno – supervisione clinica',60.00,'Quadro economico rimodulato'),
  ('DOC_FORM','Docenza formazione interna – Onboarding Express e Safeguarding',60.00,'Quadro economico rimodulato'),
  ('ESP_LAB','Esperto di laboratorio – docente tecnico delle edizioni laboratoriali',50.00,'Quadro economico rimodulato'),
  ('OSS','Operatore socio-sanitario – co-docente laboratorio Assistenza alla persona',30.00,'Quadro economico rimodulato'),
  ('INF','Infermiere – docente tecnico laboratorio Assistenza alla persona e primo soccorso',50.00,'Quadro economico rimodulato'),
  ('TUTOR','Tutor d''aula e di accompagnamento',30.00,'Quadro economico rimodulato'),
  ('ESP_FORM','Esperto formativo senior – progettazione didattica, orientamento, bilanci di competenze',50.00,'Quadro economico rimodulato'),
  ('ESP_MON','Esperto di monitoraggio e rendicontazione POC Legalità',50.00,'Quadro economico rimodulato'),
  ('ASACOM','Assistente all''autonomia e comunicazione – supporto a destinatari con BES',28.00,'Quadro economico rimodulato')
on conflict (codice) do update set descrizione = excluded.descrizione, tariffa_oraria = excluded.tariffa_oraria, fonte_tariffa = excluded.fonte_tariffa;

-- Perimetro temporale: contratto 04.08.2026; erogazione 31.08–30.09.2026; attività amministrative e recupero fino a gennaio 2027.
insert into public.configurazione_progetto (id, data_avvio, data_fine_erogazione, data_fine_progetto)
values (true, date '2026-08-04', date '2026-09-30', date '2027-01-31')
on conflict (id) do update set data_avvio = excluded.data_avvio, data_fine_erogazione = excluded.data_fine_erogazione, data_fine_progetto = excluded.data_fine_progetto;
