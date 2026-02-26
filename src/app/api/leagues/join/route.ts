import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const joinLeagueSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parseResult = joinLeagueSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Codigo invalido." }, { status: 400 });
  }

  const { joinCode } = parseResult.data;

  const leagueResult = await supabase
    .from("leagues")
    .select("id, name")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (leagueResult.error) {
    return NextResponse.json({ error: leagueResult.error.message }, { status: 400 });
  }

  if (!leagueResult.data) {
    return NextResponse.json({ error: "Liga no encontrada." }, { status: 404 });
  }

  const joinResult = await supabase.from("league_members").insert({
    league_id: leagueResult.data.id,
    user_id: user.id,
  });

  if (joinResult.error) {
    const message = joinResult.error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("already")) {
      return NextResponse.json({ league: leagueResult.data, alreadyJoined: true });
    }

    return NextResponse.json({ error: joinResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ league: leagueResult.data });
}
