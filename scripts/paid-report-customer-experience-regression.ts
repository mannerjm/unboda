import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisDetailPromptV4 } from "../app/lib/paidAnalysisDetailPrompt";

const read = (path: string): string => readFileSync(path, "utf8");
const language = read("app/lib/paidReportCustomerLanguage.ts");
const prompt = read("app/lib/paidAnalysisDetailPrompt.ts");
const premium = read("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx");
const consulting = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const paidLoading = read("app/components/PaidReportPreparing.tsx");
const freeLoading = read("app/components/MysticLoadingScreen.tsx");
const report = read("app/paid-analysis/[productId]/report/page.tsx");

assert(language.includes("쉬운 결론") && language.includes("숫자를 생활 행동이나 의학적 사실로 바로 환산하지 않는다"), "plain-language rules must preserve evidence and customer comprehension");
assert(prompt.includes('import { PAID_REPORT_CUSTOMER_LANGUAGE_RULES }') && (prompt.match(/\$\{PAID_REPORT_CUSTOMER_LANGUAGE_RULES\}/g) ?? []).length >= 2, "V2 and V4 paid report prompts must use shared plain-language rules");
const launchedProducts = getLaunchProductIds();
assert.equal(launchedProducts.length, 57, "all launched paid-analysis products should be included");
for (const productId of launchedProducts) {
  const generatedPrompt = buildPaidAnalysisDetailPromptV4({
    productId,
    analysisType: productId,
    birthData: "test",
    originalChart: "test",
    coreInterpretation: "test",
    fortuneTiming: "test",
    sajuSummary: "test",
    currentFortuneFlow: "test",
  });
  assert(generatedPrompt.includes("[유료 리포트 고객 이해도") && generatedPrompt.includes("숫자를 생활 행동이나 의학적 사실로 바로 환산하지 않는다"), productId + " must receive actual shared plain-Korean V4 prompt");
}

for (const path of [
  "app/lib/compatibilityReportService.ts",
  "app/lib/familyCompatibilityParentChildReportService.ts",
  "app/lib/familyCompatibilityExtendedReportService.ts",
]) {
  assert(read(path).includes("${PAID_REPORT_CUSTOMER_LANGUAGE_RULES}"), path + " must use plain-language rules without changing its report schema");
}
assert(premium.includes("이 리포트는 이렇게 읽어 주세요") && premium.includes("자주 나오는 사주 용어 쉽게 보기"), "existing V4 snapshots need a plain reading guide");
assert(premium.indexOf("{reason.realWorldPattern}") < premium.indexOf("{reason.observedStructure}"), "customer meaning must precede technical cause details");
assert(premium.indexOf("{item.meaning}") < premium.indexOf("{item.fact}"), "customer meaning must precede server-calculated evidence");
assert(premium.includes("계산 근거 펼쳐보기") && premium.includes("{item.fact}"), "technical evidence must be inspectable, not deleted");
assert(consulting.includes("AI 상담 이용 안내 확인") && consulting.includes("남은 질문 0회") && consulting.includes("이 리포트로 AI 상담 시작하기"), "first-time buyers must always see honest consulting entry even without credits");
assert(!consulting.includes('(session.state === "credit_required" && !hasPreviousConversation)'), "no-credit state must never hide the consulting entry");
assert(report.indexOf("<AiConsultingEntryCard") < report.indexOf("<Phase9NextAnalysisSection"), "report-based consultation appears before upsell recommendations");
assert(paidLoading.includes("MysticLoadingScreen") && paidLoading.includes('href="/purchased-analyses"'), "paid loading reuses free visual and preserves purchase recovery");
assert(freeLoading.includes("asSection") && freeLoading.includes("children"), "shared loading surface supports embedded paid report content");
console.log("paid-report-customer-experience regression: PASS (57/57 V4 prompts + compatibility + UI)");
