import { createClient } from "@/app/lib/supabase/server";
import { getSafeReturnTo } from "@/app/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles Supabase email-confirmation and OAuth code exchange.
 * After successful exchange, redirects to returnTo or /result.
 * returnTo is validated against allowlist prefix "/" to prevent open redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo") ?? undefined;
  const safeRedirect = getSafeReturnTo(returnTo, "/result");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeRedirect, request.url));
    }
  }

  // Code missing or exchange failed — redirect to login with error param
  return NextResponse.redirect(new URL("/auth/login?error=auth_failed", request.url));
}
