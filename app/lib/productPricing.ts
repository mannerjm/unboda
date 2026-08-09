export type ProductPricing = {
  amount: number;
  currency: "KRW";
};

const DEFAULT_PAID_ANALYSIS_PRICE: ProductPricing = {
  amount: 9900,
  currency: "KRW",
};

export function getProductPricing(
  productId: string,
): ProductPricing {
  void productId;

  return DEFAULT_PAID_ANALYSIS_PRICE;
}