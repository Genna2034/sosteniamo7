"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/security/authz";
import { createTimesheetSchema, deleteTimesheetSchema, reviewTimesheetSchema } from "@/lib/validation/timesheet";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createTimesheetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createTimesheetSchema.parse(formToObject(formData));
    const profile = await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("timesheet").insert({
      ...value, utente_id: profile.id, territorio_id: value.territorio_id ?? profile.territorio_id, stato: "INVIATO",
    });
    if (error) throw error;
    revalidatePath("/timesheet");
    return { ok: true, data: undefined, message: "Ore registrate e inviate per vidimazione" };
  } catch (e) { return actionFailure(e); }
}

export async function reviewTimesheetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = reviewTimesheetSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("timesheet").update({ stato: value.stato, note_vidimazione: value.note_vidimazione ?? null }).eq("id", value.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "Riga non trovata o non nel tuo territorio", code: "FORBIDDEN" };
    revalidatePath("/timesheet");
    return { ok: true, data: undefined, message: value.stato === "VIDIMATO" ? "Ore vidimate" : "Ore respinte" };
  } catch (e) { return actionFailure(e); }
}

export async function deleteTimesheetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = deleteTimesheetSchema.parse(formToObject(formData));
    await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("timesheet").delete().eq("id", value.id);
    if (error) throw error;
    revalidatePath("/timesheet");
    return { ok: true, data: undefined, message: "Riga eliminata" };
  } catch (e) { return actionFailure(e); }
}
