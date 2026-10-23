import Link from "next/link";
import CreditRefundResolutionControls from "./CreditRefundResolutionControls";
import RefundBankDetailsReveal from "./RefundBankDetailsReveal";
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
    .select("id,order_id,refund_amount_krw,refund_quantity,status,provider_error,provider_final_failure,created_at,updated_at")
    .in("status",["REVIEW_REQUIRED","MANUAL_BANK_REQUIRED","PROVIDER_UNKNOWN"])
    .order("created_at",{ascending:false}).limit(100);
  const bankRefundIds=(data??[]).filter(refund=>refund.status==="MANUAL_BANK_REQUIRED").map(refund=>refund.id);
  const receipts=bankRefundIds.length?await createAdminClient().from("ai_credit_refund_bank_details")
    .select("refund_id,bank_code,account_last4,submitted_at")
    .in("refund_id",bankRefundIds):{data:[],error:null};
  const bankMap=new Map((receipts.data??[]).map(record=>[record.refund_id,record]));
  
  return <main className="min-h-screen bg-[#f5f7fc] px-4 py-8 text-[#11162d] sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/admin" className="text-sm font-semibold underline">← 운영 대시보드</Link>
      <h1 className="mt-4 text-2xl font-bold">AI 질문권 환불 예외</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">자동 환불이 활성화된 파일럿에서 카드 취소가 불가능하거나 결과가 불확실한 건만 표시합니다. 토스 결제 취소 상태가 확인되기 전에는 은행으로 송금하지 마세요.</p>
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
            {row.status==="MANUAL_BANK_REQUIRED"&&(receipts.error
              ?<p className="mt-3 text-sm font-semibold text-red-700">환불 계좌 접수 상태 조회에 실패했습니다.</p>
              :bankMap.has(row.id)
                ?<RefundBankDetailsReveal refundId={row.id} bankCode={bankMap.get(row.id)!.bank_code} last4={bankMap.get(row.id)!.account_last4}/>
                :<p className="mt-3 rounded-lg bg-[#f5f5fb] p-3 text-sm text-slate-700">고객의 대체 환불 계좌 제출을 기다리고 있습니다. 고객은 운보다 질문권 환불 관리 화면에서 직접 제출할 수 있습니다.</p>)}
            <CreditRefundResolutionControls refundId={row.id} status={row.status} finalFailure={Boolean(row.provider_final_failure)} bankSubmitted={Boolean(bankMap.get(row.id))&&!receipts.error}/>
          </li>
        ))}</ul>}
      <p className="mt-6 text-xs leading-6 text-slate-600">카드 취소 가능 상태를 토스에서 직접 확인한 후 대체 환불을 진행해야 합니다. 실제 송금은 대표가 직접 수행하고 거래식별자를 기록합니다. 자동 계좌송금은 지원하지 않습니다.</p>
    </div>
  </main>;
}
