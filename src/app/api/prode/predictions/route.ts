import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const predictionsSchema = z.object({
  predictions: z
    .array(
      z.object({
        fixtureId: z.string().uuid(),
        predictedHome: z.number().int().min(0).max(20),
        predictedAway: z.number().int().min(0).max(20),
      }),
    )
    .min(1)
    .max(104),
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
  const parseResult = predictionsSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de predicciones invalido." }, { status: 400 });
  }

  const predictions = parseResult.data.predictions;
  const fixtureIds = [...new Set(predictions.map((prediction) => prediction.fixtureId))];

  const fixturesResult = await supabase
    .from("fixtures")
    .select("id, kickoff_at, status")
    .in("id", fixtureIds);

  if (fixturesResult.error) {
    return NextResponse.json({ error: fixturesResult.error.message }, { status: 400 });
  }

  const fixturesById = new Map(
    (fixturesResult.data ?? []).map((fixture) => [
      fixture.id,
      {
        status: fixture.status as string,
        kickoffAt: fixture.kickoff_at as string,
      },
    ]),
  );

  for (const prediction of predictions) {
    const fixture = fixturesById.get(prediction.fixtureId);
    if (!fixture) {
      return NextResponse.json({ error: "Uno de los partidos no existe." }, { status: 400 });
    }

    const alreadyStarted = new Date(fixture.kickoffAt).getTime() <= Date.now();
    if (fixture.status !== "scheduled" || alreadyStarted) {
      return NextResponse.json(
        { error: "Hay partidos bloqueados. Solo podes editar partidos futuros." },
        { status: 400 },
      );
    }
  }

  const upsertResult = await supabase.from("prode_predictions").upsert(
    predictions.map((prediction) => ({
      user_id: user.id,
      fixture_id: prediction.fixtureId,
      predicted_home_score: prediction.predictedHome,
      predicted_away_score: prediction.predictedAway,
    })),
    { onConflict: "user_id,fixture_id" },
  );

  if (upsertResult.error) {
    return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saved: predictions.length });
}
