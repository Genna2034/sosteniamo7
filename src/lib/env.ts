// Letto a runtime: accetta anche SUPABASE_URL / SUPABASE_ANON_KEY (nomi non pubblici, mai inlinati in build).
export function supabasePublicEnv() {
  const env = process.env;
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const anonKey = (env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return { url, anonKey };
}
