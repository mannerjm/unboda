import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser } from "@/app/lib/purchases/server";
import { isScopedOneTimeLivePilotRefund } from "@/app/lib/refunds/server";
import OneTimeLiveCardRefundAction from "./OneTimeLiveCardRefundAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LIVE 카드 취소 검증 | 운보다",
  robots: { index: false, follow: false },
};

export default async function OneTimeLiveCardRefundPage() {
  const user = await getCurrentUser();
  const id = process.env.TOSS_ONE_TIME_LIVE_REFUND_ORDER_ID?.trim();
  if (!user || !id) notFound();
  const order = await getOrderForUser(id, user.id);
  if (!order || !isScopedOneTimeLivePilotRefund(order)) notFound();
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-14">
    <h1 className="text-2xl font-extrabold text-slate-900">운보다 LIVE 카드 취소 검증</h1>
    <p className="mt-3 text-sm leading-7 text-slate-700">
      승인된 LIVE 파일럿 주문을 구매한 계정에서만 확인할 수 있는 임시 화면입니다.
      다른 고객의 결제·구매 분석·이용권은 변경하지 않습니다.
    </p>
    <OneTimeLiveCardRefundAction />
  </main>;
}
