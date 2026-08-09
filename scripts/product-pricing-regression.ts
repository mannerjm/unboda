import { getProductPricing } from "../app/lib/productPricing";

const testProductIds = [
  "relationship",
  "wealth",
  "money-wealth-accumulation",
  "annual-current",
];

for (const productId of testProductIds) {
  const pricing = getProductPricing(productId);

  if (pricing.amount !== 9900) {
    throw new Error(
      `${productId}의 가격이 9900원이 아닙니다. 현재: ${pricing.amount}`,
    );
  }

  if (pricing.currency !== "KRW") {
    throw new Error(
      `${productId}의 통화가 KRW가 아닙니다.`,
    );
  }
}

console.log("product pricing regression passed");