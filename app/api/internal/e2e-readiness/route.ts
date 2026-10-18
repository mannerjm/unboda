import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * A public boolean-only readiness gate for read-only cross-account E2E.
 * Never exposes project identifiers, credentials or environment diagnostics.
 * Production and unconfigured previews return 404 (fail closed).
 */
export async function GET() {
  const configReady = process.env.VERCEL_ENV === "preview"
    && process.env.VERCEL_GIT_COMMIT_REF === "test/staging-tenant-e2e"
    && process.env.UNBODA_E2E_STAGING_ENABLED === "true"
    && process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() === "https://xdiitqyysmhicjcytckm.supabase.co"
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    && process.env.TOSS_LIVE_CHECKOUT_ENABLED !== "true"
    && process.env.TOSS_LIVE_PILOT_ENABLED !== "true"
    && process.env.TOSS_ALLOW_LIVE !== "true"
    && process.env.TOSS_ENVIRONMENT !== "production";

  let enabled = false;
  if (configReady) {
    try {
      // Prove the configured server credential actually works against staging.
      // A copied production key or an absent/wrong staging secret fails closed.
      // No profile details are returned or logged.
      const { count, error } = await createAdminClient()
        .from("profiles").select("id", { count: "exact", head: true });
      enabled = !error && typeof count === "number" && count >= 2;
    } catch {
      enabled = false;
    }
  }
  return NextResponse.json({ ready: enabled }, {
    status: enabled ? 200 : 404,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
