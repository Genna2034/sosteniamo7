"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/security/authz";
import { encryptSensitiveText } from "@/lib/security/crypto";
import { createClinicalNoteSchema } from "@/lib/validation/clinical";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createClinicalNoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createClinicalNoteSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["PSICOLOGO", "ASSISTENTE_SOCIALE"]);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("fascicolo_clinico_riservato").insert({
      minore_id: value.minore_id, redatto_da: profile.id, tipo_dato: value.tipo_dato,
      note_cifrate: encryptSensitiveText(value.note), data_colloquio: value.data_colloquio ?? null,
    });
    if (error) throw error;
    revalidatePath(`/beneficiari/${value.minore_id}`);
    return { ok: true, data: undefined, message: "Nota riservata salvata (cifrata)" };
  } catch (e) { return actionFailure(e); }
}
