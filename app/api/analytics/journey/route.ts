import { NextResponse } from "next/server";
import { recordCustomerJourneyEvent, type CustomerJourneyEventName, type CustomerJourneySource } from "@/app/lib/analytics/customerJourney";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRODUCT_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const EVENTS: readonly CustomerJourneyEventName[] = [
  "PRODUCT_SELECTED", "PRODUCT_DETAIL_VIEWED", "CHECKOUT_VIEWED",
  "REPORT_PAGE_OPENED", "AI_CHAT_PAGE_OPENED",
];
const SOURCES: readonly CustomerJourneySource[] = [
  "recommendations", "deep-analysis", "compatibility", "other",
];

/** No client-provided user ID, URL, query string, birth data, or consultation text is accepted. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 2048) {
    return NextResponse.json({ error: "요청이 너무 깁니다." }, { status: 413 });
  }
  const body = await request.json().catch(() => null) as {
    eventName?: unknown; visitorId?: unknown; productId?: unknown; source?: unknown;
  } | null;
  if (!body || typeof body.eventName !== "string" || !EVENTS.includes(body.eventName as CustomerJourneyEventName)) {
    return NextResponse.json({ error: "잘못된 분석 이벤트입니다." }, { status: 400 });
  }
  const visitorId = typeof body.visitorId === "string" && UUID_PATTERN.test(body.visitorId)
    ? body.visitorId : null;
  const productId = typeof body.productId === "string" && PRODUCT_PATTERN.test(body.productId)
    ? body.productId : null;
  const source = typeof body.source === "string" && SOURCES.includes(body.source as CustomerJourneySource)
    ? body.source as CustomerJourneySource : "other";
  if (["PRODUCT_SELECTED", "PRODUCT_DETAIL_VIEWED", "CHECKOUT_VIEWED"].includes(body.eventName) && !productId) {
    return NextResponse.json({ error: "유효한 상품 ID가 필요합니다." }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    if (!visitorId && !user) return new NextResponse(null, { status: 204 });
    await recordCustomerJourneyEvent({
      eventName: body.eventName as CustomerJourneyEventName,
      visitorId, accountId: user?.id ?? null, productId, source,
    });
  } catch (error) {
    // Analytics is strictly best effort; the commercial customer path remains unchanged.
    console.warn("[customer-journey] event unavailable", error instanceof Error ? error.name : "unknown");
  }
  return new NextResponse(null, { status: 204 });
}
