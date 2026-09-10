"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireProfile, requireRole, requireMinorAccess } from "@/lib/security/authz";
import { createPiaeSchema, addPiaeGoalSchema, createPiaeRevisionSchema } from "@/lib/validation/piae";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

async function piaeMinor(piaeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("piae").select("id,minore_id,data_scadenza_prossima_revisione").eq("id", piaeId).maybeSingle();
  if (!data) throw new Error("PIAE non trovato o non accessibile");
  return data;
}

export async function createPiaeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createPiaeSchema.parse(formToObject(formData));
    const { profile } = await requireMinorAccess(value.minore_id, { write: true });
    requireRole(profile, ["COORDINATORE"]);
    const supabase = await createSupabaseServerClient();
    const { data: cfg } = await supabase.from("configurazione_progetto").select("giorni_revisione_piae").maybeSingle();
    const due = new Date(`${value.data_inizio}T12:00:00Z`); due.setUTCDate(due.getUTCDate() + (cfg?.giorni_revisione_piae ?? 60));
    const { data: prev } = await supabase.from("piae").select("versione").eq("minore_id", value.minore_id).order("versione", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("piae").insert({
      ...value, versione: (prev?.versione ?? 0) + 1, data_scadenza_prossima_revisione: due.toISOString().slice(0, 10), created_by: profile.id,
    });
    if (error) throw error;
    revalidatePath(`/beneficiari/${value.minore_id}`);
    return { ok: true, data: undefined, message: "PIAE avviato" };
  } catch (e) { return actionFailure(e); }
}

export async function addPiaeGoalAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = addPiaeGoalSchema.parse(formToObject(formData));
    const p = await piaeMinor(value.piae_id);
    await requireMinorAccess(p.minore_id, { write: true });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("piae_obiettivi").insert(value);
    if (error) throw error;
    revalidatePath(`/beneficiari/${p.minore_id}`);
    return { ok: true, data: undefined, message: "Obiettivo aggiunto" };
  } catch (e) { return actionFailure(e); }
}

export async function createPiaeRevisionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const value = createPiaeRevisionSchema.parse(formToObject(formData));
    const profile = await requireProfile(); requireRole(profile, ["COORDINATORE"]);
    const p = await piaeMinor(value.piae_id);
    await requireMinorAccess(p.minore_id, { write: true });
    const supabase = await createSupabaseServerClient();
    const { data: last } = await supabase.from("piae_revisioni").select("numero_revisione").eq("piae_id", value.piae_id).order("numero_revisione", { ascending: false }).limit(1).maybeSingle();
    const numero = (last?.numero_revisione ?? 0) + 1;
    const { error } = await supabase.from("piae_revisioni").insert({
      ...value, numero_revisione: numero, data_scadenza_prevista: p.data_scadenza_prossima_revisione, coordinatore_id: profile.id, created_by: profile.id,
    });
    if (error) throw error;
    const { data: cfg } = await supabase.from("configurazione_progetto").select("giorni_revisione_piae").maybeSingle();
    const next = new Date(`${value.data_effettuazione}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + (cfg?.giorni_revisione_piae ?? 60));
    const stato = value.esito === "CONCLUSO" ? "CONCLUSO" : "ATTIVO";
    const { error: e2 } = await supabase.from("piae").update({ data_scadenza_prossima_revisione: next.toISOString().slice(0, 10), stato, updated_by: profile.id }).eq("id", value.piae_id);
    if (e2) throw e2;
    revalidatePath(`/beneficiari/${p.minore_id}`);
    return { ok: true, data: undefined, message: `Revisione n. ${numero} registrata` };
  } catch (e) { return actionFailure(e); }
}
