import { RouteLoader } from "@/components/route-loader";

export default function RootLoading() {
  return (
    <main className="page-shell">
      <div className="app-container fade-in">
        <RouteLoader
          title="Cargando la plataforma"
          subtitle="Estamos armando todo para que sigas compitiendo."
        />
      </div>
    </main>
  );
}
