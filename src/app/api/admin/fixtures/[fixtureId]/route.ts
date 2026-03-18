import { NextResponse } from "next/server";
import { z } from "zod";

import { readUserAdminFlag } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateFixtureSchema = z
  .object({
    homeScore: z.number().int().min(0).max(30).nullable(),
    awayScore: z.number().int().min(0).max(30).nullable(),
    status: z.enum(["scheduled", "in_progress", "finished"]),
    notify: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "finished" && (value.homeScore === null || value.awayScore === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para estado finalizado tenes que cargar ambos goles.",
        path: ["status"],
      });
    }
  });

type FixtureRouteContext = {
  params: Promise<{
    fixtureId: string;
  }>;
};

export async function PUT(request: Request, { params }: FixtureRouteContext) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const adminCheck = await readUserAdminFlag(supabase, user.id);
  if (adminCheck.errorMessage) {
    return NextResponse.json({ error: adminCheck.errorMessage }, { status: 400 });
  }
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { fixtureId } = await params;

  const payload = await request.json().catch(() => null);
  const parseResult = updateFixtureSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de resultado invalido." }, { status: 400 });
  }

  const fixtureResult = await supabase
    .from("fixtures")
    .select("id, home_team:national_teams!fixtures_home_team_id_fkey(name), away_team:national_teams!fixtures_away_team_id_fkey(name)")
    .eq("id", fixtureId)
    .maybeSingle();

  if (fixtureResult.error) {
    return NextResponse.json({ error: fixtureResult.error.message }, { status: 400 });
  }

  if (!fixtureResult.data) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  const { homeScore, awayScore, status, notify } = parseResult.data;

  const updateResult = await supabase
    .from("fixtures")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
    })
    .eq("id", fixtureId)
    .select("id")
    .single();

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
  }

  if (notify) {
    const homeName = ((fixtureResult.data.home_team as { name?: string } | null)?.name as string | undefined) ?? "Local";
    const awayName = ((fixtureResult.data.away_team as { name?: string } | null)?.name as string | undefined) ?? "Visitante";
    const scoreText = homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : "actualizado";

    const notifResult = await supabase.from("notifications").insert({
      kind: "result_update",
      audience: "global",
      title: "Resultado actualizado",
      body: `${homeName} vs ${awayName}: ${scoreText}`,
      cta_href: "/dashboard/prode",
      created_by: user.id,
    });

    if (notifResult.error) {
      return NextResponse.json({ error: notifResult.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

