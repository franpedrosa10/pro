import Link from "next/link";

import { ProdePredictions } from "@/components/prode-predictions";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProdePage() {
  const { supabase, user } = await requireUser();
  const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const fixturesResult = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, status, home_score, away_score, matchdays(name), home_team:national_teams!fixtures_home_team_id_fkey(name), away_team:national_teams!fixtures_away_team_id_fkey(name)",
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
      kickoff_label: `${dateFormatter.format(new Date(fixture.kickoff_at as string))} UTC`,
      status: fixture.status as "scheduled" | "in_progress" | "finished",
      home_score: (fixture.home_score as number | null) ?? null,
      away_score: (fixture.away_score as number | null) ?? null,
      matchday_name: ((fixture.matchdays as { name?: string } | null)?.name as string | undefined) ?? "Fecha",
      home_team_name:
        ((fixture.home_team as { name?: string } | null)?.name as string | undefined) ?? "Local",
      away_team_name:
        ((fixture.away_team as { name?: string } | null)?.name as string | undefined) ?? "Visitante",
    })) ?? [];

  return (
    <div className="fade-in space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">Prode</p>
            <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Prediccion de resultados</h1>
          </div>
          <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm">
            Resumen
          </Link>
        </div>
      </div>

      <ProdePredictions
        fixtures={fixtures}
        predictions={predictionsResult.data ?? []}
        nowIso={new Date().toISOString()}
      />
    </div>
  );
}
