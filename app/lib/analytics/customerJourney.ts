import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type CustomerJourneyEventName =
  | "PAGE_VISIT"
  | "PRODUCT_SELECTED"
  | "PRODUCT_DETAIL_VIEWED"
  | "CHECKOUT_VIEWED"
  | "REPORT_PAGE_OPENED"
  | "AI_CHAT_PAGE_OPENED"
  | "TODAY_VIEWED";

export type CustomerJourneySource = "recommendations" | "deep-analysis" | "compatibility" | "other";

export type AcquisitionSourceMetric = {
  channel: string;
  source: string;
  visitors: number;
  linkedAccounts: number;
  buyers: number;
  netRevenueKrw: number;
};

export type AiConsultingBuyerComparison = {
  aiUsers: number;
  aiReturned30: number;
  aiSecondReportBuyers30: number;
  aiAverageNetRevenue30Krw: number;
  nonAiUsers: number;
  nonAiReturned30: number;
  nonAiSecondReportBuyers30: number;
  nonAiAverageNetRevenue30Krw: number;
};

export type CustomerJourneyDashboard = {
  visitorSince: string | null;
  journeySince: string | null;
  visitor1Eligible: number;
  visitor1Returned: number;
  visitor7Eligible: number;
  visitor7Returned: number;
  visitor30Eligible: number;
  visitor30Returned: number;
  buyer1Eligible: number;
  buyer1Returned: number;
  buyer7Eligible: number;
  buyer7Returned: number;
  buyer30Eligible: number;
  buyer30Returned: number;
  freeToFirstPurchaseEligible: number;
  freeToFirstPurchase7: number;
  secondPaid30Eligible: number;
  secondPaid30Repeated: number;
  selected7Eligible: number;
  selected7Purchased: number;
  productSelected: number;
  productDetailViewed: number;
  checkoutViewed: number;
  reportPageOpened: number;
  todaySince: string | null;
  todayViewedToday: number;
  todayViewedYesterday: number;
  todayReturnedFromYesterday: number;
  todayActive2Days7: number;
  todayD1Eligible: number;
  todayD1Returned: number;
  todayD7Eligible: number;
  todayD7Returned: number;
  paidOrders30: number;
  paidBuyers: number;
  consultingBuyers: number;
  reportBuyers: number;
  reportConsultingBuyers: number;
  aiCreditBuyers: number;
  aiCreditRepeatBuyers: number;
  revenue30Eligible: number;
  averageNetRevenue30Krw: number;
  revenue90Eligible: number;
  averageNetRevenue90Krw: number;
  aiComparison: AiConsultingBuyerComparison;
  acquisitionSources: AcquisitionSourceMetric[];
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
  profileId?: string | null;
  source?: CustomerJourneySource | null;
}): Promise<void> {
  if (!input.accountId && !input.visitorId) return;
  const { error } = await createAdminClient().from("customer_journey_events").insert({
    event_name: input.eventName,
    visitor_id: input.visitorId ?? null,
    account_id: input.accountId ?? null,
    product_id: input.productId ?? null,
    profile_id: input.profileId ?? null,
    source: input.source ?? null,
  });
  // Duplicate daily account visits are expected when navigating multiple pages.
  const expectedDuplicate = error?.code === "23505"
    && (input.eventName === "PAGE_VISIT" || input.eventName === "TODAY_VIEWED");
  if (error && !expectedDuplicate) {
    console.warn("[customer-journey] telemetry unavailable", { event: input.eventName, code: error.code });
  }
}

export async function hasTodayUnbodaViewed(
  userId: string,
  profileId: string,
  dateKst: string,
): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("customer_journey_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", "TODAY_VIEWED")
    .eq("account_id", userId)
    .eq("profile_id", profileId)
    .eq("event_date_kst", dateKst);

  if (error) {
    console.warn("[customer-journey] today-view lookup unavailable", { code: error.code });
    return false;
  }
  return (count ?? 0) > 0;
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
