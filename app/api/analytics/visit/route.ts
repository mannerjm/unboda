import { NextResponse } from "next/server";
import { recordDailyVisitor } from "@/app/lib/analytics/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { visitorId?: unknown } | null;
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.trim() : "";

  if (!UUID_PATTERN.test(visitorId)) {
    return NextResponse.json({ error: "방문 식별값이 올바르지 않습니다." }, { status: 400 });
  }

  await recordDailyVisitor(visitorId);
  return new NextResponse(null, { status: 204 });
}
