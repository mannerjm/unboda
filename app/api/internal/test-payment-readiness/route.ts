import { NextResponse } from "next/server";
import { getTossConfig } from "@/app/lib/toss/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staging-only, boolean-only smoke check. It never calls Toss, NICE, or a DB,
 * exposes no key/identifier, and is inaccessible on production or other previews.
 */
export async function GET() {
  const isolated =
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "test/staging-tenant-e2e" &&
    process.env.UNBODA_E2E_STAGING_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://xdiitqyysmhicjcytckm.supabase.co" &&
    process.env.TOSS_ENVIRONMENT === "sandbox" &&
    process.env.TOSS_REVIEW_MODE === "enabled" &&
    process.env.TOSS_ALLOW_LIVE === "false" &&
    process.env.TOSS_LIVE_CHECKOUT_ENABLED === "false" &&
    process.env.TOSS_LIVE_PILOT_ENABLED === "false" &&
    process.env.TOSS_HYBRID_ROUTING_ENABLED === "false";

  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!isolated) {
    return NextResponse.json({ ready: false }, { status: 404, headers });
  }

  let tossTestPairValid = false;
  try {
    // Validates format and sandbox routing without exposing credentials.
    const config = getTossConfig();
    tossTestPairValid = !config.isProduction &&
      config.environment === "sandbox" &&
      config.clientKey.startsWith("test_ck_") &&
      config.secretKey.startsWith("test_sk_");
  } catch {
    tossTestPairValid = false;
  }

  return NextResponse.json({
    ready: tossTestPairValid,
    checks: {
      isolatedStaging: true,
      tossTestPairFormat: tossTestPairValid,
      niceStagingConfigured: Boolean(
        process.env.NICE_GATEWAY_URL?.startsWith("https://") &&
        (process.env.NICE_GATEWAY_SHARED_SECRET?.length ?? 0) >= 32
      ),
    },
    note: "Format/configuration checks only; not a Toss payment or NICE identity E2E.",
  }, { status: tossTestPairValid ? 200 : 503, headers });
}
