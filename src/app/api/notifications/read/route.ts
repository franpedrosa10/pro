import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const markReadSchema = z
  .object({
    all: z.boolean().optional(),
    notificationId: z.string().uuid().optional(),
  })
  .refine((value) => value.all === true || Boolean(value.notificationId), {
    message: "Debe indicar all=true o notificationId.",
    path: ["notificationId"],
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
  const parseResult = markReadSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Formato de notificacion invalido." }, { status: 400 });
  }

  if (parseResult.data.all) {
    const result = await supabase.rpc("mark_all_notifications_read");
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, marked: Number(result.data ?? 0) });
  }

  const notificationId = parseResult.data.notificationId!;
  const result = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

