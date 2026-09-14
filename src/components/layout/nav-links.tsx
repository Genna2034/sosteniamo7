"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, CalendarClock, ClipboardList, Clock3, FileBarChart2, Sun, MapPinned, ShieldAlert, UsersRound, Sigma, LayoutDashboard } from "lucide-react";

// Le icone sono risolte qui, lato client: un Server Component non può passare funzioni (componenti) come prop.
const ICONS = { sun: Sun, dashboard: LayoutDashboard, users: UsersRound, calendar: CalendarClock, book: BookOpenText, clock: Clock3, alert: ShieldAlert, map: MapPinned, list: ClipboardList, sigma: Sigma, report: FileBarChart2 } as const;
export type IconName = keyof typeof ICONS;
export type NavItem = { href: string; label: string; short: string; icon: IconName };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "tab" }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      {items.map(i => { const Icon = ICONS[i.icon]; return (
        <Link key={i.href + i.label} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={variant === "side" ? "nav-link" : "tab-link"}>
          <Icon className={variant === "side" ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} aria-hidden />
          <span className={variant === "tab" ? "truncate" : ""}>{variant === "side" ? i.label : i.short}</span>
        </Link>); })}
    </>
  );
}
