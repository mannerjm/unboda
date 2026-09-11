import { createAdminClient } from "@/app/lib/supabase/admin";

export type ServiceAnalyticsEventName =
  | "VISITOR_DAY"
  | "FREE_ANALYSIS_STARTED"
  | "FREE_ANALYSIS_COMPLETED"
  | "SIGNUP_COMPLETED"
  | "FREE_ANALYSIS_REFRESH_COMPLETED";

export type ServiceAnalyticsActorKind = "guest" | "member";

export async function recordServiceAnalyticsEvent(input: {
  eventName: Exclude<ServiceAnalyticsEventName, "VISITOR_DAY">;
  actorKind?: ServiceAnalyticsActorKind;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("service_analytics_events")
    .insert({
      event_name: input.eventName,
      actor_kind: input.actorKind ?? null,
    });

  if (error) {
    // Analytics must never block the customer path. Operational logs still make
    // a telemetry write failure visible to the operator.
    console.warn("[service-analytics] event write failed", {
      eventName: input.eventName,
      code: error.code,
    });
  }
}

export async function recordDailyVisitor(visitorId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("service_analytics_events")
    .upsert(
      {
        event_name: "VISITOR_DAY" satisfies ServiceAnalyticsEventName,
        visitor_id: visitorId,
        actor_kind: null,
      },
      {
        onConflict: "event_name,visitor_id,event_date_kst",
        ignoreDuplicates: true,
      },
    );

  if (error) {
    console.warn("[service-analytics] visitor write failed", { code: error.code });
  }
}

export type AdminGrowthDaily = {
  date: string;
  visitors: number;
  freeAnalysisStarted: number;
  freeAnalysisCompleted: number;
  guestFreeAnalysisCompleted: number;
  memberFreeAnalysisCompleted: number;
  signups: number;
  adultVerified: number;
  monthlyRefreshes: number;
  checkoutStarted: number;
  paidOrders: number;
  payingCustomers: number;
  grossRevenueKrw: number;
  refunds: number;
  refundAmountKrw: number;
  netRevenueKrw: number;
};

export type AdminGrowthPeriod = {
  startDate: string;
  endDate: string;
  visitors: number;
  freeAnalysisStarted: number;
  freeAnalysisCompleted: number;
  signups: number;
  adultVerified: number;
  monthlyRefreshes: number;
  checkoutStarted: number;
  paidOrders: number;
  payingCustomers: number;
  grossRevenueKrw: number;
  refunds: number;
  refundAmountKrw: number;
  netRevenueKrw: number;
};

export type AdminGrowthTotals = {
  dataSince: string | null;
  visitors: number;
  freeAnalysisStarted: number;
  freeAnalysisCompleted: number;
  signups: number;
  monthlyRefreshes: number;
  activeAccounts: number;
  currentVerifiedAdults: number;
  adultVerifiedEver: number;
  checkoutStarted: number;
  paidOrders: number;
  payingCustomers: number;
  grossRevenueKrw: number;
  refunds: number;
  refundAmountKrw: number;
  netRevenueKrw: number;
};

export type AdminGrowthProduct = {
  productId: string;
  paidOrders: number;
  grossRevenueKrw: number;
  refundAmountKrw: number;
  netRevenueKrw: number;
};

export type AdminGrowthDashboard = {
  generatedAt: string;
  timezone: "Asia/Seoul";
  rangeDays: number;
  daily: AdminGrowthDaily[];
  periods: {
    today: AdminGrowthPeriod;
    week: AdminGrowthPeriod;
    month: AdminGrowthPeriod;
  };
  totals: AdminGrowthTotals;
  topProducts: AdminGrowthProduct[];
};

export async function getAdminGrowthDashboard(days = 30): Promise<AdminGrowthDashboard> {
  const { data, error } = await createAdminClient().rpc("get_admin_growth_dashboard", {
    p_days: days,
  });

  if (error || !data) {
    throw new Error(`운영 성장 지표를 불러오지 못했습니다: ${error?.message ?? "unknown"}`);
  }

  return data as AdminGrowthDashboard;
}
