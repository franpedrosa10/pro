import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const saveLeaguePrizeVoteSchema = z.object({
  leagueId: z.string().uuid(),
  proposalId: z.string().uuid(),
  vote: z.boolean(),
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
  const parseResult = saveLeaguePrizeVoteSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de voto invalido." }, { status: 400 });
  }

  const { leagueId, proposalId, vote } = parseResult.data;

  const proposalResult = await supabase
    .from("league_prize_proposals")
    .select("id, league_id")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalResult.error) {
    return NextResponse.json({ error: proposalResult.error.message }, { status: 400 });
  }

  if (!proposalResult.data) {
    return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }

  if ((proposalResult.data.league_id as string) !== leagueId) {
    return NextResponse.json({ error: "La propuesta no corresponde a esta liga." }, { status: 400 });
  }

  const leagueResult = await supabase
    .from("leagues")
    .select("id, is_country_league, league_members!inner(user_id)")
    .eq("id", leagueId)
    .eq("league_members.user_id", user.id)
    .maybeSingle();

  if (leagueResult.error) {
    return NextResponse.json({ error: leagueResult.error.message }, { status: 400 });
  }

  if (!leagueResult.data) {
    return NextResponse.json({ error: "Liga no encontrada o sin acceso." }, { status: 404 });
  }

  if (Boolean(leagueResult.data.is_country_league)) {
    return NextResponse.json(
      { error: "Las ligas oficiales por pais no admiten votacion de premio." },
      { status: 400 },
    );
  }

  const firstRoundOpenResult = await supabase.rpc("is_first_round_open");
  if (firstRoundOpenResult.error) {
    return NextResponse.json({ error: firstRoundOpenResult.error.message }, { status: 400 });
  }

  if (!firstRoundOpenResult.data) {
    return NextResponse.json(
      { error: "El plazo para votar propuestas ya esta cerrado." },
      { status: 400 },
    );
  }

  if (vote) {
    const insertResult = await supabase.from("league_prize_votes").upsert(
      {
        proposal_id: proposalId,
        user_id: user.id,
      },
      { onConflict: "proposal_id,user_id" },
    );

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
    }
  } else {
    const deleteResult = await supabase
      .from("league_prize_votes")
      .delete()
      .eq("proposal_id", proposalId)
      .eq("user_id", user.id);

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, vote });
}
