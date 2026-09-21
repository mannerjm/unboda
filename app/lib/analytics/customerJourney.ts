import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type CustomerJourneyEventName =
  | "PAGE_VISIT"
  | "PRODUCT_SELECTED"
  | "PRODUCT_DETAIL_VIEWED"
  | "CHECKOUT_VIEWED"
  | "REPORT_PAGE_OPENED"
  | "AI_CHAT_PAGE_OPENED";

export type CustomerJourneySource = "recommendations" | "deep-analysis" | "compatibility" | "other";

export type CustomerJourneyDashboard = {
  visitorSince: string | null;
  journeySince: string | null;
  visitor7Eligible: number;
  visitor7Returned: number;
  visitor30Eligible: number;
  visitor30Returned: number;
  buyer7Eligible: number;
  buyer7Returned: number;
  buyer30Eligible: number;
  buyer30Returned: number;
  selected7Eligible: number;
  selected7Purchased: number;
  productSelected: number;
  productDetailViewed: number;
  checkoutViewed: number;
  reportPageOpened: number;
  paidOrders30: number;
  paidBuyers: number;
  consultingBuyers: number;
  reportsCompleted30: number;
  reportsFailed30: number;
  reportAverageSeconds30: number | null;
  generationRetries30: number;
  generationFailedAttempts30: number;
  bySource: Record<string, number>;
};

/** Best-effort, privacy-minimized telemetry. Only the verified server session supplies accountId. */
export async function recordCustomerJourneyEvent(input: {
  eventName: CustomerJourneyEventName;
  visitorId?: string | null;
  accountId?: string | null;
  productId?: string | null;
  source?: CustomerJourneySource | null;
}): Promise<void> {
  if (!input.accountId && !input.visitorId) return;
  const { error } = await createAdminClient().from("customer_journey_events").insert({
    event_name: input.eventName,
    visitor_id: input.visitorId ?? null,
    account_id: input.accountId ?? null,
    product_id: input.productId ?? null,
    source: input.source ?? null,
  });
  // Duplicate daily account visits are expected when navigating multiple pages.
  if (error && !(input.eventName === "PAGE_VISIT" && error.code === "23505")) {
    console.warn("[customer-journey] telemetry unavailable", { event: input.eventName, code: error.code });
  }
}

export async function getAdminCustomerJourneyDashboard(): Promise<CustomerJourneyDashboard> {
  const { data, error } = await createAdminClient().rpc("get_admin_customer_journey_dashboard");
  if (error || !data) {
    throw new Error("고객 행동 지표를 조회하지 못했습니다.");
  }
  return data as CustomerJourneyDashboard;
}

/** Bounded cleanup; invoked only by the existing authenticated reconciliation scheduler. */
export async function cleanupCustomerJourneyEvents(): Promise<number> {
  const { data, error } = await createAdminClient().rpc("prune_customer_journey_events", { p_limit: 2000 });
  if (error) throw new Error("CUSTOMER_JOURNEY_CLEANUP_FAILED");
  return typeof data === "number" ? data : 0;
}
