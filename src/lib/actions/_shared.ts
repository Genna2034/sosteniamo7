import "server-only";
import { ZodError } from "zod";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/security/errors";
import type { ActionResult } from "@/types/domain";

export type FormAction<T = undefined> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

function translatePg(message: string): string {
  if (/row-level security/i.test(message)) return "Operazione non autorizzata per il tuo profilo (RLS)";
  if (/duplicate key/i.test(message)) return "Esiste già un record con questi dati";
  if (/violates check constraint/i.test(message)) return "Dati non coerenti con le regole del progetto";
  if (/violates foreign key/i.test(message)) return "Riferimento a un record inesistente";
  return message;
}

export function actionFailure(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const k = issue.path.join(".") || "_";
      (fieldErrors[k] ??= []).push(issue.message);
    }
    const first = Object.values(fieldErrors)[0]?.[0];
    return { ok: false, error: first ? `Controlla i dati: ${first}` : "Dati non validi", code: "VALIDATION", fieldErrors };
  }
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof NotFoundError) {
    return { ok: false, error: error.message, code: error.code };
  }
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    const msg = (error as { message: string }).message;
    // Errori sollevati dai trigger DB (regole di dominio) sono leggibili e vanno mostrati.
    if (/fuori dal perimetro|vidimat|non iscritto|append-only|non autorizzato|negato|titolare/i.test(msg)) return { ok: false, error: msg, code: "DOMAIN" };
    console.error("[action]", msg);
    return { ok: false, error: translatePg(msg), code: "DB" };
  }
  console.error("[action]", error);
  return { ok: false, error: "Errore applicativo. Riprova o contatta l'amministratore.", code: "INTERNAL" };
}
