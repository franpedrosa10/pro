import type { ReactNode } from "react";
import Link from "next/link";

import { DashboardNav } from "@/components/dashboard-nav";
import type { NavNotificationItem } from "@/components/notifications-menu";
import { requireUser } from "@/lib/auth";
import { getUiDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { readUserAdminFlag } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();
  const locale = await getRequestLocale();
  const copy = getUiDictionary(locale);
  const profileSelect = "display_name, first_name, last_name, username, phone, country_code, is_admin";

  const profileResult = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle();

  let profileData = profileResult.data as
    | {
        display_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
        phone?: string | null;
        country_code?: string | null;
        is_admin?: boolean | null;
      }
    | null;

  if (!profileData) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const firstNameMeta = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
    const lastNameMeta = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
    const phoneMeta = typeof metadata.phone === "string" ? metadata.phone.trim().replace(/\s+/g, "") : "";
    const countryCodeMetaRaw = typeof metadata.country_code === "string" ? metadata.country_code.trim().toUpperCase() : "";
    const countryCodeMeta = /^[A-Z]{2}$/.test(countryCodeMetaRaw) ? countryCodeMetaRaw : null;
    const countryNameMeta = typeof metadata.country_name === "string" ? metadata.country_name.trim() : "";
    const displayNameMeta =
      `${firstNameMeta} ${lastNameMeta}`.trim() ||
      (typeof metadata.display_name === "string" ? metadata.display_name.trim() : "") ||
      user.email?.split("@")[0] ||
      "Jugador";

    const ensureProfileResult = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          first_name: firstNameMeta || null,
          last_name: lastNameMeta || null,
          phone: phoneMeta || null,
          country_code: countryCodeMeta,
          country_name: countryNameMeta || null,
          display_name: displayNameMeta,
        },
        { onConflict: "id" },
      )
      .select(profileSelect)
      .single();

    if (!ensureProfileResult.error) {
      profileData = ensureProfileResult.data;
    }
  }

  const firstName = profileData?.first_name as string | null | undefined;
  const lastName = profileData?.last_name as string | null | undefined;
  const phone = profileData?.phone as string | null | undefined;
  const countryCode = profileData?.country_code as string | null | undefined;

  const profileName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    (profileData?.display_name as string | null | undefined) ||
    (profileData?.username as string | null | undefined) ||
    user.email ||
    "Jugador";

  const missingFields: string[] = [];
  if (!firstName) {
    missingFields.push(copy.layout.missingField.firstName);
  }
  if (!lastName) {
    missingFields.push(copy.layout.missingField.lastName);
  }
  if (!phone) {
    missingFields.push(copy.layout.missingField.phone);
  }
  if (!countryCode) {
    missingFields.push(copy.layout.missingField.country);
  }

  const adminCheck = await readUserAdminFlag(supabase, user.id);
  const isAdmin = adminCheck.isAdmin || Boolean(profileData?.is_admin);

  const notificationsRpc = await supabase.rpc("get_my_notifications", {
    p_limit: 20,
  });

  const unreadRpc = await supabase.rpc("count_my_unread_notifications");

  const notificationDateFormatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const notifications: NavNotificationItem[] =
    (notificationsRpc.data as Array<{
      id: string;
      kind: "general" | "matchday_points" | "result_update" | "admin_broadcast";
      title: string;
      body: string;
      cta_href: string | null;
      created_at: string;
      is_read: boolean;
    }> | null)?.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      ctaHref: row.cta_href ?? null,
      createdAtLabel: notificationDateFormatter.format(new Date(row.created_at)),
      isRead: Boolean(row.is_read),
    })) ?? [];

  const unreadNotifications = Number(unreadRpc.data ?? 0);

  return (
    <div className="page-shell">
      <div className="app-container space-y-4">
        <DashboardNav
          profileName={profileName}
          locale={locale}
          isAdmin={isAdmin}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
        />

        {adminCheck.errorMessage ? (
          <div className="alert-warning rounded-xl p-3 text-sm">
            Error al validar permisos de admin: {adminCheck.errorMessage}
          </div>
        ) : null}

        {notificationsRpc.error ? (
          <div className="alert-warning rounded-xl p-3 text-sm">
            Error al cargar notificaciones: {notificationsRpc.error.message}
          </div>
        ) : null}

        {missingFields.length > 0 ? (
          <div className="alert-warning rounded-xl p-3 text-sm">
            {copy.layout.incompleteProfile} ({missingFields.join(", ")}).
            <Link href="/dashboard/account" className="link-inline ml-1">
              {copy.layout.completeInAccount}
            </Link>
            .
          </div>
        ) : null}

        <section>{children}</section>
      </div>
    </div>
  );
}
