import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isMainAnalysisRetryExhausted } from "../app/lib/freeAnalysisResults/server";
import { MAX_MAIN_ANALYSIS_RETRY_COUNT } from "../app/lib/analyzeApiTypes";
import type { AnalyzeSuccessResponse } from "../app/lib/analyzeApiTypes";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const persistence = read("app/lib/freeAnalysisResults/server.ts");
const guestPersistence = read("app/lib/guestFreeAnalyses/server.ts");
const resultPage = read("app/result/page.tsx");
const memberRetryRoute = read("app/api/free-analysis/[profileId]/retry-main-analysis/route.ts");
const guestRetryRoute = read("app/api/guest-free-analysis/retry-main-analysis/route.ts");
const guestSaju = read("app/guest-saju/page.tsx");
const sajuPage = read("app/saju/page.tsx");
const myPage = read("app/mypage/page.tsx");

function content(
  mainAnalysisStatus: "completed" | "failed" | undefined,
  mainAnalysisRetryCount?: number,
): AnalyzeSuccessResponse {
  return {
    result: "본문",
    generationMeta: mainAnalysisStatus
      ? { mainAnalysisStatus, ...(mainAnalysisRetryCount === undefined ? {} : { mainAnalysisRetryCount }) }
      : undefined,
  } as unknown as AnalyzeSuccessResponse;
}

// 1. the retry policy itself is untouched
assert(MAX_MAIN_ANALYSIS_RETRY_COUNT === 2, "1: the retry cap must stay 2");

// 5 ~ 8. exhaustion predicate drives the recovery branch
assert(
  isMainAnalysisRetryExhausted(content("completed", 0)) === false,
  "5: a healthy completed result must never be treated as exhausted",
);
assert(
  isMainAnalysisRetryExhausted(content(undefined)) === false,
  "5: a legacy result without generationMeta must stay a cache hit",
);
assert(
  isMainAnalysisRetryExhausted(content("failed")) === false,
  "6: failed without any retry yet must keep using the retry button",
);
assert(
  isMainAnalysisRetryExhausted(content("failed", 0)) === false,
  "6: failed with 0 retries must keep using the retry button",
);
assert(
  isMainAnalysisRetryExhausted(content("failed", 1)) === false,
  "6: failed with 1 retry left must keep using the retry button",
);
assert(
  isMainAnalysisRetryExhausted(content("failed", MAX_MAIN_ANALYSIS_RETRY_COUNT)) === true,
  "7: failed with the retry budget spent must allow a fresh generation",
);
assert(
  isMainAnalysisRetryExhausted(content("failed", MAX_MAIN_ANALYSIS_RETRY_COUNT + 1)) === true,
  "7: an over-spent budget must also allow a fresh generation",
);
assert(
  isMainAnalysisRetryExhausted(null) === false,
  "5: a missing content must not be treated as exhausted",
);

// 7. the claim is atomic, fingerprint-scoped and only reachable from the completed branch
const claimBody = persistence.slice(
  persistence.indexOf("export async function claimFreeAnalysisResult"),
  persistence.indexOf("export async function completeFreeAnalysisResult"),
);
assert(
  claimBody.includes("if (!isMainAnalysisRetryExhausted(existing.content)) {")
    && claimBody.includes('return { state: "completed", record: existing };'),
  "5: a non-exhausted completed row must still return the cached result",
);
assert(
  claimBody.includes('.eq("profile_fingerprint", fingerprint)')
    && claimBody.includes('.eq("status", "completed")')
    && claimBody.includes('.eq("content->generationMeta->>mainAnalysisStatus", "failed")'),
  "7: the recovery claim must be guarded by fingerprint, completed status and a failed main analysis",
);
assert(
  claimBody.includes('.maybeSingle<FreeAnalysisResultRow>()')
    && claimBody.includes('? { state: "claimed", record: toRecord(data) }')
    && claimBody.includes(': { state: "generating", record: existing }'),
  "7: losing the conditional UPDATE race must report generating, never a second generation",
);
assert(
  claimBody.indexOf("profileFingerprint !== fingerprint") < claimBody.indexOf("isMainAnalysisRetryExhausted"),
  "8: the stale fingerprint branch must still be evaluated before the recovery branch",
);
const recoveryBlock = claimBody.slice(
  claimBody.indexOf("if (!isMainAnalysisRetryExhausted(existing.content)) {"),
  claimBody.indexOf('} else if (existing?.status === "generating")'),
);
assert(
  recoveryBlock.length > 0 && !recoveryBlock.includes("content: null"),
  "7: the recovery claim must not wipe the stored saju/recommendation content",
);
assert(
  recoveryBlock.includes('status: "generating" satisfies FreeAnalysisResultStatus'),
  "7: the recovery claim must reuse the existing generating state, not a new status value",
);

// 9. retry claim contracts are unchanged
for (const [name, source] of [["member", persistence], ["guest", guestPersistence]] as const) {
  assert(
    source.includes('.eq("status", "completed")')
      && source.includes('.eq("content->generationMeta->>mainAnalysisStatus", "failed")')
      && source.includes("mainAnalysisRetryCount ?? 0;")
      && source.includes(">= MAX_MAIN_ANALYSIS_RETRY_COUNT")
      && source.includes("mainAnalysisRetryStatus: \"generating\""),
    `9: the ${name} retry claim must keep its status/failed/lock/cap preconditions`,
  );
  assert(
    source.includes("mainAnalysisRetryCount: retryCount + 1"),
    `9: the ${name} retry claim must still consume one attempt per claim`,
  );
}

// 10. retry API error contracts unchanged
for (const [name, source] of [["member", memberRetryRoute], ["guest", guestRetryRoute]] as const) {
  assert(
    source.includes('!== "failed"') && source.includes("status: 409"),
    `10: the ${name} retry route must keep its 409 guard`,
  );
  assert(
    source.includes("RETRY_LIMIT_EXCEEDED") && source.includes("status: 429"),
    `10: the ${name} retry route must keep its 429 limit response`,
  );
  assert(
    source.includes("RETRY_IN_PROGRESS"),
    `10: the ${name} retry route must keep its in-progress code`,
  );
}

// 2 ~ 4. limit-exceeded screen offers a real next step for both audiences
const limitBlockStart = resultPage.indexOf("재시도 가능 횟수를 모두 사용했습니다.");
assert(limitBlockStart > 0, "2: the limit-exceeded copy must stay on the result screen");
const limitBlock = resultPage.slice(limitBlockStart, limitBlockStart + 1400);
assert(
  limitBlock.includes('providedResult'),
  "2: the limit-exceeded CTA must branch between guest and member",
);
assert(
  limitBlock.includes('"/guest-saju"') && limitBlock.includes("새 무료 사주 조회하기"),
  "2: guests must get a /guest-saju CTA",
);
assert(
  limitBlock.includes("`/loading?profileId=${currentProfileId}`") && limitBlock.includes("새 무료 분석 시작하기"),
  "4: members must get a CTA that actually starts a new analysis",
);
assert(
  limitBlock.includes("onClick={() =>") && !limitBlock.includes("useEffect"),
  "3: the CTA must require an explicit click, never an automatic navigation",
);
assert(
  !limitBlock.includes("/api/guest-free-analysis/start")
    && !limitBlock.includes("/api/guest-free-analysis/generate")
    && !limitBlock.includes("/api/analyze"),
  "3: the limit-exceeded block must not call any generation endpoint itself",
);
assert(
  resultPage.includes("mainAnalysisRetryCount ?? 0) < MAX_MAIN_ANALYSIS_RETRY_COUNT"),
  "6: the retry button must still be the path while the budget remains",
);

// 11. a fresh generation starts from a clean retry budget
assert(
  persistence.includes('status: "completed" satisfies FreeAnalysisResultStatus')
    && persistence.includes("content: input.content"),
  "11: completeFreeAnalysisResult must overwrite the content, so the new retry count starts at 0",
);
assert(
  guestSaju.includes('fetch("/api/guest-free-analysis/start"')
    && guestSaju.includes('router.push("/guest-loading")'),
  "11: the guest new-analysis path must stay unchanged (new row => count 0)",
);

// 12 & 13. untouched navigation contracts
assert(
  sajuPage.includes("fetch(`/api/free-analysis/${activeProfile.id}`)")
    && sajuPage.includes("/result?profileId=${activeProfile.id}")
    && sajuPage.includes("/loading?profileId=${activeProfile.id}"),
  "12: the authenticated saju cache-hit contract must stay unchanged",
);
assert(
  myPage.includes('needs_retry: "AI 해석 재생성 필요"')
    && myPage.includes('status === "completed" || status === "needs_retry"')
    && myPage.includes("router.push(`/result?profileId=${activeProfileId}`)"),
  "13: the mypage completed/needs_retry/stale contract must stay unchanged",
);
assert(
  persistence.includes('return "stale";'),
  "13: the stale resolution must stay in place",
);

// 14. no schema/RPC work was required
assert(
  !persistence.includes(".rpc(") && !guestPersistence.includes("create table"),
  "14: the recovery path must not introduce an RPC or schema change",
);
assert(
  persistence.includes('.from("free_analysis_results")'),
  "14: the recovery path must reuse the existing table",
);

console.log("retry recovery matrix:");
console.log(`  completed + ok            → exhausted=${isMainAnalysisRetryExhausted(content("completed", 0))} (cache hit)`);
console.log(`  completed + failed + 1    → exhausted=${isMainAnalysisRetryExhausted(content("failed", 1))} (retry button)`);
console.log(`  completed + failed + ${MAX_MAIN_ANALYSIS_RETRY_COUNT}    → exhausted=${isMainAnalysisRetryExhausted(content("failed", MAX_MAIN_ANALYSIS_RETRY_COUNT))} (new analysis)`);

console.log("\nmain-analysis-retry-recovery-regression passed ✓");
