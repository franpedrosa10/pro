import Link from "next/link";

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
    };
  }
> = {
  es: {
    localeCode: "es-AR",
    timeZone: "America/Argentina/Buenos_Aires",
    timeZoneLabel: "ARG",
    chip: "Prode",
    title: "Prediccion de resultados",
    summary: "Resumen",
    fallbackMatchday: "Fecha",
    fallbackHome: "Local",
    fallbackAway: "Visitante",
    predictions: {
      title: "Prode de resultados",
      subtitle: "Carga tu marcador antes del inicio de cada partido. Puntaje: exacto 5, diferencia 3, resultado 2.",
      modeByMatchday: "Por fecha",
      modeAll: "Ver todo",
      loadedSuffix: "cargados",
      pendingSuffix: "pendientes",
      closed: "cerrada",
      fullView: "Vista completa",
      selectMatchday: "Selecciona una fecha",
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
    },
  },
  pt: {
    localeCode: "pt-BR",
    timeZone: "America/Sao_Paulo",
    timeZoneLabel: "BRT",
    chip: "Bolao",
    title: "Predicao de resultados",
    summary: "Resumo",
    fallbackMatchday: "Rodada",
    fallbackHome: "Mandante",
    fallbackAway: "Visitante",
    predictions: {
      title: "Bolao de resultados",
      subtitle: "Carregue o placar antes do inicio. Pontos: exato 5, diferenca 3, resultado 2.",
      modeByMatchday: "Por rodada",
      modeAll: "Ver tudo",
      loadedSuffix: "carregados",
      pendingSuffix: "pendentes",
      closed: "fechada",
      fullView: "Visao completa",
      selectMatchday: "Selecione uma rodada",
      showing: "Mostrando",
      matchSingle: "partida",
      matchPlural: "partidas",
      locked: "Bloqueado",
      editable: "Editavel",
      finalPrefix: "Final",
      noFixtures: "Nao ha partidas disponiveis neste momento.",
      noNewAll: "Nao ha novos palpites para salvar.",
      noNewMatchday: "Nao ha palpites completos nesta rodada.",
      saveErrorFallback: "Nao foi possivel salvar os palpites.",
      saved: "Palpites salvos",
      savedMatchday: "Rodada salva",
      saveThisMatchday: "Salvar esta rodada",
      saveCurrentView: "Salvar visao atual",
      saveAll: "Salvar tudo",
      saving: "Salvando...",
    },
  },
};

export default async function ProdePage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const { supabase, user } = await requireUser();
  const dateFormatter = new Intl.DateTimeFormat(copy.localeCode, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: copy.timeZone,
  });

  const fixturesResult = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, status, home_score, away_score, matchdays(name, order_index), home_team:national_teams!fixtures_home_team_id_fkey(name), away_team:national_teams!fixtures_away_team_id_fkey(name)",
    )
    .order("kickoff_at", { ascending: true })
    .limit(200);

  const predictionsResult = await supabase
    .from("prode_predictions")
    .select("fixture_id, predicted_home_score, predicted_away_score")
    .eq("user_id", user.id);

  const fixtures =
    fixturesResult.data?.map((fixture) => ({
      id: fixture.id as string,
      kickoff_at: fixture.kickoff_at as string,
      kickoff_label: `${dateFormatter.format(new Date(fixture.kickoff_at as string))} ${copy.timeZoneLabel}`,
      status: fixture.status as "scheduled" | "in_progress" | "finished",
      home_score: (fixture.home_score as number | null) ?? null,
      away_score: (fixture.away_score as number | null) ?? null,
      matchday_name: ((fixture.matchdays as { name?: string } | null)?.name as string | undefined) ?? copy.fallbackMatchday,
      matchday_order:
        (((fixture.matchdays as { order_index?: number } | null)?.order_index as number | undefined) ?? null),
      home_team_name:
        ((fixture.home_team as { name?: string } | null)?.name as string | undefined) ?? copy.fallbackHome,
      away_team_name:
        ((fixture.away_team as { name?: string } | null)?.name as string | undefined) ?? copy.fallbackAway,
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

      <ProdePredictions
        copy={copy.predictions}
        fixtures={fixtures}
        predictions={predictionsResult.data ?? []}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
