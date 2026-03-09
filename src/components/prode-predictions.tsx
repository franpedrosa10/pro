"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FixtureRow = {
  id: string;
  matchday_id: string;
  matchday_lock_at: string;
  kickoff_at: string;
  kickoff_label: string;
  status: "scheduled" | "in_progress" | "finished";
  matchday_name: string;
  matchday_order: number | null;
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

type InitialDouble = {
  matchdayId: string;
  fixtureId: string;
};

type DraftState = Record<
  string,
  {
    predictedHome: string;
    predictedAway: string;
  }
>;

type ProdePredictionsProps = {
  copy: {
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
    doubleMark: string;
    doubleRemove: string;
    doubleSaving: string;
    doubleUpdated: string;
    doubleCleared: string;
    doubleSaveErrorFallback: string;
    doubleBadge: string;
    doubleOnePerMatchday: string;
  };
  fixtures: FixtureRow[];
  predictions: ExistingPrediction[];
  initialDoubles: InitialDouble[];
  nowIso: string;
};

type MatchdayGroup = {
  id: string;
  name: string;
  order: number;
  lockAt: string;
  fixtures: FixtureRow[];
  completedCount: number;
  editableCount: number;
  firstKickoff: string;
};

export function ProdePredictions({ copy, fixtures, predictions, initialDoubles, nowIso }: ProdePredictionsProps) {
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

  const [doubleByMatchday, setDoubleByMatchday] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const row of initialDoubles) {
      initial[row.matchdayId] = row.fixtureId;
    }
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const [isSavingDouble, setIsSavingDouble] = useState(false);
  const [savingDoubleFixtureId, setSavingDoubleFixtureId] = useState<string | null>(null);
  const [doubleError, setDoubleError] = useState<string | null>(null);
  const [doubleInfo, setDoubleInfo] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"matchday" | "all">("matchday");
  const [manualSelectedMatchdayId, setManualSelectedMatchdayId] = useState<string | null>(null);
  const router = useRouter();
  const nowTimestamp = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  const editableFixtureIds = useMemo(() => {
    const ids = new Set<string>();
    for (const fixture of fixtures) {
      if (fixture.status !== "scheduled") {
        continue;
      }
      if (new Date(fixture.kickoff_at).getTime() > nowTimestamp) {
        ids.add(fixture.id);
      }
    }
    return ids;
  }, [fixtures, nowTimestamp]);

  const editableFixtures = useMemo(
    () => fixtures.filter((fixture) => editableFixtureIds.has(fixture.id)),
    [fixtures, editableFixtureIds],
  );

  const matchdays = useMemo<MatchdayGroup[]>(() => {
    const groups = new Map<string, MatchdayGroup>();

    for (const fixture of fixtures) {
      const id = fixture.matchday_id;
      const order = fixture.matchday_order ?? 999;

      if (!groups.has(id)) {
        groups.set(id, {
          id,
          name: fixture.matchday_name,
          order,
          lockAt: fixture.matchday_lock_at,
          fixtures: [],
          completedCount: 0,
          editableCount: 0,
          firstKickoff: fixture.kickoff_at,
        });
      }

      const current = groups.get(id)!;
      current.fixtures.push(fixture);

      const draftHome = draft[fixture.id]?.predictedHome?.trim() ?? "";
      const draftAway = draft[fixture.id]?.predictedAway?.trim() ?? "";
      if (draftHome !== "" && draftAway !== "") {
        current.completedCount += 1;
      }

      if (editableFixtureIds.has(fixture.id)) {
        current.editableCount += 1;
      }

      if (new Date(fixture.kickoff_at).getTime() < new Date(current.firstKickoff).getTime()) {
        current.firstKickoff = fixture.kickoff_at;
      }
    }

    for (const group of groups.values()) {
      group.fixtures.sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return new Date(a.firstKickoff).getTime() - new Date(b.firstKickoff).getTime();
    });
  }, [fixtures, draft, editableFixtureIds]);

  const selectedMatchdayId = useMemo(() => {
    if (matchdays.length === 0) {
      return null;
    }

    if (manualSelectedMatchdayId && matchdays.some((matchday) => matchday.id === manualSelectedMatchdayId)) {
      return manualSelectedMatchdayId;
    }

    const withPending = matchdays.find(
      (matchday) => matchday.editableCount > 0 && matchday.completedCount < matchday.editableCount,
    );
    return withPending?.id ?? matchdays[0].id;
  }, [matchdays, manualSelectedMatchdayId]);

  const selectedMatchday = useMemo(
    () => matchdays.find((matchday) => matchday.id === selectedMatchdayId) ?? null,
    [matchdays, selectedMatchdayId],
  );

  const visibleFixtures = useMemo(() => {
    if (viewMode === "all") {
      return fixtures;
    }

    if (!selectedMatchday) {
      return [];
    }

    return selectedMatchday.fixtures;
  }, [viewMode, fixtures, selectedMatchday]);

  const visibleEditableFixtures = useMemo(
    () => visibleFixtures.filter((fixture) => editableFixtureIds.has(fixture.id)),
    [visibleFixtures, editableFixtureIds],
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

  async function saveMatchdayDouble(matchdayId: string, fixtureId: string | null) {
    setDoubleError(null);
    setDoubleInfo(null);
    setIsSavingDouble(true);
    setSavingDoubleFixtureId(fixtureId ?? (doubleByMatchday[matchdayId] ?? null));

    const response = await fetch("/api/prode/double", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchdayId,
        fixtureId,
      }),
    });
    const result = await response.json();

    setIsSavingDouble(false);
    setSavingDoubleFixtureId(null);

    if (!response.ok) {
      setDoubleError(result.error ?? copy.doubleSaveErrorFallback);
      return;
    }

    setDoubleByMatchday((current) => {
      const next = { ...current };
      if (result.fixtureId) {
        next[matchdayId] = result.fixtureId as string;
      } else {
        delete next[matchdayId];
      }
      return next;
    });

    setDoubleInfo(result.fixtureId ? copy.doubleUpdated : copy.doubleCleared);
    router.refresh();
  }

  async function savePredictions(scope: "visible" | "all") {
    setSaveError(null);
    setSaveInfo(null);

    const sourceFixtures = scope === "all" ? editableFixtures : visibleEditableFixtures;

    const payload = sourceFixtures
      .map((fixture) => ({
        fixtureId: fixture.id,
        predictedHome: draft[fixture.id]?.predictedHome ?? "",
        predictedAway: draft[fixture.id]?.predictedAway ?? "",
      }))
      .filter((row) => row.predictedHome !== "" && row.predictedAway !== "");

    if (payload.length === 0) {
      setSaveError(scope === "all" ? copy.noNewAll : copy.noNewMatchday);
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
      setSaveError(result.error ?? copy.saveErrorFallback);
      return;
    }

    setSaveInfo(
      scope === "all"
        ? `${copy.saved} (${payload.length} ${payload.length === 1 ? copy.matchSingle : copy.matchPlural}).`
        : `${copy.savedMatchday} (${payload.length} ${payload.length === 1 ? copy.matchSingle : copy.matchPlural}).`,
    );
    router.refresh();
  }

  if (fixtures.length === 0) {
    return <div className="alert-warning rounded-2xl p-5 text-sm">{copy.noFixtures}</div>;
  }

  return (
    <section className="panel w-full p-4 sm:p-5">
      <h2 className="text-3xl leading-none sm:text-4xl">{copy.title}</h2>
      <p className="section-subtitle mt-2 text-sm">{copy.subtitle}</p>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("matchday")}
            className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              viewMode === "matchday"
                ? "border-[#1d2430] bg-[#1d2430] text-[#ffe289]"
                : "border-[#1d2430] bg-[#fffef8] text-[#47381a]"
            }`}
          >
            {copy.modeByMatchday}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              viewMode === "all"
                ? "border-[#1d2430] bg-[#1d2430] text-[#ffe289]"
                : "border-[#1d2430] bg-[#fffef8] text-[#47381a]"
            }`}
          >
            {copy.modeAll}
          </button>
          <span className="rounded-lg border-2 border-[#1d2430] bg-[#fffef8] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#64563a]">
            {copy.doubleOnePerMatchday}
          </span>
        </div>

        <div className="scroll-hover-x flex gap-1.5 pb-1">
          {matchdays.map((matchday) => {
            const isActive = selectedMatchdayId === matchday.id;
            const pending = Math.max(0, matchday.editableCount - matchday.completedCount);
            const hasDouble = Boolean(doubleByMatchday[matchday.id]);

            return (
              <button
                key={matchday.id}
                type="button"
                onClick={() => {
                  setViewMode("matchday");
                  setManualSelectedMatchdayId(matchday.id);
                }}
                className={`min-w-[170px] rounded-lg border-2 px-2.5 py-2 text-left transition ${
                  isActive
                    ? "border-[#1d2430] bg-[#ffe289]"
                    : "border-[#1d2430] bg-[#fffef8] hover:bg-[#fff0c2]"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-xs font-bold text-[#1f2937]">{matchday.name}</p>
                  {hasDouble ? (
                    <span className="x2-chip px-1.5 py-0.5 text-[10px] font-semibold">
                      ★ {copy.doubleBadge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] text-[#5d6778]">
                  {matchday.completedCount}/{matchday.fixtures.length} {copy.loadedSuffix}
                  {matchday.editableCount > 0 ? ` · ${pending} ${copy.pendingSuffix}` : ` · ${copy.closed}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {doubleError ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{doubleError}</p> : null}
      {doubleInfo ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{doubleInfo}</p> : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64563a]">
          {viewMode === "all" ? copy.fullView : selectedMatchday?.name ?? copy.selectMatchday}
        </p>
        <p className="text-xs text-[#5d6778]">
          {copy.showing} {visibleFixtures.length} {visibleFixtures.length === 1 ? copy.matchSingle : copy.matchPlural}
        </p>
      </div>

      <div className="mt-2 space-y-2.5">
        {visibleFixtures.map((fixture) => {
          const fixtureKickoffTs = new Date(fixture.kickoff_at).getTime();
          const matchdayLockTs = new Date(fixture.matchday_lock_at).getTime();

          const isLocked = fixture.status !== "scheduled" || fixtureKickoffTs <= nowTimestamp;
          const isDoubleFixture = doubleByMatchday[fixture.matchday_id] === fixture.id;
          const canToggleDouble = fixture.status === "scheduled" && fixtureKickoffTs > nowTimestamp && matchdayLockTs > nowTimestamp;

          return (
            <article key={fixture.id} className="panel-soft p-3 sm:p-3.5">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1f2937] sm:text-[15px]">
                    {fixture.home_team_name} vs {fixture.away_team_name}
                  </p>
                  <p className="text-xs text-[#6b7280]">{fixture.kickoff_label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  {isDoubleFixture ? (
                    <span className="x2-chip px-2 py-1 text-[11px] font-semibold">
                      ★ {copy.doubleBadge}
                    </span>
                  ) : null}
                  <span
                    className={`rounded px-2 py-1 text-[11px] font-semibold ${
                      isLocked ? "bg-[#ececec] text-[#6b7280]" : "bg-[#9a6b00] text-white"
                    }`}
                  >
                    {isLocked ? copy.locked : copy.editable}
                  </span>
                  {fixture.status === "finished" ? (
                    <span className="rounded bg-[#fff0c7] px-2 py-1 text-[11px] font-semibold text-[#7a5307]">
                      {copy.finalPrefix}: {fixture.home_score}-{fixture.away_score}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => saveMatchdayDouble(fixture.matchday_id, isDoubleFixture ? null : fixture.id)}
                    disabled={!canToggleDouble || isSavingDouble}
                    aria-label={isDoubleFixture ? copy.doubleRemove : copy.doubleMark}
                    className={`x2-star-btn disabled:cursor-not-allowed disabled:opacity-60 ${
                      isDoubleFixture ? "x2-star-btn-active" : "x2-star-btn-idle"
                    }`}
                  >
                    <span className="x2-star-core">
                      {isSavingDouble && savingDoubleFixtureId === fixture.id ? "..." : "X2"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-2 sm:max-w-[220px]">
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft[fixture.id]?.predictedHome ?? ""}
                  onChange={(event) => updatePrediction(fixture.id, "predictedHome", event.target.value)}
                  disabled={isLocked}
                  className="input-tech w-16 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="-"
                />
                <span className="text-sm text-[#6b7280]">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft[fixture.id]?.predictedAway ?? ""}
                  onChange={(event) => updatePrediction(fixture.id, "predictedAway", event.target.value)}
                  disabled={isLocked}
                  className="input-tech w-16 text-center text-sm disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="-"
                />
              </div>
            </article>
          );
        })}
      </div>

      {saveError ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{saveError}</p> : null}
      {saveInfo ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{saveInfo}</p> : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => savePredictions("visible")}
          disabled={isSaving || visibleEditableFixtures.length === 0}
          className="btn-primary w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? copy.saving : viewMode === "all" ? copy.saveCurrentView : copy.saveThisMatchday}
        </button>
        <button
          type="button"
          onClick={() => savePredictions("all")}
          disabled={isSaving || editableFixtures.length === 0}
          className="btn-ghost w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.saveAll}
        </button>
      </div>
    </section>
  );
}
