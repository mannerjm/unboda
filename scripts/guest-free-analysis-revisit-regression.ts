import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const guestSaju = read("app/guest-saju/page.tsx");
const guestLoading = read("app/guest-loading/page.tsx");
const guestResult = read("app/guest-result/page.tsx");
const guestRoute = read("app/api/guest-free-analysis/route.ts");
const sajuPage = read("app/saju/page.tsx");
const myPage = read("app/mypage/page.tsx");
const resultPage = read("app/result/page.tsx");

function countMatches(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

/** The revisit probe must stay on the read-only endpoint. */
const READ_ENDPOINT = /fetch\("\/api\/guest-free-analysis"\)/g;
const START_ENDPOINT = /\/api\/guest-free-analysis\/start/g;
const GENERATE_ENDPOINT = /\/api\/guest-free-analysis\/generate/g;

// A. guest-saju probes the existing read-only endpoint for a saved result
assert(
  countMatches(guestSaju, READ_ENDPOINT) === 1,
  "guest-saju must probe the saved result exactly once through GET /api/guest-free-analysis",
);
assert(
  !guestSaju.includes('method: "POST"') || guestSaju.includes("/api/guest-free-analysis/start"),
  "guest-saju must not introduce a new POST endpoint for the revisit probe",
);
assert(
  guestSaju.includes("hasSavedResult") && guestSaju.includes("body.analysis"),
  "guest-saju must derive the saved-result state from the stored analysis payload",
);
assert(
  guestSaju.includes(".catch(() => undefined)"),
  "a failed probe must not break the new-analysis form (progressive enhancement)",
);

// B. a completed result exposes an explicit revisit entry point
assert(
  guestSaju.includes("{hasSavedResult ? (") && guestSaju.includes('href="/guest-result"'),
  "guest-saju must render a revisit entry point to /guest-result when a saved result exists",
);
assert(
  guestSaju.includes("저장된 결과 다시 보기"),
  "the revisit entry point must be labelled for the user",
);
assert(
  !guestSaju.includes('router.replace("/guest-result")')
    && !guestSaju.includes('router.push("/guest-result")'),
  "revisit must stay a user choice; automatic redirect is forbidden",
);

// C. the revisit path must not start or generate anything
const revisitBlockStart = guestSaju.indexOf("{hasSavedResult ? (");
const revisitBlockEnd = guestSaju.indexOf(") : null}", revisitBlockStart);
assert(
  revisitBlockStart > 0 && revisitBlockEnd > revisitBlockStart,
  "the revisit block must be a self-contained conditional section",
);
const revisitBlock = guestSaju.slice(revisitBlockStart, revisitBlockEnd);
assert(
  !START_ENDPOINT.test(revisitBlock) && !GENERATE_ENDPOINT.test(revisitBlock),
  "the revisit block must never call the start or generate endpoints",
);
assert(
  countMatches(guestSaju, GENERATE_ENDPOINT) === 0,
  "guest-saju must never call the generate endpoint",
);

// D. the new-analysis contract is unchanged
assert(
  countMatches(guestSaju, START_ENDPOINT) === 1
    && guestSaju.includes('router.push("/guest-loading")'),
  "guest form submit must still create a new analysis through /start then /guest-loading",
);
assert(
  guestSaju.includes("validateProfileInput") === false && guestSaju.includes("<form"),
  "the guest input form must remain on the page for new analyses",
);

// E. guest-loading keeps owning the generation step
assert(
  countMatches(guestLoading, GENERATE_ENDPOINT) === 1
    && guestLoading.includes('router.replace("/guest-result")'),
  "guest-loading must remain the only page that triggers generation and then routes to the result",
);

// F. guest-result stays read-only
assert(
  countMatches(guestResult, READ_ENDPOINT) === 1
    && countMatches(guestResult, GENERATE_ENDPOINT) === 0
    && countMatches(guestResult, START_ENDPOINT) === 0,
  "guest-result must stay a read-only revisit page",
);
assert(
  resultPage.includes('router.push(providedResult ? "/guest-saju" : "/saju")'),
  "Guest result re-analysis must use /guest-saju while member result keeps /saju",
);

// the read endpoint contract the probe relies on
assert(
  guestRoute.includes("export async function GET()")
    && guestRoute.includes('record.status !== "completed"')
    && guestRoute.includes("{ analysis: record.content }"),
  "GET /api/guest-free-analysis must keep returning only completed stored analyses",
);

// G. authenticated revisit contracts are untouched
assert(
  sajuPage.includes("fetch(`/api/free-analysis/${activeProfile.id}`)")
    && sajuPage.includes("/result?profileId=${activeProfile.id}")
    && sajuPage.includes("/loading?profileId=${activeProfile.id}"),
  "G: authenticated saju must keep routing cache hits to result and misses to loading",
);
assert(
  myPage.includes('freeAnalysisStatusById[activeProfileId] === "completed"')
    && myPage.includes("router.push(`/result?profileId=${activeProfileId}`)"),
  "G: mypage completed CTA must keep opening the stored authenticated result",
);
assert(
  resultPage.includes("fetch(`/api/free-analysis/${currentProfileId}`)"),
  "G: result must keep restoring the stored authenticated analysis",
);
assert(
  countMatches(sajuPage, GENERATE_ENDPOINT) === 0
    && countMatches(myPage, GENERATE_ENDPOINT) === 0
    && countMatches(resultPage, GENERATE_ENDPOINT) === 0,
  "G: authenticated pages must never touch the guest generation endpoint",
);

console.log("guest revisit entry point contracts:");
console.log("  guest-saju   → GET /api/guest-free-analysis (probe) + Link /guest-result");
console.log("  guest-saju   → POST /start → /guest-loading (new analysis, unchanged)");
console.log("  guest-loading→ POST /generate → /guest-result (unchanged)");
console.log("  guest-result → GET /api/guest-free-analysis (read-only)");

console.log("\nguest-free-analysis-revisit-regression passed ✓");
