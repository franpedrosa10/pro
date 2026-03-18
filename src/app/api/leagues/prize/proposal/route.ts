import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const baseProposalSchema = z.object({
  leagueId: z.string().uuid(),
  note: z.string().trim().max(160).nullable().optional(),
});

const saveLeaguePrizeProposalSchema = z.discriminatedUnion("proposalKind", [
  baseProposalSchema.extend({
    proposalKind: z.literal("money"),
    amountPerPerson: z.number().positive().max(100000000),
    currencyCode: z.enum(["ARS", "USD"]),
    materialDescription: z.null().optional(),
  }),
  baseProposalSchema.extend({
    proposalKind: z.literal("material"),
    materialDescription: z.string().trim().min(3).max(160),
    amountPerPerson: z.null().optional(),
    currencyCode: z.null().optional(),
  }),
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parseResult = saveLeaguePrizeProposalSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de propuesta invalido." }, { status: 400 });
  }

  const { leagueId, note } = parseResult.data;

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
      { error: "Las ligas oficiales por pais no admiten propuesta de premio." },
      { status: 400 },
    );
  }

  const firstRoundOpenResult = await supabase.rpc("is_first_round_open");
  if (firstRoundOpenResult.error) {
    return NextResponse.json({ error: firstRoundOpenResult.error.message }, { status: 400 });
  }

  if (!firstRoundOpenResult.data) {
    return NextResponse.json(
      { error: "El plazo para proponer premio ya esta cerrado." },
      { status: 400 },
    );
  }

  const upsertResult = await supabase
    .from("league_prize_proposals")
    .upsert(
      {
        league_id: leagueId,
        proposer_user_id: user.id,
        proposal_kind: parseResult.data.proposalKind,
        amount_per_person:
          parseResult.data.proposalKind === "money"
            ? Number(parseResult.data.amountPerPerson.toFixed(2))
            : null,
        currency_code:
          parseResult.data.proposalKind === "money"
            ? parseResult.data.currencyCode
            : null,
        material_description:
          parseResult.data.proposalKind === "material"
            ? parseResult.data.materialDescription
            : null,
        note: note ?? null,
      },
      { onConflict: "league_id,proposer_user_id" },
    )
    .select("id")
    .single();

  if (upsertResult.error) {
    return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    proposalId: upsertResult.data.id,
  });
}
