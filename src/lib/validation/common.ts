import { z } from "zod";
export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida (AAAA-MM-GG)");
export const isoDateTime = z.string().datetime({ offset: true });
export const optionalText = (max = 5000) => z.preprocess(v => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());
export const optionalUuid = z.preprocess(v => (v === "" ? null : v), uuid.nullable().optional());
export const optionalDate = z.preprocess(v => (v === "" ? null : v), isoDate.nullable().optional());
export const checkbox = z.preprocess(v => v === "on" || v === "true" || v === true, z.boolean());

// Converte un FormData in oggetto piatto (ultimo valore per chiave; le chiavi con [] diventano array).
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$")) continue; // campi tecnici di Next
    if (k.endsWith("[]")) { const key = k.slice(0, -2); (out[key] as unknown[] | undefined) ? (out[key] as unknown[]).push(v) : (out[key] = [v]); }
    else out[k] = v;
  }
  return out;
}
