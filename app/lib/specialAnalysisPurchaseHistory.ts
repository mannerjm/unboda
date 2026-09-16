import type { PaymentStatus } from "./payment";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  getSpecialAnalysisProduct,
} from "./specialAnalysisProducts";
import { createAdminClient } from "./supabase/admin";

export type SpecialAnalysisPurchaseHistoryItem = {
  purchaseId: string;
  orderId: string;
  profileId: string;
  productId: string;
  productName: string;
  categoryLabel: string;
  purchasedAt: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
};

type PurchaseRow = {
  id: string;
  profile_id: string;
  product_id: string;
  order_id: string;
  purchased_at: string;
};

type OrderRow = {
  id: string;
  amount: number;
  status: PaymentStatus;
};

const SPECIAL_PURCHASE_PRODUCT_IDS = [
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
] as const;

export async function listUserSpecialAnalysisPurchaseHistory(
  userId: string,
): Promise<SpecialAnalysisPurchaseHistoryItem[]> {
  const supabase = createAdminClient();
  const { data: purchaseData, error: purchaseError } = await supabase
    .from("purchases")
    .select("id,profile_id,product_id,order_id,purchased_at")
    .eq("user_id", userId)
    .in("product_id", [...SPECIAL_PURCHASE_PRODUCT_IDS])
    .order("purchased_at", { ascending: false });

  if (purchaseError) {
    throw new Error(`전문 분석 구매 내역을 조회하지 못했습니다: ${purchaseError.message}`);
  }

  const purchases = (purchaseData ?? []) as PurchaseRow[];
  if (purchases.length === 0) return [];

  const orderIds = purchases.map((item) => item.order_id);
  const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }] = await Promise.all([
    supabase.from("orders").select("id,amount,status").eq("user_id", userId).in("id", orderIds),
    supabase.from("toss_payment_records").select("order_id,currency").in("order_id", orderIds),
  ]);

  if (orderError) throw new Error(`전문 분석 주문 내역을 조회하지 못했습니다: ${orderError.message}`);
  if (paymentError) throw new Error(`전문 분석 결제 내역을 조회하지 못했습니다: ${paymentError.message}`);

  const orderById = new Map(((orderData ?? []) as OrderRow[]).map((row) => [row.id, row]));
  const currencyByOrderId = new Map(
    ((paymentData ?? []) as Array<{ order_id: string; currency: string | null }>).map((row) => [row.order_id, row.currency ?? "KRW"]),
  );

  return purchases.flatMap((purchase) => {
    const order = orderById.get(purchase.order_id);
    const product = getSpecialAnalysisProduct(purchase.product_id);
    if (!order || !product) return [];
    return [{
      purchaseId: purchase.id,
      orderId: purchase.order_id,
      profileId: purchase.profile_id,
      productId: product.id,
      productName: product.title,
      categoryLabel: product.categoryLabel,
      purchasedAt: purchase.purchased_at,
      amount: order.amount,
      currency: currencyByOrderId.get(order.id) ?? "KRW",
      paymentStatus: order.status,
    }];
  });
}
