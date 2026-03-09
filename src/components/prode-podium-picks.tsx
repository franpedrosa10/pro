"use client";

import { useMemo, useState } from "react";

type TeamOption = {
  id: string;
  name: string;
};

type ProdePodiumPicksProps = {
  copy: {
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
  teams: TeamOption[];
  initialChampionTeamId: string | null;
  initialRunnerUpTeamId: string | null;
  lockAtIso: string;
  lockAtLabel: string;
  nowIso: string;
};

export function ProdePodiumPicks({
  copy,
  teams,
  initialChampionTeamId,
  initialRunnerUpTeamId,
  lockAtIso,
  lockAtLabel,
  nowIso,
}: ProdePodiumPicksProps) {
  const [championTeamId, setChampionTeamId] = useState(initialChampionTeamId ?? "");
  const [runnerUpTeamId, setRunnerUpTeamId] = useState(initialRunnerUpTeamId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isLocked = useMemo(
    () => new Date(lockAtIso).getTime() <= new Date(nowIso).getTime(),
    [lockAtIso, nowIso],
  );

  const currentChampionName = teams.find((team) => team.id === championTeamId)?.name ?? null;
  const currentRunnerUpName = teams.find((team) => team.id === runnerUpTeamId)?.name ?? null;

  async function handleSave() {
    setError(null);
    setInfo(null);

    if (!championTeamId || !runnerUpTeamId) {
      setError(copy.selectPlaceholder);
      return;
    }

    if (championTeamId === runnerUpTeamId) {
      setError(copy.sameTeamError);
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/prode/podium", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championTeamId,
        runnerUpTeamId,
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? copy.saveErrorFallback);
      return;
    }

    setInfo(copy.saved);
  }

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-3xl leading-none sm:text-4xl">{copy.title}</h2>
          <p className="section-subtitle mt-2 text-sm">{copy.subtitle}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${
            isLocked ? "bg-[#ececec] text-[#6b7280]" : "bg-[#1d2430] text-[#ffe289]"
          }`}
        >
          {isLocked ? copy.locked : `${copy.deadlinePrefix}: ${lockAtLabel}`}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.champion}</span>
          <select
            value={championTeamId}
            onChange={(event) => setChampionTeamId(event.target.value)}
            disabled={isLocked || isSaving}
            className="select-tech"
          >
            <option value="">{copy.selectPlaceholder}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.runnerUp}</span>
          <select
            value={runnerUpTeamId}
            onChange={(event) => setRunnerUpTeamId(event.target.value)}
            disabled={isLocked || isSaving}
            className="select-tech"
          >
            <option value="">{copy.selectPlaceholder}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLocked || isSaving}
          className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? copy.saving : copy.save}
        </button>

        {currentChampionName && currentRunnerUpName ? (
          <p className="text-xs text-[#5d6778]">
            {copy.currentPickPrefix}: {currentChampionName} / {currentRunnerUpName}
          </p>
        ) : null}
      </div>

      {error ? <p className="alert-error mt-3 rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success mt-3 rounded-lg p-3 text-sm">{info}</p> : null}
    </section>
  );
}
