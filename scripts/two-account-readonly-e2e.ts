import assert from "node:assert/strict";

// Requires two separate, deliberately provisioned test-account sessions.
// Never stores, prints or forwards authentication data to unexpected hosts.
// Read-only HTTP GETs only: no report generation, AI charges, or purchases.
const base = process.env.UNBODA_E2E_BASE_URL;
const expectedHost = process.env.UNBODA_E2E_EXPECTED_HOST;
const cookieA = process.env.UNBODA_E2E_COOKIE_A;
const cookieB = process.env.UNBODA_E2E_COOKIE_B;
const reportProductId = process.env.UNBODA_E2E_PAID_PRODUCT_ID;
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
  for (const [cookie, foreign] of [[cookieA, bIds[0]], [cookieB, aIds[0]]] as const) {
    const id = encodeURIComponent(foreign);
    await mustDeny("/api/ai-consulting/memories?profileId=" + id, cookie, 403);
    await mustDeny("/api/ai-consulting/portfolio?profileId=" + id, cookie, 403);
    await mustDeny("/api/ai-consulting/credits/balance?profileId=" + id, cookie, 404);
    if (reportProductId) {
      await mustDeny("/api/paid-analysis-detail-v2/status?profileId=" + id
        + "&productId=" + encodeURIComponent(reportProductId), cookie, 403);
    }
  }
  console.log("two-account-readonly-e2e: PASS (profile + purchase summary + cross-account AI memory/portfolio/credits)"
    + (reportProductId ? " + paid report status" : "; paid report status NOT CHECKED"));
}
