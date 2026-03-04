"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";

type DashboardNavProps = {
  profileName: string;
};

const NAV_ITEMS = [
  { href: "/dashboard/prode", label: "Prode" },
  { href: "/dashboard/squad", label: "Mi equipo" },
  { href: "/dashboard/leagues", label: "Ligas" },
  { href: "/dashboard/standings", label: "Resultados globales" },
  { href: "/dashboard/account", label: "Mi cuenta" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export function DashboardNav({ profileName }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <div className="panel sticky top-3 z-40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#1d2430] bg-[#1d2430] text-sm font-black text-[#ffe289]"
          >
            FP
          </Link>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4c5564]">Mundial 2026</p>
            <p className="text-sm font-semibold text-[#1f2937]">{profileName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? "nav-item nav-item-active" : "nav-item"}
              >
                {item.label}
              </Link>
            );
          })}

          <SignOutButton className="text-xs sm:text-sm" />
        </div>
      </div>
    </div>
  );
}

