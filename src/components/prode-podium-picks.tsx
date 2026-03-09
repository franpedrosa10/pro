"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    searchPlaceholder: string;
    noResults: string;
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

type SearchableTeamSelectProps = {
  value: string;
  onChange: (teamId: string) => void;
  options: TeamOption[];
  placeholder: string;
  searchPlaceholder: string;
  noResults: string;
  disabled: boolean;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function SearchableTeamSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  noResults,
  disabled,
}: SearchableTeamSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const open = isOpen && !disabled;

  const selected = useMemo(
    () => options.find((team) => team.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const normalized = normalizeText(query.trim());
    if (!normalized) {
      return options;
    }

    return options.filter((team) => normalizeText(team.name).includes(normalized));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (event.key === "Enter" && filtered.length > 0) {
        event.preventDefault();
        onChange(filtered[0].id);
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, onChange]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className="select-tech flex items-center justify-between gap-2 text-left"
      >
        <span className={selected ? "text-[#171b22]" : "text-[#6a6554]"}>{selected?.name ?? placeholder}</span>
        <span
          className={`text-xs font-bold text-[#5d6778] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          v
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border-2 border-[#1d2430] bg-[#fffef8] p-2 shadow-[4px_4px_0_#1d2430]">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="input-tech pr-8 text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5d6778] hover:text-[#1d2430]"
              >
                x
              </button>
            ) : null}
          </div>
          <div className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1 text-xs text-[#6b7280]">{noResults}</p>
            ) : (
              filtered.map((team) => {
                const isSelected = value === team.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onChange(team.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full rounded-lg border-2 px-2 py-1.5 text-left text-sm transition ${
                      isSelected
                        ? "border-[#1d2430] bg-[#ffe289] text-[#1f2937]"
                        : "border-[#1d2430] bg-[#fffef8] text-[#1f2937] hover:bg-[#fff0c2]"
                    }`}
                  >
                    {team.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
          <SearchableTeamSelect
            value={championTeamId}
            onChange={setChampionTeamId}
            options={teams}
            placeholder={copy.selectPlaceholder}
            searchPlaceholder={copy.searchPlaceholder}
            noResults={copy.noResults}
            disabled={isLocked || isSaving}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="label-tech block">{copy.runnerUp}</span>
          <SearchableTeamSelect
            value={runnerUpTeamId}
            onChange={setRunnerUpTeamId}
            options={teams}
            placeholder={copy.selectPlaceholder}
            searchPlaceholder={copy.searchPlaceholder}
            noResults={copy.noResults}
            disabled={isLocked || isSaving}
          />
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

