import { createHash, timingSafeEqual } from "crypto";

/**
 * STEP 57D-46 PHASE 3E-3: Shared internal scheduler transport authentication.
 *
 * CURRENT ENV NAME: PAYMENT_RECONCILIATION_SECRET
 * SEMANTIC TARGET: shared internal cron transport credential (not a business-logic
 * authorization boundary — payment and account-closure workers remain independent
 * server-side functions gated only by this one Vercel Cron transport check).
 * FUTURE PRODUCTION CLEANUP: rename/rotate to CRON_SECRET or equivalent during a
 * controlled deployment; not performed here.
 *
 * Only the Vercel Cron `Authorization: Bearer <secret>` transport form is accepted.
 * No query-string, cookie, or Supabase user-session auth is accepted.
 */
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function isAuthorizedSchedulerRequest(request: Request): boolean {
  const expectedSecret = process.env.PAYMENT_RECONCILIATION_SECRET;
  if (!expectedSecret) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization) return false;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;

  const supplied = match[1]?.trim();
  if (!supplied) return false;

  return safeCompare(supplied, expectedSecret);
}
