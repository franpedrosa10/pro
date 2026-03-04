import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="app-container fade-in space-y-6">
        <header className="panel-strong p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="chip">Mundial 2026</span>
              <h1 className="mt-3 text-5xl leading-none sm:text-7xl">Fantasy + Prode en serio</h1>
              <p className="section-subtitle mt-3 max-w-2xl text-sm sm:text-base">
                Armado tipo Gran DT + Prode por partido, con ligas privadas y ranking global en una sola plataforma.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/login" className="btn-primary px-5 py-3 text-sm">
                Entrar al juego
              </Link>
              <Link href="/dashboard" className="btn-ghost px-5 py-3 text-sm">
                Ir al dashboard
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">Plantel</p>
              <p className="mt-1 text-2xl font-bold">15 jugadores</p>
            </div>
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">Prode</p>
              <p className="mt-1 text-2xl font-bold">64 partidos</p>
            </div>
            <div className="rounded-xl border-2 border-[#1d2430] bg-[#fff7d9] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6a4a00]">Competencia</p>
              <p className="mt-1 text-2xl font-bold">Global + Ligas</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="kpi-card">
            <p className="kpi-label">Modo 1</p>
            <h2 className="mt-3 text-3xl leading-none">Fantasy competitivo</h2>
            <p className="kpi-meta">
              Presupuesto, titulares, banco por posicion, capitan y validaciones de regla en backend + DB.
            </p>
          </article>

          <article className="kpi-card">
            <p className="kpi-label">Modo 2</p>
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
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-4xl leading-none">Estado actual de producto</h2>
          <div className="mt-3 grid gap-2 text-sm text-[#4c5564] sm:grid-cols-2">
            <p>- Auth email + Google OAuth</p>
            <p>- Squad builder visual con filtros</p>
            <p>- Prode editable con lock por kickoff</p>
            <p>- Ligas privadas + tabla por liga</p>
            <p>- Ranking global acumulado y por fecha</p>
            <p>- API + reglas validadas también en SQL</p>
          </div>
        </section>
      </div>
    </main>
  );
}

