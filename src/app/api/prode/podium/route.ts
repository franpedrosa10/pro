import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const podiumSchema = z
  .object({
    championTeamId: z.string().uuid(),
    runnerUpTeamId: z.string().uuid(),
  })
  .refine((value) => value.championTeamId !== value.runnerUpTeamId, {
    message: "Campeón y subcampeón no pueden ser el mismo equipo.",
    path: ["runnerUpTeamId"],
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
  const parseResult = podiumSchema.safeParse(payload);
  if (!parseResult.success) {
    const firstMessage = parseResult.error.issues[0]?.message ?? "Formato inválido para campeón/subcampeón.";
    return NextResponse.json({ error: firstMessage }, { status: 400 });
  }

  const { championTeamId, runnerUpTeamId } = parseResult.data;

  const groupStageResult = await supabase
    .from("matchdays")
    .select("ends_at")
    .eq("order_index", 3)
    .maybeSingle();

  if (groupStageResult.error) {
    return NextResponse.json({ error: groupStageResult.error.message }, { status: 400 });
  }

  if (!groupStageResult.data) {
    return NextResponse.json({ error: "No se encontró el cierre de fase de grupos." }, { status: 400 });
  }

  if (new Date(groupStageResult.data.ends_at as string).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "La elección de campeón y subcampeón ya está cerrada." },
      { status: 400 },
    );
  }

  const teamsResult = await supabase
    .from("national_teams")
    .select("id, group_letter")
    .in("id", [championTeamId, runnerUpTeamId]);

  if (teamsResult.error) {
    return NextResponse.json({ error: teamsResult.error.message }, { status: 400 });
  }

  if ((teamsResult.data ?? []).length !== 2) {
    return NextResponse.json({ error: "Los equipos seleccionados no existen." }, { status: 400 });
  }

  const hasInvalidTeam = (teamsResult.data ?? []).some((team) => !(team.group_letter as string | null));
  if (hasInvalidTeam) {
    return NextResponse.json(
      { error: "Solo podés elegir selecciones participantes de la fase de grupos." },
      { status: 400 },
    );
  }

  const upsertResult = await supabase.from("prode_podium_picks").upsert(
    {
      user_id: user.id,
      champion_team_id: championTeamId,
      runner_up_team_id: runnerUpTeamId,
    },
    { onConflict: "user_id" },
  );

  if (upsertResult.error) {
    return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
