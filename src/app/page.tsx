import Link from "next/link";

import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

const COPY: Record<
  AppLocale,
  {
    chip: string;
    title: string;
    subtitle: string;
    enter: string;
    goDashboard: string;
    cardMatches: string;
    cardMatchesValue: string;
    cardProde: string;
    cardProdeValue: string;
    cardCompetition: string;
    cardCompetitionValue: string;
  }
> = {
  es: {
    chip: "Mundial 2026",
    title: "Prode del Mundial en serio",
    subtitle: "Prediccion por partido, ligas privadas por invitacion y ranking global en una sola plataforma.",
    enter: "Entrar al juego",
    goDashboard: "Ir al dashboard",
    cardMatches: "Partidos",
    cardMatchesValue: "64 pronosticos",
    cardProde: "Prode",
    cardProdeValue: "Fecha a fecha",
    cardCompetition: "Competencia",
    cardCompetitionValue: "Global + Pais + Ligas",
  },
  en: {
    chip: "World Cup 2026",
    title: "World Cup predictor",
    subtitle: "Per-match predictions, private leagues and global ranking in one platform.",
    enter: "Enter game",
    goDashboard: "Go to dashboard",
    cardMatches: "Matches",
    cardMatchesValue: "64 predictions",
    cardProde: "Predictions",
    cardProdeValue: "Matchday by matchday",
    cardCompetition: "Competition",
    cardCompetitionValue: "Global + Country + Leagues",
  },
  pt: {
    chip: "Copa 2026",
    title: "Bolao da Copa de verdade",
    subtitle: "Palpite por partida, ligas privadas e ranking global em uma plataforma.",
    enter: "Entrar no jogo",
    goDashboard: "Ir ao painel",
    cardMatches: "Partidas",
    cardMatchesValue: "64 palpites",
    cardProde: "Bolao",
    cardProdeValue: "Rodada a rodada",
    cardCompetition: "Competicao",
    cardCompetitionValue: "Global + Pais + Ligas",
  },
};

export default async function Home() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  return (
    <main className="page-shell">
      <div className="app-container fade-in space-y-6">
        <header className="panel-strong p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="chip">{copy.chip}</span>
              <h1 className="mt-3 text-5xl leading-none sm:text-7xl">{copy.title}</h1>
              <p className="section-subtitle mt-3 max-w-2xl text-sm sm:text-base">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/login" className="btn-primary px-5 py-3 text-sm">
                {copy.enter}
              </Link>
              <Link href="/dashboard" className="btn-ghost px-5 py-3 text-sm">
                {copy.goDashboard}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">{copy.cardMatches}</p>
              <p className="mt-1 text-2xl font-bold">{copy.cardMatchesValue}</p>
            </div>
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">{copy.cardProde}</p>
              <p className="mt-1 text-2xl font-bold">{copy.cardProdeValue}</p>
            </div>
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">{copy.cardCompetition}</p>
              <p className="mt-1 text-2xl font-bold">{copy.cardCompetitionValue}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="kpi-card">
            <p className="kpi-label">Core</p>
            <h2 className="mt-3 text-3xl leading-none">Prode por fecha</h2>
            <p className="kpi-meta">
              Carga de resultados antes del kickoff con bloqueo automatico cuando arranca cada partido.
            </p>
          </article>

          <article className="kpi-card">
            <p className="kpi-label">Social</p>
            <h2 className="mt-3 text-3xl leading-none">Ligas privadas</h2>
            <p className="kpi-meta">
              Crear, unirse por codigo y compartir invitaciones directas por link con tus grupos.
            </p>
          </article>

          <article className="kpi-card">
            <p className="kpi-label">Diferencial</p>
            <h2 className="mt-3 text-3xl leading-none">Liga por pais</h2>
            <p className="kpi-meta">
              Registro con pais obligatorio para competir tambien en ranking nacional.
            </p>
          </article>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-4xl leading-none">Estado actual de producto</h2>
          <div className="mt-3 grid gap-2 text-sm text-[#4c5564] sm:grid-cols-2">
            <p>- Auth email + Google OAuth</p>
            <p>- Registro completo con pais</p>
            <p>- Prode editable con lock por kickoff</p>
            <p>- Ligas privadas + tabla por liga</p>
            <p>- Ranking global, por fecha y por pais</p>
            <p>- API + reglas validadas tambien en SQL</p>
          </div>
        </section>
      </div>
    </main>
  );
}
