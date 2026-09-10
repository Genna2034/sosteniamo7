"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/security/authz";
import { ForbiddenError } from "@/lib/security/errors";
import { createAotSchema, createResourceSchema } from "@/lib/validation/rete";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createResourceAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createResourceSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
    if (profile.ruolo === "COORDINATORE" && profile.territorio_id !== value.territorio_id) throw new ForbiddenError("Puoi mappare risorse solo nel tuo territorio");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("rete_risorse").insert({ ...value, created_by: profile.id });
    if (error) throw error;
    revalidatePath("/rete");
    return { ok: true, data: undefined, message: "Realtà aggiunta alla mappa" };
  } catch (e) { return actionFailure(e); }
}

export async function createAotAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createAotSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE", "PROJECT_MANAGER"]);
    if (profile.ruolo === "COORDINATORE" && profile.territorio_id !== value.territorio_id) throw new ForbiddenError("Puoi sottoscrivere accordi solo nel tuo territorio");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("accordi_rete").insert({ ...value, coordinatore_firmatario_id: profile.id, created_by: profile.id });
    if (error) throw error;
    revalidatePath("/rete");
    return { ok: true, data: undefined, message: "Accordo registrato" };
  } catch (e) { return actionFailure(e); }
}
