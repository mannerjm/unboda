import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorAuthorizationError, requireOperator, recordOperatorAuditEvent } from "@/app/lib/operators/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
export const dynamic="force-dynamic";

export default async function CreditRefundExceptionsPage() {
  try { await requireOperator(); }
  catch(error) {
    if(error instanceof OperatorAuthorizationError && error.code==="UNAUTHENTICATED")
      redirect("/auth/login?returnTo=/admin/credit-refunds");
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">운영자 접근 권한이 없습니다.</h1></main>;
  }
  await recordOperatorAuditEvent({
    action:"FAILURE_QUEUE_VIEW",targetType:"FAILURE_QUEUE",
    targetReference:"AI_CREDIT_REFUND_QUEUE",outcome:"SUCCESS",
  });
  const {data,error}=await createAdminClient().from("ai_credit_refund_requests")
    .select("id,order_id,refund_amount_krw,refund_quantity,status,provider_error,created_at,updated_at")
    .in("status",["REVIEW_REQUIRED","MANUAL_BANK_REQUIRED","PROVIDER_UNKNOWN"])
    .order("created_at",{ascending:false}).limit(100);
  return <main className="min-h-screen bg-[#f5f7fc] px-4 py-8 text-[#11162d] sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin" className="text-sm font-semibold underline">← 운영 대시보드</Link>
      <h1 className="mt-4 text-2xl font-bold">AI 질문권 환불 예외</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">일반 카드 부분취소는 자동 처리되며, 이 목록에는 추가 확인이 필요한 건만 표시합니다. 토스 결제 취소 상태가 확인되기 전에는 은행으로 송금하지 마세요.</p>
      {error?<p className="mt-6 rounded-xl bg-rose-50 p-4">환불 예외 내역 조회에 실패했습니다.</p>
        :!data?.length?<p className="mt-6 rounded-xl bg-white p-5">현재 수동 확인이 필요한 질문권 환불 건이 없습니다.</p>
        :<ul className="mt-6 space-y-3">{data.map(row=>(
          <li key={row.id} className="rounded-2xl border border-[#dce1ef] bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3"><strong>{row.status==="PROVIDER_UNKNOWN"?"토스 처리상태 재확인 중":"담당자 확인 필요"}</strong>
            <strong>{Number(row.refund_amount_krw).toLocaleString("ko-KR")}원 · {row.refund_quantity}회</strong></div>
            <p className="mt-2 break-all text-xs text-slate-600">환불 요청 ID: {row.id}</p>
            <p className="mt-1 break-all text-xs text-slate-600">원결제 주문 ID: {row.order_id}</p>
            <p className="mt-2 text-xs text-slate-500">접수: {new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",dateStyle:"medium",timeStyle:"short"}).format(new Date(row.created_at))}</p>
            {row.provider_error?<p className="mt-2 text-xs text-amber-800">안전 확인 코드: {row.provider_error}</p>:null}
            <Link href="/admin/support" className="mt-3 inline-block text-sm font-semibold text-[#5143b0] underline">고객지원 확인 →</Link>
          </li>
        ))}</ul>}
      <p className="mt-6 text-xs leading-6 text-slate-600">카드 취소 가능 상태를 토스에서 직접 확인한 후 대체 환불을 진행해야 합니다. 자동 계좌송금은 지원하지 않습니다.</p>
    </div>
  </main>;
}
