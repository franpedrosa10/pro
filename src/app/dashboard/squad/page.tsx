import Link from "next/link";

import { SquadBuilder } from "@/components/squad-builder";
import {
  inferFormationCodeFromStarterCounts,
  type FormationCode,
  type PlayerPosition,
} from "@/lib/domain/rules";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SquadPage() {
  const { supabase, user } = await requireUser();

  const teamResult = await supabase
    .from("fantasy_teams")
    .select("id, budget")
    .eq("user_id", user.id)
    .maybeSingle();

  let team = teamResult.data;
  if (!team) {
    const createdTeam = await supabase
      .from("fantasy_teams")
      .insert({ user_id: user.id, name: "Mi Equipo", budget: 100 })
      .select("id, budget")
      .single();
    team = createdTeam.data;
  }

  const teamPlayersResult = team
    ? await supabase
        .from("fantasy_team_players")
        .select("player_id, slot, is_captain")
        .eq("team_id", team.id)
    : { data: [] as Array<{ player_id: string; slot: "starter" | "bench"; is_captain: boolean }> };

  const playersResult = await supabase
    .from("players")
    .select("id, full_name, position, price, national_team_id, national_teams(name)")
    .eq("is_active", true)
    .order("price", { ascending: false })
    .limit(300);

  const pointsResult = await supabase
    .from("player_matchday_points")
    .select("player_id, points");

  const pointsByPlayerId = new Map<string, number>();
  for (const row of pointsResult.data ?? []) {
    const playerId = row.player_id as string;
    const nextPoints = (pointsByPlayerId.get(playerId) ?? 0) + Number(row.points ?? 0);
    pointsByPlayerId.set(playerId, nextPoints);
  }

  const players =
    playersResult.data?.map((player) => ({
      id: player.id as string,
      full_name: player.full_name as string,
      position: player.position as "GK" | "DEF" | "MID" | "FWD",
      price: Number(player.price),
      national_team_id: player.national_team_id as string,
      national_team_name:
        ((player.national_teams as { name?: string } | null)?.name as string | undefined) ?? "Seleccion",
      total_points: pointsByPlayerId.get(player.id as string) ?? 0,
    })) ?? [];

  const playersById = new Map(players.map((player) => [player.id, player]));

  const startersByPosition: Record<PlayerPosition, number> = {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };

  for (const selected of teamPlayersResult.data ?? []) {
    if (selected.slot !== "starter") {
      continue;
    }

    const player = playersById.get(selected.player_id);
    if (!player) {
      continue;
    }

    startersByPosition[player.position] += 1;
  }

  const initialFormationCode =
    (inferFormationCodeFromStarterCounts(startersByPosition) ?? "4-4-2") as FormationCode;

  return (
    <div className="fade-in space-y-4">
      <div className="panel-strong p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="chip w-fit">Mi equipo</p>
            <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Armado de plantel</h1>
          </div>
          <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm">
            Resumen
          </Link>
        </div>
      </div>

      <SquadBuilder
        teamBudget={Number(team?.budget ?? 100)}
        players={players}
        initialSelection={teamPlayersResult.data ?? []}
        initialFormationCode={initialFormationCode}
      />
    </div>
  );
}
