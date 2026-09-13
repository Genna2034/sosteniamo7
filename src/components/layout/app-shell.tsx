import Link from "next/link";
import { BookOpenText, CalendarClock, ClipboardList, Clock3, FileBarChart2, Sun, MapPinned, ShieldAlert, UsersRound, LogOut, Sigma, LayoutDashboard } from "lucide-react";
import type { CurrentProfile } from "@/types/domain";
import { ROLE_LABEL } from "@/types/domain";
import { signOutAction } from "@/lib/actions/auth";
import { NavLinks, type NavItem } from "@/components/layout/nav-links";

type Role = CurrentProfile["ruolo"];
type Item = NavItem & { roles?: Role[]; mobile?: Role[] | "all" };
const OPERATIVI: Role[] = ["EDUCATORE", "COORDINATORE", "PSICOLOGO", "ASSISTENTE_SOCIALE", "ALTRO_SPECIALISTA"];
const DIREZIONE: Role[] = ["PROJECT_MANAGER", "COORDINATORE", "AMMINISTRATIVO"];

const items: Item[] = [
  { href: "/dashboard", label: "Oggi", short: "Oggi", Icon: Sun, roles: OPERATIVI, mobile: "all" },
  { href: "/dashboard", label: "Cruscotto", short: "Cruscotto", Icon: LayoutDashboard, roles: ["PROJECT_MANAGER", "AMMINISTRATIVO"], mobile: "all" },
  { href: "/beneficiari", label: "I ragazzi", short: "Ragazzi", Icon: UsersRound, roles: [...OPERATIVI, "PROJECT_MANAGER"], mobile: "all" },
  { href: "/attivita", label: "Attività e registri", short: "Registri", Icon: CalendarClock, roles: [...OPERATIVI, "PROJECT_MANAGER"], mobile: "all" },
  { href: "/diario-rapido", label: "Diario rapido", short: "Diario", Icon: BookOpenText, roles: ["EDUCATORE", "COORDINATORE"], mobile: ["EDUCATORE"] },
  { href: "/timesheet", label: "Le mie ore", short: "Ore", Icon: Clock3, mobile: "all" },
  { href: "/alert", label: "Alert e PER", short: "Alert", Icon: ShieldAlert, roles: [...OPERATIVI, "PROJECT_MANAGER"], mobile: ["COORDINATORE", "PROJECT_MANAGER"] },
  { href: "/rete", label: "Comunità educante", short: "Rete", Icon: MapPinned, roles: [...OPERATIVI, "PROJECT_MANAGER"] },
  { href: "/piae", label: "Registro PIAE", short: "PIAE", Icon: ClipboardList, roles: OPERATIVI },
  { href: "/rendicontazione", label: "Rendicontazione", short: "Rendic.", Icon: Sigma, roles: DIREZIONE, mobile: ["AMMINISTRATIVO"] },
  { href: "/report", label: "Report al RUP", short: "Report", Icon: FileBarChart2, roles: DIREZIONE, mobile: ["AMMINISTRATIVO"] },
];

export function AppShell({ profile, children }: { profile: CurrentProfile; children: React.ReactNode }) {
  const r = profile.ruolo;
  const visible = items.filter(i => !i.roles || i.roles.includes(r));
  const mobile = visible.filter(i => i.mobile === "all" || (Array.isArray(i.mobile) && i.mobile.includes(r))).slice(0, 5);
  const iniziali = `${profile.nome.slice(0, 1)}${profile.cognome.slice(0, 1)}`.toUpperCase();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print hidden bg-[var(--petrolio)] text-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/dashboard" className="px-2 pb-7 pt-2">
            <div className="text-[1.35rem] font-extrabold leading-tight tracking-tight">SosteniAMO<br />il Quartiere</div>
            <div className="mt-1.5 text-xs text-white/65">Città Metropolitana di Napoli</div>
          </Link>
          <nav className="grid gap-1"><NavLinks items={visible} variant="side" /></nav>
          <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{iniziali}</div>
            <div className="min-w-0">
              <div className="truncate font-bold">{profile.nome} {profile.cognome}</div>
              <div className="truncate text-xs text-white/65">{ROLE_LABEL[r]}</div>
            </div>
            <form action={signOutAction} className="ml-auto"><button className="rounded-md p-1.5 text-white/75 hover:bg-white/15 hover:text-white" title="Esci" aria-label="Esci"><LogOut className="h-4 w-4" aria-hidden /></button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--petrolio)] px-4 text-white lg:hidden">
          <div className="text-[15px] font-extrabold tracking-tight">SosteniAMO il Quartiere</div>
          <Link href="/profilo" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold" aria-label="Profilo">{iniziali}</Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</main>
        <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] bg-white px-1 pt-1 lg:hidden" aria-label="Navigazione principale"><NavLinks items={mobile} variant="tab" /></nav>
      </div>
    </div>
  );
}
