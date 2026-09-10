"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole, requireMinorAccess } from "@/lib/security/authz";
import { ForbiddenError } from "@/lib/security/errors";
import { assignCaseSchema, createMinorSchema, updateMinorSchema } from "@/lib/validation/minori";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createMinorAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const value = createMinorSchema.parse(formToObject(formData));
    const profile = await requireProfile();
    requireRole(profile, ["COORDINATORE"]);
    if (profile.territorio_id !== value.territorio_id) throw new ForbiddenError("Puoi inserire beneficiari solo nel tuo territorio");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("minori").insert({ ...value, created_by: profile.id }).select("id").single();
    if (error) throw error;
    revalidatePath("/beneficiari");
    return { ok: true, data: { id: data.id }, message: "Beneficiario registrato" };
  } catch (e) { return actionFailure(e); }
}

export async function updateMinorAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const { id, ...patch } = updateMinorSchema.parse(formToObject(formData));
    const { profile } = await requireMinorAccess(id, { write: true });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("minori").update({ ...patch, updated_by: profile.id }).eq("id", id);
    if (error) throw error;
    revalidatePath(`/beneficiari/${id}`);
    return { ok: true, data: undefined, message: "Scheda aggiornata" };
  } catch (e) { return actionFailure(e); }
}

export async function assignCaseAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = assignCaseSchema.parse(formToObject(formData));
    const { profile } = await requireMinorAccess(value.minore_id, { write: true });
    requireRole(profile, ["COORDINATORE"]);
    const supabase = await createSupabaseServerClient();
    if (value.ruolo_nel_caso === "EDUCATORE_CASEMANAGER") {
      // Un solo case manager attivo: chiude il precedente prima di assegnare il nuovo.
      await supabase.from("assegnazioni_caso").update({ attiva: false, data_fine: new Date().toISOString().slice(0, 10) })
        .eq("minore_id", value.minore_id).eq("ruolo_nel_caso", "EDUCATORE_CASEMANAGER").eq("attiva", true);
    }
    const { error } = await supabase.from("assegnazioni_caso").insert({ ...value, created_by: profile.id });
    if (error) throw error;
    revalidatePath(`/beneficiari/${value.minore_id}`);
    return { ok: true, data: undefined, message: "Incarico assegnato" };
  } catch (e) { return actionFailure(e); }
}
