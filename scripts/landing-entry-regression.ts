import { readFileSync } from "node:fs";

const landingSource = readFileSync("app/page.tsx", "utf8");
const shellSource = readFileSync("app/components/AppShell.tsx", "utf8");

for (const required of [
  'kind: "guest"',
  'kind: "analysis_complete"',
  '무료 사주 분석 시작하기',
  '내 분석 이어보기',
  '현재 추천 보기',
  '심층 분석 둘러보기',
  '내 운보다',
  '내 분석',
  '추천 분석 보기',
  '마이페이지에서 분석 대상 관리하기',
  "getActiveProfile",
  "resolveProfileFreeAnalysisStatus",
]) {
  if (!landingSource.includes(required)) {
    throw new Error(`Missing landing entry contract: ${required}`);
  }
}

for (const forbidden of [
  "PremiumCatalogSection",
  "/checkout/",
  "가격",
  "useEffect",
  "generate",
  "getProductPricing",
]) {
  if (landingSource.includes(forbidden)) {
    throw new Error(`Landing must not contain premium or automatic-generation behavior: ${forbidden}`);
  }
}

if (landingSource.includes("AppShell")) {
  throw new Error("Public landing must remain outside the internal AppShell");
}

for (const required of ["/recommendations", "/deep-analysis", "모바일 네비게이션"]) {
  if (!shellSource.includes(required)) {
    throw new Error(`Internal AppShell contract missing: ${required}`);
  }
}

console.log("landing-entry-regression: OK");