import { NextResponse } from "next/server";
import { recordDailyVisitor } from "@/app/lib/analytics/server";
import { recordCustomerJourneyEvent } from "@/app/lib/analytics/customerJourney";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { visitorId?: unknown } | null;
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";

  if (!UUID_PATTERN.test(visitorId)) {
    return NextResponse.json({ error: "방문 식별값이 올바르지 않습니다." }, { status: 400 });
  }

  await recordDailyVisitor(visitorId);
  // A session-derived account visit is needed for first-purchase retention; never trust a body userId.
  // Tracking failures must not prevent a customer from navigating the site.
  try {
    const user = await getCurrentUser();
    if (user) {
      await recordCustomerJourneyEvent({ eventName: "PAGE_VISIT", accountId: user.id });
    }
  } catch (error) {
    console.warn("[analytics-visit] account visit unavailable", error instanceof Error ? error.name : "unknown");
  }
  return new NextResponse(null, { status: 204 });
}
