// Serializzazione CSV compatibile con Excel italiano (separatore ";", BOM UTF-8, decimali con virgola).
export function toCsv(headers: string[], rows: Array<Record<string, unknown>>, sep = ";"): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [headers.join(sep), ...rows.map(r => headers.map(h => esc(r[h])).join(sep))];
  return "\uFEFF" + lines.join("\r\n");
}
