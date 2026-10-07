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
const completionGate = read("app/paid-analysis/[productId]/report/ReportCompletionGate.tsx");

assert(language.includes("쉬운 결론") && language.includes("숫자·비율·간지·전문용어를 생활 행동이나 의학적 사실로 바로 환산하지 않는다"), "plain-language rules must preserve evidence and customer comprehension");
assert(language.includes("고객 본문과 계산 근거의 강제 분리") && language.includes("고객에게 바로 보이는 문자열에는 다음 전문용어를 쓰지 않는다") && language.includes("전문용어에 괄호 설명을 붙이는 방식도 사용하지 않는다"), "customer copy must completely separate fortune jargon from the main paid report");
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
  assert(generatedPrompt.includes("[유료 리포트 고객 이해도·가치 기준") && generatedPrompt.includes("[고객용 본문과 전문 계산 근거 분리]") && generatedPrompt.includes("고객용 본문에 전문용어를 괄호로 설명하는 방식도 사용하지 않는다"), productId + " must receive the strict beginner-friendly V4 customer-value contract");
}

for (const path of [
  "app/lib/compatibilityReportService.ts",
  "app/lib/familyCompatibilityParentChildReportService.ts",
  "app/lib/familyCompatibilityExtendedReportService.ts",
]) {
  assert(read(path).includes("${PAID_REPORT_CUSTOMER_LANGUAGE_RULES}"), path + " must use plain-language rules without changing its report schema");
}
assert(premium.includes("이 리포트는 이렇게 읽어 주세요") && !premium.includes("자주 나오는 사주 용어 쉽게 보기"), "V4 must keep jargon out of the primary reading path instead of teaching it before the customer needs it");
assert(premium.indexOf("{reason.realWorldPattern}") < premium.indexOf("{reason.observedStructure}"), "customer meaning must precede technical cause details");
assert(
  premium.indexOf("{item.meaning}") < premium.indexOf("formatPaidAnalysisEvidenceFactForCustomer"),
  "customer meaning must precede customer-safe server-calculated evidence",
);
assert(
  premium.includes("계산 근거 펼쳐보기") &&
    premium.includes("formatPaidAnalysisEvidenceFactForCustomer") &&
    premium.includes("getPaidAnalysisEvidenceCustomerLabel"),
  "technical evidence must remain inspectable while raw internal scores stay hidden",
);
assert(premium.includes("이 판단을 뒷받침하는 근거") && premium.includes("비교적 분명하게 볼 수 있는 부분") && premium.includes("현실에서 추가로 확인해야 할 부분") && premium.includes("이 분석만으로 정할 수 없는 것"), "V4 confidence and evidence UI must read as customer decision support, not an internal model score");
assert(!premium.includes("신뢰도 {detail.confidence.level}") && !premium.includes("Confidence & Limits"), "customer UI must not expose internal confidence labels as product quality scores");
assert(consulting.includes("AI 상담 화면 보기") && consulting.includes("남은 질문 0회") && consulting.includes("이 리포트로 AI에게 질문하기") && consulting.includes("새 답변을 받으려면 질문권이 필요해요."), "first-time buyers must see a concise truthful consultation entry for both zero-credit and ready states");
assert(!consulting.includes('(session.state === "credit_required" && !hasPreviousConversation)'), "no-credit state must never hide the consulting entry");
assert(report.indexOf("<AiConsultingEntryCard") < report.indexOf("<Phase9NextAnalysisSection"), "report-based consultation appears before upsell recommendations");
assert(report.includes("<ReportCompletionGate") && report.indexOf("<ReportCompletionGate") < report.indexOf("<AiConsultingEntryCard"), "consultation and upsell must stay behind verified report completion");
assert(completionGate.includes('window.addEventListener("unboda:paid-report-ready"') && completionGate.includes("if (!completed) return null"), "first-purchase follow-up content must remain invisible until the exact report-ready event");
assert(paidLoading.includes("MysticLoadingScreen") && paidLoading.includes('href="/purchased-analyses"'), "paid loading reuses free visual and preserves purchase recovery");
assert(freeLoading.includes("asSection") && freeLoading.includes("children"), "shared loading surface supports embedded paid report content");
console.log("paid-report-customer-experience regression: PASS (57/57 V4 prompts + compatibility + UI)");
