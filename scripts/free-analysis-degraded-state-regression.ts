import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getProfileFingerprint,
  resolveProfileFreeAnalysisStatus,
  type FreeAnalysisResultSummary,
} from "../app/lib/freeAnalysisResults/server";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const profile = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "본인",
  relationshipType: "self",
  birthDate: "1990-01-15",
  birthTime: "09:00",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
} as unknown as ProfileDto;

const fingerprint = getProfileFingerprint(profile);

function summary(overrides: Partial<FreeAnalysisResultSummary>): FreeAnalysisResultSummary[] {
  return [
    {
      profileId: profile.id,
      status: "completed",
      profileFingerprint: fingerprint,
      ...overrides,
    },
  ];
}

// 1. completed row whose stored main analysis failed becomes a derived needs_retry
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({ mainAnalysisStatus: "failed" })) === "needs_retry",
  "1: completed + mainAnalysisStatus failed must resolve to needs_retry",
);

// 2. a healthy completed row stays completed
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({ mainAnalysisStatus: "completed" })) === "completed",
  "2: completed + mainAnalysisStatus completed must stay completed",
);
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({ mainAnalysisStatus: null })) === "completed",
  "2: a missing main-analysis status must keep the legacy completed meaning",
);
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({})) === "completed",
  "2: an undefined main-analysis status must keep the legacy completed meaning",
);

// 3. fingerprint mismatch keeps winning over needs_retry
assert(
  resolveProfileFreeAnalysisStatus(
    profile,
    summary({ profileFingerprint: "other-fingerprint", mainAnalysisStatus: "failed" }),
  ) === "stale",
  "3: stale must take priority over needs_retry",
);

// existing non-completed statuses are untouched
assert(resolveProfileFreeAnalysisStatus(profile, []) === "none", "missing summary must stay none");
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({ status: "generating", mainAnalysisStatus: "failed" })) === "generating",
  "generating must stay generating",
);
assert(
  resolveProfileFreeAnalysisStatus(profile, summary({ status: "failed", mainAnalysisStatus: "failed" })) === "failed",
  "a failed row must stay failed",
);

const persistence = read("app/lib/freeAnalysisResults/server.ts");
const guestPersistence = read("app/lib/guestFreeAnalyses/server.ts");
const myPage = read("app/mypage/page.tsx");
const guestSaju = read("app/guest-saju/page.tsx");
const resultPage = read("app/result/page.tsx");

// 4. mypage surfaces the degraded state instead of a positive "completed" label
assert(
  myPage.includes('needs_retry: "AI 해석 재생성 필요"'),
  "4: mypage must label needs_retry explicitly",
);
assert(
  myPage.includes('needs_retry: "warning"'),
  "4: needs_retry must use a warning tone, never the positive completed tone",
);
assert(
  /needs_retry:\s*"사주/.test(myPage),
  "4: needs_retry must explain that only the AI main analysis has to be regenerated",
);

// 5 & 6. the CTA opens the stored result, never a new generation
assert(
  myPage.includes('status === "completed" || status === "needs_retry"')
    && myPage.includes("router.push(`/result?profileId=${activeProfileId}`)"),
  "5: needs_retry must navigate to the stored result screen",
);
assert(
  !myPage.includes("/loading?profileId="),
  "6: mypage must never send a needs_retry profile into a new generation",
);
assert(
  myPage.includes("저장된 결과 열고 AI 해석 다시 생성하기"),
  "5: the CTA label must tell the user the retry happens on the result screen",
);

// 7 ~ 9. guest saved-result card branches on the stored generation meta
assert(
  guestSaju.includes("generationMeta?.mainAnalysisStatus === \"failed\"")
    && guestSaju.includes("savedResultNeedsRetry"),
  "7: guest card must read the stored mainAnalysisStatus",
);
assert(
  guestSaju.includes("저장된 결과가 있습니다 · AI 해석 재생성 필요"),
  "8: guest card must show the degraded state",
);
assert(
  guestSaju.includes("저장된 무료 사주 결과가 있습니다"),
  "8: the healthy guest card copy must stay unchanged",
);
assert(
  guestSaju.includes('href="/guest-result"')
    && (guestSaju.match(/href="\/guest-result"/g) ?? []).length === 1,
  "9: the guest card link must stay the single read-only /guest-result entry point",
);

// 10. no generation is triggered from the guest form page
assert(
  !guestSaju.includes("/api/guest-free-analysis/generate"),
  "10: guest-saju must never call the generate endpoint",
);
assert(
  (guestSaju.match(/fetch\("\/api\/guest-free-analysis"\)/g) ?? []).length === 1,
  "10: the guest probe must stay a single read-only request",
);

// 11. the summary keeps a single query and reads the status from stored content
assert(
  persistence.includes("main_analysis_status:content->generationMeta->>mainAnalysisStatus"),
  "11: the summary query must read the main-analysis status from the stored content",
);
const listBody = persistence.slice(
  persistence.indexOf("export async function listUserFreeAnalysisResults"),
  persistence.indexOf("export type ProfileFreeAnalysisStatus"),
);
assert(
  (listBody.match(/\.from\(/g) ?? []).length === 1,
  "11: listUserFreeAnalysisResults must stay a single query (no N+1)",
);
assert(
  listBody.includes("profile_id, status, profile_fingerprint"),
  "11: the existing status/fingerprint selection must be preserved",
);

// 12. the stored row status policy is unchanged
assert(
  persistence.includes('status: "completed" satisfies FreeAnalysisResultStatus'),
  "12: completeFreeAnalysisResult must keep storing status completed",
);
assert(
  guestPersistence.includes('.update({ status: "completed", content })'),
  "12: completeGuestFreeAnalysis must keep storing status completed",
);

// 13. retry claims still require a completed row
assert(
  persistence.includes('.eq("status", "completed")')
    && persistence.includes('.eq("content->generationMeta->>mainAnalysisStatus", "failed")'),
  "13: the member retry claim must keep its completed + failed precondition",
);
assert(
  guestPersistence.includes('.eq("status", "completed")')
    && guestPersistence.includes('.eq("content->generationMeta->>mainAnalysisStatus", "failed")'),
  "13: the guest retry claim must keep its completed + failed precondition",
);

// the result screen keeps owning the retry action
assert(
  resultPage.includes('generationMeta?.mainAnalysisStatus === "failed"')
    && resultPage.includes("AI 해석 다시 생성"),
  "the result screen must remain the only place that triggers a retry",
);

console.log("derived free-analysis states:");
console.log(`  completed + failed main analysis → ${resolveProfileFreeAnalysisStatus(profile, summary({ mainAnalysisStatus: "failed" }))}`);
console.log(`  completed + ok main analysis     → ${resolveProfileFreeAnalysisStatus(profile, summary({ mainAnalysisStatus: "completed" }))}`);
console.log(`  fingerprint mismatch             → ${resolveProfileFreeAnalysisStatus(profile, summary({ profileFingerprint: "x", mainAnalysisStatus: "failed" }))}`);

console.log("\nfree-analysis-degraded-state-regression passed ✓");
