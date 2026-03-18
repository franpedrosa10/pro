"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationsMenu, type NavNotificationItem } from "@/components/notifications-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { AppLocale, getUiDictionary } from "@/lib/i18n";

type DashboardNavProps = {
  profileName: string;
  locale: AppLocale;
  isAdmin: boolean;
  notifications: NavNotificationItem[];
  unreadNotifications: number;
};

const BASE_NAV_ITEMS = [
  { href: "/dashboard", key: "home", exact: true },
  { href: "/dashboard/prode", key: "prode" },
  { href: "/dashboard/leagues", key: "leagues" },
  { href: "/dashboard/standings", key: "standings" },
  { href: "/dashboard/account", key: "account" },
] as const;

function isActive(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function DashboardNav({
  profileName,
  locale,
  isAdmin,
  notifications,
  unreadNotifications,
}: DashboardNavProps) {
  const pathname = usePathname();
  const copy = getUiDictionary(locale);
  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, { href: "/dashboard/admin", key: "admin" as const }]
    : BASE_NAV_ITEMS;

  return (
    <div className="panel sticky top-3 z-40 overflow-visible p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#1d2430] bg-[#1d2430] text-sm font-black text-[#ffe289]"
          >
            PR
          </Link>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4c5564]">
              {copy.nav.worldCup}
            </p>
            <p className="text-sm font-semibold text-[#1f2937]">{profileName}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 lg:justify-end">
          <div className="scroll-hover-x min-w-0 flex-1 lg:max-w-[700px]">
            <div className="flex min-w-max items-center gap-2 pb-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={active ? "nav-item nav-item-active" : "nav-item"}
                  >
                    {"key" in item && item.key === "admin" ? "Admin" : copy.nav[item.key]}
                  </Link>
                );
              })}
            </div>
          </div>

          <NotificationsMenu items={notifications} unreadCount={unreadNotifications} />

          <SignOutButton
            className="shrink-0 text-xs sm:text-sm"
            labels={{ idle: copy.nav.signOut, pending: copy.nav.signingOut }}
          />
        </div>
      </div>
    </div>
  );
}

