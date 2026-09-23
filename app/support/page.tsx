import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser } from "@/app/lib/purchases/server";
import { getRefundWorkflowForOrder } from "@/app/lib/refunds/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import { listUserProfiles } from "@/app/lib/profiles/server";
import { listCurrentUserSupportRequests } from "@/app/lib/support/server";
import type { SupportRequestDto } from "@/app/lib/support/types";
import SupportCenterClient, { type SupportRefundOrder } from "./SupportCenterClient";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SupportPage({ searchParams }: {
  searchParams: Promise<{ category?: string; orderId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  let requests: SupportRequestDto[] = [];
  let refundOrder: SupportRefundOrder | null = null;
  const requestedRefundOrder = params.category === "PAYMENT_REFUND" && typeof params.orderId === "string";
  const orderId = requestedRefundOrder ? params.orderId! : null;

  if (user) {
    try {
      requests = await listCurrentUserSupportRequests();
    } catch {
      requests = [];
    }
    // The query string is only an identifier: resolve details from this
    // authenticated user's own order instead of trusting client-supplied text.
    if (orderId && UUID_PATTERN.test(orderId)) {
      try {
        const order = await getOrderForUser(orderId, user.id);
        if (order) {
          const [profiles, refund] = await Promise.all([
            listUserProfiles(user.id),
            getRefundWorkflowForOrder(order.id),
          ]);
          refundOrder = {
            orderId: order.id,
            productName: getSpecialAnalysisProduct(order.productId)?.title
              ?? getPremiumProduct(order.productId)?.title
              ?? "구매한 분석",
            profileLabel: profiles.find((profile) => profile.id === order.profileId)?.label ?? "등록된 프로필",
            amount: order.amount,
            purchasedAt: order.paidAt ?? order.createdAt,
            paymentStatus: order.status,
            refundStatus: refund?.status ?? null,
          };
        }
      } catch {
        refundOrder = null;
      }
    }
  }

  return (
    <SupportCenterClient
      isAuthenticated={Boolean(user)}
      initialRequests={requests}
      initialRefundOrder={refundOrder}
      invalidRefundOrder={Boolean(user && requestedRefundOrder && !refundOrder)}
      initialCategory={params.category === "PAYMENT_REFUND" ? "PAYMENT_REFUND" : null}
    />
  );
}
