import { NextResponse } from "next/server";
import { recordDailyVisitor, type AcquisitionChannel, type AcquisitionSource } from "@/app/lib/analytics/server";
import { recordCustomerJourneyEvent } from "@/app/lib/analytics/customerJourney";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACQUISITION_CHANNELS: readonly AcquisitionChannel[] = ["direct","organic_search","paid_campaign","social","shared_link","referral","other"];
const ACQUISITION_SOURCES: readonly AcquisitionSource[] = ["direct","naver","google","daum","bing","kakao","instagram","facebook","youtube","x","other"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    visitorId?: unknown;
    acquisitionChannel?: unknown;
    acquisitionSource?: unknown;
  } | null;
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";

  if (!UUID_PATTERN.test(visitorId)) {
    return NextResponse.json({ error: "방문 식별값이 올바르지 않습니다." }, { status: 400 });
  }
  const acquisitionChannel = typeof body?.acquisitionChannel === "string"
    && ACQUISITION_CHANNELS.includes(body.acquisitionChannel as AcquisitionChannel)
    ? body.acquisitionChannel as AcquisitionChannel : null;
  const acquisitionSource = typeof body?.acquisitionSource === "string"
    && ACQUISITION_SOURCES.includes(body.acquisitionSource as AcquisitionSource)
    ? body.acquisitionSource as AcquisitionSource : null;

  await recordDailyVisitor({ visitorId, acquisitionChannel, acquisitionSource });
  // A session-derived account visit is needed for first-purchase retention; never trust a body userId.
  // Tracking failures must not prevent a customer from navigating the site.
  try {
    const user = await getCurrentUser();
    if (user) {
      await recordCustomerJourneyEvent({ eventName: "PAGE_VISIT", visitorId, accountId: user.id });
    }
  } catch (error) {
    console.warn("[analytics-visit] account visit unavailable", error instanceof Error ? error.name : "unknown");
  }
  return new NextResponse(null, { status: 204 });
}
