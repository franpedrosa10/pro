import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LeagueStandingsPageProps = {
  params: Promise<{
    leagueId: string;
  }>;
  searchParams: Promise<{
    matchday?: string | string[];
  }>;
};

type LeagueRow = {
  userId: string;
  displayName: string;
  countryName: string | null;
  points: number;
};

function parseMatchdayParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export default async function LeagueStandingsPage({ params, searchParams }: LeagueStandingsPageProps) {
  const { supabase, user } = await requireUser();
  const { leagueId } = await params;
  const query = await searchParams;
  const requestedMatchdayId = parseMatchdayParam(query.matchday);

  let schemaError: string | null = null;

  const leagueResult = await supabase
    .from("leagues")
    .select("id, name, join_code")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueResult.error) {
    schemaError = leagueResult.error.message;
  }
  if (!leagueResult.data) {
    notFound();
  }

  const invitePath = `/invite/${leagueResult.data.join_code}`;

  const matchdaysResult = await supabase
    .from("matchdays")
    .select("id, name, order_index")
    .order("order_index", { ascending: true });

  if (matchdaysResult.error) {
    schemaError = schemaError ?? matchdaysResult.error.message;
  }

  const matchdays =
    matchdaysResult.data?.map((matchday) => ({
      id: matchday.id as string,
      name: matchday.name as string,
      order: Number(matchday.order_index),
    })) ?? [];

  const selectedMatchday =
    matchdays.find((matchday) => matchday.id === requestedMatchdayId) ?? null;

  let rows: LeagueRow[] = [];

  if (!selectedMatchday) {
    const totalsResult = await supabase
      .from("v_league_standings")
      .select("user_id, display_name, prode_points")
      .eq("league_id", leagueId)
      .order("prode_points", { ascending: false });

    if (totalsResult.error) {
      schemaError = schemaError ?? totalsResult.error.message;
    } else {
      const memberIds = (totalsResult.data ?? []).map((row) => row.user_id as string);
      const countriesResult =
        memberIds.length === 0
          ? { data: [] as Array<{ id: string; country_name: string | null }>, error: null }
          : await supabase
              .from("profiles")
              .select("id, country_name")
              .in("id", memberIds);

      if (countriesResult.error) {
        schemaError = schemaError ?? countriesResult.error.message;
      }

      const countryByUserId = new Map<string, string | null>();
      (countriesResult.data ?? []).forEach((profile) => {
        countryByUserId.set(profile.id as string, (profile.country_name as string | null) ?? null);
      });

      rows =
        totalsResult.data?.map((row) => ({
          userId: row.user_id as string,
          displayName: row.display_name as string,
          countryName: countryByUserId.get(row.user_id as string) ?? null,
          points: Number(row.prode_points ?? 0),
        })) ?? [];
    }
  } else {
    const membersResult = await supabase
      .from("league_members")
      .select("user_id, profiles(display_name, username, country_name)")
      .eq("league_id", leagueId);

    if (membersResult.error) {
      schemaError = schemaError ?? membersResult.error.message;
    }

    const memberUserIds = (membersResult.data ?? []).map((row) => row.user_id as string);

    const prodeResult =
      memberUserIds.length === 0
        ? { data: [] as Array<{ user_id: string; points: number }>, error: null }
        : await supabase
            .from("v_prode_user_matchday_scores")
            .select("user_id, points")
            .eq("matchday_id", selectedMatchday.id)
            .in("user_id", memberUserIds);

    if (prodeResult.error) {
      schemaError = schemaError ?? prodeResult.error.message;
    }

    const profileByUserId = new Map<string, { displayName: string; countryName: string | null }>();
    (membersResult.data ?? []).forEach((row) => {
      const profile = row.profiles as { display_name?: string | null; username?: string | null; country_name?: string | null } | null;
      const displayName = profile?.display_name || profile?.username || "Jugador";
      profileByUserId.set(row.user_id as string, {
        displayName,
        countryName: profile?.country_name ?? null,
      });
    });

    const prodeByUserId = new Map<string, number>();
    (prodeResult.data ?? []).forEach((row) => {
      prodeByUserId.set(row.user_id as string, Number(row.points ?? 0));
    });

    rows = Array.from(profileByUserId.entries())
      .map(([userId, profile]) => {
        const points = prodeByUserId.get(userId) ?? 0;
        return {
          userId,
          displayName: profile.displayName,
          countryName: profile.countryName,
          points,
        };
      })
      .sort((a, b) => b.points - a.points);
  }

  return (
    <div className="fade-in space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">Liga privada</p>
            <h1 className="mt-2 text-5xl leading-none sm:text-6xl">{leagueResult.data.name}</h1>
            <p className="section-subtitle mt-2 text-sm">
              Codigo de ingreso:{" "}
              <span className="rounded bg-[#1d2430] px-2 py-1 font-mono text-xs text-[#ffe289]">
                {leagueResult.data.join_code}
              </span>
            </p>
            <p className="mt-2 text-xs text-[#4c5564]">
              Link de invitacion: <span className="font-mono">{invitePath}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={invitePath} className="btn-ghost px-3 py-2 text-sm">
              Invitacion
            </Link>
            <Link href="/dashboard/leagues" className="btn-ghost px-3 py-2 text-sm">
              Ligas
            </Link>
          </div>
        </div>
      </div>

      <section className="panel p-4">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="space-y-1 text-sm">
            <span className="label-tech block">Vista</span>
            <select name="matchday" defaultValue={selectedMatchday?.id ?? ""} className="select-tech">
              <option value="">Acumulado total</option>
              {matchdays.map((matchday) => (
                <option key={matchday.id} value={matchday.id}>
                  {matchday.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="btn-primary px-3 py-2 text-sm">
            Aplicar
          </button>

          {selectedMatchday ? (
            <Link href={`/dashboard/leagues/${leagueId}`} className="btn-ghost px-3 py-2 text-sm">
              Limpiar
            </Link>
          ) : null}
        </form>

        <p className="section-subtitle mt-3 text-sm">
          Mostrando:{" "}
          <span className="font-semibold text-[#1f2937]">
            {selectedMatchday ? `${selectedMatchday.name} (Prode)` : "Acumulado general Prode"}
          </span>
        </p>
      </section>

      {schemaError ? <div className="alert-warning rounded-2xl p-4 text-sm">Error al cargar la tabla de liga: {schemaError}</div> : null}

      <section className="panel p-5">
        {rows.length === 0 ? (
          <p className="section-subtitle text-sm">Todavia no hay miembros o puntajes para esta vista.</p>
        ) : (
          <div className="table-shell">
            <table className="w-full border-collapse text-sm">
              <thead className="text-[#4c5564]">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Jugador</th>
                  <th className="px-3 py-2">Pais</th>
                  <th className="px-3 py-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.userId}
                    className={`border-t border-[#b9a068] ${row.userId === user.id ? "bg-[#fff2c6] font-semibold" : ""}`}
                  >
                    <td className="px-3 py-2 text-[#4c5564]">{index + 1}</td>
                    <td className="px-3 py-2 text-[#1f2937]">
                      {row.displayName}
                      {row.userId === user.id ? (
                        <span className="ml-2 rounded bg-[#1d2430] px-1.5 py-0.5 text-[10px] text-[#ffe289]">Vos</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[#4c5564]">{row.countryName ?? "-"}</td>
                    <td className="px-3 py-2 text-[#1f2937]">{row.points}</td>
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

