import { RouteLoader } from "@/components/route-loader";

export default function DashboardLoading() {
  return (
    <div className="fade-in">
      <RouteLoader
        compact
        title="Actualizando tu tablero"
        subtitle="Revisamos equipo, prode, ligas y posiciones en tiempo real."
      />
    </div>
  );
}
