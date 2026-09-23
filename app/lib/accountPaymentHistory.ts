import "server-only";

import { listUserPurchaseHistory } from "@/app/lib/purchases/server";
import { listUserSpecialAnalysisPurchaseHistory } from "@/app/lib/specialAnalysisPurchaseHistory";
import { listUserRefundSummaries } from "@/app/lib/refunds/server";

/** Account-wide financial history: unlike the purchased report library, this
 * must never be restricted to the currently selected analysis profile. */
export async function getAccountPaymentHistory(userId: string) {
  const [standard, special, refunds] = await Promise.all([
    listUserPurchaseHistory(userId),
    listUserSpecialAnalysisPurchaseHistory(userId),
    listUserRefundSummaries(userId),
  ]);
  const refundByOrderId = new Map(refunds.map((refund) => [refund.orderId, refund]));
  return [...standard, ...special]
    .map((item) => ({ ...item, refund: refundByOrderId.get(item.orderId) ?? null }))
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)
      || a.orderId.localeCompare(b.orderId)
      || a.purchaseId.localeCompare(b.purchaseId));
}

export type AccountPaymentHistoryItem = Awaited<ReturnType<typeof getAccountPaymentHistory>>[number];
