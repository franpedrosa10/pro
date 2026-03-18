import { NextResponse } from "next/server";
import { z } from "zod";

import { readUserAdminFlag } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const publishMatchdaySchema = z.object({
  matchdayId: z.string().uuid(),
  notify: z.boolean().optional(),
});

export async function POST(request: Request) {
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

  const payload = await request.json().catch(() => null);
  const parseResult = publishMatchdaySchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de fecha invalido." }, { status: 400 });
  }

  const { matchdayId, notify } = parseResult.data;

  const matchdayResult = await supabase
    .from("matchdays")
    .select("id, name, is_finalized")
    .eq("id", matchdayId)
    .maybeSingle();

  if (matchdayResult.error) {
    return NextResponse.json({ error: matchdayResult.error.message }, { status: 400 });
  }
  if (!matchdayResult.data) {
    return NextResponse.json({ error: "Fecha no encontrada." }, { status: 404 });
  }

  const alreadyFinalized = Boolean(matchdayResult.data.is_finalized);
  if (!alreadyFinalized) {
    const updateResult = await supabase
      .from("matchdays")
      .update({ is_finalized: true })
      .eq("id", matchdayId);

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
    }
  }

  if (notify ?? true) {
    const notifyResult = await supabase.from("notifications").insert({
      kind: "matchday_points",
      audience: "global",
      title: "Puntos publicados",
      body: `Ya estan los puntajes de ${matchdayResult.data.name}.`,
      cta_href: "/dashboard/standings",
      created_by: user.id,
    });

    if (notifyResult.error) {
      return NextResponse.json({ error: notifyResult.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyFinalized,
    matchdayName: matchdayResult.data.name,
  });
}

