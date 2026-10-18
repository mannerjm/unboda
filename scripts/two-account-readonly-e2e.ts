import assert from "node:assert/strict";

// Execute only with two dedicated test-account sessions; never log cookies or profile data.
// This is a non-destructive read-only probe. A PASS requires BOTH authenticated accounts.
const base = process.env.UNBODA_E2E_BASE_URL;
const cookieA = process.env.UNBODA_E2E_COOKIE_A;
const cookieB = process.env.UNBODA_E2E_COOKIE_B;
if (!base || !cookieA || !cookieB) {
  console.error("SKIPPED: two dedicated test sessions and base URL are required; NOT an E2E pass");
  process.exitCode = 2;
} else {
  const origin = new URL(base);
  assert.equal(origin.protocol, "https:", "only HTTPS origins are permitted");
  assert.notEqual(cookieA, cookieB, "test sessions must differ");
  async function read(path: string, cookie: string) {
    const result = await fetch(new URL(path, origin), {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
    });
    assert.equal(result.status, 200, path + " must return 200 for a valid test account");
    assert.match(result.headers.get("content-type") ?? "", /application\/json/);
    return result.json() as Promise<Record<string, unknown>>;
  }
  const [a, b, summaryA, summaryB] = await Promise.all([
    read("/api/profiles", cookieA),
    read("/api/profiles", cookieB),
    read("/api/mypage/summary", cookieA),
    read("/api/mypage/summary", cookieB),
  ]);
  const ids = (value: Record<string, unknown>) => {
    assert(Array.isArray(value.profiles) && value.profiles.length > 0, "each test user needs a non-empty profile fixture");
    return new Set(value.profiles.map((p: { id?: string }) => p.id));
  };
  const aIds = ids(a), bIds = ids(b);
  for (const id of aIds) assert(!bIds.has(id), "account B received an account A profile");
  for (const id of bIds) assert(!aIds.has(id), "account A received an account B profile");
  for (const [summary, ownIds, otherIds] of [[summaryA, aIds, bIds], [summaryB, bIds, aIds]] as const) {
    const summaryProfiles = [...((summary.paidProfileIds as string[] | undefined) ?? [])];
    for (const id of summaryProfiles) {
      assert(!otherIds.has(id), "another account's purchase profile leaked");
      assert(ownIds.has(id), "summary references a profile not present in this user's profile list");
    }
  }
  console.log("two-account-readonly-e2e: PASS (profile lists and payment summary boundary)");
}
