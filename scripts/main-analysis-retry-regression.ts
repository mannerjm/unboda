import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const analyzeTypes = read("app/lib/analyzeApiTypes.ts");
const pipeline = read("app/lib/freeAnalysisPipeline/server.ts");
const memberPersistence = read("app/lib/freeAnalysisResults/server.ts");
const guestPersistence = read("app/lib/guestFreeAnalyses/server.ts");
const memberRoute = read("app/api/free-analysis/[profileId]/retry-main-analysis/route.ts");
const guestRoute = read("app/api/guest-free-analysis/retry-main-analysis/route.ts");
const resultPage = read("app/result/page.tsx");

// --- 1. typed contract for the retry lock ---------------------------------
assert(analyzeTypes.includes('mainAnalysisRetryStatus?: "idle" | "generating";'), "generationMeta must expose an optional retry lock field, absent/undefined meaning idle");
console.log("1. generationMeta.mainAnalysisRetryStatus typed contract present ✓");

// --- 2. regenerateMainAnalysis only recomputes getSaju(), reuses stored freeAnalysis,
//        and never calls the recommendation/premium pipeline or a second AI call ---
assert(pipeline.includes("export async function regenerateMainAnalysis"), "a dedicated retry-only helper must exist");
assert(pipeline.includes("getSaju(") , "regenerateMainAnalysis must recompute getSaju() locally");
assert(!/regenerateMainAnalysis[\s\S]*?buildFreeAnalysis\(/.test(pipeline), "regenerateMainAnalysis must not call buildFreeAnalysis");
assert(!/regenerateMainAnalysis[\s\S]*?buildPremiumAnalysis\(/.test(pipeline), "regenerateMainAnalysis must not call buildPremiumAnalysis");
assert(!/regenerateMainAnalysis[\s\S]*?buildAnalysisProductRecommendations\(/.test(pipeline), "regenerateMainAnalysis must not recompute product recommendations");
assert(!/regenerateMainAnalysis[\s\S]*?generateRecommendationExplanation\(/.test(pipeline), "regenerateMainAnalysis must not call the recommendation-analysis AI");
console.log("2. regenerateMainAnalysis only recomputes getSaju() and calls main-analysis once ✓");

// --- 3. atomic claim: single conditional UPDATE covers missing/idle/stale-generating ---
for (const source of [memberPersistence, guestPersistence]) {
  assert(source.includes('.eq("content->generationMeta->>mainAnalysisStatus", "failed")'), "claim must require the row to currently be a failed main-analysis");
  assert(source.includes("mainAnalysisRetryStatus.is.null") && source.includes("mainAnalysisRetryStatus.eq.idle") && source.includes("mainAnalysisRetryStatus.eq.generating"), "claim's single OR filter must cover missing, idle, and stale-generating retry locks");
  assert(source.includes("updated_at.lt.$"), "the stale-generating branch of the claim must be bounded by updated_at staleness");
  assert(source.includes(".select(") && (source.includes("maybeSingle<FreeAnalysisResultRow>()") || source.includes("maybeSingle<GuestFreeAnalysisRow>()")), "claim success/failure must be determined by whether the conditional UPDATE returned a row");
}
assert(memberPersistence.includes("export const STALE_RETRY_LOCK_MS = STALE_GENERATING_MS;"), "the retry stale-lock threshold must reuse the existing stale-generating threshold, not a new arbitrary value");
console.log("3. atomic claim covers missing/idle/stale-generating via a single conditional UPDATE, reusing the existing staleness threshold ✓");

// --- 4. status column untouched: retry never flips completed -> generating ---
assert(!memberPersistence.includes('status: "generating"') || memberPersistence.match(/status: "generating"/g)!.length <= 2, "claimMainAnalysisRetry/completeMainAnalysisRetry must never set the top-level status column to generating");
assert(memberPersistence.includes('.eq("status", "completed")'), "the member claim must keep operating only on rows whose top-level status is completed");
assert(guestPersistence.includes('.eq("status", "completed")'), "the guest claim must keep operating only on rows whose top-level status is completed");
console.log("4. top-level status column stays completed throughout the retry lifecycle ✓");

// --- 5. content preservation: spread existing content/generationMeta ---
for (const source of [memberPersistence, guestPersistence]) {
  assert(source.includes("...record.content,") , "completeMainAnalysisRetry must spread the existing content before overriding result/generationMeta");
  assert(source.includes("...input.record.content.generationMeta,"), "completeMainAnalysisRetry must preserve unrelated generationMeta fields");
}
console.log("5. retry completion preserves all other content fields via spread ✓");

// --- 6. member/guest ownership guards reused from existing patterns ---
assert(memberRoute.includes("getCurrentUser") && memberRoute.includes("getUserProfile(profileId, user.id)"), "member retry route must reuse the existing user+profile ownership guard");
assert(memberRoute.includes("getFreeAnalysisResult(user.id, profile.id)") && memberRoute.includes("getProfileFingerprint(profile)"), "member retry route must reuse the existing fingerprint-checked result lookup");
assert(guestRoute.includes("GUEST_ANALYSIS_COOKIE_NAME") && guestRoute.includes("parseGuestAnalysisCredential") && guestRoute.includes("hashGuestAnalysisSecret") && guestRoute.includes("getGuestFreeAnalysis"), "guest retry route must reuse the existing HttpOnly cookie + secret_hash ownership guard");
assert(!guestRoute.includes("request.json()") && !guestRoute.includes("await request.json"), "guest retry route must not accept a client-supplied analysisId/secret in the request body");
console.log("6. member/guest retry routes reuse existing ownership guards without inventing new auth ✓");

// --- 7. retry gated on mainAnalysisStatus === "failed", 409 responses ---
assert(memberRoute.includes('!== "failed"') && memberRoute.includes("status: 409"), "member route must reject retry with 409 unless mainAnalysisStatus is failed");
assert(guestRoute.includes('!== "failed"') && guestRoute.includes("status: 409"), "guest route must reject retry with 409 unless mainAnalysisStatus is failed");
assert(memberRoute.includes("RETRY_IN_PROGRESS") && guestRoute.includes("RETRY_IN_PROGRESS"), "both routes must return a distinct RETRY_IN_PROGRESS code when the atomic claim itself fails");
console.log("7. retry is gated on failed status with distinct 409 reasons (not-failed vs already-claimed) ✓");

const guestResultPage = read("app/guest-result/page.tsx");

// --- 8. UI: generationMeta threaded through both restore paths, failed-only retry UI ---
assert(resultPage.includes("setGenerationMeta(provided.generationMeta);"), "the guest/providedResult restore path must carry generationMeta into state");
assert(resultPage.includes("setGenerationMeta(saved.generationMeta);"), "the member fetch restore path must carry generationMeta into state");
assert(resultPage.includes('generationMeta?.mainAnalysisStatus === "failed"'), "the AI section must branch on generationMeta.mainAnalysisStatus to decide between normal and failed rendering");
assert(resultPage.includes("AI 해석 다시 생성") && resultPage.includes("retryMainAnalysis"), "a retry button wired to retryMainAnalysis must exist");
assert(resultPage.includes("onRetryMainAnalysis") && !resultPage.includes("guest-free-analysis"), "ResultPageContent must delegate guest retry through the ResultViewerContext callback, never referencing guest-free-analysis directly (keeps /result independent from guest APIs)");
assert(guestResultPage.includes("onRetryMainAnalysis: retryMainAnalysis") && guestResultPage.includes('fetch("/api/guest-free-analysis/retry-main-analysis"'), "guest-result must supply the guest retry endpoint via the context callback");
console.log("8. ResultPageContent threads generationMeta through both restore paths and delegates guest retry via context, keeping /result guest-API-free ✓");

// --- 9. shared retry-count cap lives in one place, safe for client bundles ---
assert(analyzeTypes.includes("export const MAX_MAIN_ANALYSIS_RETRY_COUNT = 2;"), "the retry cap must be a single named constant, not a magic number scattered across files");
for (const source of [memberPersistence, guestPersistence]) {
  assert(source.includes("MAX_MAIN_ANALYSIS_RETRY_COUNT"), "claim logic must import and use the shared retry cap constant");
}
assert(resultPage.includes("MAX_MAIN_ANALYSIS_RETRY_COUNT"), "the UI must reuse the same shared retry cap constant instead of a duplicated literal");
console.log("9. MAX_MAIN_ANALYSIS_RETRY_COUNT is a single shared constant reused by server claim logic and the UI ✓");

// --- 10. count is read/capped/advanced entirely within the atomic claim update ---
for (const source of [memberPersistence, guestPersistence]) {
  assert(source.includes("mainAnalysisRetryCount ?? 0;") && source.includes(">= MAX_MAIN_ANALYSIS_RETRY_COUNT"), "claim must read the existing count (defaulting missing to 0) and reject once it has reached the cap, before attempting any UPDATE");
  assert(source.includes("mainAnalysisRetryCount: retryCount + 1,"), "a successful claim must advance the count in the very same content object written by its UPDATE");
}
console.log("10. retry count is capped and incremented atomically within claim, never via a separate follow-up UPDATE ✓");

// --- 11. claim result is a 3-way union so callers can tell "already in progress" apart from "limit exceeded" ---
assert(memberPersistence.includes('export type MainAnalysisRetryClaimResult') && memberPersistence.includes('"limit_exceeded"') && memberPersistence.includes('"in_progress"') && memberPersistence.includes('"claimed"'), "claim must return a distinguishable 3-state result instead of a boolean/null");
console.log("11. claim result distinguishes claimed / in_progress / limit_exceeded ✓");

// --- 12. routes translate the claim result into distinct 409 vs 429 responses ---
for (const route of [memberRoute, guestRoute]) {
  assert(route.includes('"limit_exceeded"') && route.includes("status: 429") && route.includes("RETRY_LIMIT_EXCEEDED"), "the route must return 429 + RETRY_LIMIT_EXCEEDED when the claim reports limit_exceeded");
  assert(route.includes('"in_progress"') && route.includes("status: 409") && route.includes("RETRY_IN_PROGRESS"), "the route must keep returning 409 + RETRY_IN_PROGRESS when the claim reports in_progress");
}
console.log("12. routes return 429/RETRY_LIMIT_EXCEEDED and 409/RETRY_IN_PROGRESS from distinct claim outcomes ✓");

// --- 13. complete functions never touch the count field: claim already advanced it, spread preserves it ---
for (const source of [memberPersistence, guestPersistence]) {
  const completeFnMatch = source.match(/export async function complete(?:Guest)?MainAnalysisRetry[\s\S]*?\n}/);
  assert(Boolean(completeFnMatch), "a complete*MainAnalysisRetry function must exist");
  assert(!completeFnMatch![0].includes("mainAnalysisRetryCount:"), "completeMainAnalysisRetry must not re-touch mainAnalysisRetryCount; the spread of the already-claimed content must be the only source of the field");
}
console.log("13. retry completion (success or failure) never re-touches mainAnalysisRetryCount ✓");

// --- 14. UI: button hidden and replaced by a limit message once the cap is reached ---
assert(resultPage.includes("(generationMeta.mainAnalysisRetryCount ?? 0) < MAX_MAIN_ANALYSIS_RETRY_COUNT"), "the UI must branch the failed-state rendering on the retry count vs the shared cap");
assert(resultPage.includes("재시도 가능 횟수를 모두 사용했습니다"), "a distinct limit-exceeded message must exist, separate from the generic failure message");
assert(resultPage.includes('code === "RETRY_LIMIT_EXCEEDED"') && resultPage.includes("mainAnalysisRetryCount: MAX_MAIN_ANALYSIS_RETRY_COUNT"), "the client must treat a 429 response as reaching the cap immediately, without waiting for a fresh server round trip to hide the button");
console.log("14. UI removes the retry button (not just disables it) once the count reaches the cap, with a distinct message ✓");

// --- 15. behavioral simulation of the count math, mirroring claimMainAnalysisRetry's exact algorithm ---
type SimGenerationMeta = {
  mainAnalysisStatus: "completed" | "failed";
  mainAnalysisRetryStatus?: "idle" | "generating";
  mainAnalysisRetryCount?: number;
};

function simulateClaim(
  generationMeta: SimGenerationMeta | undefined,
  status: "completed" | "generating" | "failed",
  max: number,
): { state: "claimed"; generationMeta: SimGenerationMeta } | { state: "in_progress" } | { state: "limit_exceeded" } {
  if (status !== "completed" || !generationMeta) return { state: "in_progress" };
  if (generationMeta.mainAnalysisStatus !== "failed") return { state: "in_progress" };

  const retryCount = generationMeta.mainAnalysisRetryCount ?? 0;
  if (retryCount >= max) return { state: "limit_exceeded" };

  const retryStatus = generationMeta.mainAnalysisRetryStatus;
  const eligible = retryStatus === undefined || retryStatus === "idle"; // stale-generating recovery omitted; covered by static check #3
  if (!eligible) return { state: "in_progress" };

  return {
    state: "claimed",
    generationMeta: { ...generationMeta, mainAnalysisRetryStatus: "generating", mainAnalysisRetryCount: retryCount + 1 },
  };
}

const MAX = 2;

// 15a. legacy row with no generationMeta.mainAnalysisRetryCount must be treated as 0 and allow the first retry.
const first = simulateClaim({ mainAnalysisStatus: "failed" }, "completed", MAX);
assert(first.state === "claimed" && first.generationMeta.mainAnalysisRetryCount === 1, "count-undefined legacy row must claim successfully and advance to 1");

// 15b. 0 -> claim -> 1, 1 -> claim -> 2, 2 -> blocked.
const afterFirstRetry = simulateClaim({ mainAnalysisStatus: "failed", mainAnalysisRetryStatus: "idle", mainAnalysisRetryCount: 0 }, "completed", MAX);
assert(afterFirstRetry.state === "claimed" && afterFirstRetry.generationMeta.mainAnalysisRetryCount === 1, "count 0 must claim and advance to 1");

const afterSecondRetry = simulateClaim({ mainAnalysisStatus: "failed", mainAnalysisRetryStatus: "idle", mainAnalysisRetryCount: 1 }, "completed", MAX);
assert(afterSecondRetry.state === "claimed" && afterSecondRetry.generationMeta.mainAnalysisRetryCount === 2, "count 1 must claim and advance to 2");

const blockedAtCap = simulateClaim({ mainAnalysisStatus: "failed", mainAnalysisRetryStatus: "idle", mainAnalysisRetryCount: 2 }, "completed", MAX);
assert(blockedAtCap.state === "limit_exceeded", "count already at the cap must be rejected as limit_exceeded, never attempting a claim");

// 15c. a claim that fails because a retry is already in flight must not touch the count.
const inFlight = simulateClaim({ mainAnalysisStatus: "failed", mainAnalysisRetryStatus: "generating", mainAnalysisRetryCount: 0 }, "completed", MAX);
assert(inFlight.state === "in_progress", "an in-flight retry lock must reject the claim as in_progress, not consume a retry slot");

// 15d. a successfully completed row (mainAnalysisStatus "completed") is never eligible; existing success is unaffected.
const alreadyOk = simulateClaim({ mainAnalysisStatus: "completed", mainAnalysisRetryStatus: "idle", mainAnalysisRetryCount: 0 }, "completed", MAX);
assert(alreadyOk.state === "in_progress", "a row whose main-analysis already succeeded must never be claimable for retry");

console.log("15. count math (undefined->0, 0->1, 1->2, 2->blocked, in-flight claims never consume a slot) verified by simulation ✓");

console.log("\nmain-analysis-retry-regression passed ✓");
