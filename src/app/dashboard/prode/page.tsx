import Link from "next/link";

import { ProdePodiumPicks } from "@/components/prode-podium-picks";
import { ProdePredictions } from "@/components/prode-predictions";
import { requireUser } from "@/lib/auth";
import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const COPY: Record<
  AppLocale,
  {
    localeCode: string;
    timeZone: string;
    timeZoneLabel: string;
    chip: string;
    title: string;
    summary: string;
    fallbackMatchday: string;
    fallbackHome: string;
    fallbackAway: string;
    podium: {
      title: string;
      subtitle: string;
      champion: string;
      runnerUp: string;
      save: string;
      saving: string;
      locked: string;
      deadlinePrefix: string;
      selectPlaceholder: string;
      sameTeamError: string;
      saveErrorFallback: string;
      saved: string;
      currentPickPrefix: string;
    };
    predictions: {
      title: string;
      subtitle: string;
      modeByMatchday: string;
      modeAll: string;
      loadedSuffix: string;
      pendingSuffix: string;
      closed: string;
      fullView: string;
      selectMatchday: string;
      showing: string;
      matchSingle: string;
      matchPlural: string;
      locked: string;
      editable: string;
      finalPrefix: string;
      noFixtures: string;
      noNewAll: string;
      noNewMatchday: string;
      saveErrorFallback: string;
      saved: string;
      savedMatchday: string;
      saveThisMatchday: string;
      saveCurrentView: string;
      saveAll: string;
      saving: string;
      doubleTitle: string;
      doubleSubtitle: string;
      doubleSelectPlaceholder: string;
      doubleSave: string;
      doubleSaving: string;
      doubleUpdated: string;
      doubleCleared: string;
      doubleSaveErrorFallback: string;
      doubleCurrent: string;
      doubleBadge: string;
    };
  }
> = {
  es: {
    localeCode: "es-AR",
    timeZone: "America/Argentina/Buenos_Aires",
    timeZoneLabel: "ARG",
    chip: "Prode",
    title: "Predicción de resultados",
    summary: "Resumen",
    fallbackMatchday: "Fecha",
    fallbackHome: "Local",
    fallbackAway: "Visitante",
    podium: {
      title: "Campeón y subcampeón",
      subtitle: "Elegí el podio del Mundial antes de que termine la fase de grupos.",
      champion: "Campeón",
      runnerUp: "Subcampeón",
      save: "Guardar podio",
      saving: "Guardando...",
      locked: "Podio bloqueado",
      deadlinePrefix: "Cierra",
      selectPlaceholder: "Seleccioná un equipo",
      sameTeamError: "Campeón y subcampeón no pueden ser el mismo equipo.",
      saveErrorFallback: "No se pudo guardar el podio.",
      saved: "Podio guardado correctamente.",
      currentPickPrefix: "Actual",
    },
    predictions: {
      title: "Prode de resultados",
      subtitle: "Cargá tu marcador antes del inicio de cada partido. Puntaje: exacto 5, diferencia 3, resultado 2.",
      modeByMatchday: "Por fecha",
      modeAll: "Ver todo",
      loadedSuffix: "cargados",
      pendingSuffix: "pendientes",
      closed: "cerrada",
      fullView: "Vista completa",
      selectMatchday: "Seleccioná una fecha",
      showing: "Mostrando",
      matchSingle: "partido",
      matchPlural: "partidos",
      locked: "Bloqueado",
      editable: "Editable",
      finalPrefix: "Final",
      noFixtures: "No hay partidos disponibles en este momento.",
      noNewAll: "No hay predicciones nuevas para guardar.",
      noNewMatchday: "No hay predicciones completas en esta fecha.",
      saveErrorFallback: "No se pudieron guardar las predicciones.",
      saved: "Predicciones guardadas",
      savedMatchday: "Fecha guardada",
      saveThisMatchday: "Guardar esta fecha",
      saveCurrentView: "Guardar vista actual",
      saveAll: "Guardar todo",
      saving: "Guardando...",
      doubleTitle: "x2 de la fecha",
      doubleSubtitle: "Elegí un partido de esta fecha para duplicar puntos. Se bloquea al inicio de la fecha.",
      doubleSelectPlaceholder: "Sin x2",
      doubleSave: "Guardar x2",
      doubleSaving: "Guardando x2...",
      doubleUpdated: "x2 actualizado para esta fecha.",
      doubleCleared: "x2 eliminado para esta fecha.",
      doubleSaveErrorFallback: "No se pudo guardar el x2.",
      doubleCurrent: "x2 actual",
      doubleBadge: "x2",
    },
  },
  en: {
    localeCode: "en-US",
    timeZone: "America/New_York",
    timeZoneLabel: "ET",
    chip: "Predictions",
    title: "Match score predictions",
    summary: "Summary",
    fallbackMatchday: "Matchday",
    fallbackHome: "Home",
    fallbackAway: "Away",
    podium: {
      title: "Champion and runner-up",
      subtitle: "Pick your World Cup podium before the group stage ends.",
      champion: "Champion",
      runnerUp: "Runner-up",
      save: "Save podium",
      saving: "Saving...",
      locked: "Podium locked",
      deadlinePrefix: "Locks",
      selectPlaceholder: "Select a team",
      sameTeamError: "Champion and runner-up cannot be the same team.",
      saveErrorFallback: "Could not save podium.",
      saved: "Podium saved.",
      currentPickPrefix: "Current",
    },
    predictions: {
      title: "Match predictions",
      subtitle: "Set your score before kickoff. Points: exact 5, goal diff 3, result 2.",
      modeByMatchday: "By matchday",
      modeAll: "View all",
      loadedSuffix: "loaded",
      pendingSuffix: "pending",
      closed: "closed",
      fullView: "Full view",
      selectMatchday: "Select a matchday",
      showing: "Showing",
      matchSingle: "match",
      matchPlural: "matches",
      locked: "Locked",
      editable: "Editable",
      finalPrefix: "Final",
      noFixtures: "No matches are available right now.",
      noNewAll: "No new predictions to save.",
      noNewMatchday: "No complete predictions in this matchday.",
      saveErrorFallback: "Could not save predictions.",
      saved: "Predictions saved",
      savedMatchday: "Matchday saved",
      saveThisMatchday: "Save this matchday",
      saveCurrentView: "Save current view",
      saveAll: "Save all",
      saving: "Saving...",
      doubleTitle: "x2 of the matchday",
      doubleSubtitle: "Choose one match in this matchday to double points. Locks at matchday start.",
      doubleSelectPlaceholder: "No x2",
      doubleSave: "Save x2",
      doubleSaving: "Saving x2...",
      doubleUpdated: "x2 updated for this matchday.",
      doubleCleared: "x2 cleared for this matchday.",
      doubleSaveErrorFallback: "Could not save x2.",
      doubleCurrent: "Current x2",
      doubleBadge: "x2",
    },
  },
  pt: {
    localeCode: "pt-BR",
    timeZone: "America/Sao_Paulo",
    timeZoneLabel: "BRT",
    chip: "Bolão",
    title: "Predição de resultados",
    summary: "Resumo",
    fallbackMatchday: "Rodada",
    fallbackHome: "Mandante",
    fallbackAway: "Visitante",
    podium: {
      title: "Campeão e vice",
      subtitle: "Escolha o pódio da Copa antes do fim da fase de grupos.",
      champion: "Campeão",
      runnerUp: "Vice",
      save: "Salvar pódio",
      saving: "Salvando...",
      locked: "Pódio bloqueado",
      deadlinePrefix: "Fecha",
      selectPlaceholder: "Selecione uma seleção",
      sameTeamError: "Campeão e vice não podem ser o mesmo time.",
      saveErrorFallback: "Não foi possível salvar o pódio.",
      saved: "Pódio salvo.",
      currentPickPrefix: "Atual",
    },
    predictions: {
      title: "Bolão de resultados",
      subtitle: "Carregue o placar antes do início. Pontos: exato 5, diferença 3, resultado 2.",
      modeByMatchday: "Por rodada",
      modeAll: "Ver tudo",
      loadedSuffix: "carregados",
      pendingSuffix: "pendentes",
      closed: "fechada",
      fullView: "Visão completa",
      selectMatchday: "Selecione uma rodada",
      showing: "Mostrando",
      matchSingle: "partida",
      matchPlural: "partidas",
      locked: "Bloqueado",
      editable: "Editável",
      finalPrefix: "Final",
      noFixtures: "Não há partidas disponíveis neste momento.",
      noNewAll: "Não há novos palpites para salvar.",
      noNewMatchday: "Não há palpites completos nesta rodada.",
      saveErrorFallback: "Não foi possível salvar os palpites.",
      saved: "Palpites salvos",
      savedMatchday: "Rodada salva",
      saveThisMatchday: "Salvar esta rodada",
      saveCurrentView: "Salvar visão atual",
      saveAll: "Salvar tudo",
      saving: "Salvando...",
      doubleTitle: "x2 da rodada",
      doubleSubtitle: "Escolha uma partida da rodada para dobrar pontos. Fecha no início da rodada.",
      doubleSelectPlaceholder: "Sem x2",
      doubleSave: "Salvar x2",
      doubleSaving: "Salvando x2...",
      doubleUpdated: "x2 atualizado para esta rodada.",
      doubleCleared: "x2 removido para esta rodada.",
      doubleSaveErrorFallback: "Não foi possível salvar o x2.",
      doubleCurrent: "x2 atual",
      doubleBadge: "x2",
    },
  },
};

export default async function ProdePage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const { supabase, user } = await requireUser();
  const nowIso = new Date().toISOString();
  const dateFormatter = new Intl.DateTimeFormat(copy.localeCode, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: copy.timeZone,
  });

  const [fixturesResult, predictionsResult, doublesResult, podiumResult, teamsResult, groupStageResult] = await Promise.all([
    supabase
      .from("fixtures")
      .select(
        "id, matchday_id, kickoff_at, status, home_score, away_score, matchdays(id, name, order_index, lock_at), home_team:national_teams!fixtures_home_team_id_fkey(name), away_team:national_teams!fixtures_away_team_id_fkey(name)",
      )
      .order("kickoff_at", { ascending: true })
      .limit(200),
    supabase
      .from("prode_predictions")
      .select("fixture_id, predicted_home_score, predicted_away_score")
      .eq("user_id", user.id),
    supabase
      .from("prode_matchday_multipliers")
      .select("matchday_id, fixture_id")
      .eq("user_id", user.id),
    supabase
      .from("prode_podium_picks")
      .select("champion_team_id, runner_up_team_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("national_teams")
      .select("id, name")
      .not("group_letter", "is", null)
      .order("name", { ascending: true }),
    supabase
      .from("matchdays")
      .select("ends_at")
      .eq("order_index", 3)
      .maybeSingle(),
  ]);

  const groupStageEndsAtIso = (groupStageResult.data?.ends_at as string | undefined) ?? new Date().toISOString();
  const groupStageEndsAtLabel = `${dateFormatter.format(new Date(groupStageEndsAtIso))} ${copy.timeZoneLabel}`;

  const fixtures =
    fixturesResult.data?.map((fixture) => {
      const matchday = (fixture.matchdays as { id?: string; name?: string; order_index?: number; lock_at?: string } | null) ?? null;
      return {
        id: fixture.id as string,
        matchday_id: (fixture.matchday_id as string) ?? (matchday?.id ?? ""),
        matchday_lock_at: (matchday?.lock_at as string | undefined) ?? (fixture.kickoff_at as string),
        kickoff_at: fixture.kickoff_at as string,
        kickoff_label: `${dateFormatter.format(new Date(fixture.kickoff_at as string))} ${copy.timeZoneLabel}`,
        status: fixture.status as "scheduled" | "in_progress" | "finished",
        home_score: (fixture.home_score as number | null) ?? null,
        away_score: (fixture.away_score as number | null) ?? null,
        matchday_name: (matchday?.name as string | undefined) ?? copy.fallbackMatchday,
        matchday_order: (matchday?.order_index as number | undefined) ?? null,
        home_team_name:
          ((fixture.home_team as { name?: string } | null)?.name as string | undefined) ?? copy.fallbackHome,
        away_team_name:
          ((fixture.away_team as { name?: string } | null)?.name as string | undefined) ?? copy.fallbackAway,
      };
    }) ?? [];

  const teams =
    teamsResult.data?.map((team) => ({
      id: team.id as string,
      name: team.name as string,
    })) ?? [];

  const initialDoubles =
    doublesResult.data?.map((row) => ({
      matchdayId: row.matchday_id as string,
      fixtureId: row.fixture_id as string,
    })) ?? [];

  return (
    <div className="fade-in w-full space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">{copy.chip}</p>
            <h1 className="mt-2 text-4xl leading-none sm:text-5xl">{copy.title}</h1>
          </div>
          <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm">
            {copy.summary}
          </Link>
        </div>
      </div>

      <ProdePodiumPicks
        copy={copy.podium}
        teams={teams}
        initialChampionTeamId={(podiumResult.data?.champion_team_id as string | undefined) ?? null}
        initialRunnerUpTeamId={(podiumResult.data?.runner_up_team_id as string | undefined) ?? null}
        lockAtIso={groupStageEndsAtIso}
        lockAtLabel={groupStageEndsAtLabel}
        nowIso={nowIso}
      />

      <ProdePredictions
        copy={copy.predictions}
        fixtures={fixtures}
        predictions={predictionsResult.data ?? []}
        initialDoubles={initialDoubles}
        nowIso={nowIso}
      />
    </div>
  );
}
