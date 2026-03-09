import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type JoinCountryLeagueRow = {
  league_id: string;
  league_name: string;
  join_code: string;
  country_code: string;
  country_name: string;
  already_member: boolean;
  created_now: boolean;
};

function mapJoinCountryError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("no autenticado")) {
    return { status: 401, error: "No autenticado." };
  }

  if (normalized.includes("completa tu pais") || normalized.includes("completa tu país")) {
    return { status: 400, error: "Completá tu país en Mi cuenta para unirte a la liga oficial." };
  }

  return { status: 400, error: message };
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const joinResult = await supabase.rpc("join_country_league");
  if (joinResult.error) {
    const mapped = mapJoinCountryError(joinResult.error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }

  const row = (joinResult.data?.[0] as JoinCountryLeagueRow | undefined) ?? null;
  if (!row) {
    return NextResponse.json({ error: "No se pudo resolver la liga oficial de tu país." }, { status: 400 });
  }

  return NextResponse.json({
    league: {
      id: row.league_id,
      name: row.league_name,
      join_code: row.join_code,
      country_code: row.country_code,
      country_name: row.country_name,
      is_country_league: true,
    },
    alreadyJoined: row.already_member,
    created: row.created_now,
  });
}
