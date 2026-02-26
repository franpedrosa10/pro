import type { ReactNode } from "react";
import Link from "next/link";

import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();

  const profileResult = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, username, phone")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = profileResult.data?.first_name as string | null | undefined;
  const lastName = profileResult.data?.last_name as string | null | undefined;
  const phone = profileResult.data?.phone as string | null | undefined;

  const profileName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    (profileResult.data?.display_name as string | null | undefined) ||
    (profileResult.data?.username as string | null | undefined) ||
    user.email ||
    "Jugador";

  const missingFields: string[] = [];
  if (!firstName) {
    missingFields.push("nombre");
  }
  if (!lastName) {
    missingFields.push("apellido");
  }
  if (!phone) {
    missingFields.push("telefono");
  }

  return (
    <div className="page-shell">
      <div className="app-container space-y-4">
        <DashboardNav profileName={profileName} />

        {missingFields.length > 0 ? (
          <div className="alert-warning rounded-xl p-3 text-sm">
            Perfil incompleto ({missingFields.join(", ")}).
            <Link href="/dashboard/account" className="link-inline ml-1">
              Completalo en Mi cuenta
            </Link>
            .
          </div>
        ) : null}

        <section>{children}</section>
      </div>
    </div>
  );
}
