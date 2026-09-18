import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const presentation = read("app/lib/aiConsultingPresentation.ts");
const entry = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const chat = read("app/ai-consulting/AiConsultingChatClient.tsx");
const portfolioChat = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const page = read("app/ai-consulting/page.tsx");
const credits = read("app/ai-consulting/credits/page.tsx");
const creditClient = read("app/ai-consulting/credits/CreditCheckoutClient.tsx");
const preview = read("app/admin/ai-consulting-preview/page.tsx");
const reportPreview = read("app/admin/report-preview/page.tsx");
const admin = read("app/admin/page.tsx");

for (const [name, source] of [
  ["AI consulting chat", chat],
  ["AI consulting portfolio chat", portfolioChat],
  ["AI consulting entry", entry],
  ["AI consulting fallback page", page],
  ["AI credit page", credits],
  ["AI credit checkout cards", creditClient],
] as const) {
  for (const warmToken of ["#f7f2e8", "text-stone-", "bg-stone-", "border-stone-", "ring-stone-"]) {
    assert(!source.includes(warmToken), `${name} must not restore legacy warm/stone token ${warmToken}`);
  }
}

assert(presentation.includes("getPremiumProductDisplayTitle"), "AI consulting presentation must resolve customer-facing premium titles");
assert(presentation.includes("formatAnalysisEditionLabel"), "AI consulting presentation must show semantic edition labels");
assert(presentation.includes("COMPATIBILITY_ROMANTIC_PRODUCT_ID"), "AI consulting presentation must include romantic compatibility questions");
assert(presentation.includes("COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID"), "AI consulting presentation must include parent-child compatibility questions");
assert(presentation.includes("COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID"), "AI consulting presentation must include sibling compatibility questions");
assert(presentation.includes("COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID"), "AI consulting presentation must include other-family compatibility questions");
assert(presentation.includes("PERIOD_SUGGESTED_QUESTIONS"), "period reports must get period-aware suggested questions");

for (const label of [
  "상담 기준 리포트",
  "남은 질문",
  "CONSULTING SCOPE",
  "추천 질문",
  "CONVERSATION",
  "리포트에서 이어지는 대화",
  "AI가 기억하는 내 상황",
]) {
  assert(chat.includes(label), `Phase 7 chat must expose ${label}`);
}
assert(chat.includes("presentation.productTitle") && chat.includes("presentation.editionLabel"), "chat must orient the user to the exact report context");
assert(chat.includes("presentation.suggestedQuestions.map"), "chat must render deterministic suggested questions");
assert(chat.includes("범위 밖 질문은 답변하지 않아요"), "consulting scope chip must clearly say out-of-scope questions are not answered");
assert(chat.includes("범위를 벗어나 AI 답변을 생성하지 않았습니다. 질문권도 차감되지 않았습니다."), "DENY policy copy must state that no AI answer is generated and no credit is charged");
assert(chat.includes("범위를 벗어난 질문은 AI 답변을 생성하지 않으며 질문권도 차감되지 않습니다."), "composer helper must explain blocked out-of-scope behavior");
assert(entry.includes("보유 분석 전체 범위 밖 질문은 답변하지 않고 미차감합니다."), "report entry must explain unified owned-scope behavior");
assert(chat.includes("setQuestion(suggestion)"), "suggested questions must fill the composer without bypassing submission");
assert(chat.includes("지난 상담에서 이어서 궁금한 점을 질문해 주세요."), "resumed chat composer contract must remain intact");
assert(chat.includes("이전 상담 이어보기") && chat.includes("최근 상담") && chat.includes("이전 대화"), "prior-conversation orientation must remain intact");
assert(chat.includes("whitespace-pre-wrap") && !chat.includes("dangerouslySetInnerHTML"), "assistant output must remain plain text rendering");

for (const runtimeContract of [
  'fetch("/api/ai-consulting/session"',
  'fetch("/api/ai-consulting/question"',
  'fetch("/api/ai-consulting/memories"',
  "crypto.randomUUID()",
  "scopeDecision",
  "차감되지 않았습니다",
]) {
  assert(chat.includes(runtimeContract), `AI consulting runtime contract missing: ${runtimeContract}`);
}
assert(chat.includes("if (isPreview) return;"), "operator preview must block question submission");
assert(chat.includes("if (previewData)"), "operator preview must render without live session/memory fetches");
assert(chat.includes("previewData?.backHref"), "preview must retain its design-review return target");
assert(chat.includes('data-section="conversation"'), "chat must mark the conversation boundary");
assert(chat.includes('data-ai-composer="conversation-sticky"'), "composer must be scoped to the conversation section");
assert(
  chat.indexOf('data-ai-composer="conversation-sticky"') > chat.indexOf('data-section="conversation"'),
  "sticky composer must render inside the conversation flow, not above scope/memory sections",
);
assert(chat.includes('space-y-4 pb-44 sm:pb-40'), "conversation must reserve space so the sticky composer does not cover the latest answer");
assert(!chat.includes('← {isPreview ? "미리보기 목록으로" : "리포트로 돌아가기"}'), "operator preview must not duplicate the admin preview navigation");
assert(!chat.includes('남은 질문 {session.questionsRemaining}회'), "mid-page continuation card must not duplicate the primary remaining-question counter");

assert(entry.includes("이 리포트를 바탕으로 AI에게 질문하기"), "report entry must preserve the established AI consulting CTA language");
assert(entry.includes("presentation.productTitle"), "report entry must name the report that grounds consultation");
assert(entry.includes("presentation.suggestedQuestions.slice(0, 3)"), "report entry must preview suggested follow-up questions");
assert(entry.includes("이전 상담 기록 보기") && entry.includes("이전 상담 이어보기"), "report entry must preserve familiar continuation/history actions inside the unified hub");
assert(entry.includes("이전 상담 기록은 계속 볼 수 있습니다"), "zero-credit prior conversations must remain readable");

assert(page.includes("AiConsultingPortfolioClient") && page.includes("getActiveProfile"), "AI consultation page must resolve the active profile and render the unified portfolio hub");
assert(credits.includes('bg-[#f5f7fc]'), "AI credit management must use the Phase 7 cool canvas");
assert(creditClient.includes('bg-[#6f5ce7]'), "AI credit checkout primary actions must use the shared violet CTA");
assert(creditClient.includes('fetch("/api/ai-consulting/credits/orders"'), "credit purchase must preserve the server order endpoint");
assert(creditClient.includes("window.TossPayments") && creditClient.includes("requestPayment"), "credit purchase must preserve Toss payment invocation");

assert(preview.includes("await requireOperator()"), "AI consulting preview must be operator-gated");
assert(preview.includes("AiConsultingPortfolioClient") && preview.includes("previewData={PREVIEW_DATA}"), "AI consulting preview must render the actual unified portfolio component");
assert(preview.includes("실제 질문권·AI 호출·기억 저장은 동작하지 않습니다."), "preview must clearly disclose that it creates no live consulting state");
for (const forbidden of ["/api/ai-consulting/question", "/api/orders", "requestPayment", "grantEntitlement"]) {
  assert(!preview.includes(forbidden), `operator preview must not invoke commercial/runtime action: ${forbidden}`);
}
assert(reportPreview.includes('href="/admin/ai-consulting-preview"'), "Phase 6 report preview must link directly to the Phase 7 follow-up screen");
assert(portfolioChat.includes("내 구매 분석을 연결하는 AI 상담"), "unified consultation must explain the portfolio model");
assert(portfolioChat.includes("공용 질문권") && portfolioChat.includes("모든 보유 분석에서 함께 사용"), "unified consultation must make the shared balance explicit");
assert(portfolioChat.includes("질문마다 관련 리포트 자동 선택"), "unified consultation must explain automatic report routing");
assert(portfolioChat.includes('fetch("/api/ai-consulting/portfolio/question"'), "unified consultation must submit through the portfolio router");
assert(portfolioChat.includes('data-ai-composer="portfolio-sticky"'), "unified consultation composer must stay scoped to the conversation");
assert(admin.includes('href="/admin/ai-consulting-preview"'), "admin dashboard must expose the Phase 7 design preview");

console.log("AI consulting Phase 7 UX regression passed ✓");
