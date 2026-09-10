import { createHash, timingSafeEqual } from "crypto";

/**
 * Shared internal scheduler transport authentication.
 *
 * Production Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * server-only `CRON_SECRET` environment variable is configured. The shared
 * dispatcher therefore prefers CRON_SECRET as its transport credential.
 *
 * PAYMENT_RECONCILIATION_SECRET remains a legacy compatibility fallback for
 * local/disposable environments that have not adopted CRON_SECRET yet. When
 * CRON_SECRET is present, the legacy payment secret is NOT accepted by this
 * shared dispatcher.
 *
 * Only the bearer transport form is accepted. Query-string credentials,
 * cookies, and Supabase user sessions are never accepted as scheduler auth.
 */
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function isAuthorizedSchedulerRequest(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.PAYMENT_RECONCILIATION_SECRET;
  if (!expectedSecret) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization) return false;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;

  const supplied = match[1]?.trim();
  if (!supplied) return false;

  return safeCompare(supplied, expectedSecret);
}
