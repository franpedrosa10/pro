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

type JoinLeagueRpcRow = {
  league_id: string;
  league_name: string;
  join_code: string;
  already_member: boolean;
};

function mapJoinError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("no autenticado")) {
    return { status: 401, error: "No autenticado." };
  }

  if (normalized.includes("codigo invalido")) {
    return { status: 400, error: "Codigo invalido." };
  }

  if (normalized.includes("liga no encontrada")) {
    return { status: 404, error: "Liga no encontrada." };
  }

  return { status: 400, error: message };
}

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

  const joinResult = await supabase.rpc("join_league_with_code", {
    p_join_code: joinCode,
  });

  if (joinResult.error) {
    const mapped = mapJoinError(joinResult.error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  const row = (joinResult.data?.[0] as JoinLeagueRpcRow | undefined) ?? null;
  if (!row) {
    return NextResponse.json({ error: "No se pudo resolver la liga." }, { status: 400 });
  }

  return NextResponse.json({
    league: {
      id: row.league_id,
      name: row.league_name,
      join_code: row.join_code,
    },
    alreadyJoined: row.already_member,
  });
}

