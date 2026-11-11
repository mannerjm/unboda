import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { groupTopicCatalogProductsByCategory, listPeriodCatalogProducts } from "../app/lib/premiumCatalog";
import { getPaidAnalysisTopicConfig } from "../app/lib/paidAnalysisTopicConfig";

const page = readFileSync("app/deep-analysis/page.tsx", "utf8");
const catalog = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const storefront = readFileSync("app/components/PremiumCatalogMarketplace.tsx", "utf8");
const shell = readFileSync("app/components/AppShell.tsx", "utf8");

for (const preserved of [
  "getCurrentUser",
  "getActiveProfile",
  "AppShell",
  "PremiumCatalogSection",
]) {
  assert(page.includes(preserved), `phase 2 must preserve deep-analysis boundary: ${preserved}`);
}

for (const queryContract of ["searchParams", "initialMode", "initialCategory"]) {
  assert(page.includes(queryContract), `phase 2 must support discovery entry state: ${queryContract}`);
}

for (const customerCopy of [
  "원하는 분석 바로 찾기",
  "어떤 운이 궁금하세요?",
  "질문으로 찾는 심층 분석",
  "무엇이 궁금한지부터 선택하세요.",
  "어떤 영역이 마음에 걸리나요?",
  "지금 어떤 질문에 가장 가까우세요?",
  "어느 시간의 흐름이 궁금하세요?",
]) {
  assert(page.includes(customerCopy) || catalog.includes(customerCopy), `phase 2 customer discovery copy missing: ${customerCopy}`);
}

for (const category of ["relationship", "career", "money", "growth", "social", "business", "health"]) {
  assert(catalog.includes(`${category}: {`), `phase 2 must keep customer discovery metadata for ${category}`);
}

assert(catalog.includes('fetch("/api/premium-catalog/status")'), "phase 2 must preserve purchased-report status loading");
assert(catalog.includes("summary.profileId === profileId"), "phase 2 must preserve profile-scoped paid status");
assert(catalog.includes("currentOwnedProductIds.has(summary.productId)"), "phase 2 must preserve current-edition ownership gating");
assert(catalog.includes("PremiumProductDetail"), "phase 2 must preserve the existing purchase/detail surface");
assert(catalog.includes("decision.decisionQuestion"), "topic discovery must lead with the existing purchase-decision question");
assert(catalog.includes("decision.primaryQuestion"), "period discovery must lead with the existing period purchase question");
assert(catalog.includes("formatPrice(product.id)"), "question cards must keep exact configured product pricing visible");
assert(catalog.includes("주제로 찾기") && catalog.includes("시기로 찾기"), "phase 2 must expose topic and period discovery modes");

const topicGroups = groupTopicCatalogProductsByCategory();
assert(topicGroups.length >= 7, "launch topic catalog must keep all existing topic groups");
for (const group of topicGroups) {
  assert(group.products.length > 0, `topic group ${group.category} must remain populated`);
  for (const product of group.products) {
    const decision = getPaidAnalysisTopicConfig(product.id)?.purchaseDecision;
    assert(decision?.decisionQuestion, `topic ${product.id} must have a question-first purchase decision`);
  }
}

const periodProducts = listPeriodCatalogProducts();
assert(periodProducts.length >= 7, "launch period catalog must preserve the existing period range");
for (const product of periodProducts) {
  assert(product.purchaseDecision?.primaryQuestion, `period ${product.id} must have a question-first purchase decision`);
}

for (const forbidden of ["requestPayment", "markOrderPaid", "grantEntitlement", "generatePaidReport"]) {
  assert(!page.includes(forbidden) && !catalog.includes(forbidden), `phase 2 discovery must not embed commercial runtime logic: ${forbidden}`);
}


assert(catalog.includes("PremiumCatalogMarketplace") && catalog.includes('NEXT_PUBLIC_PREMIUM_STOREFRONT === "legacy"'),
  "the new storefront must render by default while preserving a reversible legacy layout");
assert(storefront.includes("topicGroups.map") && storefront.includes("periodProducts.map"),
  "storefront must present all seven topic categories and seven period navigation items");
assert(storefront.includes("currentGroup.products.map") && storefront.includes("onSelectProduct(product.id)"),
  "topic category must open its own thumbnail product list before detail");
assert(storefront.includes("choosePeriod(product.id)") && storefront.includes("<PremiumProductDetail"),
  "period navigation must open an existing product detail without a second product grid");
assert(storefront.includes("getProductPricing(productId)") && storefront.includes("getPaidAnalysisTopicConfig"),
  "storefront must retain product-specific prices and original purchase questions");
assert(storefront.includes("/api/reviews?productId=") && storefront.includes("summary.count<=0"),
  "ratings must come only from published purchase-verified reviews and remain absent without reviews");
assert(storefront.includes("stateByProductId.get(selected.id)") && storefront.includes("savedProductIds.has(selected.id)"),
  "storefront details must preserve edition ownership, report state, and saved state");
assert(!storefront.includes("requestPayment") && !storefront.includes("grantEntitlement"),
  "storefront cannot implement its own financial or permission logic");


// Customer request: global sidebar is the only desktop category list.
// Topic selection goes directly to the selected topic's product cards;
// period selection goes directly to the existing product detail.
for (const category of ["growth", "business", "health", "money", "career", "social", "relationship"]) {
  assert(shell.includes(`category: "${category}"`), `global sidebar must retain topic category ${category}`);
}
for (const product of listPeriodCatalogProducts()) {
  assert(shell.includes(`productId: "${product.id}"`), `global sidebar must link directly to period product ${product.id}`);
}
assert(shell.includes('item.activeHref === "/deep-analysis" && isDeepCatalog')
  && shell.includes('href={deepCatalogHref("topic", category)}')
  && shell.includes('href={deepCatalogHref("period", productId)}'),
  "global deep-analysis sidebar must expose direct topic and period navigation under the existing item");
assert(shell.includes('profileId ? `&profileId=${encodeURIComponent(profileId)}`'),
  "category and period navigation must preserve the analysis profile context");
assert(!storefront.includes("<aside") && !storefront.includes('md:grid-cols-[166px_minmax(0,1fr)]'),
  "the deep-analysis body must not render a second desktop category menu");
assert(storefront.includes('grid-cols-[116px_minmax(0,1fr)]') && storefront.includes('currentGroup.products.map'),
  "topic selection should reveal compact illustrated product cards immediately");
assert(storefront.includes("lg:hidden") && storefront.includes("choosePeriod(product.id)"),
  "mobile users must still reach topic and period choices without a desktop sidebar");
assert(page.includes('initialProductId={initialProductId}') && page.includes('initialMode === "period"')
  && page.includes('key={`${initialMode}:${initialCategory ?? ""}:${initialProductId ?? ""}`}'),
  "deep-link changes must remount the correct topic or period detail instead of retaining stale catalog state");
assert(catalog.includes('periodProducts.some((product) => product.id === initialProductId)'),
  "only existing period products can open directly from URL");


const photoRegistry = readFileSync("app/lib/premiumProductPhotos.ts", "utf8");
const growthPhotoProductIds = [
  "study-learning-strategy",
  "study-exam-preparation",
  "study-focus-routine",
  "study-credential-decision",
];
const growthCatalogIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "growth")?.products.map((product) => product.id) ?? []
);
for (const id of growthPhotoProductIds) {
  assert(growthCatalogIds.has(id), `Photographic thumbnail must map to a real launched growth product: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Each growth product must have its own first-party photograph: ${id}`);
  const photo = statSync(`public/images/premium/${id}.jpg`);
  assert(photo.size > 7000 && photo.size < 160000,
    `Growth photo must be a real compressed thumbnail, not a missing or oversized asset: ${id}`);
}
assert(new Set(growthPhotoProductIds).size === 4, "Growth thumbnails must not reuse a product ID");
assert(storefront.includes("ProductArtwork") && storefront.includes("PREMIUM_PRODUCT_PHOTOS")
  && storefront.includes("onError={()=>setPhotoUnavailable(true)}")
  && storefront.includes("<CatalogArt category={category} seed={productId}"),
  "The list and detail must show product-specific images with safe first-party SVG fallback");
assert(shell.includes("rounded-lg px-2.5 py-2.5 text-sm font-semibold leading-5"),
  "Deep-analysis sidebar links must remain readable at 14px");
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "Deep-analysis product questions must remain legible at 16px without changing card structure");
assert(photoRegistry.includes('sourcePage: "https://www.pexels.com/photo/close-up-photo-of-diploma-7942430/"'),
  "Credential product must retain the vetted certificate-focused photo source and attribution");
assert(photoRegistry.includes('alt: "빨간 리본으로 묶인 여러 장의 증서가 책상 위에 놓인 모습"'),
  "Credential photo needs meaningful alternative text");


// The four launched study product photos have their own short, high-contrast
// thumbnail titles. This is display-only; the official question and product
// detail continue to use canonical registry IDs and text.
const studyThumbnailLabels: Record<string, string> = {
  "study-learning-strategy": "공부법 찾기",
  "study-exam-preparation": "시험 준비",
  "study-focus-routine": "집중 루틴",
  "study-credential-decision": "자격증 도전",
};
for (const [id, title] of Object.entries(studyThumbnailLabels)) {
  assert(
    storefront.includes(`"${id}": "${title}"`),
    `The study thumbnail must show its distinct short title for ${id}`,
  );
}
assert(storefront.includes('thumbnailTitle=STUDY_THUMBNAIL_TITLES[product.id] ?? BUSINESS_THUMBNAIL_TITLES[product.id]'),
  "Product titles must be mapped by canonical study/business IDs instead of generic category art");
assert(storefront.includes('pointer-events-none absolute inset-0 z-10')
  && storefront.includes('bg-gradient-to-t from-black/85 via-black/20 to-transparent')
  && storefront.includes('line-clamp-2 text-[17px] font-extrabold'),
  "Overlay should show only a readable, click-through item title over the photograph");
assert(!storefront.includes('>학업·성장운</span>'),
  "Do not put the redundant category name on study or business thumbnails");
assert(storefront.includes('{getReadablePaidQuestion(product.id,question??product.title)}')
  && storefront.includes('onClick={()=>onSelectProduct(product.id)}')
  && storefront.includes('<PremiumProductDetail'),
  "Overlay must not replace official question text, product selection or purchase detail flow");
assert(storefront.includes('top-1.5 z-20') && storefront.includes('top-8 z-20'),
  "Recommendation/purchase badges should remain readable at the top, away from overlay titles");


const businessThumbnailLabels: Record<string,string> = {
  "business-startup-readiness": "창업 준비",
  "business-expansion-control": "사업 확장",
  "business-client-relationship": "고객 관계",
  "business-team-management": "팀 운영",
};
const launchBusinessProductIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "business")?.products.map((product) => product.id) ?? []
);
assert(launchBusinessProductIds.size === 4, "Launch business category must keep its original four products");
for (const [id, label] of Object.entries(businessThumbnailLabels)) {
  assert(launchBusinessProductIds.has(id), `Business image target must be a real launched product: ${id}`);
  assert(storefront.includes(`"${id}": "${label}"`), `Business product must display distinct short title: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Business product must map to its own self-hosted licensed photo: ${id}`);
  const photo = statSync(`public/images/premium/${id}.jpg`);
  assert(photo.size > 7000 && photo.size < 180000,
    `Business photo must be real, compressed and present: ${id}`);
}
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "Study and business question titles must use the same approved 16px size");
assert(storefront.includes('onClick={()=>onSelectProduct(product.id)}') && storefront.includes('<PremiumProductDetail'),
  "Business photo and overlay must never replace existing product detail, report or checkout entry");


const healthThumbnailLabels: Readonly<Record<string,string>> = {
  "health-energy-recovery": "에너지 회복",
  "health-sleep-rhythm": "수면 리듬",
  "health-stress-regulation": "스트레스 조절",
  "health-burnout-risk": "과부하 점검",
  "health-habit-continuity": "생활 습관",
  "health-body-signal-review": "몸의 신호",
};
const launchedHealthIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "health")?.products.map((product) => product.id) ?? []
);
assert(launchedHealthIds.size === 6, "Health category must retain exactly six launched products");
for(const [id,label] of Object.entries(healthThumbnailLabels)) {
  assert(launchedHealthIds.has(id), `Health thumbnail must target an actual product: ${id}`);
  assert(storefront.includes(`"${id}": "${label}"`), `Health photo must have its own short label: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Health photo must be self-hosted and associated with its actual product ID: ${id}`);
  const f = statSync(`public/images/premium/${id}.jpg`);
  assert(f.size > 7000 && f.size < 180000, `Health photo missing or abnormally sized: ${id}`);
}
assert(storefront.includes('HEALTH_THUMBNAIL_TITLES[product.id]'),
  "Health product must reuse short overlaid titles rather than shared category art");
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "Study, business and health product question text must share the approved 16px size");
assert(storefront.includes('onClick={()=>onSelectProduct(product.id)}') && storefront.includes('<PremiumProductDetail'),
  "Health thumbnails may not modify purchase, report or AI consultation navigation");


const moneyThumbnailLabels: Readonly<Record<string,string>> = {
  "wealth": "재물 흐름",
  "money-wealth-accumulation": "돈 모으기",
  "money-leak-risk": "새는 돈 점검",
  "money-saving-discipline": "저축 습관",
  "money-income-stability": "수입 안정",
  "money-debt-repayment": "상환 부담",
  "money-emergency-buffer": "비상자금",
  "money-shared-finance": "공동 재정",
  "money-contract-commitment": "계약 전 점검",
  "money-spending-decision": "큰 지출 판단",
};
const launchedMoneyIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "money")?.products.map((product) => product.id) ?? []
);
assert(launchedMoneyIds.size === 10, "Money category must retain all ten launched products, including legacy wealth");
for(const [id,label] of Object.entries(moneyThumbnailLabels)) {
  assert(launchedMoneyIds.has(id), `Money thumbnail must target a launched product: ${id}`);
  assert(storefront.includes(`"${id}": "${label}"`), `Money card must show its distinct short thumbnail title: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Money product photo must be hosted and keyed by exact product ID: ${id}`);
  const picture = statSync(`public/images/premium/${id}.jpg`);
  assert(picture.size > 7000 && picture.size < 180000, `Money photo missing or abnormally sized: ${id}`);
}
assert(storefront.includes('MONEY_THUMBNAIL_TITLES[product.id]'),
  "Money category must use the existing short photo title overlay, not generic category artwork");
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "All money question titles must retain the 16px approved readable text size");
assert(storefront.includes('onClick={()=>onSelectProduct(product.id)}') && storefront.includes('<PremiumProductDetail'),
  "Money thumbnail changes must not replace existing exact product detail, entitlement or purchase routes");
assert(!storefront.includes('>재물운</span>'), "Money thumbnails should not add redundant top category text");


const careerThumbnailLabels: Readonly<Record<string,string>> = {
  "career": "직업 방향",
  "career-job-change": "이직 고민",
  "career-job-fit": "업무 적성",
  "career-specialization": "전문성 강화",
  "career-promotion-readiness": "승진 준비",
  "career-workplace-adaptation": "직장 적응",
  "career-leadership-readiness": "리더십 역량",
  "career-freelance-transition": "프리랜서 전환",
  "career-workload-recovery": "업무 과부하",
  "career-workplace-relationships": "직장 관계",
};
const launchedCareerIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "career")?.products.map((product) => product.id) ?? []
);
assert(launchedCareerIds.size === 10, "Career must retain ten launched products including legacy career");
for (const [id,label] of Object.entries(careerThumbnailLabels)) {
  assert(launchedCareerIds.has(id), `Career image must target a real launched product: ${id}`);
  assert(storefront.includes(`"${id}": "${label}"`), `Career card needs its own title: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Career card must serve a separate first-party photo for ${id}`);
  const file = statSync(`public/images/premium/${id}.jpg`);
  assert(file.size > 7000 && file.size < 180000, `Career JPEG is missing, empty, or too large: ${id}`);
}
assert(storefront.includes('CAREER_THUMBNAIL_TITLES[product.id]'),
  "Career labels must use original product IDs and existing product-specific photo overlay");
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "Do not change approved 16px question-style product title typography");
assert(storefront.includes('onClick={()=>onSelectProduct(product.id)}') && storefront.includes('<PremiumProductDetail'),
  "Do not change canonical product selection, paid report or AI consultation navigation");
assert(!storefront.includes('>직업운</span>'), "Career photo must not show a redundant category chip");


const socialThumbnailLabels: Readonly<Record<string,string>> = {
  "relationship-friendship": "친구 관계",
  "relationship-family-role": "가족 역할",
  "social-helper": "도움과 신뢰",
  "social-conflict": "대인 갈등",
  "social-network-expansion": "새 인맥 만들기",
};
const launchedSocialIds = new Set(
  groupTopicCatalogProductsByCategory().find((group) => group.category === "social")?.products.map((p) => p.id) ?? [],
);
assert(launchedSocialIds.size === 5, "Social category must keep its five existing launched products");
for (const [id,title] of Object.entries(socialThumbnailLabels)) {
  assert(launchedSocialIds.has(id), `Photo must map to actual launched social product: ${id}`);
  assert(storefront.includes(`"${id}": "${title}"`),
    `Social card must show an individual short Korean photo label: ${id}`);
  assert(photoRegistry.includes(`"${id}":`) && photoRegistry.includes(`src: "/images/premium/${id}.jpg"`),
    `Social photo must use its own first-party JPEG: ${id}`);
  const photo = statSync(`public/images/premium/${id}.jpg`);
  assert(photo.size > 7000 && photo.size < 180000, `Social photo must exist and remain optimized: ${id}`);
}
assert(storefront.includes('SOCIAL_THUMBNAIL_TITLES[product.id]'),
  "Social labels must reuse the existing clickable photo overlay, not a generic icon");
assert(storefront.includes('line-clamp-2 text-[16px] font-extrabold leading-[1.4]'),
  "Keep the approved 16px official question title separate from the photo label");
assert(storefront.includes('onClick={()=>onSelectProduct(product.id)}') && storefront.includes('<PremiumProductDetail'),
  "Photo-only update must not alter product selection, checkout or report detail routes");
assert(!storefront.includes('>대인관계운</span>'), "No redundant social category word inside photographs");

console.log("Deep-analysis phase 2 discovery regression passed ✓");
