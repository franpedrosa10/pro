import { LeagueManager } from "@/components/league-manager";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LeagueForUi = {
  id: string;
  name: string;
  join_code: string;
};

export default async function LeaguesPage() {
  const { supabase, user } = await requireUser();

  let schemaError: string | null = null;

  const leaguesResult = await supabase
    .from("leagues")
    .select("id, name, join_code, league_members!inner(user_id)")
    .eq("league_members.user_id", user.id);

  if (leaguesResult.error) {
    schemaError = leaguesResult.error.message;
  }

  const leagues: LeagueForUi[] =
    leaguesResult.data?.map((league) => ({
      id: league.id as string,
      name: league.name as string,
      join_code: league.join_code as string,
    })) ?? [];

  return (
    <div className="fade-in space-y-4">
      <header className="panel-strong p-4 sm:p-5">
        <p className="chip w-fit">Ligas</p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Tus ligas</h1>
        <p className="section-subtitle mt-2">
          Crea nuevas ligas, unite por codigo y revisa tus tablas privadas.
        </p>
      </header>

      {schemaError ? <div className="alert-warning rounded-2xl p-4 text-sm">Error al cargar ligas: {schemaError}</div> : null}

      <LeagueManager leagues={leagues} />
    </div>
  );
}
