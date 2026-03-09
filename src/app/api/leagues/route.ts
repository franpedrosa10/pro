import { NextResponse } from "next/server";
import { z } from "zod";

import { generateJoinCode } from "@/lib/domain/join-code";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createLeagueSchema = z.object({
  name: z.string().trim().min(3).max(40),
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
  const parseResult = createLeagueSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Nombre de liga inválido." }, { status: 400 });
  }

  const { name } = parseResult.data;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const joinCode = generateJoinCode();

    const createdLeague = await supabase
      .from("leagues")
      .insert({
        owner_id: user.id,
        name,
        join_code: joinCode,
      })
      .select("id, name, join_code")
      .single();

    if (createdLeague.error) {
      const message = createdLeague.error.message.toLowerCase();
      const duplicateCode = message.includes("duplicate") && message.includes("join_code");
      if (duplicateCode) {
        continue;
      }

      return NextResponse.json({ error: createdLeague.error.message }, { status: 400 });
    }

    const membership = await supabase.from("league_members").insert({
      league_id: createdLeague.data.id,
      user_id: user.id,
    });

    if (membership.error) {
      return NextResponse.json({ error: membership.error.message }, { status: 400 });
    }

    return NextResponse.json({ league: createdLeague.data });
  }

  return NextResponse.json(
    { error: "No se pudo generar un código único. Reintentá." },
    { status: 500 },
  );
}
