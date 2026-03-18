"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MatchdayItem = {
  id: string;
  name: string;
  isFinalized: boolean;
};

type FixtureItem = {
  id: string;
  matchdayId: string;
  matchdayName: string;
  kickoffLabel: string;
  homeTeam: string;
  awayTeam: string;
  status: "scheduled" | "in_progress" | "finished";
  homeScore: number | null;
  awayScore: number | null;
};

type LeagueOption = {
  id: string;
  name: string;
  isCountryLeague: boolean;
};

type AdminControlPanelProps = {
  matchdays: MatchdayItem[];
  fixtures: FixtureItem[];
  leagues: LeagueOption[];
};

type FixtureDraft = {
  homeScore: string;
  awayScore: string;
  status: "scheduled" | "in_progress" | "finished";
  notify: boolean;
};

export function AdminControlPanel({ matchdays, fixtures, leagues }: AdminControlPanelProps) {
  const router = useRouter();

  const [activeMatchdayId, setActiveMatchdayId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [fixtureDraftById, setFixtureDraftById] = useState<Record<string, FixtureDraft>>(() => {
    const initial: Record<string, FixtureDraft> = {};
    for (const fixture of fixtures) {
      initial[fixture.id] = {
        homeScore: fixture.homeScore === null ? "" : String(fixture.homeScore),
        awayScore: fixture.awayScore === null ? "" : String(fixture.awayScore),
        status: fixture.status,
        notify: true,
      };
    }
    return initial;
  });
  const [savingFixtureId, setSavingFixtureId] = useState<string | null>(null);

  const [publishingMatchdayId, setPublishingMatchdayId] = useState<string | null>(null);

  const [audience, setAudience] = useState<"global" | "country" | "league">("global");
  const [countryCode, setCountryCode] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationHref, setNotificationHref] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const visibleFixtures = useMemo(() => {
    const query = search.trim().toLowerCase();
    return fixtures.filter((fixture) => {
      if (activeMatchdayId !== "all" && fixture.matchdayId !== activeMatchdayId) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${fixture.homeTeam} ${fixture.awayTeam} ${fixture.matchdayName}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeMatchdayId, fixtures, search]);

  function updateFixtureDraft(fixtureId: string, next: Partial<FixtureDraft>) {
    setFixtureDraftById((current) => ({
      ...current,
      [fixtureId]: {
        ...current[fixtureId],
        ...next,
      },
    }));
  }

  async function saveFixture(fixtureId: string) {
    setError(null);
    setInfo(null);

    const draft = fixtureDraftById[fixtureId];
    if (!draft) {
      return;
    }

    const homeScore = draft.homeScore.trim() === "" ? null : Number(draft.homeScore);
    const awayScore = draft.awayScore.trim() === "" ? null : Number(draft.awayScore);

    if ((homeScore !== null && (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > 30))
      || (awayScore !== null && (!Number.isInteger(awayScore) || awayScore < 0 || awayScore > 30))) {
      setError("Los goles deben ser enteros entre 0 y 30.");
      return;
    }

    setSavingFixtureId(fixtureId);
    const response = await fetch(`/api/admin/fixtures/${fixtureId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore,
        awayScore,
        status: draft.status,
        notify: draft.notify,
      }),
    });
    const payload = await response.json();
    setSavingFixtureId(null);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar el resultado.");
      return;
    }

    setInfo("Resultado guardado.");
    router.refresh();
  }

  async function publishMatchdayPoints(matchdayId: string) {
    setError(null);
    setInfo(null);
    setPublishingMatchdayId(matchdayId);

    const response = await fetch("/api/admin/matchdays/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchdayId,
        notify: true,
      }),
    });
    const payload = await response.json();
    setPublishingMatchdayId(null);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo publicar la fecha.");
      return;
    }

    setInfo(
      payload.alreadyFinalized
        ? `La fecha ${payload.matchdayName} ya estaba publicada.`
        : `Puntos publicados para ${payload.matchdayName}.`,
    );
    router.refresh();
  }

  async function sendNotification() {
    setError(null);
    setInfo(null);

    if (notificationTitle.trim().length < 3 || notificationBody.trim().length < 3) {
      setError("Completa titulo y mensaje.");
      return;
    }

    if (audience === "country" && countryCode.trim().length !== 2) {
      setError("Para pais, ingresa codigo ISO2 (ej: AR).");
      return;
    }

    if (audience === "league" && !leagueId) {
      setError("Selecciona una liga para audiencia por liga.");
      return;
    }

    setIsSendingNotification(true);
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "admin_broadcast",
        audience,
        countryCode: audience === "country" ? countryCode.trim().toUpperCase() : undefined,
        leagueId: audience === "league" ? leagueId : undefined,
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        ctaHref: notificationHref.trim() ? notificationHref.trim() : undefined,
      }),
    });
    const payload = await response.json();
    setIsSendingNotification(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo enviar la notificacion.");
      return;
    }

    setNotificationTitle("");
    setNotificationBody("");
    setNotificationHref("");
    setInfo("Notificacion enviada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <p className="alert-error rounded-lg p-3 text-sm">{error}</p> : null}
      {info ? <p className="alert-success rounded-lg p-3 text-sm">{info}</p> : null}

      <section className="panel p-4">
        <h2 className="text-3xl leading-none">Notificacion global</h2>
        <p className="section-subtitle mt-2 text-sm">
          Envia avisos para todo el juego o por segmento.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-sm sm:col-span-1">
            <span className="label-tech block">Audiencia</span>
            <select
              className="select-tech"
              value={audience}
              onChange={(event) => setAudience(event.target.value as "global" | "country" | "league")}
            >
              <option value="global">Global</option>
              <option value="country">Pais</option>
              <option value="league">Liga</option>
            </select>
          </label>

          {audience === "country" ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="label-tech block">Codigo pais</span>
              <input
                className="input-tech uppercase"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                maxLength={2}
                placeholder="AR"
              />
            </label>
          ) : null}

          {audience === "league" ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="label-tech block">Liga</span>
              <select className="select-tech" value={leagueId} onChange={(event) => setLeagueId(event.target.value)}>
                <option value="">Selecciona una liga</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="mt-2 space-y-2">
          <label className="space-y-1 text-sm">
            <span className="label-tech block">Titulo</span>
            <input
              className="input-tech"
              value={notificationTitle}
              onChange={(event) => setNotificationTitle(event.target.value)}
              maxLength={120}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="label-tech block">Mensaje</span>
            <textarea
              className="input-tech min-h-[92px]"
              value={notificationBody}
              onChange={(event) => setNotificationBody(event.target.value)}
              maxLength={600}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="label-tech block">Link opcional</span>
            <input
              className="input-tech"
              value={notificationHref}
              onChange={(event) => setNotificationHref(event.target.value)}
              placeholder="/dashboard/standings"
            />
          </label>
          <button
            type="button"
            onClick={sendNotification}
            disabled={isSendingNotification}
            className="btn-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingNotification ? "Enviando..." : "Enviar notificacion"}
          </button>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-3xl leading-none">Publicar puntos por fecha</h2>
        <p className="section-subtitle mt-2 text-sm">
          Marca la fecha como finalizada y dispara notificacion de puntajes.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {matchdays.map((matchday) => (
            <div key={matchday.id} className="panel-soft flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold text-[#1f2937]">{matchday.name}</p>
                <p className="text-xs text-[#6b7280]">
                  Estado: {matchday.isFinalized ? "publicada" : "pendiente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => publishMatchdayPoints(matchday.id)}
                disabled={publishingMatchdayId === matchday.id}
                className="btn-ghost px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishingMatchdayId === matchday.id ? "Publicando..." : "Publicar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-3xl leading-none">Carga de resultados</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
          <select
            className="select-tech"
            value={activeMatchdayId}
            onChange={(event) => setActiveMatchdayId(event.target.value)}
          >
            <option value="all">Todas las fechas</option>
            {matchdays.map((matchday) => (
              <option key={matchday.id} value={matchday.id}>
                {matchday.name}
              </option>
            ))}
          </select>
          <input
            className="input-tech"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar partido..."
          />
        </div>

        <div className="mt-3 space-y-2">
          {visibleFixtures.map((fixture) => {
            const draft = fixtureDraftById[fixture.id] ?? {
              homeScore: "",
              awayScore: "",
              status: "scheduled" as const,
              notify: true,
            };

            return (
              <article key={fixture.id} className="panel-soft p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1f2937]">
                      {fixture.homeTeam} vs {fixture.awayTeam}
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      {fixture.matchdayName} | {fixture.kickoffLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      className="input-tech w-16 text-center text-sm"
                      value={draft.homeScore}
                      onChange={(event) => updateFixtureDraft(fixture.id, { homeScore: event.target.value })}
                      inputMode="numeric"
                    />
                    <span className="text-sm text-[#6b7280]">-</span>
                    <input
                      className="input-tech w-16 text-center text-sm"
                      value={draft.awayScore}
                      onChange={(event) => updateFixtureDraft(fixture.id, { awayScore: event.target.value })}
                      inputMode="numeric"
                    />
                    <select
                      className="select-tech w-[132px] text-sm"
                      value={draft.status}
                      onChange={(event) =>
                        updateFixtureDraft(fixture.id, { status: event.target.value as FixtureDraft["status"] })}
                    >
                      <option value="scheduled">Programado</option>
                      <option value="in_progress">En juego</option>
                      <option value="finished">Finalizado</option>
                    </select>
                    <label className="inline-flex items-center gap-1 text-xs text-[#4c5564]">
                      <input
                        type="checkbox"
                        checked={draft.notify}
                        onChange={(event) => updateFixtureDraft(fixture.id, { notify: event.target.checked })}
                      />
                      Notificar
                    </label>
                    <button
                      type="button"
                      onClick={() => saveFixture(fixture.id)}
                      disabled={savingFixtureId === fixture.id}
                      className="btn-primary px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingFixtureId === fixture.id ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

