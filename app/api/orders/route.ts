import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { resolvePurchasableProduct } from "@/app/lib/purchases/products";
import { createPendingOrder } from "@/app/lib/purchases/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const rawProductId = (body as { productId?: unknown } | null)?.productId;
  const resolved = resolvePurchasableProduct(rawProductId);

  if (!resolved.ok) {
    return NextResponse.json(
      { error: "유효하지 않은 분석 상품입니다." },
      { status: 400 },
    );
  }

  try {
    // amount comes from the server-side pricing source, never from the client
    const order = await createPendingOrder({
      userId: user.id,
      productId: resolved.productId,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[orders] create order failed", error);

    return NextResponse.json(
      { error: "주문을 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}
