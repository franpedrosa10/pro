import { NextResponse } from "next/server";
import { z } from "zod";

import { readUserAdminFlag } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createAdminNotificationSchema = z
  .object({
    kind: z.enum(["general", "matchday_points", "result_update", "admin_broadcast"]).default("admin_broadcast"),
    audience: z.enum(["global", "country", "league", "user"]).default("global"),
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
    leagueId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(3).max(600),
    ctaHref: z.string().trim().min(1).max(300).optional(),
  })
  .superRefine((value, context) => {
    if (value.audience === "country" && !value.countryCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["countryCode"],
        message: "Country code requerido para audiencia por pais.",
      });
    }

    if (value.audience === "league" && !value.leagueId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leagueId"],
        message: "LeagueId requerido para audiencia por liga.",
      });
    }

    if (value.audience === "user" && !value.userId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userId"],
        message: "UserId requerido para audiencia por usuario.",
      });
    }
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
  const parseResult = createAdminNotificationSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de notificacion invalido." }, { status: 400 });
  }

  const data = parseResult.data;
  const ctaHref = data.ctaHref
    ? data.ctaHref.startsWith("/") || data.ctaHref.startsWith("http://") || data.ctaHref.startsWith("https://")
      ? data.ctaHref
      : null
    : null;

  const insertResult = await supabase
    .from("notifications")
    .insert({
      kind: data.kind,
      audience: data.audience,
      audience_country_code: data.audience === "country" ? data.countryCode : null,
      audience_league_id: data.audience === "league" ? data.leagueId : null,
      audience_user_id: data.audience === "user" ? data.userId : null,
      title: data.title,
      body: data.body,
      cta_href: ctaHref,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, notificationId: insertResult.data.id });
}

