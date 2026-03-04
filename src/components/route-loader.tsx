type RouteLoaderProps = {
  title?: string;
  subtitle?: string;
  chipLabel?: string;
  nextPlayLabel?: string;
  compact?: boolean;
};

export function RouteLoader({
  title = "Estamos preparando la proxima pantalla",
  subtitle = "Sincronizando datos de tu competencia...",
  chipLabel = "Cargando",
  nextPlayLabel = "Entrando a la proxima jugada...",
  compact = false,
}: RouteLoaderProps) {
  return (
    <section className={`panel route-loader ${compact ? "p-4 sm:p-5" : "p-5 sm:p-7"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{chipLabel}</span>
        <div className="route-loader-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>

      <h2 className={`mt-3 leading-none ${compact ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"}`}>
        {title}
      </h2>
      <p className="section-subtitle mt-2 text-sm">{subtitle}</p>

      <div className="route-loader-field mt-4" aria-hidden>
        <div className="route-loader-lines">
          <span className="route-loader-midline" />
          <span className="route-loader-circle" />
        </div>
        <div className="route-loader-track">
          <span className="route-loader-ball" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d5a2a]">
        {nextPlayLabel}
      </p>
    </section>
  );
}
