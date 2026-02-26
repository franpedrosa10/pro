"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FixtureRow = {
  id: string;
  kickoff_at: string;
  kickoff_label: string;
  status: "scheduled" | "in_progress" | "finished";
  matchday_name: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
};

type ExistingPrediction = {
  fixture_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
};

type DraftState = Record<
  string,
  {
    predictedHome: string;
    predictedAway: string;
  }
>;

type ProdePredictionsProps = {
  fixtures: FixtureRow[];
  predictions: ExistingPrediction[];
  nowIso: string;
};

export function ProdePredictions({ fixtures, predictions, nowIso }: ProdePredictionsProps) {
  const [draft, setDraft] = useState<DraftState>(() => {
    const initial: DraftState = {};
    for (const prediction of predictions) {
      initial[prediction.fixture_id] = {
        predictedHome: String(prediction.predicted_home_score),
        predictedAway: String(prediction.predicted_away_score),
      };
    }
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const router = useRouter();
  const nowTimestamp = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  const editableFixtures = useMemo(
    () =>
      fixtures.filter((fixture) => {
        if (fixture.status !== "scheduled") {
          return false;
        }
        return new Date(fixture.kickoff_at).getTime() > nowTimestamp;
      }),
    [fixtures, nowTimestamp],
  );

  function updatePrediction(fixtureId: string, side: "predictedHome" | "predictedAway", value: string) {
    if (!/^\d*$/.test(value)) {
      return;
    }

    setDraft((current) => {
      const previous = current[fixtureId] ?? { predictedHome: "", predictedAway: "" };
      return {
        ...current,
        [fixtureId]: {
          ...previous,
          [side]: value,
        },
      };
    });
  }

  async function savePredictions() {
    setSaveError(null);
    setSaveInfo(null);

    const payload = editableFixtures
      .map((fixture) => ({
        fixtureId: fixture.id,
        predictedHome: draft[fixture.id]?.predictedHome ?? "",
        predictedAway: draft[fixture.id]?.predictedAway ?? "",
      }))
      .filter((row) => row.predictedHome !== "" && row.predictedAway !== "");

    if (payload.length === 0) {
      setSaveError("No hay predicciones nuevas para guardar.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/prode/predictions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        predictions: payload.map((row) => ({
          fixtureId: row.fixtureId,
          predictedHome: Number(row.predictedHome),
          predictedAway: Number(row.predictedAway),
        })),
      }),
    });
    const result = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setSaveError(result.error ?? "No se pudieron guardar las predicciones.");
      return;
    }

    setSaveInfo("Predicciones guardadas.");
    router.refresh();
  }

  if (fixtures.length === 0) {
    return (
      <div className="alert-warning rounded-2xl p-5 text-sm">
        No hay partidos cargados. Ejecuta `supabase/seed.sql` o importa fixtures reales.
      </div>
    );
  }

  return (
    <section className="panel p-5">
      <h2 className="text-4xl leading-none">Prode de resultados</h2>
      <p className="section-subtitle mt-2 text-sm">
        Carga tu marcador antes del inicio de cada partido. Puntaje: exacto 5, diferencia 3, resultado 2.
      </p>

      <div className="mt-4 space-y-3">
        {fixtures.map((fixture) => {
          const isLocked =
            fixture.status !== "scheduled" || new Date(fixture.kickoff_at).getTime() <= nowTimestamp;

          return (
            <article key={fixture.id} className="panel-soft p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">
                    {fixture.home_team_name} vs {fixture.away_team_name}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    {fixture.matchday_name} | {fixture.kickoff_label}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    isLocked ? "bg-[#ececec] text-[#6b7280]" : "bg-[#9a6b00] text-white"
                  }`}
                >
                  {isLocked ? "Bloqueado" : "Editable"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft[fixture.id]?.predictedHome ?? ""}
                  onChange={(event) => updatePrediction(fixture.id, "predictedHome", event.target.value)}
                  disabled={isLocked}
                  className="input-tech w-14 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="-"
                />
                <span className="text-sm text-[#6b7280]">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft[fixture.id]?.predictedAway ?? ""}
                  onChange={(event) => updatePrediction(fixture.id, "predictedAway", event.target.value)}
                  disabled={isLocked}
                  className="input-tech w-14 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="-"
                />
                {fixture.status === "finished" ? (
                  <span className="ml-2 rounded bg-[#fff0c7] px-2 py-1 text-xs font-semibold text-[#7a5307]">
                    Final: {fixture.home_score}-{fixture.away_score}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {saveError ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{saveError}</p> : null}
      {saveInfo ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{saveInfo}</p> : null}

      <button
        type="button"
        onClick={savePredictions}
        disabled={isSaving || editableFixtures.length === 0}
        className="btn-primary mt-4 w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : "Guardar predicciones"}
      </button>
    </section>
  );
}

