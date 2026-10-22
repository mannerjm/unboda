import { NextRequest, NextResponse } from "next/server";
import { requireOperator, OperatorAuthorizationError } from "@/app/lib/operators/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getTossPaymentRecordForOrder } from "@/app/lib/purchases/server";
import { getPaymentByOrderIdFromToss } from "@/app/lib/toss/server";
import { getTossConfigForAccount } from "@/app/lib/toss/config";

export const dynamic="force-dynamic";
type Action="manual_required"|"manual_paid"|"restore_credit"|"reset_bank";
type RefundRow={
  id:string;order_id:string;user_id:string;refund_amount_krw:number;
  status:string;provider_final_failure:boolean;processing_claim_expires_at:string|null;
};
export async function POST(request:NextRequest) {
  const origin=request.headers.get("origin");
  if(!origin || new URL(origin).host!==new URL(request.url).host) {
    return NextResponse.json({error:"요청 출처를 확인할 수 없습니다."},{status:403});
  }
  let operator;
  try {operator=await requireOperator();}
  catch(e) {return NextResponse.json({error:"관리자 권한이 필요합니다."},{status:e instanceof OperatorAuthorizationError && e.code==="UNAUTHENTICATED"?401:403});}
  const payload=await request.json().catch(()=>null) as {refundId?:unknown;action?:unknown;note?:unknown;customerConfirmed?:unknown;transferConfirmed?:unknown;noTransferConfirmed?:unknown}|null;
  const refundId=payload?.refundId,action=payload?.action,note=payload?.note;
  if(typeof refundId!=="string"||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(refundId)
    || !["manual_required","manual_paid","restore_credit","reset_bank"].includes(String(action))
    || typeof note!=="string" || note.trim().length<6 || note.length>180) {
    return NextResponse.json({error:"환불 요청과 확인 메모를 정확히 입력해 주세요."},{status:400});
  }
  if(action==="reset_bank"&&payload?.noTransferConfirmed!==true){
    return NextResponse.json({error:"아직 계좌로 송금하지 않았음을 확인해야 계좌 재입력을 요청할 수 있습니다."},{status:400});
  }
  if(action==="manual_paid"&&payload?.transferConfirmed!==true) {
    return NextResponse.json({error:"실제 송금 완료 여부를 확인해야 합니다."},{status:400});
  }
  if(action==="restore_credit"&&payload?.customerConfirmed!==true) {
    return NextResponse.json({error:"고객의 환불 신청 철회 의사를 확인해야 합니다."},{status:400});
  }
  // Store evidence reference only. Never retain a customer's bank account number in refund metadata.
  const safeNote=note.trim();
  if(/\d{5,}[-\s]?\d{4,}/.test(safeNote))return NextResponse.json({error:"계좌번호 등 개인정보를 메모에 입력하지 마세요."},{status:400});
  const db=createAdminClient();
  const {data:refund,error:readError}=await db.from("ai_credit_refund_requests")
    .select("id,order_id,user_id,refund_amount_krw,status,provider_final_failure,processing_claim_expires_at")
    .eq("id",refundId).single<RefundRow>();
  if(readError||!refund)return NextResponse.json({error:"환불 요청을 확인할 수 없습니다."},{status:404});
  if(!refund.provider_final_failure
    || !((action==="manual_required" && refund.status==="REVIEW_REQUIRED")
      || (["manual_paid","reset_bank"].includes(String(action)) && refund.status==="MANUAL_BANK_REQUIRED")
      || (action==="restore_credit" && ["REVIEW_REQUIRED","MANUAL_BANK_REQUIRED"].includes(refund.status)))
    || (refund.processing_claim_expires_at && new Date(refund.processing_claim_expires_at).getTime()>Date.now())){
    return NextResponse.json({error:"이 환불은 카드 취소 거절이 확정된 예외 상태가 아닙니다."},{status:409});
  }
  if(action==="manual_paid"||action==="reset_bank"){
    const {data:bank,error:bankError}=await db.from("ai_credit_refund_bank_details")
      .select("refund_id").eq("refund_id",refundId).maybeSingle();
    if(bankError||!bank)return NextResponse.json({error:"고객의 환불 계좌가 아직 접수되지 않았습니다."},{status:409});
  }
  try {
    // Mandatory fresh provider verification before any separate bank transfer or credit restoration.
    // Fail closed on outages or ambiguous provider status; never double-refund an already canceled payment.
    const record=await getTossPaymentRecordForOrder(refund.order_id);
    if(!record?.paymentKey||record.currency!=="KRW"||record.confirmedAmount===null)
      throw new Error("TOSS_PAYMENT_EVIDENCE_MISSING");
    const provider=await getPaymentByOrderIdFromToss(refund.order_id,getTossConfigForAccount(refund.user_id,"settlement"));
    if(provider.orderId!==refund.order_id||provider.paymentKey!==record.paymentKey
      ||provider.totalAmount!==record.confirmedAmount||provider.currency!=="KRW"
      ||!["DONE","PARTIAL_CANCELED"].includes(provider.status)){
      throw new Error("TOSS_PAYMENT_STATE_AMBIGUOUS");
    }
    if((provider.cancels??[]).some(c=>c.cancelStatus==="DONE"
      && c.cancelAmount===refund.refund_amount_krw)){
      throw new Error("TOSS_POSSIBLE_PRIOR_REFUND");
    }
    if(action==="reset_bank"){
      const {data:reset,error:resetError}=await db.rpc("reset_ai_credit_bank_intake",{
        p_request_id:refundId,p_operator_id:operator.authUserId,p_reason:safeNote,
      });
      if(resetError||reset!==true)throw new Error("AI_CREDIT_BANK_RESET_FAILED");
      return NextResponse.json({status:"BANK_INFO_RESET"},{headers:{"Cache-Control":"no-store"}});
    }
    const rpc=action==="manual_required"?"mark_ai_credit_manual_required"
      :action==="manual_paid"?"finish_ai_credit_manual_bank_refund":"restore_ai_credit_refund_hold";
    const args=action==="manual_required"
      ? {p_request_id:refundId,p_operator_id:operator.authUserId,p_reason:safeNote}
      :action==="manual_paid"
        ? {p_request_id:refundId,p_operator_id:operator.authUserId,p_bank_reference:safeNote}
        : {p_request_id:refundId,p_operator_id:operator.authUserId,p_reason:safeNote};
    const {data,error}=await db.rpc(rpc,args);
    if(error||!Array.isArray(data)||!data[0]) throw new Error("AI_CREDIT_RESOLUTION_DB_FAILED");
    return NextResponse.json({status:data[0].status},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    console.error("[ai-credit-refund-resolution]",e instanceof Error?e.message:"UNKNOWN");
    return NextResponse.json({
      error:"환불 상태를 안전하게 확정하지 못했습니다. 토스 취소 내역을 확인한 뒤 다시 진행하세요. 실제 계좌이체는 별도로 진행해야 합니다.",
    },{status:409});
  }
}
