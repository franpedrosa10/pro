import Link from "next/link";
import { notFound } from "next/navigation";

import { LeaguePrizeVoting } from "@/components/league-prize-voting";
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

type LeaguePrizeProposal = {
  id: string;
  proposerUserId: string;
  proposerName: string;
  proposalKind: "money" | "material";
  amountPerPerson: number | null;
  currencyCode: "ARS" | "USD" | null;
  materialDescription: string | null;
  note: string | null;
  votesCount: number;
  votedByMe: boolean;
  createdAtLabel: string;
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

function formatProposalDate(isoValue: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(isoValue));
}

export default async function LeagueStandingsPage({ params, searchParams }: LeagueStandingsPageProps) {
  const { supabase, user } = await requireUser();
  const { leagueId } = await params;
  const query = await searchParams;
  const requestedMatchdayId = parseMatchdayParam(query.matchday);

  let schemaError: string | null = null;

  const leagueResult = await supabase
    .from("leagues")
    .select("id, name, is_country_league")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueResult.error) {
    schemaError = leagueResult.error.message;
  }
  if (!leagueResult.data) {
    notFound();
  }

  const isCountryLeague = Boolean(leagueResult.data.is_country_league);

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

  const firstRoundResult = await supabase
    .from("matchdays")
    .select("id, ends_at")
    .eq("order_index", 1)
    .maybeSingle();

  if (firstRoundResult.error) {
    schemaError = schemaError ?? firstRoundResult.error.message;
  }

  const firstRoundEndsAtIso = (firstRoundResult.data?.ends_at as string | null | undefined) ?? null;
  const firstRoundOpenResult = await supabase.rpc("is_first_round_open");
  if (firstRoundOpenResult.error) {
    schemaError = schemaError ?? firstRoundOpenResult.error.message;
  }
  const isPrizeWindowOpen = Boolean(firstRoundOpenResult.data);

  let prizeProposals: LeaguePrizeProposal[] = [];

  const proposalsResult = await supabase
    .from("league_prize_proposals")
    .select(
      "id, proposer_user_id, proposal_kind, amount_per_person, currency_code, material_description, note, created_at",
    )
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true });

  if (proposalsResult.error) {
    schemaError = schemaError ?? proposalsResult.error.message;
  }

  const proposerUserIds = Array.from(
    new Set((proposalsResult.data ?? []).map((row) => row.proposer_user_id as string)),
  );

  const proposerProfilesResult =
    proposerUserIds.length === 0
      ? { data: [] as Array<{ id: string; display_name: string | null; username: string | null }>, error: null }
      : await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", proposerUserIds);

  if (proposerProfilesResult.error) {
    schemaError = schemaError ?? proposerProfilesResult.error.message;
  }

  const proposalIds = (proposalsResult.data ?? []).map((row) => row.id as string);
  const votesResult =
    proposalIds.length === 0
      ? { data: [] as Array<{ proposal_id: string; user_id: string }>, error: null }
      : await supabase
          .from("league_prize_votes")
          .select("proposal_id, user_id")
          .in("proposal_id", proposalIds);

  if (votesResult.error) {
    schemaError = schemaError ?? votesResult.error.message;
  }

  const voteCountByProposalId = new Map<string, number>();
  const votedByMe = new Set<string>();
  for (const row of votesResult.data ?? []) {
    const proposalId = row.proposal_id as string;
    voteCountByProposalId.set(proposalId, (voteCountByProposalId.get(proposalId) ?? 0) + 1);
    if ((row.user_id as string) === user.id) {
      votedByMe.add(proposalId);
    }
  }

  const proposerNameByUserId = new Map<string, string>();
  for (const row of proposerProfilesResult.data ?? []) {
    const displayName = (row.display_name as string | null) ?? null;
    const username = (row.username as string | null) ?? null;
    proposerNameByUserId.set(row.id as string, displayName || username || "Jugador");
  }

  prizeProposals =
    proposalsResult.data?.map((row) => {
      const proposerUserId = row.proposer_user_id as string;
      const proposerName = proposerNameByUserId.get(proposerUserId) ?? "Jugador";
      const proposalId = row.id as string;
      const proposalKind = ((row.proposal_kind as "money" | "material" | null) ?? "money");
      const currencyCode = (row.currency_code as "ARS" | "USD" | null) ?? null;

      return {
        id: proposalId,
        proposerUserId,
        proposerName,
        proposalKind,
        amountPerPerson: row.amount_per_person === null ? null : Number(row.amount_per_person),
        currencyCode,
        materialDescription: (row.material_description as string | null) ?? null,
        note: (row.note as string | null) ?? null,
        votesCount: voteCountByProposalId.get(proposalId) ?? 0,
        votedByMe: votedByMe.has(proposalId),
        createdAtLabel: formatProposalDate(row.created_at as string),
      };
    }) ?? [];

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
      const profile = row.profiles as
        | { display_name?: string | null; username?: string | null; country_name?: string | null }
        | null;
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
      .map(([memberUserId, profile]) => {
        const points = prodeByUserId.get(memberUserId) ?? 0;
        return {
          userId: memberUserId,
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
          </div>
          <div className="flex flex-wrap gap-2">
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

      {schemaError ? (
        <div className="alert-warning rounded-2xl p-4 text-sm">Error al cargar la tabla de liga: {schemaError}</div>
      ) : null}

      <LeaguePrizeVoting
        leagueId={leagueId}
        currentUserId={user.id}
        isCountryLeague={isCountryLeague}
        firstRoundEndsAtIso={firstRoundEndsAtIso}
        isWindowOpen={isPrizeWindowOpen}
        proposals={prizeProposals}
      />

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
