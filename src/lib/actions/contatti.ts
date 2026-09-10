"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireMinorAccess } from "@/lib/security/authz";
import { createContactSchema } from "@/lib/validation/contatti";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function recordContactAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const value = createContactSchema.parse(input);
    const profile = await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { data: p } = await supabase.from("piae").select("minore_id").eq("id", value.piae_id).maybeSingle();
    if (!p) throw new Error("PIAE non trovato o non accessibile");
    await requireMinorAccess(p.minore_id, { write: true });
    const { data, error } = await supabase.from("contatti_settimanali").insert({ ...value, operatore_id: profile.id, created_by: profile.id }).select("id").single();
    if (error) throw error;
    revalidatePath(`/beneficiari/${p.minore_id}`);
    return { ok: true, data: { id: data.id }, message: "Contatto registrato" };
  } catch (e) { return actionFailure(e); }
}
