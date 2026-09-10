import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ children, className, title, aside }: { children: ReactNode; className?: string; title?: ReactNode; aside?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-[var(--line)] bg-[var(--surface)]", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
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

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[var(--blu)] text-white hover:bg-[var(--blu-2)]",
    secondary: "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--paper)]",
    danger: "bg-[var(--rosso)] text-white hover:opacity-90",
    ghost: "text-[var(--blu)] hover:bg-[var(--blu-soft)]",
  };
  return (
    <button className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string[]; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1 text-sm", className)}>
      <span className="font-medium text-[var(--ink)]">{label}</span>
      {children}
      {error?.length ? <span className="text-xs text-[var(--rosso)]">{error[0]}</span> : hint ? <span className="text-xs text-[var(--ink-3)]">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {lead ? <p className="mt-1 max-w-prose text-sm text-[var(--ink-2)]">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 no-print">{actions}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-[var(--ink-2)]">{children}</div>;
}

export function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  const bar = { neutral: "bg-[var(--line)]", blu: "bg-[var(--blu)]", verde: "bg-[var(--verde)]", ambra: "bg-[var(--ambra)]", rosso: "bg-[var(--rosso)]" }[tone];
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--line)] bg-white p-4">
      <div className={cn("w-1 shrink-0 rounded-full", bar)} />
      <div className="min-w-0">
        <div className="text-sm text-[var(--ink-2)]">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
        {sub ? <div className="mt-0.5 text-xs text-[var(--ink-3)]">{sub}</div> : null}
      </div>
    </div>
  );
}

export const th = "px-3 py-2 text-left text-xs font-semibold text-[var(--ink-2)]";
export const td = "px-3 py-2.5 align-top";
