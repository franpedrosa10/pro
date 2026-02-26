import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) {
    return "/dashboard";
  }

  if (!nextPath.startsWith("/")) {
    return "/dashboard";
  }

  if (nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

function mapOAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "oauth_provider_disabled";
  }

  if (normalized.includes("redirect") && normalized.includes("not allowed")) {
    return "oauth_redirect_mismatch";
  }

  if (normalized.includes("invalid_client") || normalized.includes("invalid client")) {
    return "oauth_invalid_credentials";
  }

  return "oauth_failed";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=oauth_no_code`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorCode = mapOAuthError(error.message ?? "oauth_failed");
    return NextResponse.redirect(new URL(`/login?error=${errorCode}`, request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
