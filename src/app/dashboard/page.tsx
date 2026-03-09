import Link from "next/link";

import { LeagueManager } from "@/components/league-manager";
import { requireUser } from "@/lib/auth";
import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type LeagueForUi = {
  id: string;
  name: string;
  join_code: string;
  is_country_league: boolean;
  country_code: string | null;
};

type StandingsRow = {
  userId: string;
  displayName: string;
  countryCode: string | null;
  countryName: string | null;
  points: number;
};

function buildDisplayName(profile: {
  id?: string | null;
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

const COPY: Record<
  AppLocale,
  {
    chip: string;
    title: string;
    subtitle: string;
    ctaProde: string;
    ctaStandings: string;
    ctaLeagues: string;
    schemaError: string;
    kpiProde: string;
    kpiPosition: string;
    noRank: string;
    viewRanking: string;
    kpiPending: string;
    kpiPendingMeta: string;
    loadPredictions: string;
    kpiLeagues: string;
    kpiLeaguesMeta: string;
    country: string;
    completeProfile: string;
    manageLeagues: string;
    topGlobal: string;
    fullTable: string;
    noScores: string;
    countryLeague: string;
    completeCountry: string;
    noCountryScores: string;
    tableRank: string;
    tablePlayer: string;
    tableCountry: string;
    tablePoints: string;
    you: string;
  }
> = {
  es: {
    chip: "Centro de control",
    title: "Tablero de competencia",
    subtitle: "Tu estado de Prode, ligas privadas y ranking en una sola vista.",
    ctaProde: "Cargar prode",
    ctaStandings: "Resultados globales",
    ctaLeagues: "Mis ligas",
    schemaError: "El esquema de Supabase todavía no está aplicado o hay un error:",
    kpiProde: "Puntaje Prode",
    kpiPosition: "Posición global",
    noRank: "sin ranking",
    viewRanking: "Ver ranking",
    kpiPending: "Pendientes",
    kpiPendingMeta: "Partidos pendientes de pronóstico.",
    loadPredictions: "Cargar pronósticos",
    kpiLeagues: "Ligas",
    kpiLeaguesMeta: "Privadas activas en tu cuenta.",
    country: "País",
    completeProfile: "completa tu perfil",
    manageLeagues: "Gestionar ligas",
    topGlobal: "Top global Prode",
    fullTable: "Ver tabla completa",
    noScores: "Todavía no hay puntajes publicados.",
    countryLeague: "Liga por país",
    completeCountry: "Completá tu país en Mi cuenta para activar esta tabla.",
    noCountryScores: "Todavía no hay puntajes cargados para",
    tableRank: "#",
    tablePlayer: "Jugador",
    tableCountry: "País",
    tablePoints: "Puntos",
    you: "Vos",
  },
  en: {
    chip: "Control center",
    title: "Competition dashboard",
    subtitle: "Your predictions, private leagues and rankings in one place.",
    ctaProde: "Load predictions",
    ctaStandings: "Global standings",
    ctaLeagues: "My leagues",
    schemaError: "Supabase schema is not applied yet or there is an error:",
    kpiProde: "Prediction points",
    kpiPosition: "Global rank",
    noRank: "no rank",
    viewRanking: "View ranking",
    kpiPending: "Pending",
    kpiPendingMeta: "Matches pending prediction.",
    loadPredictions: "Load predictions",
    kpiLeagues: "Leagues",
    kpiLeaguesMeta: "Active private leagues in your account.",
    country: "Country",
    completeProfile: "complete profile",
    manageLeagues: "Manage leagues",
    topGlobal: "Global Top",
    fullTable: "View full table",
    noScores: "No scores published yet.",
    countryLeague: "Country league",
    completeCountry: "Complete your country in My account to enable this table.",
    noCountryScores: "No scores available yet for",
    tableRank: "#",
    tablePlayer: "Player",
    tableCountry: "Country",
    tablePoints: "Points",
    you: "You",
  },
  pt: {
    chip: "Centro de controle",
    title: "Painel de competicao",
    subtitle: "Seu bolao, ligas privadas e rankings em uma tela.",
    ctaProde: "Carregar bolao",
    ctaStandings: "Classificacao global",
    ctaLeagues: "Minhas ligas",
    schemaError: "Schema do Supabase nao aplicado ou com erro:",
    kpiProde: "Pontos bolao",
    kpiPosition: "Posicao global",
    noRank: "sem ranking",
    viewRanking: "Ver ranking",
    kpiPending: "Pendentes",
    kpiPendingMeta: "Partidas pendentes de palpite.",
    loadPredictions: "Carregar palpites",
    kpiLeagues: "Ligas",
    kpiLeaguesMeta: "Privadas ativas na sua conta.",
    country: "Pais",
    completeProfile: "complete perfil",
    manageLeagues: "Gerenciar ligas",
    topGlobal: "Top global",
    fullTable: "Ver tabela completa",
    noScores: "Ainda nao ha pontuacoes publicadas.",
    countryLeague: "Liga por pais",
    completeCountry: "Complete seu pais em Minha conta para ativar esta tabela.",
    noCountryScores: "Ainda nao ha pontuacoes para",
    tableRank: "#",
    tablePlayer: "Jogador",
    tableCountry: "Pais",
    tablePoints: "Pontos",
    you: "Voce",
  },
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  let schemaError: string | null = null;

  const profileResult = await supabase
    .from("profiles")
    .select("country_code, country_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    schemaError = profileResult.error.message;
  }

  const profileCountryCode = (profileResult.data?.country_code as string | null | undefined) ?? null;
  const profileCountryName = (profileResult.data?.country_name as string | null | undefined) ?? null;

  const leaguesResult = await supabase
    .from("leagues")
    .select("id, name, join_code, is_country_league, country_code, league_members!inner(user_id)")
    .eq("league_members.user_id", user.id);

  const leagues: LeagueForUi[] =
    leaguesResult.data?.map((league) => ({
      id: league.id as string,
      name: league.name as string,
      join_code: league.join_code as string,
      is_country_league: Boolean(league.is_country_league),
      country_code: (league.country_code as string | null) ?? null,
    })) ?? [];

  if (leaguesResult.error && !schemaError) {
    schemaError = leaguesResult.error.message;
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

  const profilesResult = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, username, country_code, country_name");

  const prodeTotalsResult = await supabase
    .from("v_prode_user_totals")
    .select("user_id, points");

  if (profilesResult.error && !schemaError) {
    schemaError = profilesResult.error.message;
  }
  if (prodeTotalsResult.error && !schemaError) {
    schemaError = prodeTotalsResult.error.message;
  }

  const pointsByUserId = new Map<string, number>();
  (prodeTotalsResult.data ?? []).forEach((row) => {
    pointsByUserId.set(row.user_id as string, Number(row.points ?? 0));
  });

  const standings: StandingsRow[] = (profilesResult.data ?? [])
    .map((profile) => {
      const userId = profile.id as string;
      return {
        userId,
        displayName: buildDisplayName({
          id: profile.id as string | null,
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
    .sort((a, b) => b.points - a.points);

  const topGlobal = standings.slice(0, 10);
  const userRank = standings.findIndex((row) => row.userId === user.id) + 1;
  const myProdePoints = pointsByUserId.get(user.id) ?? 0;
  const countryRows = profileCountryCode
    ? standings.filter((row) => row.countryCode === profileCountryCode).slice(0, 10)
    : [];

  const pendingProde = Math.max(0, editableFixtureIds.length - (predictionsResult.data?.length ?? 0));

  return (
    <div className="fade-in space-y-5">
      <header className="panel-strong p-5 sm:p-6">
        <p className="chip w-fit">{copy.chip}</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">{copy.title}</h1>
        <p className="section-subtitle mt-2 max-w-2xl">
          {copy.subtitle}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/prode" className="btn-primary px-4 py-2 text-sm">
            {copy.ctaProde}
          </Link>
          <Link href="/dashboard/standings" className="btn-ghost px-4 py-2 text-sm">
            {copy.ctaStandings}
          </Link>
          <Link href="/dashboard/leagues" className="btn-ghost px-4 py-2 text-sm">
            {copy.ctaLeagues}
          </Link>
        </div>
      </header>

      {schemaError ? (
        <div className="alert-warning rounded-2xl p-4 text-sm">
          {copy.schemaError} {schemaError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="kpi-card kpi-card-stack">
          <p className="kpi-label">{copy.kpiProde}</p>
          <p className="kpi-value">{myProdePoints}</p>
          <p className="kpi-meta">
            {copy.kpiPosition}: {userRank > 0 ? `#${userRank}` : copy.noRank}
          </p>
          <Link href="/dashboard/standings" className="link-inline kpi-cta inline-flex text-sm">
            {copy.viewRanking}
          </Link>
        </article>

        <article className="kpi-card kpi-card-stack">
          <p className="kpi-label">{copy.kpiPending}</p>
          <p className="kpi-value">{pendingProde}</p>
          <p className="kpi-meta">{copy.kpiPendingMeta}</p>
          <Link href="/dashboard/prode" className="link-inline kpi-cta inline-flex text-sm">
            {copy.loadPredictions}
          </Link>
        </article>

        <article className="kpi-card kpi-card-stack">
          <p className="kpi-label">{copy.kpiLeagues}</p>
          <p className="kpi-value">{leagues.length}</p>
          <p className="kpi-meta">{copy.kpiLeaguesMeta}</p>
          <p className="mt-3 text-xs text-[#4c5564]">
            {copy.country}: {profileCountryName ?? copy.completeProfile}
          </p>
          <Link href="/dashboard/leagues" className="link-inline kpi-cta inline-flex text-sm">
            {copy.manageLeagues}
          </Link>
        </article>
      </section>

      <LeagueManager
        leagues={leagues}
        locale={locale}
        profileCountry={{
          countryCode: profileCountryCode,
          countryName: profileCountryName,
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel h-full p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-4xl leading-none">{copy.topGlobal}</h2>
            <Link href="/dashboard/standings" className="link-inline text-sm">
              {copy.fullTable}
            </Link>
          </div>
          {topGlobal.length === 0 ? (
            <p className="section-subtitle mt-2 text-sm">{copy.noScores}</p>
          ) : (
            <div className="table-shell mt-3">
              <table className="w-full border-collapse text-sm">
                <thead className="text-[#4c5564]">
                  <tr className="text-left">
                    <th className="px-3 py-2">{copy.tableRank}</th>
                    <th className="px-3 py-2">{copy.tablePlayer}</th>
                    <th className="px-3 py-2">{copy.tableCountry}</th>
                    <th className="px-3 py-2">{copy.tablePoints}</th>
                  </tr>
                </thead>
                <tbody>
                  {topGlobal.map((row, index) => (
                    <tr key={`${row.displayName}-${index}`} className="border-t border-[#b9a068]">
                      <td className="px-3 py-2 font-semibold text-[#4c5564]">{index + 1}</td>
                      <td className="px-3 py-2 text-[#1f2937]">{row.displayName}</td>
                      <td className="px-3 py-2 text-[#4c5564]">{row.countryName ?? "-"}</td>
                      <td className="px-3 py-2 font-semibold text-[#1f2937]">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel h-full p-5">
          <h2 className="text-4xl leading-none">{copy.countryLeague}</h2>
          {!profileCountryCode ? (
            <p className="section-subtitle mt-2 text-sm">
              {copy.completeCountry}
            </p>
          ) : countryRows.length === 0 ? (
            <p className="section-subtitle mt-2 text-sm">
              {copy.noCountryScores} {profileCountryName ?? profileCountryCode}.
            </p>
          ) : (
            <div className="table-shell mt-3">
              <table className="w-full border-collapse text-sm">
                <thead className="text-[#4c5564]">
                  <tr className="text-left">
                    <th className="px-3 py-2">{copy.tableRank}</th>
                    <th className="px-3 py-2">{copy.tablePlayer}</th>
                    <th className="px-3 py-2">{copy.tablePoints}</th>
                  </tr>
                </thead>
                <tbody>
                  {countryRows.map((row, index) => (
                    <tr key={`${row.userId}-country`} className="border-t border-[#b9a068]">
                      <td className="px-3 py-2 font-semibold text-[#4c5564]">{index + 1}</td>
                      <td className="px-3 py-2 text-[#1f2937]">
                        {row.displayName}
                        {row.userId === user.id ? (
                          <span className="ml-2 rounded bg-[#1d2430] px-1.5 py-0.5 text-[10px] text-[#ffe289]">{copy.you}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#1f2937]">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
