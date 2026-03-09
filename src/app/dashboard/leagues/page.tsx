import { LeagueManager } from "@/components/league-manager";
import { requireUser } from "@/lib/auth";
import type { AppLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type LeagueForUi = {
  id: string;
  name: string;
  join_code: string;
  is_country_league: boolean;
  country_code: string | null;
};

const COPY: Record<
  AppLocale,
  {
    chip: string;
    title: string;
    subtitle: string;
    errorPrefix: string;
  }
> = {
  es: {
    chip: "Ligas",
    title: "Tus ligas",
    subtitle: "Creá nuevas ligas, unite por código y revisá tus tablas privadas.",
    errorPrefix: "Error al cargar ligas:",
  },
  en: {
    chip: "Leagues",
    title: "Your leagues",
    subtitle: "Create leagues, join by code and review private standings.",
    errorPrefix: "Error loading leagues:",
  },
  pt: {
    chip: "Ligas",
    title: "Suas ligas",
    subtitle: "Crie ligas, entre por codigo e acompanhe tabelas privadas.",
    errorPrefix: "Erro ao carregar ligas:",
  },
};

export default async function LeaguesPage() {
  const { supabase, user } = await requireUser();
  const locale = await getRequestLocale();
  const copy = COPY[locale];

  let schemaError: string | null = null;
  const profileResult = await supabase
    .from("profiles")
    .select("country_code, country_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    schemaError = profileResult.error.message;
  }

  const profileCountryCode = (profileResult.data?.country_code as string | null | undefined) ?? null;
  const profileCountryName = (profileResult.data?.country_name as string | null | undefined) ?? null;

  const leaguesResult = await supabase
    .from("leagues")
    .select("id, name, join_code, is_country_league, country_code, league_members!inner(user_id)")
    .eq("league_members.user_id", user.id);

  if (leaguesResult.error) {
    schemaError = leaguesResult.error.message;
  }

  const leagues: LeagueForUi[] =
    leaguesResult.data?.map((league) => ({
      id: league.id as string,
      name: league.name as string,
      join_code: league.join_code as string,
      is_country_league: Boolean(league.is_country_league),
      country_code: (league.country_code as string | null) ?? null,
    })) ?? [];

  return (
    <div className="fade-in space-y-4">
      <header className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">{copy.chip}</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">{copy.title}</h1>
        <p className="section-subtitle mt-2">{copy.subtitle}</p>
      </header>

      {schemaError ? <div className="alert-warning rounded-2xl p-4 text-sm">{copy.errorPrefix} {schemaError}</div> : null}

      <LeagueManager
        leagues={leagues}
        locale={locale}
        profileCountry={{
          countryCode: profileCountryCode,
          countryName: profileCountryName,
        }}
      />
    </div>
  );
}
