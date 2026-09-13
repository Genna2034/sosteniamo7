import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { coloreTerritorio } from "@/lib/territori";

export function Panel({ children, className, title, aside, tone }: { children: ReactNode; className?: string; title?: ReactNode; aside?: ReactNode; tone?: string }) {
  return (
    <section className={cn("card overflow-hidden", tone ? "card-tone" : "", className)} style={tone ? ({ "--tone": tone } as CSSProperties) : undefined}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <h2>{title}</h2>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export type Tone = "neutral" | "blu" | "verde" | "ambra" | "rosso";
export function Stamp({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn("stamp", `stamp-${tone}`)}>{children}</span>;
}
export function Territorio({ codice, nome }: { codice?: string | null; nome?: string | null }) {
  if (!codice) return null;
  return <span className="stamp stamp-terr" style={{ "--tone": coloreTerritorio(codice) } as CSSProperties} title={nome ?? undefined}>{nome ?? codice}</span>;
}

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[var(--petrolio)] text-white hover:bg-[var(--petrolio-2)] shadow-sm",
    secondary: "border-[1.5px] border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--petrolio-2)] hover:text-[var(--petrolio)]",
    danger: "bg-[var(--rosso)] text-white hover:opacity-90",
    ghost: "text-[var(--petrolio)] hover:bg-[var(--petrolio-soft)]",
  };
  return (
    <button className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string[]; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1 text-sm", className)}>
      <span className="font-semibold text-[var(--ink)]">{label}</span>
      {children}
      {error?.length ? <span className="text-xs text-[var(--rosso)]">{error[0]}</span> : hint ? <span className="text-xs text-[var(--ink-3)]">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({ title, lead, actions, kicker }: { title: string; lead?: ReactNode; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? <div className="mb-1.5">{kicker}</div> : null}
        <h1>{title}</h1>
        {lead ? <p className="mt-1.5 max-w-prose text-[15px] text-[var(--ink-2)]">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 no-print">{actions}</div> : null}
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="px-4 py-9 text-center text-sm text-[var(--ink-2)]">{children}{action ? <div className="mt-3">{action}</div> : null}</div>;
}

export function Progress({ value, max, tone }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={tone ? ({ "--tone": tone } as CSSProperties) : undefined}><i style={{ width: `${pct}%` }} /></div>;
}

export function Stat({ label, value, sub, tone = "neutral", progress }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; progress?: { value: number; max: number } }) {
  const color = { neutral: "#7b8b9a", blu: "var(--petrolio)", verde: "var(--verde)", ambra: "#e0a400", rosso: "var(--rosso)" }[tone];
  return (
    <div className="card card-tone p-4" style={{ "--tone": color } as CSSProperties}>
      <div className="text-[13px] font-semibold text-[var(--ink-2)]">{label}</div>
      <div className="mt-1 text-[1.9rem] font-extrabold leading-none tabular-nums tracking-tight">{value}</div>
      {progress ? <div className="mt-3"><Progress value={progress.value} max={progress.max} tone={color} /></div> : null}
      {sub ? <div className="mt-1.5 text-xs text-[var(--ink-3)]">{sub}</div> : null}
    </div>
  );
}

export const th = "px-3 py-2 text-left text-xs font-bold text-[var(--ink-2)] bg-[var(--paper)]";
export const td = "px-3 py-2.5 align-top";
