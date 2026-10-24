import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getOrderForUser } from "@/app/lib/purchases/server";
import { isScopedSandboxTestRefundOrder } from "@/app/lib/refunds/server";
import TestSandboxRefundAction from "./TestSandboxRefundAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TEST 결제 취소 검증 | 운보다", robots: { index: false, follow: false } };

export default async function TestSandboxRefundPage() {
  const user = await getCurrentUser();
  const id = process.env.TOSS_ONE_TIME_TEST_REFUND_ORDER_ID?.trim();
  if (!user || !id) notFound();
  const order = await getOrderForUser(id, user.id);
  if (!order || !isScopedSandboxTestRefundOrder(order)) notFound();
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-14">
    <h1 className="text-2xl font-extrabold text-slate-900">운보다 TEST 결제 취소 검증</h1>
    <p className="mt-3 text-sm leading-7 text-slate-700">
      해당 시험 계정으로 로그인한 상태에서만 보이는 임시 화면입니다.
      일반 고객, 다른 구매, LIVE 카드 거래는 대상이 아닙니다.
    </p>
    <TestSandboxRefundAction />
  </main>;
}
