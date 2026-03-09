import { NextResponse } from "next/server";
import { z } from "zod";

import {
  type FormationCode,
  type SquadSlot,
  validateSquadSelection,
} from "@/lib/domain/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const squadSchema = z.object({
  formationCode: z.enum(["3-4-3", "3-5-2", "4-3-3", "4-4-2"]).default("4-4-2"),
  players: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        slot: z.enum(["starter", "bench"]),
        isCaptain: z.boolean(),
      }),
    )
    .max(15),
});

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parseResult = squadSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de plantel inválido." }, { status: 400 });
  }

  const { formationCode, players: selections } = parseResult.data;

  let teamResult = await supabase
    .from("fantasy_teams")
    .select("id, budget")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!teamResult.data) {
    const created = await supabase
      .from("fantasy_teams")
      .insert({ user_id: user.id, name: "Mi Equipo", budget: 100 })
      .select("id, budget")
      .single();
    teamResult = created;
  }

  if (teamResult.error || !teamResult.data) {
    return NextResponse.json(
      { error: teamResult.error?.message ?? "No se pudo crear/obtener el equipo." },
      { status: 400 },
    );
  }

  const team = teamResult.data;

  const playerIds = [...new Set(selections.map((item) => item.playerId))];
  const playersResult =
    playerIds.length > 0
      ? await supabase
          .from("players")
          .select("id, price, national_team_id, position")
          .in("id", playerIds)
      : {
          data: [] as Array<{
            id: string;
            price: number;
            national_team_id: string;
            position: "GK" | "DEF" | "MID" | "FWD";
          }>,
          error: null,
        };

  if (playersResult.error) {
    return NextResponse.json({ error: playersResult.error.message }, { status: 400 });
  }

  const playersById = new Map(
    (playersResult.data ?? []).map((player) => [
      player.id,
      {
        id: player.id,
        price: Number(player.price),
        nationalTeamId: player.national_team_id,
        position: player.position as "GK" | "DEF" | "MID" | "FWD",
      },
    ]),
  );

  const validation = validateSquadSelection(
    selections.map((selection) => ({
      playerId: selection.playerId,
      slot: selection.slot as SquadSlot,
      isCaptain: selection.isCaptain,
    })),
    playersById,
    Number(team.budget),
    {
      formationCode: formationCode as FormationCode,
      requireFullLineup: false,
    },
  );

  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }

  const replaceResult = await supabase.rpc("replace_fantasy_team_players", {
    p_team_id: team.id,
    p_players: selections.map((selection) => ({
      player_id: selection.playerId,
      slot: selection.slot,
      is_captain: selection.isCaptain,
    })),
  });

  if (replaceResult.error) {
    return NextResponse.json({ error: replaceResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    budgetUsed: validation.budgetUsed,
    squadSize: validation.squadSize,
  });
}
