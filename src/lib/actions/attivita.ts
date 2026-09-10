"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole, requireMinorAccess } from "@/lib/security/authz";
import { ForbiddenError } from "@/lib/security/errors";
import { createActivitySchema, createSessionSchema, enrollSchema, recordAttendanceSchema, setSessionStatusSchema, updateActivityStatusSchema } from "@/lib/validation/attivita";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createActivityAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const value = createActivitySchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
    if (profile.ruolo === "COORDINATORE" && profile.territorio_id !== value.territorio_id) throw new ForbiddenError("Puoi programmare attività solo nel tuo territorio");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("attivita").insert({ ...value, created_by: profile.id }).select("id").single();
    if (error) throw error;
    revalidatePath("/attivita");
    return { ok: true, data: { id: data.id }, message: "Attività programmata" };
  } catch (e) { return actionFailure(e); }
}

export async function updateActivityStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = updateActivityStatusSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("attivita").update({ stato: value.stato }).eq("id", value.id);
    if (error) throw error;
    revalidatePath(`/attivita/${value.id}`);
    return { ok: true, data: undefined, message: "Stato aggiornato" };
  } catch (e) { return actionFailure(e); }
}

export async function createSessionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createSessionSchema.parse(formToObject(formData));
    const profile = await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("sessioni_attivita").insert({
      ...value, operatore_responsabile_id: value.operatore_responsabile_id ?? profile.id, created_by: profile.id,
    });
    if (error) throw error;
    revalidatePath(`/attivita/${value.attivita_id}`);
    return { ok: true, data: undefined, message: "Sessione programmata" };
  } catch (e) { return actionFailure(e); }
}

export async function setSessionStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = setSessionStatusSchema.parse(formToObject(formData));
    await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("sessioni_attivita").update({ stato: value.stato }).eq("id", value.sessione_id).select("attivita_id").maybeSingle();
    if (error) throw error;
    if (!data) throw new ForbiddenError("Sessione non modificabile con il tuo profilo");
    revalidatePath(`/attivita/${data.attivita_id}/sessioni/${value.sessione_id}`);
    return { ok: true, data: undefined, message: value.stato === "EROGATA" ? "Sessione chiusa come erogata" : "Stato aggiornato" };
  } catch (e) { return actionFailure(e); }
}

export async function enrollAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = enrollSchema.parse(formToObject(formData));
    const { profile } = await requireMinorAccess(value.minore_id, { write: true });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("iscrizioni_attivita").upsert({ ...value, attiva: true, created_by: profile.id }, { onConflict: "attivita_id,minore_id" });
    if (error) throw error;
    revalidatePath(`/attivita/${value.attivita_id}`);
    return { ok: true, data: undefined, message: "Iscrizione registrata" };
  } catch (e) { return actionFailure(e); }
}

// Registro presenze: salva tutte le righe di una sessione in una volta (campi presenza__<minoreId>).
export async function saveAttendanceSheetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireProfile();
    const sessioneId = String(formData.get("sessione_id") ?? "");
    const rows: Array<Record<string, unknown>> = [];
    for (const [k, v] of formData.entries()) {
      if (!k.startsWith("presenza__")) continue;
      const minoreId = k.slice("presenza__".length);
      const stato = String(v); if (!stato) continue;
      const minuti = formData.get(`minuti__${minoreId}`); const note = formData.get(`note__${minoreId}`);
      rows.push(recordAttendanceSchema.parse({ sessione_id: sessioneId, minore_id: minoreId, stato_presenza: stato,
        minuti_frequentati: minuti ? Number(minuti) : null, note_educatore: note ? String(note) : null }));
    }
    if (!rows.length) return { ok: false, error: "Nessuna presenza selezionata", code: "VALIDATION" };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("partecipazioni").upsert(rows.map(r => ({ ...r, created_by: profile.id, updated_by: profile.id })), { onConflict: "sessione_id,minore_id" });
    if (error) throw error;
    const { data: s } = await supabase.from("sessioni_attivita").select("attivita_id").eq("id", sessioneId).maybeSingle();
    if (s) revalidatePath(`/attivita/${s.attivita_id}/sessioni/${sessioneId}`);
    return { ok: true, data: undefined, message: `Registro salvato: ${rows.length} presenze` };
  } catch (e) { return actionFailure(e); }
}
