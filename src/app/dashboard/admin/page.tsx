import { redirect } from "next/navigation";

import { AdminControlPanel } from "@/components/admin-control-panel";
import { requireUser } from "@/lib/auth";
import { readUserAdminFlag } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, user } = await requireUser();

  const adminCheck = await readUserAdminFlag(supabase, user.id);
  if (!adminCheck.isAdmin) {
    redirect("/dashboard");
  }

  const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const [matchdaysResult, fixturesResult, leaguesResult] = await Promise.all([
    supabase
      .from("matchdays")
      .select("id, name, order_index, is_finalized")
      .order("order_index", { ascending: true }),
    supabase
      .from("fixtures")
      .select(
        "id, matchday_id, kickoff_at, status, home_score, away_score, matchdays(name), home_team:national_teams!fixtures_home_team_id_fkey(name), away_team:national_teams!fixtures_away_team_id_fkey(name)",
      )
      .order("kickoff_at", { ascending: true }),
    supabase
      .from("leagues")
      .select("id, name, is_country_league")
      .order("created_at", { ascending: false }),
  ]);

  const schemaErrors = [
    adminCheck.errorMessage,
    matchdaysResult.error?.message,
    fixturesResult.error?.message,
    leaguesResult.error?.message,
  ].filter(Boolean) as string[];

  const matchdays =
    matchdaysResult.data?.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      isFinalized: Boolean(row.is_finalized),
    })) ?? [];

  const fixtures =
    fixturesResult.data?.map((row) => ({
      id: row.id as string,
      matchdayId: row.matchday_id as string,
      matchdayName: ((row.matchdays as { name?: string } | null)?.name as string | undefined) ?? "Fecha",
      kickoffLabel: dateFormatter.format(new Date(row.kickoff_at as string)),
      homeTeam: ((row.home_team as { name?: string } | null)?.name as string | undefined) ?? "Local",
      awayTeam: ((row.away_team as { name?: string } | null)?.name as string | undefined) ?? "Visitante",
      status: row.status as "scheduled" | "in_progress" | "finished",
      homeScore: (row.home_score as number | null) ?? null,
      awayScore: (row.away_score as number | null) ?? null,
    })) ?? [];

  const leagues =
    leaguesResult.data?.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      isCountryLeague: Boolean(row.is_country_league),
    })) ?? [];

  return (
    <div className="fade-in space-y-4">
      <section className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">Admin</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Panel operativo</h1>
        <p className="section-subtitle mt-2">
          Carga de resultados, publicacion de puntos y notificaciones globales.
        </p>
      </section>

      {schemaErrors.length > 0 ? (
        <div className="alert-warning rounded-xl p-3 text-sm">
          {schemaErrors.join(" | ")}
        </div>
      ) : null}

      <AdminControlPanel matchdays={matchdays} fixtures={fixtures} leagues={leagues} />
    </div>
  );
}

