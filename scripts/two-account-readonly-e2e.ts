import assert from "node:assert/strict";

// Requires two separate, deliberately provisioned test-account sessions.
// Never stores, prints or forwards authentication data to unexpected hosts.
// Read-only HTTP GETs only: no report generation, AI charges, or purchases.
const base = process.env.UNBODA_E2E_BASE_URL;
const expectedHost = process.env.UNBODA_E2E_EXPECTED_HOST;
const cookieA = process.env.UNBODA_E2E_COOKIE_A;
const cookieB = process.env.UNBODA_E2E_COOKIE_B;
// Use a server-known launch product without purchasing it. The paid-status
// checks below must return 403 for unpaid test profiles.
const reportProductId = process.env.UNBODA_E2E_PAID_PRODUCT_ID || "career";
if (!base || !expectedHost || !cookieA || !cookieB) {
  console.error("SKIPPED: dedicated test origin, expected hostname and two test sessions required; NOT an E2E pass");
  process.exitCode = 2;
} else {
  const origin = new URL(base);
  assert.equal(origin.protocol, "https:", "HTTPS test origin required");
  assert.equal(origin.hostname, expectedHost, "origin hostname must be explicitly pinned");
  assert(!["unboda.kr", "www.unboda.kr"].includes(origin.hostname), "never run test account probe against public production host");
  assert.equal(origin.username, "", "URL must not embed authentication");
  assert.equal(origin.password, "", "URL must not embed authentication");
  assert.notEqual(cookieA, cookieB, "two independent test sessions required");
  async function get(path: string, cookie: string): Promise<Response> {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin.origin, "no cross-origin requests allowed");
    return fetch(url, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
  }
  async function ownRead(path: string, cookie: string) {
    const response = await get(path, cookie);
    assert.equal(response.status, 200, "test account read failed for " + path);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    return response.json() as Promise<Record<string, unknown>>;
  }
  async function mustDeny(path: string, cookie: string, expected: number) {
    const response = await get(path, cookie);
    assert.equal(response.status, expected, "foreign-owner GET must be blocked on " + path);
  }
  // Before sending any account cookies, require the server to positively identify
  // itself as the isolated staging preview and reject all LIVE payment routing.
  const readyResponse = await fetch(new URL("/api/internal/e2e-readiness", origin), {
    headers: { accept: "application/json" },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(readyResponse.status, 200, "target has not proven isolated staging readiness");
  const readiness = await readyResponse.json() as { ready?: boolean };
  assert.equal(readiness.ready, true, "staging identity check failed");

  // Anonymous reads must fail as application JSON, not a proxy login page.
  // This runs before either test cookie is sent to the server.
  async function anonymousMustDeny(path: string) {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin.origin);
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 401, "anonymous access must return 401: " + path);
    assert.match(response.headers.get("content-type") ?? "", /application\\/json/, "API must deny in JSON");
  }
  const placeholderId = "00000000-0000-4000-8000-000000000000";
  for (const path of [
    "/api/profiles",
    "/api/mypage/summary",
    "/api/ai-consulting/memories?profileId=" + placeholderId,
    "/api/ai-consulting/portfolio?profileId=" + placeholderId,
    "/api/ai-consulting/credits/balance?profileId=" + placeholderId,
    "/api/paid-analysis-detail-v2/status?profileId=" + placeholderId + "&productId=" + encodeURIComponent(reportProductId),
  ]) await anonymousMustDeny(path);

  const [a, b, summaryA, summaryB] = await Promise.all([
    ownRead("/api/profiles", cookieA),
    ownRead("/api/profiles", cookieB),
    ownRead("/api/mypage/summary", cookieA),
    ownRead("/api/mypage/summary", cookieB),
  ]);
  function ids(payload: Record<string, unknown>): string[] {
    assert(Array.isArray(payload.profiles) && payload.profiles.length > 0, "each test account needs a profile");
    const result = payload.profiles.map((p: { id?: string }) => p.id);
    assert(result.every((id: unknown) => typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id)), "invalid test profile fixture");
    return result as string[];
  }
  const aIds = ids(a);
  const bIds = ids(b);
  const aSet = new Set(aIds), bSet = new Set(bIds);
  for (const id of aIds) assert(!bSet.has(id), "B received an A profile");
  for (const id of bIds) assert(!aSet.has(id), "A received a B profile");
  for (const [summary, ownIds, otherIds] of [[summaryA, aSet, bSet], [summaryB, bSet, aSet]] as const) {
    assert(Array.isArray(summary.paidProfileIds), "mypage must expose purchase profile IDs");
    for (const id of summary.paidProfileIds as string[]) {
      assert(ownIds.has(id) && !otherIds.has(id), "cross-account purchase summary leak");
    }
  }
  for (const [cookie, own] of [[cookieA, aIds[0]], [cookieB, bIds[0]]] as const) {
    const id = encodeURIComponent(own);
    const memory = await ownRead("/api/ai-consulting/memories?profileId=" + id, cookie);
    assert(Array.isArray(memory.memories), "own AI memory list must be readable");
    const portfolio = await ownRead("/api/ai-consulting/portfolio?profileId=" + id, cookie);
    assert(portfolio && typeof portfolio === "object", "own AI portfolio must be readable");
    const credits = await ownRead("/api/ai-consulting/credits/balance?profileId=" + id, cookie);
    assert(credits.profileId === own, "own credit balance must return the selected profile");
    // These dedicated staging accounts have no purchased entitlement.
    await mustDeny("/api/paid-analysis-detail-v2/status?profileId=" + id
      + "&productId=" + encodeURIComponent(reportProductId), cookie, 403);
  }

  for (const [cookie, foreign] of [[cookieA, bIds[0]], [cookieB, aIds[0]]] as const) {
    const id = encodeURIComponent(foreign);
    await mustDeny("/api/ai-consulting/memories?profileId=" + id, cookie, 403);
    await mustDeny("/api/ai-consulting/portfolio?profileId=" + id, cookie, 403);
    await mustDeny("/api/ai-consulting/credits/balance?profileId=" + id, cookie, 404);
    await mustDeny("/api/paid-analysis-detail-v2/status?profileId=" + id
      + "&productId=" + encodeURIComponent(reportProductId), cookie, 403);
  }
  console.log("two-account-readonly-e2e: PASS (anonymous 401, two owners' profile/AI reads, foreign-owner 403/404, unpaid report 403). Paid purchase ownership with real entitlements still untested.");
}
