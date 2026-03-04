import { RouteLoader } from "@/components/route-loader";
import { getUiDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function RootLoading() {
  const locale = await getRequestLocale();
  const copy = getUiDictionary(locale);

  return (
    <main className="page-shell">
      <div className="app-container fade-in">
        <RouteLoader
          chipLabel={copy.loading.chip}
          title={copy.loading.rootTitle}
          subtitle={copy.loading.rootSubtitle}
          nextPlayLabel={copy.loading.nextPlay}
        />
      </div>
    </main>
  );
}
