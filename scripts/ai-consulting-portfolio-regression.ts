import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const portfolio = read("app/lib/aiConsulting/portfolio.ts");
const portfolioApi = read("app/api/ai-consulting/portfolio/route.ts");
const portfolioQuestionApi = read("app/api/ai-consulting/portfolio/question/route.ts");
const client = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const page = read("app/ai-consulting/page.tsx");
const entry = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const library = read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const preview = read("app/admin/ai-consulting-preview/page.tsx");
const creditMigration = read("supabase/migrations/043_ai_consulting_profile_credit_ledger.sql");
const runtimeMigration = read("supabase/migrations/044_ai_consulting_credit_runtime.sql");

assert(portfolio.includes("listUserPaidAnalysisSummaries"), "portfolio must derive owned scope from active paid-analysis summaries");
assert(portfolio.includes('summary.profileId === input.profileId'), "portfolio owned scope must stay profile-scoped");
assert(portfolio.includes('summary.reportStatus === "completed"'), "only completed paid reports may expand consulting scope");
assert(portfolio.includes("Boolean(summary.analysisEditionKey)"), "portfolio scope must remain exact-edition bound");
assert(portfolio.includes("getAiConsultingCreditBalance(input)"), "portfolio must use the existing shared profile credit balance");
assert(portfolio.includes("evaluateAiConsultingScope"), "portfolio router must reuse existing deterministic product scope evaluation");
assert(portfolio.includes("routingScore("), "portfolio router must rank eligible owned reports deterministically");
assert(portfolio.includes('state: "clarify_source"'), "ambiguous cross-report questions must ask for source selection without charging");
assert(portfolio.includes('state: "outside_portfolio"'), "questions outside all owned analyses must fail closed");
assert(portfolio.includes("preferredProductId") && portfolio.includes("preferredEditionKey"), "a report-originated question must be able to prefer its exact owned report");
assert(portfolio.includes("ensureAiConsultingThreadForAnalysis"), "portfolio routing must preserve exact report entitlement/thread boundaries");
assert(portfolio.includes("answerAiConsultingQuestion"), "portfolio answers must reuse the existing charge-safe grounded answer pipeline");
assert(portfolio.includes("recordAiConsultingSuccessOutcome") && portfolio.includes("recordAiConsultingFailureOutcome"), "portfolio answers must remain visible to AI operations telemetry");
assert(!portfolio.includes("insert into") && !portfolio.includes("grantEntitlement"), "portfolio routing must not create commercial access outside existing boundaries");

assert(portfolioApi.includes("getCurrentUser") && portfolioApi.includes("getActiveProfile"), "portfolio state API must authenticate and enforce active profile");
assert(portfolioApi.includes("activeProfile.id !== profile.id"), "portfolio state API must reject non-active profiles");
assert(portfolioQuestionApi.includes("getCurrentUser") && portfolioQuestionApi.includes("getActiveProfile"), "portfolio question API must enforce auth and active profile");
assert(portfolioQuestionApi.includes("crypto.randomUUID") === false, "portfolio question API must not invent hidden retry request ids");
assert(portfolioQuestionApi.includes("300"), "portfolio question API must keep the 300-character cap");
assert(portfolioQuestionApi.includes("answerAiConsultingPortfolioQuestion"), "portfolio question API must delegate to the server router");

assert(page.includes("getActiveProfile") && page.includes("AiConsultingPortfolioClient"), "AI consulting page must be a profile-scoped unified hub");
assert(page.includes("focusProductId") && page.includes("focusEdition"), "report-originated navigation must keep an optional starting context without restricting the hub");

for (const copy of [
  "내 구매 분석을 연결하는 AI 상담",
  "새 분석을 구매하면 이 상담에서 답할 수 있는 범위도 함께 넓어집니다.",
  "공용 질문권",
  "모든 보유 분석에서 함께 사용",
  "질문마다 관련 리포트 자동 선택",
  "보유 범위 밖 질문은 답변하지 않아요",
]) {
  assert(client.includes(copy), `unified AI consulting UX must expose: ${copy}`);
}
assert(client.includes('fetch("/api/ai-consulting/portfolio/question"'), "unified composer must submit through the portfolio router");
assert(client.includes("preferredProductId") && client.includes("preferredEditionKey"), "source-selection retry must stay explicit and deterministic");
assert(client.includes('data-section="portfolio-conversation"') && client.includes('data-ai-composer="portfolio-sticky"'), "unified composer must stay inside the conversation section");
assert(client.includes("sourceTitle") && client.includes("sourceEditionLabel"), "each aggregated message must show which report/edition grounded it");
assert(client.includes("threadId: message.threadId"), "memory writes must preserve the originating internal thread");
assert(client.includes("showAllAnalyses") && client.includes("portfolio.analyses.slice(0, 3)"), "owned analysis display must default to the three most recent analyses");
assert(client.includes("전체 보기 · +") && client.includes("접기"), "owned analysis display must support expand/collapse for the full portfolio");
assert(client.includes("최근 보유 분석 3개") && client.includes("전체 보유 분석"), "owned analysis list must clearly explain collapsed and expanded states");
assert(client.includes("상담 이용 안내") && client.includes('border-t border-[#e4e7f0]'), "consulting guidance must be visually separated from the owned-analysis list");
assert(!client.includes("dangerouslySetInnerHTML"), "unified consultation must render model output as plain text");

assert(entry.includes("질문권은 프로필 공용입니다."), "paid-report entry must explain that AI credits are shared");
assert(entry.includes("다른 유료 분석을 추가로 보유하면 통합 AI 상담에서 그 분석 범위도 함께 사용할 수 있습니다."), "report entry must explain scope expansion after later purchases");
assert(entry.includes("const href = `/ai-consulting?") && entry.includes("이전 상담 이어보기"), "report entry must preserve familiar continuation copy while routing into the shared hub");
assert(entry.includes("이 리포트로 통합 상담 시작"), "first-time report entry must frame the report as a starting context, not an isolated wallet");

assert(library.includes("AI CONSULTING HUB"), "purchased library must expose a unified AI consultation hub");
assert(library.includes("질문권은 상품별로 나뉘지 않습니다."), "library must explicitly explain shared credits");
assert(library.includes("완료된 구매 분석이 늘어날수록 AI 상담 범위가 자동으로 넓어지고"), "library must explain expanding owned scope");
assert(library.includes("통합 AI 상담 이어가기"), "library must expose a global AI consultation entry");
assert(library.includes("다른 심층 분석이나 전문 분석을 둘러볼 수 있습니다."), "library next-question copy must remain future-category neutral");
assert(library.includes("전문 분석 보기"), "library specialist CTA must use the generic label");
assert(!library.includes("이 리포트로 질문하기"), "purchased library must avoid per-report AI consultation buttons now that the unified hub is the single entry point");

assert(preview.includes("AiConsultingPortfolioClient"), "operator preview must render the unified portfolio client");
assert(preview.includes("재물·이직·관계·학업·창업 리포트를 한 상담에서 자동 연결"), "operator preview must demonstrate multi-product scope with enough samples for expansion");
assert(preview.includes("previewData={PREVIEW_DATA}"), "operator preview must remain static and non-mutating");
assert(preview.includes('productId: "study-learning-strategy"') && preview.includes('productId: "business-startup-readiness"'), "operator preview must include more than three analyses so expand/collapse is visible");
assert(!client.includes('공용 질문권 {portfolio.questionsRemaining}회'), "shared credit count must not be duplicated in the continuation card");

assert(creditMigration.includes("unused paid questions can be used later against any separately purchased"), "profile credit ledger must remain explicitly cross-product");
assert(runtimeMigration.includes("one AI credit purchase may authorize multiple separately purchased analyses"), "runtime must remain shared-credit across owned analyses");
assert(runtimeMigration.includes("profile-wide balance"), "runtime reservation must remain profile-wide");
assert(runtimeMigration.includes("base_entitlement_id"), "internal access must remain pinned to an exact entitlement even with unified UX");

console.log("Unified AI consulting portfolio regression passed ✓");
