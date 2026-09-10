// Seed dimostrativo: utenti di test (dominio .invalid, password DemoSosteniamo!2026), beneficiari, attività, rete.
// Usa la SERVICE ROLE: eseguire SOLO su un progetto Supabase di prova, mai in produzione.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SOSTENIAMO_FIELD_ENCRYPTION_KEY=... node scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = "DemoSosteniamo!2026";
const die = (e, ctx) => { if (e) { console.error(ctx, e.message ?? e); process.exit(1); } };
// Inserimento idempotente: cerca per chiave logica, altrimenti inserisce.
async function ensure(table, match, row) {
  let q = sb.from(table).select("id"); for (const [k, v] of Object.entries(match)) q = v === null ? q.is(k, null) : q.eq(k, v);
  const { data: found } = await q.limit(1); if (found?.length) return found[0];
  const { data, error } = await sb.from(table).insert({ ...match, ...row }).select("id").single(); die(error, `${table} ${JSON.stringify(match)}`); return data;
}

const { data: territori, error: et } = await sb.from("territori").select("id,codice,nome").order("codice"); die(et, "territori");
const { data: figure, error: ef } = await sb.from("figure_professionali").select("id,codice"); die(ef, "figure");
const fig = c => figure.find(f => f.codice === c)?.id ?? null;
const T = c => territori.find(t => t.codice === c);

async function user(email, profilo) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let u = list?.users.find(x => x.email === email);
  if (!u) { const { data, error } = await sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true }); die(error, email); u = data.user; }
  const { error } = await sb.from("profili_utenti").upsert({ id: u.id, stato_attivo: "ATTIVO", ...profilo }); die(error, `profilo ${email}`);
  return u.id;
}
const pm = await user("pm@sosteniamo.invalid", { nome: "Luigi", cognome: "Vanore", ruolo: "PROJECT_MANAGER", ente_partner: "EMMANUEL", figura_id: fig("PM") });
await user("amministrazione@sosteniamo.invalid", { nome: "Umberto", cognome: "Rendiconti", ruolo: "AMMINISTRATIVO", ente_partner: "EMMANUEL", figura_id: fig("AMM") });
const coord = {}; const edu = {}; const psi = {};
for (const t of territori) {
  const k = t.codice.toLowerCase();
  coord[t.codice] = await user(`coord.${k}@sosteniamo.invalid`, { nome: "Coordinatore", cognome: t.nome, ruolo: "COORDINATORE", territorio_id: t.id, ente_partner: "MDS", figura_id: fig("COORD") });
  edu[t.codice] = [await user(`edu1.${k}@sosteniamo.invalid`, { nome: "Educatore", cognome: `${t.nome} Uno`, ruolo: "EDUCATORE", territorio_id: t.id, ente_partner: "MDS", figura_id: fig("EDU") }), await user(`edu2.${k}@sosteniamo.invalid`, { nome: "Educatrice", cognome: `${t.nome} Due`, ruolo: "EDUCATORE", territorio_id: t.id, ente_partner: "EITD", figura_id: fig("EDU") })];
  psi[t.codice] = await user(`psi.${k}@sosteniamo.invalid`, { nome: "Psicologa", cognome: t.nome, ruolo: "PSICOLOGO", territorio_id: t.id, ente_partner: "ESCULAPIO", figura_id: fig("PSI") });
}

// Beneficiari: 31 per territorio (217 totali), con PIAE ed equipe.
const nomi = ["Falco", "Onda", "Vento", "Lupo", "Sole", "Roccia", "Nuvola", "Fiamma", "Luna", "Radice"];
let seq = 0; const minori = {};
for (const t of territori) {
  minori[t.codice] = [];
  for (let i = 1; i <= 31; i++) {
    const codice = `${t.codice}-${String(i).padStart(3, "0")}`;
    const { data: m, error } = await sb.from("minori").upsert({ codice_identificativo: codice, territorio_id: t.id, pseudonimo: `${nomi[i % nomi.length]} ${i}`, data_presa_in_carico: "2026-08-24", stato: "IN_CARICO", created_by: coord[t.codice] }, { onConflict: "codice_identificativo" }).select("id").single(); die(error, codice);
    minori[t.codice].push(m.id); seq++;
    const e = edu[t.codice][i % 2];
    await ensure("assegnazioni_caso", { minore_id: m.id, utente_id: e, ruolo_nel_caso: "EDUCATORE_CASEMANAGER" }, { data_inizio: "2026-08-24", attiva: true, assegnato_da: coord[t.codice] });
    if (i % 5 === 0) await ensure("assegnazioni_caso", { minore_id: m.id, utente_id: psi[t.codice], ruolo_nel_caso: "PSICOLOGO" }, { data_inizio: "2026-08-24", attiva: true, assegnato_da: coord[t.codice] });
    const { data: p } = await sb.from("piae").upsert({ minore_id: m.id, versione: 1, educatore_referente_id: e, data_inizio: "2026-08-31", stato: "ATTIVO", contratto_sociale_firmato: i % 3 !== 0, data_firma_contratto: i % 3 !== 0 ? "2026-08-31" : null, created_by: coord[t.codice] }, { onConflict: "minore_id,versione" }).select("id").single();
    if (p && i <= 3) for (const [tipologia, d] of [["FORMATIVO", "Frequentare almeno il 70% delle sessioni del laboratorio entro ottobre"], ["RELAZIONALE", "Partecipare a due uscite di gruppo con il pari tutor entro settembre"], ["RESPONSABILITA", "Rispettare gli orari concordati per 4 settimane consecutive"]])
      await sb.from("piae_obiettivi").insert({ piae_id: p.id, tipologia, descrizione_smart: d, target_mensile: "verifica al 60° giorno" }).then(() => {});
  }
}
console.log(`Beneficiari: ${seq}`);

// Attività: 2 laboratori + 1 corso sportivo per territorio, con sessioni e presenze.
const lab = [["LABORATORIO", "Laboratorio musicale – freestyle rap e beatbox", "MDS"], ["LABORATORIO", "Laboratorio di street art e grafica", "EITD"], ["CORSO_SPORTIVO", "Corso di calcio a 5 e boxe educativa", "EMMANUEL"]];
let sessCount = 0;
for (const t of territori) for (const [tipo, titolo, ente] of lab) {
  const a = await ensure("attivita", { territorio_id: t.id, titolo: `${titolo} – ${t.nome}` }, { tipo, ente_erogatore: ente, ore_minime_previste: 8, data_inizio: "2026-09-01", data_fine: "2026-09-30", stato: "IN_CORSO", created_by: coord[t.codice] });
  const iscritti = minori[t.codice].slice(tipo === "LABORATORIO" ? 0 : 8, tipo === "LABORATORIO" ? 8 : 16);
  for (const m of iscritti) await sb.from("iscrizioni_attivita").upsert({ attivita_id: a.id, minore_id: m, data_iscrizione: "2026-09-01", attiva: true }, { onConflict: "attivita_id,minore_id" });
  for (let d = 2; d <= 9; d += 7) {
    const s = await ensure("sessioni_attivita", { attivita_id: a.id, data_sessione: `2026-09-${String(d).padStart(2, "0")}`, ora_inizio: "15:00" }, { ora_fine: "17:00", operatore_responsabile_id: edu[t.codice][0], stato: "EROGATA", luogo: "Sede di territorio" });
    if (!s) continue; sessCount++;
    for (const [i, m] of iscritti.entries()) await sb.from("partecipazioni").upsert({ sessione_id: s.id, minore_id: m, stato_presenza: i % 4 === 3 ? "ASSENTE_INGIUSTIFICATO" : "PRESENTE", minuti_frequentati: i % 4 === 3 ? 0 : 120, registrato_da: edu[t.codice][0] }, { onConflict: "sessione_id,minore_id" });
  }
  // Timesheet dell'educatore conduttore
  for (let d = 2; d <= 9; d += 7) await ensure("timesheet", { utente_id: edu[t.codice][0], attivita_id: a.id, data: `2026-09-${String(d).padStart(2, "0")}` }, { figura_id: fig("EDU"), territorio_id: t.id, ore: 3, descrizione: `Preparazione e conduzione: ${titolo}`, stato: "INVIATO" });
}
console.log(`Sessioni: ${sessCount}`);

// Rete: 10 realtà per territorio (70) e AOT
const tipi = ["SCUOLA", "SERVIZIO_SOCIALE", "BOTTEGA", "ASD", "TERZO_SETTORE", "PARROCCHIA", "IMPRESA", "SCUOLA", "ASD", "ALTRO"];
for (const t of territori) for (const [i, tipologia] of tipi.entries()) {
  const { data: r } = await sb.from("rete_risorse").upsert({ territorio_id: t.id, tipologia, denominazione: `${tipologia.replaceAll("_", " ").toLowerCase()} ${i + 1} – ${t.nome}`, referente: "Referente demo", email: `rete${i + 1}.${t.codice.toLowerCase()}@sosteniamo.invalid`, created_by: coord[t.codice] }, { onConflict: "territorio_id,denominazione" }).select("id").single();
  if (r && (i === 0 || i === 1)) await ensure("accordi_rete", { risorsa_id: r.id, tipo_accordo: i === 0 ? "AOT_SCUOLE" : "AOT_SERVIZI_SOCIALI" }, { territorio_id: t.id, stato: "ATTIVO", data_sottoscrizione: "2026-08-28", protocollo_interno: `AOT-${t.codice}-${i + 1}`, created_by: coord[t.codice] });
}
const { data: checks } = await sb.rpc("run_periodic_checks"); console.log("Controlli automatici:", checks);
console.log(`\nSeed completato. Accesso: pm@sosteniamo.invalid / coord.pnt@sosteniamo.invalid / edu1.pnt@sosteniamo.invalid / psi.pnt@sosteniamo.invalid — password ${PASSWORD}`);
console.log("Nota: gli utenti di seed hanno dominio .invalid e vanno rimossi prima della messa in esercizio.");
