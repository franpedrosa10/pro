import { RouteLoader } from "@/components/route-loader";
import { getUiDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function DashboardLoading() {
  const locale = await getRequestLocale();
  const copy = getUiDictionary(locale);

  return (
    <div className="fade-in">
      <RouteLoader
        compact
        chipLabel={copy.loading.chip}
        title={copy.loading.dashboardTitle}
        subtitle={copy.loading.dashboardSubtitle}
        nextPlayLabel={copy.loading.nextPlay}
      />
    </div>
  );
}
