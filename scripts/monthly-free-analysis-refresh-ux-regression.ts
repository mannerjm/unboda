import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const notice = read("app/components/MonthlyFreeAnalysisRefreshNotice.tsx");
const shell = read("app/components/AppShell.tsx");
const summary = read("app/api/mypage/summary/route.ts");
const refreshRoute = read("app/api/free-analysis/[profileId]/refresh/route.ts");
const pipeline = read("app/lib/freeAnalysisPipeline/server.ts");

assert(
  notice.includes('body.freshness !== "STALE"')
    && notice.includes("body.currentEvaluationContext")
    && notice.includes("evaluationMonth"),
  "monthly notice must use server-provided Korea evaluation context instead of a client-local month guess",
);
assert(
  !notice.includes("new Date(") && !notice.includes("toISOString("),
  "monthly notice must not derive the month from browser UTC/local date helpers",
);
console.log("1. monthly label follows the server Korea evaluation month ✓");

assert(
  notice.includes("/refresh`")
    && notice.includes('method: "POST"')
    && notice.includes("refreshCurrentMonth")
    && notice.includes("onClick={() => void refreshCurrentMonth()}"),
  "period refresh must remain an explicit user action",
);
assert(
  !notice.includes("useEffect(() => {\n    void refreshCurrentMonth")
    && refreshRoute.includes("allowPeriodRefresh: true"),
  "page load must not automatically trigger monthly AI regeneration",
);
console.log("2. monthly regeneration stays explicit and user-triggered ✓");

for (const copy of [
  "갱신하기 전까지 기존 결과는 그대로 볼 수 있습니다.",
  "추천 분석 TOP 3가 새롭게 갱신될 수 있습니다.",
  "운세 갱신 가능",
]) {
  assert(notice.includes(copy), `monthly UX copy missing: ${copy}`);
}
assert(!notice.includes("alert(") && !notice.includes("confirm("), "monthly refresh must not use a blocking popup");
console.log("3. refresh guidance is inline, non-blocking, and explains TOP 3 refresh ✓");

assert(
  shell.includes('pathname === "/result"')
    && shell.includes('pathname === "/mypage" || pathname === "/recommendations"')
    && shell.includes("MonthlyFreeAnalysisRefreshNotice")
    && shell.includes("isGuest === false && profileId && refreshNoticeSurface"),
  "member result, My Page, and recommendation surfaces must share the monthly notice",
);
console.log("4. member result/My Page/recommendations expose the same stale-period signal ✓");

assert(
  summary.includes("periodRefreshAvailable")
    && summary.includes('status: periodRefreshAvailable ? "completed" : status')
    && summary.includes("summary.profileFingerprint === getProfileFingerprint(profile)"),
  "My Page must distinguish period refresh availability from a true birth-input stale state",
);
console.log("5. My Page no longer labels a pure month change as changed birth information ✓");

assert(
  pipeline.includes("buildAnalysisProductRecommendations({")
    && pipeline.includes("evaluationContext,")
    && refreshRoute.includes("buildFreeAnalysisResponse({"),
  "explicit refresh must rebuild the complete response including period-aware recommendations",
);
console.log("6. successful monthly refresh recomputes the complete free result and recommendation TOP 3 ✓");

assert(
  notice.includes("window.location.reload()")
    && notice.includes("MAX_POLL_ATTEMPTS")
    && notice.includes("waitForRefreshCompletion"),
  "refresh UX must converge after both direct completion and concurrent generating responses",
);
console.log("7. refresh completion reloads the current result and handles concurrent generation ✓");

console.log("monthly-free-analysis-refresh-ux-regression passed ✓");
