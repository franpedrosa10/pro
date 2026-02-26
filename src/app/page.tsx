import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="app-container fade-in space-y-6">
        <header className="panel-strong p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="chip">Mundial 2026</span>
              <h1 className="mt-3 text-5xl leading-none sm:text-7xl">Fantasy + Prode</h1>
              <p className="section-subtitle mt-3 max-w-2xl text-sm sm:text-base">
                Competencia doble en un solo lugar: armador estilo Gran DT, prode por partido,
                ligas privadas y ranking global combinado.
              </p>
            </div>

            <Link href="/login" className="btn-primary px-5 py-3 text-sm">
              Entrar al juego
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="kpi-card">
            <p className="kpi-label">Fantasy</p>
            <h2 className="mt-3 text-3xl leading-none">Plantel con presupuesto</h2>
            <p className="kpi-meta">
              Elegis titulares y suplentes por posicion, formaciones validas y capitan.
            </p>
          </article>

          <article className="kpi-card">
            <p className="kpi-label">Prode</p>
            <h2 className="mt-3 text-3xl leading-none">Marcadores por fecha</h2>
            <p className="kpi-meta">
              Cargas pronosticos hasta el kick-off y sumas puntos en paralelo al fantasy.
            </p>
          </article>

          <article className="kpi-card">
            <p className="kpi-label">Ligas</p>
            <h2 className="mt-3 text-3xl leading-none">Privadas y global</h2>
            <p className="kpi-meta">
              Codigo de invitacion para tus grupos y tabla general para toda la comunidad.
            </p>
          </article>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-4xl leading-none">Estado del MVP</h2>
          <div className="mt-3 grid gap-2 text-sm text-[#6b7280] sm:grid-cols-2">
            <p>- Auth email + Google con Supabase</p>
            <p>- Constructor de equipos con cancha visual</p>
            <p>- Prode editable por partido y bloqueo por hora</p>
            <p>- Ligas privadas y tablas de posiciones</p>
            <p>- Ranking global acumulado y por fecha</p>
            <p>- Backend/API y reglas de negocio validadas</p>
          </div>
        </section>
      </div>
    </main>
  );
}

