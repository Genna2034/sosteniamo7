import Link from "next/link";
import { BookOpenText, CalendarClock, ClipboardList, Clock3, FileBarChart2, LayoutDashboard, MapPinned, ShieldAlert, UsersRound, LogOut, Sigma } from "lucide-react";
import type { CurrentProfile } from "@/types/domain";
import { ROLE_LABEL } from "@/types/domain";
import { signOutAction } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; roles?: CurrentProfile["ruolo"][]; mobile?: boolean };

const items: Item[] = [
  { href: "/dashboard", label: "Cruscotto", icon: LayoutDashboard, mobile: true },
  { href: "/beneficiari", label: "Beneficiari", icon: UsersRound, mobile: true },
  { href: "/attivita", label: "Attività e registri", icon: CalendarClock, mobile: true },
  { href: "/diario-rapido", label: "Diario rapido", icon: BookOpenText, roles: ["EDUCATORE", "COORDINATORE"], mobile: true },
  { href: "/timesheet", label: "Le mie ore", icon: Clock3, mobile: true },
  { href: "/alert", label: "Alert e PER", icon: ShieldAlert },
  { href: "/rete", label: "Rete e accordi", icon: MapPinned },
  { href: "/rendicontazione", label: "Rendicontazione", icon: Sigma, roles: ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"] },
  { href: "/report", label: "Report al RUP", icon: FileBarChart2, roles: ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"] },
  { href: "/piae", label: "Registro PIAE", icon: ClipboardList },
];

export function AppShell({ profile, children }: { profile: CurrentProfile; children: React.ReactNode }) {
  const visible = items.filter(i => !i.roles || i.roles.includes(profile.ruolo));
  const mobile = visible.filter(i => i.mobile).slice(0, 5);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="no-print hidden bg-[var(--blu)] text-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <div className="px-2 pb-6 pt-2">
            <div className="text-lg font-bold leading-tight">SosteniAMO<br />il Quartiere</div>
            <div className="mt-1 text-xs text-blue-200">POC Legalità · Città Metropolitana di Napoli</div>
          </div>
          <nav className="grid gap-0.5">
            {visible.map(i => (
              <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-blue-50 hover:bg-white/10">
                <i.icon className="h-4.5 w-4.5" aria-hidden />{i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-md bg-white/10 p-3 text-sm">
            <div className="font-semibold">{profile.nome} {profile.cognome}</div>
            <div className="mt-0.5 text-xs text-blue-200">{ROLE_LABEL[profile.ruolo]}</div>
            <form action={signOutAction} className="mt-3">
              <button className="flex items-center gap-2 text-xs text-blue-100 hover:text-white"><LogOut className="h-3.5 w-3.5" aria-hidden />Esci</button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--line)] bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="text-sm font-bold">SosteniAMO il Quartiere</div>
          <Link href="/profilo" className="text-xs text-[var(--ink-2)]">{profile.nome} {profile.cognome.slice(0, 1)}.</Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</main>
        <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] bg-white px-1 pt-1 lg:hidden" aria-label="Navigazione principale">
          {mobile.map(i => (
            <Link key={i.href} href={i.href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold text-[var(--ink-2)]">
              <i.icon className="h-5 w-5" aria-hidden /><span className="truncate">{i.label.split(" ")[0]}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
