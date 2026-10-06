import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");

const migration = read("supabase/migrations/20261006193000_trust_verified_reviews.sql");
const service = read("app/lib/reviews/server.ts");
const api = read("app/api/reviews/route.ts");
const moderationApi = read("app/api/admin/reviews/[reviewId]/route.ts");
const publicSummary = read("app/components/ProductReviewSummary.tsx");
const editor = read("app/components/VerifiedReviewPanel.tsx");
const trustCard = read("app/components/TrustPrinciplesCard.tsx");
const trustPage = read("app/trust/page.tsx");
const productDetail = read("app/components/PremiumProductDetail.tsx");
const compatibilityPreview = read("app/components/CompatibilityReportValuePreview.tsx");
const checkout = read("app/checkout/[productId]/CheckoutAccessPanel.tsx");
const familyCheckout = read("app/checkout/[productId]/FamilyExtendedCheckoutAccessPanel.tsx");
const ai = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const standardReport = read("app/paid-analysis/[productId]/report/page.tsx");
const pairReport = read("app/special-analysis/compatibility/PairCompatibilityReportPage.tsx");
const parentReport = read("app/special-analysis/compatibility/family/parent-child/report/page.tsx");
const siblingReport = read("app/special-analysis/compatibility/family/siblings/report/page.tsx");
const otherReport = read("app/special-analysis/compatibility/family/other/report/page.tsx");
const adminPage = read("app/admin/page.tsx");
const adminReviews = read("app/admin/reviews/page.tsx");
const adminModeration = read("app/admin/reviews/AdminReviewModerationClient.tsx");
const operatorServer = read("app/lib/operators/server.ts");
const privacy = read("app/privacy/page.tsx");
const terms = read("app/terms/page.tsx");
const home = read("app/components/HomeExperience.tsx");
const reviewsPage = read("app/reviews/page.tsx");

assert(migration.includes("create table if not exists public.paid_product_reviews"), "verified reviews table must be migrated");
assert(migration.includes("constraint paid_product_reviews_purchase_unique unique (purchase_id)"), "one review per purchase must be enforced in Postgres");
assert(migration.includes("alter table public.paid_product_reviews enable row level security"), "review table must have RLS enabled");
assert(migration.includes("revoke all on table public.paid_product_reviews from anon, authenticated"), "browser roles must not receive direct review-table access");
assert(migration.includes("grant select, insert, update, delete on table public.paid_product_reviews to service_role"), "server role must mediate review access");
assert(migration.includes("status in ('PENDING','PUBLISHED','HIDDEN')"), "review states must remain bounded");
assert(migration.includes("operator_moderate_paid_product_review") && migration.includes("'REVIEW_MODERATE'") && migration.includes("'REVIEW'"), "review moderation must be audited atomically");

assert(service.includes('import "server-only"'), "review service must remain server-only");
for (const boundary of [
  '.eq("user_id", input.userId)',
  '.eq("profile_id", input.profileId)',
  '.eq("product_id", input.productId)',
  '.eq("analysis_edition_key", input.analysisEditionKey)',
  '.eq("status", "completed")',
  '.not("purchase_id", "is", null)',
]) assert(service.includes(boundary), "purchase verification boundary missing: " + boundary);
assert(service.includes('.eq("status", "PUBLISHED")'), "public review surfaces must return published reviews only");
assert(service.includes('status: "PENDING"') && service.includes('onConflict: "purchase_id"'), "new or edited reviews must re-enter moderation and remain one-per-purchase");
assert(service.includes("ai_consulting_threads") && service.includes("base_product_id"), "AI-consulting-used badge must be derived from server records");
assert(service.includes("await requireOperator()") && service.includes("operator_moderate_paid_product_review"), "admin review reads/writes must stay operator-gated");
assert(service.includes('input.status === "HIDDEN" && reason.length < 3'), "hidden reviews must require an accountable moderation reason");

assert(api.includes("getCurrentUser()") && api.includes("saveVerifiedReview") && api.includes("deleteVerifiedReview"), "review writes/deletes must use verified server session");
assert(moderationApi.includes("moderateReview") && moderationApi.includes("OperatorAuthorizationError"), "moderation API must use operator-only service");
assert(!api.includes("userId: body.userId") && !api.includes("purchaseId: body.purchaseId"), "browser must never choose review ownership or purchase identity");

for (const copy of ["구매 인증 후기","실제로 이 분석을 구매한 고객의 후기","후기 수를 부풀리지 않고"]) {
  assert(publicSummary.includes(copy), "public review proof copy missing: " + copy);
}
assert(publicSummary.includes('href="/reviews"'), "product review proof must link to the overall verified review feed");
assert(reviewsPage.includes("실제 구매 고객이 남긴 후기") && reviewsPage.includes("실명·프로필·출생정보·구매 식별자는 공개하지 않습니다."), "public review feed must explain purchase verification and privacy");
assert(!publicSummary.includes("user_id") && !reviewsPage.includes("profile_id") && !reviewsPage.includes("purchase_id"), "public review UI must not expose private identifiers");

for (const copy of ["이번 분석은 어떠셨나요?","후기 수정","후기 삭제","개인정보나 다른 사람의 실명","AI 상담이 리포트를 이어서 이해"]) {
  assert(editor.includes(copy), "verified review editor missing: " + copy);
}
assert(!editor.includes("리뷰 작성 시") && !editor.includes("질문권 지급") && !editor.includes("보상"), "launch reviews must not be incentivized");
assert(editor.includes('status: "PENDING" | "PUBLISHED" | "HIDDEN"'), "customer must see truthful moderation state");

assert(productDetail.includes("<ProductReviewSummary") && productDetail.includes("<TrustPrinciplesCard"), "premium product details must show verified proof and trust principles before purchase");
for (const id of [
  "COMPATIBILITY_ROMANTIC_PRODUCT_ID",
  "COMPATIBILITY_WORKPLACE_PRODUCT_ID",
  "COMPATIBILITY_FRIEND_PRODUCT_ID",
  "COMPATIBILITY_BUSINESS_PRODUCT_ID",
  "COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID",
  "COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID",
  "COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID",
]) assert(compatibilityPreview.includes(id), "compatibility review mapping missing: " + id);
assert(compatibilityPreview.includes("<ProductReviewSummary"), "all compatibility preview modes must show product-specific verified reviews");

assert(checkout.includes("<TrustPrinciplesCard compact"), "standard/pair/parent-child checkout must show compact trust rules");
assert(familyCheckout.includes("<TrustPrinciplesCard compact"), "siblings/other-family checkout must show compact trust rules");
assert(ai.includes("<TrustPrinciplesCard compact"), "AI consulting must disclose trust rules");

for (const report of [standardReport, pairReport, parentReport, siblingReport, otherReport]) {
  assert(report.includes("VerifiedReviewPanel"), "every paid report family must support verified review creation");
  assert(report.indexOf("AiConsultingEntryCard") < report.indexOf("VerifiedReviewPanel"), "review request must follow the AI continuation entry");
  assert(report.indexOf("VerifiedReviewPanel") < report.indexOf("Phase9NextAnalysisSection"), "review request must appear before next-purchase upsell");
}

for (const copy of [
  "구매한 분석을 기준으로 AI 상담",
  "내가 허용한 내용만 장기 기억",
  "완료된 구매 리포트는 다시 열람",
  "정상 답변 완료 기준으로 질문권 차감",
  "구매 인증 후기만 표시",
]) assert(trustPage.includes(copy) || trustCard.includes(copy), "trust principle missing: " + copy);
assert(trustPage.includes('href="/privacy"') && trustPage.includes('href="/terms"') && trustPage.includes('href="/refund"') && trustPage.includes('href="/support"'), "trust page must connect to authoritative policy/support pages");
assert(!trustPage.includes("98%") && !trustPage.includes("대한민국 1위") && !trustPage.includes("적중률 9"), "trust surface must not invent unverified proof");
assert(home.includes('href="/trust"') && home.includes("운보다 이용 원칙"), "home must expose trust principles");

assert(adminPage.includes("getAdminReviewDashboard") && adminPage.includes("<AdminReviewOverview"), "main admin must surface review KPIs");
assert(adminReviews.includes("await requireOperator()") && adminReviews.includes("구매 인증 후기 운영"), "review console must be operator-only");
assert(adminModeration.includes("낮은 평점이나 서비스 불만 자체는 숨김 사유가 아닙니다."), "moderation UI must protect legitimate negative reviews");
assert(operatorServer.includes('"REVIEW_MODERATE"') && operatorServer.includes('"REVIEW"'), "operator audit vocabulary must include review moderation");

assert(privacy.includes("구매 인증 후기") && privacy.includes("계정·프로필·구매 식별자와 출생정보를 표시하지 않습니다"), "privacy policy must disclose review processing and public minimization");
assert(terms.includes("제17조 구매 인증 후기") && terms.includes("낮은 평점이나 서비스에 대한 비판이라는 이유만으로 숨김 처리하지 않습니다"), "terms must disclose verified review and fair moderation rules");

const privacyNumbers = [...privacy.matchAll(/<h2>(\d+)\./g)].map((match) => Number(match[1]));
assert.deepEqual(privacyNumbers, Array.from({ length: 16 }, (_, index) => index + 1), "privacy sections must stay sequential after review disclosure");
const termNumbers = [...terms.matchAll(/<h2>제(\d+)조/g)].map((match) => Number(match[1]));
assert.deepEqual(termNumbers, Array.from({ length: 24 }, (_, index) => index + 1), "terms articles must stay sequential after review terms");

console.log("trust-verified-reviews-regression: PASS");
