import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const saveDoubleSchema = z.object({
  matchdayId: z.string().uuid(),
  fixtureId: z.string().uuid().nullable(),
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
  const parseResult = saveDoubleSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de x2 inválido." }, { status: 400 });
  }

  const { matchdayId, fixtureId } = parseResult.data;

  const matchdayResult = await supabase
    .from("matchdays")
    .select("id, lock_at")
    .eq("id", matchdayId)
    .maybeSingle();

  if (matchdayResult.error) {
    return NextResponse.json({ error: matchdayResult.error.message }, { status: 400 });
  }

  if (!matchdayResult.data) {
    return NextResponse.json({ error: "Fecha no encontrada." }, { status: 404 });
  }

  if (new Date(matchdayResult.data.lock_at as string).getTime() <= Date.now()) {
    return NextResponse.json({ error: "El x2 de esta fecha ya está bloqueado." }, { status: 400 });
  }

  if (!fixtureId) {
    const deleteResult = await supabase
      .from("prode_matchday_multipliers")
      .delete()
      .eq("user_id", user.id)
      .eq("matchday_id", matchdayId);

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, matchdayId, fixtureId: null });
  }

  const fixtureResult = await supabase
    .from("fixtures")
    .select("id, matchday_id, kickoff_at, status")
    .eq("id", fixtureId)
    .maybeSingle();

  if (fixtureResult.error) {
    return NextResponse.json({ error: fixtureResult.error.message }, { status: 400 });
  }

  if (!fixtureResult.data) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  if ((fixtureResult.data.matchday_id as string) !== matchdayId) {
    return NextResponse.json({ error: "El partido no corresponde a esta fecha." }, { status: 400 });
  }

  if (
    (fixtureResult.data.status as string) !== "scheduled" ||
    new Date(fixtureResult.data.kickoff_at as string).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "El partido seleccionado para x2 ya está bloqueado." }, { status: 400 });
  }

  const upsertResult = await supabase.from("prode_matchday_multipliers").upsert(
    {
      user_id: user.id,
      matchday_id: matchdayId,
      fixture_id: fixtureId,
    },
    { onConflict: "user_id,matchday_id" },
  );

  if (upsertResult.error) {
    return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, matchdayId, fixtureId });
}
