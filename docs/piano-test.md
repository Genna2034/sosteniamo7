# Piano di collaudo

## Automatici (eseguiti)
- `npm run security:scan` — nessun segreto nel codice, service role assente dal runtime.
- `npm run typecheck` — TypeScript strict, 0 errori.
- `npm test` — 17 test unitari: cifratura L3 (round-trip, IV casuale, manomissione, chiave errata), CSV italiano, aggregazioni di rendicontazione e quote RTI, validazioni (anagrafica, timesheet a quarti d'ora, sessioni, presenze, PIAE, AOT).
- `npm run test:sql` — 11 gruppi su Postgres 16: RLS cross-territorio, IDOR sulle schede, un solo PIAE attivo, contatti, attività/iscrizioni/presenze, timesheet (perimetro date, no auto-vidimazione, immutabilità), alert automatici, SLA escalation, L3 con audit anche in caso di diniego, audit non modificabile, viste KPI e report, nessun accesso anonimo.
- `npm run build` + avvio standalone: `/login` 200, `/`→`/login`, rotte protette 307 con `next=`, `/api/health` 200, header CSP/HSTS/X-Frame-Options presenti.

## Manuali (da fare su ambiente Supabase di prova con `seed:demo`)
1. Login come `coord.pnt@sosteniamo.invalid`: cruscotto con 31 beneficiari, nuova presa in carico `PNT-032`, assegnazione educatore, avvio PIAE, revisione a 60 giorni.
2. Login come `edu1.pnt@…`: vede solo i casi assegnati; diario rapido; registro presenze di una sessione; inserimento ore; non vede beneficiari di Afragola (URL diretto → "Pagina non trovata").
3. Coordinatore: vidima le ore dell'educatore; prova a vidimare le proprie → errore.
4. `psi.pnt@…`: apre la scheda di un caso assegnato, salva una nota L3, la riapre; verifica in `audit_logs` gli eventi `VIEW_SENSITIVE`.
5. `amministrazione@…`: rendicontazione per figura/ente/territorio, export CSV apribile in Excel, report al RUP stampato; `/beneficiari` non accessibile.
6. `/alert`: "Esegui controlli" genera FREQ_SUB_70 per i beneficiari con assenze del seed; chiusura con nota.
