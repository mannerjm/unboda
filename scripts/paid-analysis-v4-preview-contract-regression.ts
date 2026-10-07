import { readFileSync } from "node:fs";
import { getAnalysisEditionPolicy } from "../app/lib/analysisEditionPolicy";
import {
  getLaunchProductIds,
  getPaidAnalysisTopicConfig,
} from "../app/lib/paidAnalysisTopicConfig";
import { buildPaidAnalysisV4PreviewModel } from "../app/lib/paidAnalysisV4PreviewModel";
import { getProductPricing, type PricingFamily } from "../app/lib/productPricing";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error("FAIL: " + message);
}

const launchIds = getLaunchProductIds();
assert(launchIds.length === 57, "V4 preview coverage must stay exactly 57 products");
assert(
  launchIds.every((id) => !id.startsWith("compatibility-")),
  "compatibility products must stay outside the paid-analysis V4 preview system",
);

const kindCounts = { topic: 0, period: 0 };
const topicPolicyCounts = { MONTHLY: 0, YEARLY: 0, LIFETIME: 0 };
const familyCounts: Record<PricingFamily, number> = {
  CORE: 0,
  DEEP: 0,
  LONG_RANGE: 0,
  SIGNATURE: 0,
};

for (const productId of launchIds) {
  const product = getPremiumProduct(productId);
  assert(Boolean(product), productId + " must resolve from premium registry");
  if (!product) continue;

  const model = buildPaidAnalysisV4PreviewModel(product);
  assert(Boolean(model), productId + " must build a V4 preview model");
  if (!model) continue;

  const pricing = getProductPricing(productId);
  familyCounts[pricing.family] += 1;

  assert(model.tier.family === pricing.family, productId + " preview must use the live price family");
  assert(model.cards.length === 6, productId + " preview must mirror the six V4 customer-facing stages");
  assert(model.cards[0]?.title.includes("결론"), productId + " preview must lead with the conclusion");
  assert(model.cards[2]?.title.includes("근거"), productId + " preview must explain evidence separation");
  assert(model.cards[3]?.title.includes("기회") || model.cards[3]?.title.includes("변화"), productId + " preview must cover opportunity/change signals");
  assert(model.cards[4]?.title.includes("행동") || model.cards[4]?.title.includes("실행"), productId + " preview must cover action guidance");
  assert(model.cards[5]?.title.includes("범위와 한계"), productId + " preview must disclose decision limits");
  assert(model.topics.length > 0, productId + " preview must expose product-specific scope");
  assert(model.question.trim().length > 0, productId + " preview must expose the actual product question");

  if (product.kind === "PERIOD") {
    kindCounts.period += 1;
    assert(model.kind === "period", productId + " must use a period preview model");
    assert(
      ["CORE", "LONG_RANGE", "SIGNATURE"].includes(pricing.family),
      productId + " period preview must preserve period price-family ownership",
    );
    assert(
      /기간|월|연|대운|생애/.test(model.timeValue.title + model.timeValue.description),
      productId + " period preview must explain its time horizon",
    );
  } else {
    kindCounts.topic += 1;
    assert(model.kind === "topic", productId + " must use a topic preview model");

    const config = getPaidAnalysisTopicConfig(productId);
    assert(Boolean(config), productId + " topic preview must resolve the live V4 topic contract");
    const policy = getAnalysisEditionPolicy(productId);

    if (policy === "MONTHLY") {
      topicPolicyCounts.MONTHLY += 1;
      assert(
        model.timeValue.badge === "월간 에디션" &&
          model.timeValue.description.includes("절기 월 흐름"),
        productId + " monthly preview must disclose real month-cycle value",
      );
    } else if (policy === "YEARLY") {
      topicPolicyCounts.YEARLY += 1;
      assert(
        model.timeValue.badge === "연간 에디션" &&
          model.timeValue.description.includes("세운"),
        productId + " yearly preview must disclose real annual evidence",
      );
    } else if (policy === "LIFETIME") {
      topicPolicyCounts.LIFETIME += 1;
      assert(
        model.timeValue.badge === "장기 기준" &&
          model.timeValue.description.includes("억지로 현재 월이나 연도를 붙이지 않고"),
        productId + " lifetime topic preview must avoid fake time personalization",
      );
    } else {
      throw new Error("FAIL: unexpected topic edition policy for " + productId + ": " + policy);
    }

    if (pricing.family === "DEEP") {
      assert(
        model.topics.length >= 5,
        productId + " DEEP preview must show the broader five-item analysis scope",
      );
      assert(
        model.tier.description.includes("서로 다른 계산 근거"),
        productId + " DEEP preview must explain deeper evidence ownership",
      );
    }
  }
}

assert(kindCounts.topic === 50, "V4 preview must cover 50 topic products");
assert(kindCounts.period === 7, "V4 preview must cover 7 period products");
assert(topicPolicyCounts.MONTHLY === 27, "V4 preview must cover 27 monthly topics");
assert(topicPolicyCounts.YEARLY === 21, "V4 preview must cover 21 yearly topics");
assert(topicPolicyCounts.LIFETIME === 2, "V4 preview must cover 2 lifetime topics");
assert(familyCounts.CORE === 44, "V4 preview must cover 44 CORE products");
assert(familyCounts.DEEP === 8, "V4 preview must cover 8 DEEP products");
assert(familyCounts.LONG_RANGE === 4, "V4 preview must cover 4 LONG_RANGE products");
assert(familyCounts.SIGNATURE === 1, "V4 preview must cover 1 SIGNATURE product");

const previewSource = readFileSync("app/components/PremiumReportValuePreview.tsx", "utf8");
assert(
  previewSource.includes("buildPaidAnalysisV4PreviewModel"),
  "shared premium preview must be driven by the V4 preview model",
);
assert(
  !previewSource.includes("CompatibilityReportValuePreview") &&
    !previewSource.includes("specialAnalysisProducts"),
  "paid-analysis V4 preview must not absorb professional compatibility previews",
);

const compatibilitySource = readFileSync(
  "app/components/CompatibilityReportValuePreview.tsx",
  "utf8",
);
assert(
  compatibilitySource.includes("단순 점수 대신 관계의 맥락을 나눠 설명") &&
    compatibilitySource.includes("CompatibilityReportValuePreview"),
  "professional compatibility preview must remain on its independent contract",
);

console.log(
  "paid-analysis-v4-preview-contract-regression: PASS (57/57, topic=50, period=7, monthly=27, yearly=21, lifetime=2)",
);
