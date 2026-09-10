"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireMinorAccess, requireRole } from "@/lib/security/authz";
import { addEscalationEventSchema, closeAlertSchema, createEscalationSchema, recordAuthorityNotificationSchema } from "@/lib/validation/escalation";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function createEscalationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createEscalationSchema.parse(formToObject(formData));
    const { profile } = await requireMinorAccess(value.minore_id, { write: true });
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("escalation_cases").insert({ minore_id: value.minore_id, livello_gravita: value.livello_gravita, aperto_da_id: profile.id }).select("id").single();
    if (error) throw error;
    await supabase.from("escalation_eventi").insert({ escalation_id: data.id, tipo_evento: "CAMBIO_STATO", attore_id: profile.id, descrizione: value.descrizione, stato_successivo: "APERTO" });
    revalidatePath("/alert"); revalidatePath(`/beneficiari/${value.minore_id}`);
    return { ok: true, data: undefined, message: "Escalation aperta: il Coordinatore ha 4 ore per la valutazione" };
  } catch (e) { return actionFailure(e); }
}

export async function addEscalationEventAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = addEscalationEventSchema.parse(formToObject(formData));
    const profile = await requireProfile();
    const supabase = await createSupabaseServerClient();
    const { data: esc } = await supabase.from("escalation_cases").select("minore_id,stato").eq("id", value.escalation_id).maybeSingle();
    if (!esc) throw new Error("Escalation non trovata o non accessibile");
    const { error } = await supabase.from("escalation_eventi").insert({
      escalation_id: value.escalation_id, tipo_evento: value.tipo_evento, attore_id: profile.id, descrizione: value.descrizione,
      stato_precedente: esc.stato, stato_successivo: value.stato_successivo ?? null,
    });
    if (error) throw error;
    if (value.stato_successivo && value.stato_successivo !== esc.stato) {
      const { error: e2 } = await supabase.from("escalation_cases").update({ stato: value.stato_successivo }).eq("id", value.escalation_id);
      if (e2) throw e2;
    }
    revalidatePath("/alert"); revalidatePath(`/beneficiari/${esc.minore_id}`);
    return { ok: true, data: undefined, message: "Evento registrato nella timeline" };
  } catch (e) { return actionFailure(e); }
}

export async function recordAuthorityNotificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = recordAuthorityNotificationSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER", "COORDINATORE"]);
    const supabase = await createSupabaseServerClient();
    const { data: esc } = await supabase.from("escalation_cases").select("minore_id,stato").eq("id", value.escalation_id).maybeSingle();
    if (!esc) throw new Error("Escalation non trovata o non accessibile");
    const descrizione = `Comunicazione a ${value.destinatario.replaceAll("_", " ")} del ${value.data_ora_invio}, prot. ${value.numero_protocollo}${value.estremi_pec ? ` — PEC: ${value.estremi_pec}` : ""}`;
    const { error } = await supabase.from("escalation_eventi").insert({ escalation_id: value.escalation_id, tipo_evento: "NOTIFICA_AUTORITA", attore_id: profile.id, descrizione, stato_precedente: esc.stato, stato_successivo: esc.stato });
    if (error) throw error;
    const patch: Record<string, unknown> = { estremi_notifica_autorita: descrizione };
    if (value.destinatario === "SERVIZI_SOCIALI") patch.flag_notifica_servizi_sociali = true;
    if (value.destinatario === "PROCURA") patch.flag_notifica_procura = true;
    const { error: e2 } = await supabase.from("escalation_cases").update(patch).eq("id", value.escalation_id);
    if (e2) throw e2;
    revalidatePath("/alert");
    return { ok: true, data: undefined, message: "Comunicazione istituzionale registrata" };
  } catch (e) { return actionFailure(e); }
}

export async function closeAlertAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = closeAlertSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER", "COORDINATORE"]);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("close_alert", { p_alert_id: value.alert_id, p_note: value.note ?? null });
    if (error) throw error;
    revalidatePath("/alert"); revalidatePath("/dashboard");
    return { ok: true, data: undefined, message: "Alert chiuso" };
  } catch (e) { return actionFailure(e); }
}

export async function runChecksAction(): Promise<ActionResult<Record<string, number>>> {
  try {
    const profile = await requireProfile(); requireRole(profile, ["PROJECT_MANAGER", "COORDINATORE"]);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("run_periodic_checks");
    if (error) throw error;
    revalidatePath("/alert"); revalidatePath("/dashboard");
    return { ok: true, data: data as Record<string, number>, message: "Controlli eseguiti" };
  } catch (e) { return actionFailure(e); }
}
