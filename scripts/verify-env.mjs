// Verifica le variabili d'ambiente prima dell'avvio in produzione.
const errors = [];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""; const key = process.env.SOSTENIAMO_FIELD_ENCRYPTION_KEY ?? "";
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) errors.push("NEXT_PUBLIC_SUPABASE_URL non valido");
if (anon.length < 20 || anon === "replace_me") errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY mancante");
if (anon.includes("service_role")) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contiene la service role: NON usare");
try { if (Buffer.from(key, "base64").length !== 32) errors.push("SOSTENIAMO_FIELD_ENCRYPTION_KEY deve essere 32 byte base64 (openssl rand -base64 32)"); } catch { errors.push("SOSTENIAMO_FIELD_ENCRYPTION_KEY non è base64"); }
if (errors.length) { console.error("Ambiente non valido:\n - " + errors.join("\n - ")); process.exit(1); }
console.log("Ambiente OK");
