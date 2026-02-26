import Link from "next/link";

import { LeagueManager } from "@/components/league-manager";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LeagueForUi = {
  id: string;
  name: string;
  join_code: string;
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  let schemaError: string | null = null;

  let fantasyTeamId: string | null = null;
  let fantasyTeamBudget = 100;
  let playersInSquad = 0;

  const teamResult = await supabase
    .from("fantasy_teams")
    .select("id, budget")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teamResult.error && teamResult.error.code !== "PGRST116") {
    schemaError = teamResult.error.message;
  } else {
    let currentTeam = teamResult.data;
    if (!currentTeam) {
      const createTeamResult = await supabase
        .from("fantasy_teams")
        .insert({ user_id: user.id, name: "Mi Equipo", budget: 100 })
        .select("id, budget")
        .single();

      if (createTeamResult.error) {
        schemaError = createTeamResult.error.message;
      } else {
        currentTeam = createTeamResult.data;
      }
    }

    if (currentTeam) {
      fantasyTeamId = currentTeam.id;
      fantasyTeamBudget = Number(currentTeam.budget);

      const squadResult = await supabase
        .from("fantasy_team_players")
        .select("player_id")
        .eq("team_id", currentTeam.id);

      if (squadResult.error) {
        schemaError = squadResult.error.message;
      } else {
        playersInSquad = squadResult.data.length;
      }
    }
  }

  const leaguesResult = await supabase
    .from("leagues")
    .select("id, name, join_code, league_members!inner(user_id)")
    .eq("league_members.user_id", user.id);

  const leagues: LeagueForUi[] =
    leaguesResult.data?.map((league) => ({
      id: league.id as string,
      name: league.name as string,
      join_code: league.join_code as string,
    })) ?? [];

  if (leaguesResult.error && !schemaError) {
    schemaError = leaguesResult.error.message;
  }

  const standingsResult = await supabase
    .from("v_global_standings")
    .select("display_name, fantasy_points, prode_points, combined_points")
    .order("combined_points", { ascending: false })
    .limit(10);

  const standings =
    standingsResult.data?.map((row) => ({
      displayName: row.display_name as string,
      fantasy: Number(row.fantasy_points ?? 0),
      prode: Number(row.prode_points ?? 0),
      total: Number(row.combined_points ?? 0),
    })) ?? [];

  if (standingsResult.error && !schemaError) {
    schemaError = standingsResult.error.message;
  }

  const fixturesResult = await supabase
    .from("fixtures")
    .select("id")
    .eq("status", "scheduled")
    .gt("kickoff_at", new Date().toISOString());

  const editableFixtureIds = (fixturesResult.data ?? []).map((fixture) => fixture.id as string);
  const predictionsResult =
    editableFixtureIds.length === 0
      ? { data: [] as Array<{ fixture_id: string }>, error: null }
      : await supabase
          .from("prode_predictions")
          .select("fixture_id")
          .eq("user_id", user.id)
          .in("fixture_id", editableFixtureIds);

  if (fixturesResult.error && !schemaError) {
    schemaError = fixturesResult.error.message;
  }
  if (predictionsResult.error && !schemaError) {
    schemaError = predictionsResult.error.message;
  }

  const pendingProde = Math.max(0, editableFixtureIds.length - (predictionsResult.data?.length ?? 0));

  return (
    <div className="fade-in space-y-5">
      <header className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">Resumen</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Centro de juego</h1>
        <p className="section-subtitle mt-2">Estado rapido de equipo, prode, ligas y ranking.</p>
      </header>

      {schemaError ? (
        <div className="alert-warning rounded-2xl p-4 text-sm">
          El esquema de Supabase todavia no esta aplicado o hay un error: {schemaError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="kpi-card">
          <p className="kpi-label">Fantasy</p>
          <p className="kpi-value">{playersInSquad}/15</p>
          <p className="kpi-meta">Presupuesto: {fantasyTeamBudget.toFixed(1)}</p>
          <Link href="/dashboard/squad" className="link-inline mt-3 inline-flex text-sm">
            Armar plantel
          </Link>
        </article>

        <article className="kpi-card">
          <p className="kpi-label">Prode</p>
          <p className="kpi-value">{pendingProde}</p>
          <p className="kpi-meta">Partidos pendientes de pronostico.</p>
          <Link href="/dashboard/prode" className="link-inline mt-3 inline-flex text-sm">
            Cargar pronosticos
          </Link>
        </article>

        <article className="kpi-card">
          <p className="kpi-label">Ligas</p>
          <p className="kpi-value">{leagues.length}</p>
          <p className="kpi-meta">Privadas activas en tu cuenta.</p>
          <p className="mt-3 font-mono text-[11px] text-[#6b7280]">
            Team ID: {fantasyTeamId ? fantasyTeamId.slice(0, 8) : "sin equipo"}
          </p>
          <Link href="/dashboard/standings" className="link-inline mt-3 inline-flex text-sm">
            Ver posiciones
          </Link>
        </article>
      </section>

      <LeagueManager leagues={leagues} />

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-4xl leading-none">Top global</h2>
          <Link href="/dashboard/standings" className="link-inline text-sm">
            Ver tabla completa
          </Link>
        </div>
        {standings.length === 0 ? (
          <p className="section-subtitle mt-2 text-sm">Todavia no hay puntajes publicados.</p>
        ) : (
          <div className="table-shell mt-3">
            <table className="w-full border-collapse text-sm">
              <thead className="text-[#6b7280]">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Jugador</th>
                  <th className="px-3 py-2">Fantasy</th>
                  <th className="px-3 py-2">Prode</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={`${row.displayName}-${index}`} className="border-t border-[#eadfbf]">
                    <td className="px-3 py-2 font-semibold text-[#6b7280]">{index + 1}</td>
                    <td className="px-3 py-2 text-[#1f2937]">{row.displayName}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{row.fantasy}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{row.prode}</td>
                    <td className="px-3 py-2 font-semibold text-[#1f2937]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

