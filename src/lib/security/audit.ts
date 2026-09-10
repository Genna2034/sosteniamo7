import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExplicitAuditAction = "READ" | "VIEW_SENSITIVE" | "EXPORT" | "PRINT" | "DOWNLOAD" | "ROLE_CHANGE" | "LOGIN" | "LOGOUT";

export async function logSecurityEvent(input: { action: ExplicitAuditAction; table: string; recordId?: string | null; reasonCode?: string | null }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("log_security_event", {
    p_action: input.action, p_table: input.table, p_record_id: input.recordId ?? null, p_reason_code: input.reasonCode ?? null,
  });
  if (error) throw error;
}
