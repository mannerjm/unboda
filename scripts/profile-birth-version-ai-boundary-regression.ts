import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const identity = read("app/lib/analysisInputIdentity.ts");
const snapshot = read("app/lib/analysisInputSnapshot.ts");
const mypage = read("app/mypage/page.tsx");
const profileRoute = read("app/api/profiles/[profileId]/route.ts");
const portfolio = read("app/lib/aiConsulting/portfolio.ts");
const portfolioRoute = read("app/api/ai-consulting/portfolio/route.ts");
const questionRoute = read("app/api/ai-consulting/portfolio/question/route.ts");
const client = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");

for (const key of ["birthDate", "birthTime", "gender", "calendarType", "isLeapMonth"]) {
  assert(identity.includes(`"${key}"`), `canonical input identity must include ${key}`);
}
assert(!identity.includes("label") && !identity.includes("relationshipType"), "presentation/profile relationship fields must not change the saju identity");

assert(snapshot.includes("resolveAnalysisInputProfileVersion") && snapshot.includes('"current"') && snapshot.includes('"previous"') && snapshot.includes('"unknown"'), "commercial snapshots must classify current vs previous profile input");

assert(mypage.includes("hasCanonicalAnalysisInputChanged") && mypage.includes("출생 정보를 변경하시겠어요?"), "mypage must warn before changing canonical birth inputs");
assert(mypage.includes("구매 당시 출생 정보 기준으로 그대로 보관됩니다"), "warning must explain historical report/chat preservation");
assert(mypage.includes("남아 있는 AI 질문권이 있다면 그대로 유지됩니다"), "warning must explain that paid AI credits survive the profile edit");
assert(mypage.includes("birthDataChangeAcknowledged: true"), "confirmed birth changes must send explicit acknowledgement");

assert(profileRoute.includes("BIRTH_DATA_CHANGE_ACKNOWLEDGEMENT_REQUIRED"), "server must require acknowledgement for purchase-backed birth changes");
assert(profileRoute.includes("hasCanonicalAnalysisInputChanged"), "server must independently detect canonical birth changes");
assert(!profileRoute.includes('from("entitlements").delete') && !profileRoute.includes('from("paid_reports").delete'), "profile edits must never delete paid history");

assert(portfolio.includes('from("purchases")') && portfolio.includes("analysis_input_snapshot"), "AI portfolio must compare purchase-time frozen birth inputs");
assert(portfolio.includes("includePreviousSource") && portfolio.includes("profileInputVersion"), "AI portfolio must keep previous-input analyses out of automatic routing while supporting explicit continuation");
assert(portfolio.includes("analyses: [explicitPrevious]"), "explicit previous-input continuation must isolate the historical report instead of mixing current-input reports");
assert(portfolioRoute.includes("includeProductId") && portfolioRoute.includes("includeEdition"), "portfolio API must accept only an explicit report source for previous-input continuation");
assert(questionRoute.includes("preferredProductId") && questionRoute.includes("preferredEditionKey"), "question API must bind previous-input continuation to an exact preferred source");

assert(client.includes("이전 출생정보 기준 상담") && client.includes("자동 상담 범위에서 제외"), "AI UI must disclose previous-input consultation boundaries");
assert(answerPipeline.includes("source_thread_id === thread.id"), "analysis-derived and summary memories must be scoped to the selected thread");
assert(answerPipeline.includes("userStated: partitioned.userStated"), "explicit user-stated memories remain profile-wide and separate from analysis-derived memory");

console.log("profile birth-version AI boundary regression passed");
