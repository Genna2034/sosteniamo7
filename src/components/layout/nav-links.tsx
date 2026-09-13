"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; Icon: LucideIcon };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "tab" }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      {items.map(i => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={variant === "side" ? "nav-link" : "tab-link"}>
          <i.Icon className={variant === "side" ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} aria-hidden />
          <span className={variant === "tab" ? "truncate" : ""}>{variant === "side" ? i.label : i.short}</span>
        </Link>
      ))}
    </>
  );
}
