// Colore fisso per territorio: lo stesso ovunque (badge, bordi, barre, grafici).
export const TERRITORIO_COLORE: Record<string, string> = {
  SGT: "#e8603c", PNT: "#e0a400", AFR: "#7b52d6", CAI: "#159c8f", CDC: "#f2711c", GIU: "#2f7bf0", MAR: "#d63c8a",
};
export function coloreTerritorio(codice?: string | null) { return (codice && TERRITORIO_COLORE[codice]) || "#0f5f6c"; }
