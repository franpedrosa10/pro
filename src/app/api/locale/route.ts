import { NextResponse } from "next/server";

import { LOCALE_COOKIE_NAME, normalizeAppLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  let requestedLocale: string | null = null;

  try {
    const payload = (await request.json()) as { locale?: unknown };
    requestedLocale = typeof payload.locale === "string" ? payload.locale : null;
  } catch {
    requestedLocale = null;
  }

  const locale = normalizeAppLocale(requestedLocale);

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
