export function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }
export function formatPercent(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return `${Math.round(Number(value))}%`;
}
export function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
export function longDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function euro(value: number | string | null | undefined) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value ?? 0));
}
export function hours(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(Number(value ?? 0))} h`;
}
export function todayIso() { return new Date().toISOString().slice(0, 10); }
export function label(v: string | null | undefined) { return (v ?? "—").replaceAll("_", " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
