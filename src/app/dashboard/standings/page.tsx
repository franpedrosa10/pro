import Link from "next/link";

import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StandingsPageProps = {
  searchParams: Promise<{
    matchday?: string | string[];
    country?: string | string[];
  }>;
};

type StandingsRow = {
  userId: string;
  displayName: string;
  countryCode: string | null;
  countryName: string | null;
  points: number;
};

function parseStringParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function buildDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  username?: string | null;
}) {
  const firstName = (profile.first_name ?? "").trim();
  const lastName = (profile.last_name ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }

  const displayName = (profile.display_name ?? "").trim();
  if (displayName) {
    return displayName;
  }

  const username = (profile.username ?? "").trim();
  if (username) {
    return username;
  }

  return "Jugador";
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const requestedMatchdayId = parseStringParam(params.matchday);
  const requestedCountryCode = parseStringParam(params.country)?.toUpperCase() ?? null;

  let schemaError: string | null = null;

  const myProfileResult = await supabase
    .from("profiles")
    .select("country_code, country_name")
    .eq("id", user.id)
    .maybeSingle();

  if (myProfileResult.error) {
    schemaError = myProfileResult.error.message;
  }

  const myCountryCode = (myProfileResult.data?.country_code as string | null | undefined) ?? null;
  const myCountryName = (myProfileResult.data?.country_name as string | null | undefined) ?? null;

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

  const profilesResult = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, username, country_code, country_name");

  if (profilesResult.error) {
    schemaError = schemaError ?? profilesResult.error.message;
  }

  const pointsResult = selectedMatchday
    ? await supabase
        .from("v_prode_user_matchday_scores")
        .select("user_id, points")
        .eq("matchday_id", selectedMatchday.id)
    : await supabase
        .from("v_prode_user_totals")
        .select("user_id, points");

  if (pointsResult.error) {
    schemaError = schemaError ?? pointsResult.error.message;
  }

  const pointsByUserId = new Map<string, number>();
  (pointsResult.data ?? []).forEach((row) => {
    pointsByUserId.set(row.user_id as string, Number(row.points ?? 0));
  });

  const countryOptions = Array.from(
    new Map(
      (profilesResult.data ?? [])
        .map((profile) => ({
          code: (profile.country_code as string | null) ?? null,
          name: (profile.country_name as string | null) ?? null,
        }))
        .filter((country) => country.code && country.name)
        .map((country) => [country.code as string, country.name as string]),
    ).entries(),
  )
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const rows: StandingsRow[] = (profilesResult.data ?? [])
    .map((profile) => {
      const userId = profile.id as string;
      return {
        userId,
        displayName: buildDisplayName({
          first_name: profile.first_name as string | null,
          last_name: profile.last_name as string | null,
          display_name: profile.display_name as string | null,
          username: profile.username as string | null,
        }),
        countryCode: (profile.country_code as string | null) ?? null,
        countryName: (profile.country_name as string | null) ?? null,
        points: pointsByUserId.get(userId) ?? 0,
      };
    })
    .filter((row) => row.points > 0)
    .filter((row) => {
      if (!requestedCountryCode) {
        return true;
      }
      return row.countryCode === requestedCountryCode;
    })
    .sort((a, b) => b.points - a.points);

  return (
    <div className="fade-in space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">Resultados globales</p>
            <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Ranking Prode</h1>
          </div>
          <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm">
            Resumen
          </Link>
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

          <label className="space-y-1 text-sm">
            <span className="label-tech block">País</span>
            <select name="country" defaultValue={requestedCountryCode ?? ""} className="select-tech">
              <option value="">Todos los países</option>
              {myCountryCode ? (
                <option value={myCountryCode}>
                  Mi país ({myCountryName ?? myCountryCode})
                </option>
              ) : null}
              {countryOptions.filter((country) => country.code !== myCountryCode).map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="btn-primary px-3 py-2 text-sm">
            Aplicar
          </button>

          {(selectedMatchday || requestedCountryCode) ? (
            <Link href="/dashboard/standings" className="btn-ghost px-3 py-2 text-sm">
              Limpiar
            </Link>
          ) : null}
        </form>

        <p className="section-subtitle mt-3 text-sm">
          Mostrando:{" "}
          <span className="font-semibold text-[#1f2937]">
            {selectedMatchday ? selectedMatchday.name : "Acumulado general"}
            {requestedCountryCode ? ` | País ${requestedCountryCode}` : ""}
          </span>
        </p>
      </section>

      {schemaError ? <div className="alert-warning rounded-2xl p-4 text-sm">Error al cargar posiciones: {schemaError}</div> : null}

      <section className="panel p-5">
        {rows.length === 0 ? (
          <p className="section-subtitle text-sm">Todavía no hay puntajes para esta vista.</p>
        ) : (
          <div className="table-shell">
            <table className="w-full border-collapse text-sm">
              <thead className="text-[#4c5564]">
                <tr className="text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Jugador</th>
                  <th className="px-3 py-2">País</th>
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
