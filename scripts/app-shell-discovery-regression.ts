import { readFileSync } from "node:fs";

const appShellSource = readFileSync("app/components/AppShell.tsx", "utf8");
const resultPageSource = readFileSync("app/result/page.tsx", "utf8");
const premiumCatalogSource = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
const recommendationPageSource = readFileSync("app/recommendations/page.tsx", "utf8");

const fakeRoutes = [
  "/faq",
  "/customer-center",
  "/support",
  "/notifications",
  "/payment-methods",
  "/orders",
  "/connected-services",
  "/notice",
  "/settings",
];

for (const route of fakeRoutes) {
  if (appShellSource.includes(route)) {
    throw new Error(`Fake navigation destination found: ${route}`);
  }
}

for (const requiredText of [
  "내 분석",
  "추천 분석",
  "심층 분석",
  "마이페이지",
]) {
  if (!appShellSource.includes(requiredText)) {
    throw new Error(`Missing nav copy: ${requiredText}`);
  }
}

if (!recommendationPageSource.includes("RecommendationTop3")) {
  throw new Error("Dedicated recommendation view missing");
}

if (!premiumCatalogSource.includes('id="premium-analysis"')) {
  throw new Error("Premium discovery anchor missing");
}

if (!premiumCatalogSource.includes("주제별 분석") || !premiumCatalogSource.includes("기간별 분석")) {
  throw new Error("Topic and period catalog controls missing");
}

if (!appShellSource.includes('grid-cols-4')) {
  throw new Error("Mobile navigation should use four real core destinations");
}

if (!appShellSource.includes('href: "/deep-analysis"')) {
  throw new Error("Deep analysis navigation must target a real dedicated view");
}

if (!readFileSync("app/deep-analysis/page.tsx", "utf8").includes("PremiumCatalogSection")) {
  throw new Error("Dedicated deep analysis view must reuse the canonical catalog");
}

const recommendationComponentSource = readFileSync("app/components/RecommendationTop3.tsx", "utf8");
if (!recommendationPageSource.includes("getFreeAnalysisResult") || !recommendationPageSource.includes("productRecommendations")) {
  throw new Error("Recommendation page must reuse the stored canonical recommendation payload");
}

if (!recommendationComponentSource.includes("지금 나에게 추천된 분석 TOP 3")) {
  throw new Error("Recommendation Top 3 presentation missing");
}

if (!appShellSource.includes('href: "/recommendations"')) {
  throw new Error("Recommendation navigation must target the dedicated recommendation view");
}

if (!appShellSource.includes("useSearchParams") || !appShellSource.includes("recommendationHref")) {
  throw new Error("Shell recommendation navigation must preserve profile context safely");
}

if (!premiumCatalogSource.includes("7개 분석") && !premiumCatalogSource.includes("products.length")) {
  throw new Error("Topic category grouping contract changed unexpectedly");
}

if (premiumCatalogSource.includes("47")) {
  const topicGroups = premiumCatalogSource.match(/groupTopicCatalogProductsByCategory\(\)/g);
  if (!topicGroups || topicGroups.length === 0) {
    throw new Error("Topic catalog renders as a single flat list rather than grouped categories");
  }
}

console.log("app-shell-discovery-regression: OK");