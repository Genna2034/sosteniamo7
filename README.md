# SosteniAMO 7 — piattaforma di monitoraggio e rendicontazione

Piattaforma web per il servizio **"SosteniAMO il quartiere"** (gara S023/2025, Città Metropolitana di Napoli, POC Legalità 2014-2020 — CUP H69G25000020001, CIG B8A12C555A), erogato dal RTI Emmanuel (mandataria) / EITD / Maestri di Strada / Esculapio su sette territori.

È la "piattaforma di monitoraggio" prevista in offerta tecnica: anagrafica pseudonimizzata dei 217 destinatari, PIAE con revisione a 60 giorni, registri presenze delle attività, timesheet nominativi giornalieri vidimati dal Coordinatore, cruscotto KPI, mappa della comunità educante e accordi AOT, alert automatici e Protocollo di Riattivazione (4/12/24/48h), report settimanale al RUP, prospetti di rendicontazione ed export CSV.

## Architettura

- **Next.js 15** (App Router, Server Actions, output `standalone`) · **Supabase** (Postgres + Auth, accesso SSR con cookie) · Zod 4 · Tailwind 4.
- **La sicurezza è nel database**: Row Level Security su tutte le tabelle per ruolo, territorio e assegnazione del caso; trigger che impediscono l'auto-vidimazione delle ore, la modifica delle righe vidimate, le presenze di non iscritti e le date fuori perimetro contrattuale; audit log append-only; note cliniche (L3) cifrate AES-256-GCM lato server, leggibili solo tramite RPC che verifica l'assegnazione e registra ogni lettura (anche quella negata).
- L'app usa **solo la chiave anon**: la service role non compare mai nel runtime web (lo script `security:scan` lo verifica).

Ruoli: `PROJECT_MANAGER`, `COORDINATORE` (di territorio), `EDUCATORE`, `PSICOLOGO`, `ASSISTENTE_SOCIALE`, `ALTRO_SPECIALISTA`, `AMMINISTRATIVO` (vede solo timesheet, rendicontazione e report: nessun dato di beneficiari).

## Moduli

| Percorso | Chi | Cosa |
|---|---|---|
| `/dashboard` | tutti | KPI reali per territorio, frequenza 14 giorni, alert, PER, ore da vidimare |
| `/beneficiari` | coord, educatori, specialisti | Anagrafica pseudonimizzata, scheda con equipe, PIAE, obiettivi SMART, revisioni PDCA, contatti, presenze, escalation, fascicolo L3 |
| `/attivita` | tutti tranne amm. | Laboratori, corsi, azioni di strada; sessioni e **registro presenze** compilabile da telefono |
| `/diario-rapido` | educatori | Registrazione del contatto in pochi tocchi |
| `/timesheet` | tutti | Ore giornaliere per figura professionale; vidimazione per coord/PM |
| `/rendicontazione` | PM, coord, amm. | Ore × tariffa di capitolato per figura, ente, territorio; confronto quote RTI; export CSV |
| `/report` | PM, coord, amm. | Report al RUP per periodo, stampabile in PDF |
| `/alert` | tutti | Alert automatici (frequenza <70%, contatti mancati, revisione 60gg, AOT a T+30), escalation PER con timeline e comunicazioni istituzionali |
| `/rete` | tutti | Mappa della comunità educante (70 realtà), accordi AOT per territorio |
| `/piae` | coord, educatori | Registro dei piani con scadenze di revisione |

## Messa in esercizio

1. **Supabase**: crea un progetto, apri *SQL Editor* ed esegui in ordine `supabase/migrations/0001_schema.sql`, `0002_seed_base.sql`, `0003_hardening.sql` (oppure `supabase db push` con la CLI). In *Authentication → Providers* lascia solo Email/password; disattiva le registrazioni pubbliche (*Allow new users to sign up* = off).
2. **Utenti**: crea gli utenti in *Authentication → Users* e poi la riga corrispondente in `profili_utenti` (stesso `id`, ruolo, territorio, ente, figura professionale). Per un ambiente di prova: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:demo` crea 7 territori popolati, 217 beneficiari, 21 attività, 70 realtà e utenti `*@sosteniamo.invalid` (password nello script). **Mai in produzione.**
3. **Variabili** (vedi `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SOSTENIAMO_FIELD_ENCRYPTION_KEY` (`openssl rand -base64 32` — se la perdi, le note L3 diventano illeggibili: custodiscila in un password manager).
4. **Deploy**: su Vercel importa il repo e imposta le tre variabili; oppure `docker build -t sosteniamo7 .` e `docker run -p 3000:3000 --env-file .env.local sosteniamo7`. Dopo il deploy, aggiungi l'URL pubblico in Supabase → *Authentication → URL Configuration*.
5. **Controlli periodici**: pianifica `select public.run_periodic_checks();` ogni notte (Supabase → Database → Cron, estensione `pg_cron`) oppure usa il pulsante "Esegui controlli" in `/alert`.

## Sviluppo e test

```
npm ci
npm run check          # security scan + typecheck + test unitari + build
npm run test:sql       # collaudo dello schema su Postgres locale (PGHOST/PGPORT/PGUSER)
npm run dev
```

I test SQL (`tests/sql/01_security_and_domain.sql`) verificano isolamento tra territori, protezione IDOR, unicità del PIAE, regole di timesheet e presenze, alert, SLA di escalation, accesso L3 con audit e immutabilità dell'audit. La CI GitHub esegue tutto su ogni push.

## Note di conformità

- Nella piattaforma non entrano nome, cognome, indirizzo o contatti dei minori: solo codice `TTT-nnn` e pseudonimo. L'abbinamento resta nella scheda cartacea del Coordinatore.
- Export e report riportano esclusivamente il codice pseudonimo.
- Il fascicolo L3 (colloqui, safeguarding, procedimenti) è cifrato con chiave applicativa: neppure l'amministratore del database lo legge in chiaro.
- Da completare fuori piattaforma: nomina del DPO/responsabile del trattamento nel RTI, informativa e consenso per i destinatari, registro dei trattamenti, retention (proposta: cancellazione dei dati L3 a 24 mesi dalla chiusura del servizio, timesheet e presenze conservati per 10 anni ai fini di rendicontazione).
