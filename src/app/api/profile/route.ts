import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(6).max(25),
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
  const parseResult = profileSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Datos de perfil invalidos." }, { status: 400 });
  }

  const firstName = parseResult.data.firstName;
  const lastName = parseResult.data.lastName;
  const phone = parseResult.data.phone.replace(/\s+/g, "");
  const displayName = `${firstName} ${lastName}`.trim();

  const profileResult = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      display_name: displayName,
    })
    .eq("id", user.id);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 400 });
  }

  const userResult = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      phone,
      display_name: displayName,
    },
  });

  if (userResult.error) {
    return NextResponse.json({ error: userResult.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
