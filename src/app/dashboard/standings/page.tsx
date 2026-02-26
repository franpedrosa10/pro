import Link from "next/link";

import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StandingsPageProps = {
  searchParams: Promise<{
    matchday?: string | string[];
  }>;
};

type StandingsRow = {
  userId: string;
  displayName: string;
  fantasy: number;
  prode: number;
  total: number;
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

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const requestedMatchdayId = parseMatchdayParam(params.matchday);

  let schemaError: string | null = null;

  const matchdaysResult = await supabase
    .from("matchdays")
    .select("id, name, order_index")
    .order("order_index", { ascending: true });

  if (matchdaysResult.error) {
    schemaError = matchdaysResult.error.message;
  }

  const matchdays =
    matchdaysResult.data?.map((matchday) => ({
      id: matchday.id as string,
      name: matchday.name as string,
      order: Number(matchday.order_index),
    })) ?? [];

  const selectedMatchday =
    matchdays.find((matchday) => matchday.id === requestedMatchdayId) ?? null;

  let rows: StandingsRow[] = [];

  if (!selectedMatchday) {
    const totalsResult = await supabase
      .from("v_global_standings")
      .select("user_id, display_name, fantasy_points, prode_points, combined_points")
      .order("combined_points", { ascending: false });

    if (totalsResult.error) {
      schemaError = schemaError ?? totalsResult.error.message;
    } else {
      rows =
        totalsResult.data?.map((row) => ({
          userId: row.user_id as string,
          displayName: row.display_name as string,
          fantasy: Number(row.fantasy_points ?? 0),
          prode: Number(row.prode_points ?? 0),
          total: Number(row.combined_points ?? 0),
        })) ?? [];
    }
  } else {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, display_name, username");
    const fantasyResult = await supabase
      .from("v_fantasy_user_matchday_scores")
      .select("user_id, points")
      .eq("matchday_id", selectedMatchday.id);
    const prodeResult = await supabase
      .from("v_prode_user_matchday_scores")
      .select("user_id, points")
      .eq("matchday_id", selectedMatchday.id);

    if (profilesResult.error) {
      schemaError = schemaError ?? profilesResult.error.message;
    }
    if (fantasyResult.error) {
      schemaError = schemaError ?? fantasyResult.error.message;
    }
    if (prodeResult.error) {
      schemaError = schemaError ?? prodeResult.error.message;
    }

    const nameByUserId = new Map<string, string>();
    (profilesResult.data ?? []).forEach((profile) => {
      const displayName =
        (profile.display_name as string | null) ||
        (profile.username as string | null) ||
        "Jugador";
      nameByUserId.set(profile.id as string, displayName);
    });

    const fantasyByUserId = new Map<string, number>();
    (fantasyResult.data ?? []).forEach((row) => {
      fantasyByUserId.set(row.user_id as string, Number(row.points ?? 0));
    });

    const prodeByUserId = new Map<string, number>();
    (prodeResult.data ?? []).forEach((row) => {
      prodeByUserId.set(row.user_id as string, Number(row.points ?? 0));
    });

    rows = Array.from(nameByUserId.entries())
      .map(([userId, displayName]) => {
        const fantasy = fantasyByUserId.get(userId) ?? 0;
        const prode = prodeByUserId.get(userId) ?? 0;
        return {
          userId,
          displayName,
          fantasy,
          prode,
          total: fantasy + prode,
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total || b.fantasy - a.fantasy || b.prode - a.prode);
  }

  return (
    <div className="fade-in space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">Resultados globales</p>
            <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Ranking global</h1>
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

          <button type="submit" className="btn-primary px-3 py-2 text-sm">
            Aplicar
          </button>

          {selectedMatchday ? (
            <Link href="/dashboard/standings" className="btn-ghost px-3 py-2 text-sm">
              Limpiar
            </Link>
          ) : null}
        </form>

        <p className="section-subtitle mt-3 text-sm">
          Mostrando:{" "}
          <span className="font-semibold text-[#1f2937]">
            {selectedMatchday ? `${selectedMatchday.name} (Fantasy + Prode)` : "Acumulado general"}
          </span>
        </p>
      </section>

      {schemaError ? <div className="alert-warning rounded-2xl p-4 text-sm">Error al cargar posiciones: {schemaError}</div> : null}

      <section className="panel p-5">
        {rows.length === 0 ? (
          <p className="section-subtitle text-sm">Todavia no hay puntajes para esta vista.</p>
        ) : (
          <div className="table-shell">
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
                {rows.map((row, index) => (
                  <tr
                    key={row.userId}
                    className={`border-t border-[#eadfbf] ${row.userId === user.id ? "bg-[#fff4cf] font-semibold" : ""}`}
                  >
                    <td className="px-3 py-2 text-[#6b7280]">{index + 1}</td>
                    <td className="px-3 py-2 text-[#1f2937]">
                      {row.displayName}
                      {row.userId === user.id ? (
                        <span className="ml-2 rounded bg-[#9a6b00] px-1.5 py-0.5 text-[10px] text-white">Vos</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[#6b7280]">{row.fantasy}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{row.prode}</td>
                    <td className="px-3 py-2 text-[#1f2937]">{row.total}</td>
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

