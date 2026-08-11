import fs from "node:fs";
import path from "node:path";

import {
  ALL_PREMIUM_PRODUCTS,
  PERIOD_PREMIUM_PRODUCTS,
  PREMIUM_PRODUCT_LOOKUP,
  TOPIC_PREMIUM_PRODUCTS,
  getCanonicalPremiumProductId,
  getPremiumPluginByCategory,
  getPremiumProduct,
} from "../app/lib/premiumProductRegistry";

const clientPath = path.join(
  process.cwd(),
  "app",
  "paid-analysis",
  "[productId]",
  "PaidAnalysisDetailV2Client.tsx",
);

const source = fs.readFileSync(clientPath, "utf8");

const relationshipRegistryProduct = getPremiumProduct("relationship");

if (!relationshipRegistryProduct) {
  throw new Error(
    "Premium Product Registry에서 relationship 상품을 찾지 못했습니다.",
  );
}

if (
  relationshipRegistryProduct.analysisType !==
  "연애·관계 심층 분석"
) {
  throw new Error(
    "Premium Product Registry의 relationship analysisType이 올바르지 않습니다.",
  );
}

if (relationshipRegistryProduct.plugin !== "RELATIONSHIP") {
  throw new Error(
    "Premium Product Registry의 relationship plugin이 RELATIONSHIP이 아닙니다.",
  );
}

if (relationshipRegistryProduct.kind !== "TOPIC") {
  throw new Error(
    "Premium Product Registry의 relationship kind가 TOPIC이 아닙니다.",
  );
}

console.log(
  "relationship Registry 연결:",
  relationshipRegistryProduct.analysisType,
);

const wealthRegistryProduct = getPremiumProduct("wealth");

if (!wealthRegistryProduct) {
  throw new Error(
    "Premium Product Registry에서 wealth 상품을 찾지 못했습니다.",
  );
}

if (wealthRegistryProduct.analysisType !== "재물운 심층 분석") {
  throw new Error(
    "Premium Product Registry의 wealth analysisType이 올바르지 않습니다.",
  );
}

if (wealthRegistryProduct.plugin !== "MONEY") {
  throw new Error(
    "Premium Product Registry의 wealth plugin이 MONEY가 아닙니다.",
  );
}

if (wealthRegistryProduct.kind !== "TOPIC") {
  throw new Error(
    "Premium Product Registry의 wealth kind가 TOPIC이 아닙니다.",
  );
}

if (
  !("recommendedFor" in wealthRegistryProduct) ||
  !wealthRegistryProduct.recommendedFor?.length
) {
  throw new Error(
    "Premium Product Registry의 wealth에 recommendedFor 메타데이터가 없습니다.",
  );
}

if (
  !("analysisFocus" in wealthRegistryProduct) ||
  !wealthRegistryProduct.analysisFocus?.length
) {
  throw new Error(
    "Premium Product Registry의 wealth에 analysisFocus 메타데이터가 없습니다.",
  );
}

if (
  !("expectedOutcome" in wealthRegistryProduct) ||
  !wealthRegistryProduct.expectedOutcome?.length
) {
  throw new Error(
    "Premium Product Registry의 wealth에 expectedOutcome 메타데이터가 없습니다.",
  );
}

console.log(
  "wealth Registry 연결:",
  wealthRegistryProduct.analysisType,
);

const careerRegistryProduct = getPremiumProduct("career");

if (!careerRegistryProduct) {
  throw new Error(
    "Premium Product Registry에서 career 상품을 찾지 못했습니다.",
  );
}

if (careerRegistryProduct.analysisType !== "직업운 심층 분석") {
  throw new Error(
    "Premium Product Registry의 career analysisType이 올바르지 않습니다.",
  );
}

if (careerRegistryProduct.plugin !== "CAREER") {
  throw new Error(
    "Premium Product Registry의 career plugin이 CAREER가 아닙니다.",
  );
}

if (careerRegistryProduct.kind !== "TOPIC") {
  throw new Error(
    "Premium Product Registry의 career kind가 TOPIC이 아닙니다.",
  );
}

console.log(
  "career Registry 연결:",
  careerRegistryProduct.analysisType,
);

const healthRegistryProduct = getPremiumProduct("health");

if (!healthRegistryProduct) {
  throw new Error(
    "Premium Product Registry에서 health 상품을 찾지 못했습니다.",
  );
}

if (healthRegistryProduct.analysisType !== "건강운 심층 분석") {
  throw new Error(
    "Premium Product Registry의 health analysisType이 올바르지 않습니다.",
  );
}

if (healthRegistryProduct.plugin !== "HEALTH") {
  throw new Error(
    "Premium Product Registry의 health plugin이 HEALTH가 아닙니다.",
  );
}

if (healthRegistryProduct.kind !== "TOPIC") {
  throw new Error(
    "Premium Product Registry의 health kind가 TOPIC이 아닙니다.",
  );
}

console.log(
  "health Registry 연결:",
  healthRegistryProduct.analysisType,
);

const loveCanonicalId = getCanonicalPremiumProductId("love");

if (loveCanonicalId !== "relationship") {
  throw new Error(
    "Premium Product Registry alias에서 love가 relationship으로 변환되지 않습니다.",
  );
}

const moneyCanonicalId = getCanonicalPremiumProductId("money");

if (moneyCanonicalId !== "wealth") {
  throw new Error(
    "Premium Product Registry alias에서 money가 wealth로 변환되지 않습니다.",
  );
}

const relationshipCanonicalId =
  getCanonicalPremiumProductId("relationship");

if (relationshipCanonicalId !== "relationship") {
  throw new Error(
    "canonical productId인 relationship이 변경되었습니다.",
  );
}

const wealthCanonicalId = getCanonicalPremiumProductId("wealth");

if (wealthCanonicalId !== "wealth") {
  throw new Error(
    "canonical productId인 wealth가 변경되었습니다.",
  );
}

console.log(
  "legacy alias 연결:",
  `love -> ${loveCanonicalId}, money -> ${moneyCanonicalId}`,
);

const expectedCategoryPlugins = [
  ["money", "MONEY"],
  ["career", "CAREER"],
  ["relationship", "RELATIONSHIP"],
  ["health", "HEALTH"],
  ["period", "FORTUNE"],
  ["social", "COMMON"],
  ["business", "COMMON"],
  ["growth", "COMMON"],
  ["change", "COMMON"],
  ["life", "COMMON"],
] as const;

for (const [category, expectedPlugin] of expectedCategoryPlugins) {
  const actualPlugin = getPremiumPluginByCategory(category);

  if (actualPlugin !== expectedPlugin) {
    throw new Error(
      `Premium Product category ${category}의 plugin이 ${expectedPlugin}이 아닙니다.`,
    );
  }
}

console.log("category → plugin 매핑 검증 완료");


if (TOPIC_PREMIUM_PRODUCTS.length !== 50) {
  throw new Error(
    `Topic Premium Product 개수가 50개가 아닙니다. 현재: ${TOPIC_PREMIUM_PRODUCTS.length}`,
  );
}

const topicIds = TOPIC_PREMIUM_PRODUCTS.map(
  (product) => product.id,
);

const uniqueTopicIds = new Set(topicIds);

if (uniqueTopicIds.size !== TOPIC_PREMIUM_PRODUCTS.length) {
  throw new Error(
    "Topic Premium Product에 중복 productId가 있습니다.",
  );
}

for (const product of TOPIC_PREMIUM_PRODUCTS) {
  if (product.kind !== "TOPIC") {
    throw new Error(
      `Topic Premium Product ${product.id}의 kind가 TOPIC이 아닙니다.`,
    );
  }

  if (product.releaseLevel !== "V2") {
    throw new Error(
      `Topic Premium Product ${product.id}의 releaseLevel이 V2가 아닙니다.`,
    );
  }

  if (!product.riskLevel) {
    throw new Error(
      `Topic Premium Product ${product.id}에 riskLevel이 없습니다.`,
    );
  }
}

console.log(
  "50개 Topic Premium 변환 검증 완료:",
  TOPIC_PREMIUM_PRODUCTS.length,
);

if (ALL_PREMIUM_PRODUCTS.length !== 59) {
  throw new Error(
    `전체 Premium Product 개수가 59개가 아닙니다. 현재: ${ALL_PREMIUM_PRODUCTS.length}`,
  );
}

const allProductIds = ALL_PREMIUM_PRODUCTS.map(
  (product) => product.id,
);

const uniqueAllProductIds = new Set(allProductIds);

if (uniqueAllProductIds.size !== ALL_PREMIUM_PRODUCTS.length) {
  throw new Error(
    "전체 Premium Product에 중복 productId가 있습니다.",
  );
}

if (!PREMIUM_PRODUCT_LOOKUP["relationship"]) {
  throw new Error(
    "통합 Premium Product Lookup에서 relationship을 찾지 못했습니다.",
  );
}

if (!PREMIUM_PRODUCT_LOOKUP["money-wealth-accumulation"]) {
  throw new Error(
    "통합 Premium Product Lookup에서 첫 Topic 상품을 찾지 못했습니다.",
  );
}

console.log(
  "통합 Premium Product 검증 완료:",
  ALL_PREMIUM_PRODUCTS.length,
);

const firstTopicFromUnifiedRegistry =
  getPremiumProduct("money-wealth-accumulation");

if (!firstTopicFromUnifiedRegistry) {
  throw new Error(
    "getPremiumProduct()에서 money-wealth-accumulation Topic 상품을 찾지 못했습니다.",
  );
}

if (firstTopicFromUnifiedRegistry.category !== "money") {
  throw new Error(
    "통합 Registry에서 첫 Topic 상품의 category가 money가 아닙니다.",
  );
}

if (firstTopicFromUnifiedRegistry.plugin !== "MONEY") {
  throw new Error(
    "통합 Registry에서 첫 Topic 상품의 plugin이 MONEY가 아닙니다.",
  );
}

console.log(
  "통합 getPremiumProduct Topic 조회:",
  firstTopicFromUnifiedRegistry.id,
);

if (PERIOD_PREMIUM_PRODUCTS.length !== 5) {
  throw new Error(
    `Period Premium Product 개수가 5개가 아닙니다. 현재: ${PERIOD_PREMIUM_PRODUCTS.length}`,
  );
}

const periodIds = PERIOD_PREMIUM_PRODUCTS.map(
  (product) => product.id,
);

const uniquePeriodIds = new Set(periodIds);

if (uniquePeriodIds.size !== PERIOD_PREMIUM_PRODUCTS.length) {
  throw new Error(
    "Period Premium Product에 중복 productId가 있습니다.",
  );
}

for (const product of PERIOD_PREMIUM_PRODUCTS) {
  if (product.kind !== "PERIOD") {
    throw new Error(
      `Period Premium Product ${product.id}의 kind가 PERIOD가 아닙니다.`,
    );
  }

  if (product.category !== "period") {
    throw new Error(
      `Period Premium Product ${product.id}의 category가 period가 아닙니다.`,
    );
  }

  if (product.plugin !== "FORTUNE") {
    throw new Error(
      `Period Premium Product ${product.id}의 plugin이 FORTUNE이 아닙니다.`,
    );
  }

  if (product.releaseLevel !== "V2") {
    throw new Error(
      `Period Premium Product ${product.id}의 releaseLevel이 V2가 아닙니다.`,
    );
  }
}

console.log(
  "5개 Period Premium 변환 검증 완료:",
  PERIOD_PREMIUM_PRODUCTS.length,
);

const annualCurrentFromUnifiedRegistry =
  getPremiumProduct("annual-current");

if (!annualCurrentFromUnifiedRegistry) {
  throw new Error(
    "getPremiumProduct()에서 annual-current Period 상품을 찾지 못했습니다.",
  );
}

if (annualCurrentFromUnifiedRegistry.kind !== "PERIOD") {
  throw new Error(
    "통합 Registry에서 annual-current의 kind가 PERIOD가 아닙니다.",
  );
}

if (annualCurrentFromUnifiedRegistry.category !== "period") {
  throw new Error(
    "통합 Registry에서 annual-current의 category가 period가 아닙니다.",
  );
}

if (annualCurrentFromUnifiedRegistry.plugin !== "FORTUNE") {
  throw new Error(
    "통합 Registry에서 annual-current의 plugin이 FORTUNE이 아닙니다.",
  );
}

console.log(
  "통합 getPremiumProduct Period 조회:",
  annualCurrentFromUnifiedRegistry.id,
);

const checkoutPagePath = path.join(
  process.cwd(),
  "app",
  "checkout",
  "[productId]",
  "page.tsx",
);

const checkoutPageSource = fs.readFileSync(checkoutPagePath, "utf8");

if (
  !checkoutPageSource.includes(
    "getCanonicalPremiumProductId(productId)",
  )
) {
  throw new Error(
    "CheckoutPage에서 productId를 canonical productId로 변환하지 않습니다.",
  );
}

if (
  !checkoutPageSource.includes(
    "getPremiumProduct(canonicalProductId)",
  )
) {
  throw new Error(
    "CheckoutPage가 canonical productId로 Premium Product를 조회하지 않습니다.",
  );
}

if (
  !checkoutPageSource.includes(
    "productId={canonicalProductId}",
  )
) {
  throw new Error(
    "CheckoutAccessPanel에 canonical productId가 전달되지 않습니다.",
  );
}

const paidAnalysisAccessPanelPath = path.join(
  process.cwd(),
  "app",
  "paid-analysis",
  "[productId]",
  "PaidAnalysisAccessPanel.tsx",
);

const paidAnalysisAccessPanelSource = fs.readFileSync(
  paidAnalysisAccessPanelPath,
  "utf8",
);

if (
  !paidAnalysisAccessPanelSource.includes(
    "getCanonicalPremiumProductId(productId)",
  )
) {
  throw new Error(
    "PaidAnalysisAccessPanel에서 canonical productId 변환이 누락되었습니다.",
  );
}

if (
  !paidAnalysisAccessPanelSource.includes(
    "canonicalProductId",
  )
) {
  throw new Error(
    "PaidAnalysisAccessPanel이 canonical productId를 사용하지 않습니다.",
  );
}

const reportAccessGatePath = path.join(
  process.cwd(),
  "app",
  "paid-analysis",
  "[productId]",
  "report",
  "ReportAccessGate.tsx",
);

const reportAccessGateSource = fs.readFileSync(
  reportAccessGatePath,
  "utf8",
);

if (
  !reportAccessGateSource.includes(
    "getCanonicalPremiumProductId(productId)",
  )
) {
  throw new Error(
    "ReportAccessGate에서 canonical productId 변환이 누락되었습니다.",
  );
}

if (
  !reportAccessGateSource.includes(
    "canonicalProductId",
  )
) {
  throw new Error(
    "ReportAccessGate가 canonical productId를 사용하지 않습니다.",
  );
}

console.log(
  "canonical productId checkout/access/report 경로 검증 완료",
);

const paidAnalysisDetailServicePath = path.join(
  process.cwd(),
  "app",
  "lib",
  "paidAnalysisDetailService.ts",
);

const paidAnalysisDetailServiceSource = fs.readFileSync(
  paidAnalysisDetailServicePath,
  "utf8",
);

if (
  !paidAnalysisDetailServiceSource.includes(
    "getCanonicalPremiumProductId(input.productId)",
  )
) {
  throw new Error(
    "PaidAnalysisDetailService에서 productId canonical 변환이 누락되었습니다.",
  );
}

if (
  !paidAnalysisDetailServiceSource.includes(
    'registryProduct?.plugin === "HEALTH"',
  )
) {
  throw new Error(
    "PaidAnalysisDetailService의 건강 분석 분기가 Registry HEALTH plugin을 사용하지 않습니다.",
  );
}

if (
  !paidAnalysisDetailServiceSource.includes(
    'registryProduct?.plugin === "RELATIONSHIP"',
  )
) {
  throw new Error(
    "PaidAnalysisDetailService의 관계 분석 분기가 Registry RELATIONSHIP plugin을 사용하지 않습니다.",
  );
}

console.log(
  "paid analysis service registry plugin 분기 검증 완료",
);

console.log("paid analysis product id mapping regression passed");