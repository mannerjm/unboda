import { getProductPricing } from "../app/lib/productPricing";

const expectedPricing = {
  relationship: { family: "DEEP", amount: 16900 },
  wealth: { family: "CORE", amount: 9900 },
  "money-wealth-accumulation": { family: "DEEP", amount: 16900 },
  "annual-current": { family: "LONG_RANGE", amount: 29900 },
} as const;

for (const [productId, expected] of Object.entries(expectedPricing)) {
  const pricing = getProductPricing(productId);

  if (pricing.family !== expected.family || pricing.amount !== expected.amount) {
    throw new Error(
      `${productId} pricing mismatch: expected ${expected.family}/${expected.amount}, got ${pricing.family}/${pricing.amount}`,
    );
  }

  if (pricing.currency !== "KRW") {
    throw new Error(`${productId}의 통화가 KRW가 아닙니다.`);
  }
}

const entryPricing = getProductPricing("career-job-change");
if (
  entryPricing.family !== "CORE"
  || entryPricing.amount !== 9900
  || !entryPricing.entryExperimentEligible
) {
  throw new Error("Entry experiment candidates must resolve to CORE/9900 with metadata");
}

let unknownProductRejected = false;
try {
  getProductPricing("unknown-product");
} catch {
  unknownProductRejected = true;
}
if (!unknownProductRejected) {
  throw new Error("unknown products must fail pricing resolution");
}

console.log("product pricing regression passed");