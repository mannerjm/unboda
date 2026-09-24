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
const memoryApi = read("app/api/ai-consulting/memories/route.ts");
const answerPipeline = read("app/lib/aiConsulting/answerPipeline.ts");

assert(portfolio.includes("listUserPaidAnalysisSummaries"), "portfolio must derive owned scope from active paid-analysis summaries");
assert(portfolio.includes('summary.profileId === input.profileId'), "portfolio owned scope must stay profile-scoped");
assert(portfolio.includes('summary.reportStatus === "completed"'), "only completed paid reports may expand consulting scope");
assert(portfolio.includes("Boolean(summary.analysisEditionKey)"), "portfolio scope must remain exact-edition bound");
assert(portfolio.includes("getAiConsultingCreditBalance(input)"), "portfolio must use the existing shared profile credit balance");
assert(portfolio.includes("evaluateAiConsultingScope"), "portfolio router must reuse existing deterministic product scope evaluation");
assert(portfolio.includes("routingScore("), "portfolio router must rank eligible owned reports deterministically");
assert(portfolio.includes('reason: "AMBIGUOUS_OWNED_ANALYSIS"') && !portfolio.includes('state: "clarify_source"'), "ambiguous questions must request a clearer topic without requiring report selection or charging");
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
assert(page.includes("getAiConsultingPortfolioState") && page.includes("reportEntryMatchesProfile") && page.includes("verifiedReport") && page.includes("initialPortfolioState={initialPortfolioState}") && !page.includes("messageSource: requestedReport"), "report entry must verify ownership but load unified history instead of fixing the consultation to one report");
assert(client.includes("initialPortfolioState ?? null") && client.includes("setPortfolio(initialPortfolioState)") && client.includes("reportEntryUnavailable"), "server-verified report context must be available on first render and invalid links must not claim an unrelated report");

for (const copy of [
  "나를 기억하는 AI 운세 상담",
  "새 분석을 구매하면 이 상담에서 답할 수 있는 범위도 함께 넓어집니다.",
  "공용 질문권",
  "모든 보유 분석에서 함께 사용",
  "주제를 선택할 필요 없이 질문해 주세요.",
  "답할 수 없는 질문은 차감하지 않아요.",
]) {
  assert(client.includes(copy), `unified AI consulting UX must expose: ${copy}`);
}
assert(client.includes('fetch("/api/ai-consulting/portfolio/question"'), "unified composer must submit through the portfolio router");
assert(client.includes("preferredProductId") && client.includes("preferredEditionKey") && client.includes("preferContinuation: true"), "previous conversation can inform automatic routing without customer-selected report restrictions");
assert(client.includes('data-section="portfolio-conversation"') && client.includes('data-ai-composer="portfolio-sticky"'), "unified composer must stay inside the conversation section");
assert(client.includes("sourceTitle") && client.includes("sourceEditionLabel"), "each aggregated message must show which report/edition grounded it");
assert(client.includes("threadId: message.threadId"), "memory writes must preserve the originating internal thread");
assert(client.includes("showAllAnalyses") && client.includes("ownedAnalyses.slice(0, 3)"), "the purchase library must use all completed owned reports, not the birth-time-filtered consultation scope");
assert(client.includes("filteredAnalyses.slice(0, visibleAnalysisLimit)") && client.includes("분석 8개 더 보기"), "expanded analyses must remain bounded and searchable, never render hundreds of chips at once");
assert(client.includes("visibleAnalyses.map((analysis) => (") && !client.includes("setChosenSource") && !client.includes("loadPortfolio(analysis)") && !client.includes("시작 기준"), "purchased report chips must remain read-only and must not set the consultation basis");
assert(portfolio.includes("ownedAnalyses: AiConsultingPortfolioAnalysis[]") && portfolio.includes("ownedAnalyses.push(") && portfolio.includes("analyses: currentAnalyses, ownedAnalyses"), "all completed owned reports must be returned separately from the automatic routing set");
assert(portfolio.includes("AnalysisInputSnapshotSchema.safeParse(") && portfolio.includes("canonicalAnalysisInputMatches(") && portfolio.includes("historicalCohort"), "previous-input report entry must route across every matching purchase-time snapshot, without mixing changed birth times");
assert(client.includes("portfolio?.ownedAnalyses ?? []") && client.includes("ownedAnalysisLibrary") && client.includes("portfolio?.analyses.length === 0 ? ownedAnalysisLibrary : null"), "owned reports must be discoverable even when no current-input reports can answer new questions");
assert(client.includes('href="#owned-analysis-selector"') && client.includes('id="owned-analysis-selector"') && client.includes("내가 구매한 분석 보기 ↓"), "customers can inspect owned analyses without choosing the active consultation basis");
assert(client.includes("전체 보기 · +") && client.includes("접기"), "owned analysis display must support expand/collapse for the full portfolio");
assert(client.includes("최근 구매한 분석 ${Math.min(3, ownedAnalyses.length)}개") && client.includes("전체 보유 분석 ${filteredAnalyses.length}개"), "owned-analysis labels must show the full purchased count even when eligible consultation scope differs");
assert(client.includes("답변 완료 시 질문권 1회 차감 · 답할 수 없는 질문은 차감하지 않아요.") && !client.includes("상담 이용 안내"), "consulting guidance must be one readable line without repetitive policy chips");
assert(!client.includes("dangerouslySetInnerHTML"), "unified consultation must render model output as plain text");

assert(entry.includes("질문권은 보유 분석에서 함께 사용해요."), "paid-report entry must explain shared credits in customer language");
assert(entry.includes("presentation.productTitle") && client.includes("질문권은 모든 보유 분석에서 함께 사용해요."), "report entry must identify its purchased analysis; shared-credit scope must stay clear in simple Korean");
assert(entry.includes("const href = `/ai-consulting?") && entry.includes("지난 상담 이어가기"), "report entry must preserve report-scoped routing and concise continuation copy into the shared hub");
assert(entry.includes("이 리포트로 AI에게 질문하기") && entry.includes("AI 상담 화면 보기") && entry.includes("새 답변을 받으려면 질문권이 필요해요."), "first-time buyer must see a clear report-scoped action without claiming zero-credit consultations are free");

assert(library.includes("AI 상담 · 구매한 분석 이어보기") && library.includes("리포트 읽고 끝내지 말고, AI에게 바로 물어보세요"), "purchased library must foreground a concise report-to-AI action");
assert(library.includes("새 답변에는 질문권이 필요해요."), "library must not imply AI answers are free without question credits");
assert(library.includes("구매한 분석 바탕으로 답변") && library.includes("리포트 이어서 질문"), "library must concisely explain report-grounded AI consulting");
assert(library.includes("지난 상담 이어보기") && library.includes("리포트 읽고 끝내지 말고, AI에게 바로 물어보세요"), "library should expose continuation without a lengthy policy paragraph");
assert(library.includes("통합 AI 상담 바로가기"), "library must expose a single prominent global AI consultation entry");
assert(library.includes("다른 심층 분석이나 전문 분석을 둘러볼 수 있습니다."), "library next-question copy must remain future-category neutral");
assert(library.includes("전문 분석 보기"), "library specialist CTA must use the generic label");
assert(!library.includes("이 리포트로 질문하기"), "purchased library must avoid per-report AI consultation buttons now that the unified hub is the single entry point");

assert(preview.includes("AiConsultingPortfolioClient"), "operator preview must render the unified portfolio client");
assert(preview.includes("재물·이직·관계·학업·창업 리포트를 한 상담에서 자동 연결"), "operator preview must demonstrate multi-product scope with enough samples for expansion");
assert(preview.includes("previewData={PREVIEW_DATA}"), "operator preview must remain static and non-mutating");
assert(preview.includes('productId: "study-learning-strategy"') && preview.includes('productId: "business-startup-readiness"'), "operator preview must include more than three analyses so expand/collapse is visible");
assert(!client.includes('공용 질문권 {portfolio.questionsRemaining}회'), "shared credit count must not be duplicated in the continuation card");
assert((client.match(/질문권 구매하기 →/g) ?? []).length === 1 && client.includes("질문권 구매 후 상담하기 →"), "credited customers can buy more; zero-credit customers get the composer-adjacent purchase action");
assert((client.match(/질문권 상품 안내 보기 →/g) ?? []).length === 2 && !client.includes("질문권 상품 보기 →"), "review-only credit products must show the informational link in only the active balance state");
assert(!client.includes("credit-recharge-title") && !client.includes("질문권이 0회예요. 이어서 질문해 보세요!"), "zero-credit state must not repeat a full-width purchase banner");
assert(!client.includes("AI_CONSULTING_CREDIT_BUNDLES"), "bundle prices belong on the credit purchase page, not in a duplicate consultation banner");
assert(client.includes("질문은 이 탭에 임시 보관되며 지금은 전송되지 않아요.") && client.indexOf('data-ai-composer="portfolio-sticky"') < client.indexOf("{ownedAnalysisLibrary}"), "zero-credit customers must see the same composer before the report library, without duplicate empty panels");
assert((client.match(/href=\{creditPurchaseHref\}/g) ?? []).length === 2 && client.includes("portfolio.questionsRemaining > 0 ? (") && client.includes("&& portfolio.questionsRemaining > 0 ? ("), "the header purchase link and composer-adjacent zero-credit link must be mutually exclusive in the rendered UI");
assert(portfolio.includes('order("created_at", { ascending: false })') && portfolio.includes(".limit(41)") && !portfolio.includes(".limit(200)"), "conversation must load the latest page rather than the first 200 oldest messages");
assert(client.includes("loadOlderMessages") && client.includes("이전 상담 더 보기") && portfolioApi.includes("messageBefore"), "older conversations must have an authenticated cursor-based retrieval path");
assert(client.includes("preferContinuation") && portfolio.includes("input.preferContinuation") && portfolioQuestionApi.includes("input.preferContinuation === true"), "follow-up context must be validated by the server without pinning unrelated new questions");
assert(client.includes("showMemories") && client.includes("내 기억 보기"), "saved memories must remain editable but folded until requested");
assert(client.includes("portfolio.questionsRemaining > 0 ? <div>") && client.includes("추천 질문"), "suggested question buttons must not appear when no question can be submitted");
assert(client.includes("function unifiedSuggestedQuestion(analysis: AiConsultingPortfolioAnalysis)") && client.includes("for (const analysis of portfolio.analyses.slice(0, 8))"), "unified question examples must use the currently eligible purchased analyses, not the unfiltered historical library or the report-entry source");
assert(client.includes("재물운과 관련해 수입과 지출에서 지금 가장 먼저 점검할 점은 뭐야?") && client.includes("수면 리듬을 지키려면 취침 전 생활 습관 중 무엇부터 점검해야 할까?"), "money and sleep reports must produce distinguishable topic-first questions");
assert(client.includes("const question = unifiedSuggestedQuestion(analysis)") && !client.includes("const first = analysis.suggestedQuestions[0]") && client.includes("추천 질문 · 자동 연결"), "recommendations must name their topic rather than copying this-report prompts into a hub with no selected report");
assert(client.includes("onClick={() => setQuestion(suggestion)}") && client.includes("await sendQuestion(question)"), "topic suggestions must fill the same automatic-routing composer without auto-submitting or pinning a product");

assert(client.includes("visibleChatMessages.length === 0 && (portfolio.questionsRemaining > 0 || hasOlderMessages)") && !client.includes("첫 상담 기록이 아직 없어요. 위에서 질문권 상품과 이용 방법을 확인해 주세요.") && client.includes("visibleChatMessages.map((message)"), "zero-credit new visitors must not see a repeated empty-history warning; previously saved messages remain readable");
assert(client.includes("현재 질문권 결제 준비 중") && client.includes("질문권 상품 안내 보기 →"), "review-only checkout must not imply customers can immediately buy credits");
assert(client.includes("const draftKey = `unboda:ai-consulting:draft:${profileId}`") && client.includes("window.sessionStorage.getItem(draftKey)") && client.includes("window.sessionStorage.setItem(draftKey, question)") && client.includes("window.sessionStorage.removeItem(draftKey)"), "unsent questions must survive the credit-checkout roundtrip in tab-scoped, profile-scoped storage and clear after an answer");
assert(client.includes("draftHydratedFor !== draftKey") && client.includes("setDraftHydratedFor(draftKey)"), "draft hydration must not overwrite a different profile draft on navigation");
assert(client.includes("portfolio.questionsRemaining <= 0") && client.includes("if (!portfolio || portfolio.questionsRemaining <= 0) return;"), "zero-credit questions must never reach the submit API, even via a programmatic form submit");
assert(client.includes('id="portfolio-question"') && client.includes('data-ai-composer="portfolio-sticky"') && !client.includes("              {portfolio.questionsRemaining > 0 ? (\n                <form"), "the text input must be present regardless of credit balance");
assert(!client.includes("OWNED ANALYSES") && !client.includes("LONG-TERM MEMORY") && client.includes("내 보유 분석") && client.includes("내 기억"), "customer-facing card headings must use simple Korean");
assert(portfolio.includes("id.lt.${input.beforeId}") && portfolioApi.includes("messageBeforeId") && client.includes("beforeId: oldest.id"), "history pagination must use timestamp plus message ID to avoid dropping messages sharing a timestamp");
assert(portfolio.includes("messageSource?: { productId: string; analysisEditionKey: string } | null") && portfolio.includes("analyses: messageAnalyses"), "large multi-report portfolios must retrieve selected report history without paging unrelated conversations");
assert(portfolioApi.includes("messageProductId") && portfolioApi.includes("messageEdition") && portfolioApi.includes("messageSource:"), "report-scoped history must pass through the existing authenticated portfolio API");
assert(!client.includes('portfolioParams.set("messageProductId"') && !client.includes('params.set("messageProductId"') && client.includes("const visibleChatMessages = allLoadedMessages;"), "unified consultation and paged history must not be filtered to a customer-selected source");
assert(client.includes("portfolioRequestSeq.current"), "slow asynchronous history responses must not replace a newer consultation");
assert(client.includes("통합 AI 상담") && !client.includes("activeAnalysis") && !client.includes("sourceMode") && !client.includes("다른 분석으로 상담하기") && !client.includes('kind: "select"'), "unified composer must not present a fixed report title, report-selection controls or source-choice prompts");
assert(client.includes("message.sourceTitle") && client.includes("message.sourceEditionLabel"), "the report actually used must remain visible on individual messages, not pinned above the composer");
assert(portfolio.includes("SELECTED_REPORT_OUT_OF_SCOPE") && portfolio.includes("!input.preferContinuation") && client.includes("preferContinuation: true"), "legacy explicit-report API boundary stays safe while unified customer questions automatically route over all owned analyses");
assert(client.includes("saveEditedMemory") && client.includes('method: "PATCH"') && client.includes("기억 수정"), "customers must be able to correct outdated user-stated memories in the folded panel");
for (const boundary of ['export async function PATCH(request: Request)', 'resolveProfileBoundary(input.profileId)', '.eq("user_id", boundary.user.id)', '.eq("profile_id", boundary.profile.id)', '.eq("provenance", "USER_STATED")', '.eq("status", "active")', '"수정할 기억을 찾지 못했습니다."']) {
  assert(memoryApi.includes(boundary), `saved-memory edit must preserve owner, profile, provenance and active-state boundary: ${boundary}`);
}
assert(!memoryApi.includes("grantEntitlement") && !memoryApi.includes("reserveAiConsultingQuestion"), "updating a remembered fact must never change purchases or question credits");
assert(answerPipeline.includes("질문에 직접 대답하는 핵심 답변") && answerPipeline.includes("실제 구매 분석 본문에서 이번 질문과 직접 연결되는 구체적인 결과") && answerPipeline.includes("일반 생활 조언을 마치 유료 리포트의 고유 결과처럼 표현하지 않는다"), "new AI replies should lead with an easy direct answer grounded in an actual paid-report detail rather than generic advice");
assert(answerPipeline.includes("질문을 반복해서 쓰거나") && answerPipeline.includes("작은 행동 1~2개만 쓴다"), "replies must avoid repeating customer questions and provide only a short actionable follow-up");
assert(answerPipeline.includes("전체 250~500자 내외") && answerPipeline.includes("합계 최대 150자") && answerPipeline.includes("최대 2개") && answerPipeline.includes("AI_CONSULTING_MAX_ACCEPTED_ANSWER_CHARS = 950"), "new paid consulting answers must be brief and have a readable core before the optional report evidence");
assert(client.includes("const firstSentenceEnd = main.search(") && client.includes("답변 더 읽기") && client.includes("const shortAnswer = hasLongAnswer"), "long older paid answers must retain their full text while starting with a complete short sentence");
assert(client.includes("AI가 기억하면 좋을 내용을 적어주세요") && !client.includes("기억 종류") && client.includes("내 상황이나 목표를 직접 적고 저장해 주세요."), "customer memory UX should ask only for their own notes and keep direct confirmation before save");

assert(client.includes("function ConsultingAnswer({ content }") && client.includes('<ConsultingAnswer content={message.content} />') && client.includes("핵심 답변") && client.includes("지금 해볼 일") && client.includes("왜 이렇게 보나요? · 구매 분석 근거"), "answer layout should show the answer and action first and let customers expand the underlying report evidence");
assert(client.includes('if (!main || !action || !report || userFacts === undefined)') && client.includes('return <div className="whitespace-pre-wrap">{content}</div>'), "unknown older answer formats must remain readable without losing content");
assert(client.includes('inferCustomerMemoryKind(content)') && client.includes('memoryDraftContent') && !client.includes('memoryDraftKind') && !client.includes('기억 종류') && !client.includes('<select'), "memory input must be one simple customer-authored field; only explicit goals are categorized automatically");
assert(client.includes('kind: inferCustomerMemoryKind(content)') && client.includes('const content = memoryDraftContent.trim()') && !client.includes('const content = message.content.trim()'), "memory POST must use only the customer-written content and infer an explicit goal conservatively, never the whole question");
assert(memoryApi.includes('isUserMemoryKind(input.kind)') && memoryApi.includes('.eq("role", "user")') && memoryApi.includes('provenance: "USER_STATED"'), "existing server authorization and provenance checks must protect explicitly saved goal or situation");



assert(creditMigration.includes("unused paid questions can be used later against any separately purchased"), "profile credit ledger must remain explicitly cross-product");
assert(runtimeMigration.includes("one AI credit purchase may authorize multiple separately purchased analyses"), "runtime must remain shared-credit across owned analyses");
assert(runtimeMigration.includes("profile-wide balance"), "runtime reservation must remain profile-wide");
assert(runtimeMigration.includes("base_entitlement_id"), "internal access must remain pinned to an exact entitlement even with unified UX");

console.log("Unified AI consulting portfolio regression passed ✓");
