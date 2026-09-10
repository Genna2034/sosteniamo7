import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, CurrentProfile } from "@/types/domain";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";

export async function getProfileOrNull(): Promise<{ user: { id: string; email?: string } | null; profile: CurrentProfile | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { user: null, profile: null };
  const { data } = await supabase.from("profili_utenti")
    .select("id,nome,cognome,ruolo,territorio_id,ente_partner,figura_id,stato_attivo").eq("id", authData.user.id).maybeSingle();
  return { user: { id: authData.user.id, email: authData.user.email }, profile: (data as CurrentProfile | null) ?? null };
}

export async function requireProfile(): Promise<CurrentProfile> {
  const { user, profile } = await getProfileOrNull();
  if (!user) throw new UnauthorizedError("Sessione non valida");
  if (!profile || profile.stato_attivo !== "ATTIVO") throw new UnauthorizedError("Profilo non attivo");
  return profile;
}

export function requireRole(profile: CurrentProfile, allowed: AppRole[]) {
  if (!allowed.includes(profile.ruolo)) throw new ForbiddenError("Operazione non consentita per il tuo ruolo");
}

export function isStaffDirettivo(profile: CurrentProfile) {
  return profile.ruolo === "PROJECT_MANAGER" || profile.ruolo === "COORDINATORE";
}

// Verifica applicativa (defense-in-depth): la RLS resta l'enforcement finale.
export async function requireMinorAccess(minoreId: string, options: { write?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const profile = await requireProfile();
  const { data: minor, error } = await supabase.from("minori").select("id,territorio_id,pseudonimo,codice_identificativo").eq("id", minoreId).maybeSingle();
  if (error || !minor) throw new NotFoundError("Beneficiario non trovato o non accessibile");
  if (options.write && profile.ruolo === "PROJECT_MANAGER") throw new ForbiddenError("Il PM opera in sola lettura sui casi individuali");
  if (options.write && profile.ruolo === "AMMINISTRATIVO") throw new ForbiddenError("Il profilo amministrativo non modifica i casi");
  if (profile.ruolo === "COORDINATORE" && minor.territorio_id !== profile.territorio_id) throw new ForbiddenError("Beneficiario di un altro territorio");
  return { profile, minor };
}
