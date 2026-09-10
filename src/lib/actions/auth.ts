"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { formToObject } from "@/lib/validation/common";
import { actionFailure } from "./_shared";
import type { ActionResult } from "@/types/domain";

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let next = "/dashboard";
  try {
    const value = loginSchema.parse(formToObject(formData));
    if (value.next && value.next.startsWith("/") && !value.next.startsWith("//")) next = value.next;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: value.email, password: value.password });
    if (error) return { ok: false, error: "Email o password non corretti", code: "AUTH" };
    try { await supabase.rpc("log_security_event", { p_action: "LOGIN", p_table: "auth", p_reason_code: "PASSWORD" }); } catch { /* audit best-effort */ }
  } catch (e) { return actionFailure(e); }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  try { await supabase.rpc("log_security_event", { p_action: "LOGOUT", p_table: "auth" }); } catch { /* best-effort */ }
  await supabase.auth.signOut();
  redirect("/login");
}
