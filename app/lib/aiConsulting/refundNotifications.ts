import "server-only";
import { createAdminClient } from "@/app/lib/supabase/admin";

const FROM="운보다 고객지원 <noreply@mail.unboda.kr>";
const CUSTOMER_URL="https://unboda.kr/ai-consulting/credits/refunds";
type RefundStatus="PENDING"|"PROVIDER_UNKNOWN"|"COMPLETED"|"REVIEW_REQUIRED"|"MANUAL_BANK_REQUIRED"|"MANUAL_BANK_PAID"|"CANCELLED_NO_REFUND";
type NoticeRow={
  id:string;refund_id:string;refund_status:RefundStatus;status:string;
  attempt_count:number;next_retry_at:string|null;updated_at:string;
};
type RefundRow={id:string;user_id:string;status:RefundStatus};
const statuses:RefundStatus[]=[
  "PENDING","PROVIDER_UNKNOWN","COMPLETED","REVIEW_REQUIRED",
  "MANUAL_BANK_REQUIRED","MANUAL_BANK_PAID","CANCELLED_NO_REFUND",
];
function textForStatus(status:RefundStatus):{subject:string;body:string}{
  switch(status){
    case "COMPLETED":return {
      subject:"[운보다] AI 질문권 카드 환불 완료",
      body:"신청한 질문권의 카드 환불 처리가 완료되었습니다. 카드사 반영 시점은 달라질 수 있습니다.",
    };
    case "MANUAL_BANK_PAID":return {
      subject:"[운보다] AI 질문권 대체 환불 완료",
      body:"신청한 질문권의 대체 환불 처리가 완료되었습니다. 자세한 사항은 운보다에서 확인하세요.",
    };
    case "REVIEW_REQUIRED":return {
      subject:"[운보다] AI 질문권 환불 확인 안내",
      body:"카드 취소를 자동으로 완료하지 못해 담당자가 확인하고 있습니다. 환불은 완료되지 않았으며, 중복 신청하지 않아도 됩니다.",
    };
    case "MANUAL_BANK_REQUIRED":return {
      subject:"[운보다] AI 질문권 대체 환불 안내",
      body:"원결제 카드의 부분취소가 어려워 대체 환불 절차가 필요합니다. 이메일 회신으로 계좌번호를 보내지 말고, 로그인 후 운보다의 AI 질문권 환불 관리 화면에서 안전하게 환불 계좌를 제출해 주세요. 송금은 담당자가 확인 후 진행합니다.",
    };
    case "CANCELLED_NO_REFUND":return {
      subject:"[운보다] AI 질문권 환불 신청 종료",
      body:"고객이 요청한 환불 신청 철회에 따라 환불을 진행하지 않았습니다. 남은 질문권은 기존 이용기간 규정에 따라 처리됩니다.",
    };
    case "PENDING":return {
      subject:"[운보다] AI 질문권 환불 요청 접수",
      body:"AI 질문권 환불 요청이 접수되었습니다. 환불 대상 질문권은 확인이 끝날 때까지 사용이 보류됩니다.",
    };
    case "PROVIDER_UNKNOWN":return {
      subject:"[운보다] AI 질문권 카드 취소 결과 확인 중",
      body:"카드 취소 결과가 불확실해 다시 확인하고 있습니다. 중복 신청하지 않아도 되며 환불 대상 질문권은 사용이 보류됩니다.",
    };
  }
}
export type CreditRefundNoticeSummary={
  configured:boolean;scanned:number;sent:number;retrying:number;failedFinal:number;skipped:number;
};
/** Delivery is deliberately decoupled from payment and refund transactions. */
export async function dispatchCreditRefundNotices(limit=10):Promise<CreditRefundNoticeSummary>{
  const key=process.env.RESEND_API_KEY?.trim();
  if(!key)return {configured:false,scanned:0,sent:0,retrying:0,failedFinal:0,skipped:0};
  const db=createAdminClient();
  const {data:changed,error:changedError}=await db.from("ai_credit_refund_requests")
    .select("id,status,updated_at").in("status",statuses)
    .order("updated_at",{ascending:false}).limit(250);
  if(changedError)throw new Error("AI_CREDIT_NOTICE_REFUNDS_READ_FAILED");
  for(const refund of changed??[]){
    // On receipt, immediate synchronous card cancellation normally resolves PENDING.
    // Only emit the unsettled receipt if it remains PENDING for at least 1 minute.
    if(refund.status==="PENDING"&&Date.now()-new Date(refund.updated_at).getTime()<60_000)continue;
    const {error}=await db.from("ai_credit_refund_notice_deliveries")
      .upsert({refund_id:refund.id,refund_status:refund.status},{
        onConflict:"refund_id,refund_status",ignoreDuplicates:true,
      });
    if(error)throw new Error("AI_CREDIT_NOTICE_ENQUEUE_FAILED");
  }
  const {data:deliveries,error:readError}=await db.from("ai_credit_refund_notice_deliveries")
    .select("id,refund_id,refund_status,status,attempt_count,next_retry_at,updated_at")
    .in("status",["PENDING","SENDING","FAILED_RETRYING"])
    .order("created_at",{ascending:true}).limit(Math.max(1,Math.min(25,limit)));
  if(readError)throw new Error("AI_CREDIT_NOTICE_QUEUE_READ_FAILED");
  const summary:CreditRefundNoticeSummary={configured:true,scanned:deliveries?.length??0,sent:0,retrying:0,failedFinal:0,skipped:0};
  for(const candidate of (deliveries??[]) as NoticeRow[]){
    if(candidate.status==="SENDING"){
      // A provider request may have succeeded before our DB ack. Resend idempotency
      // key ensures safe reuse of the same delivery identity.
      if(Date.now()-new Date(candidate.updated_at).getTime()<15*60_000){summary.skipped++;continue;}
      const {error}=await db.from("ai_credit_refund_notice_deliveries")
        .update({status:"FAILED_RETRYING",next_retry_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq("id",candidate.id).eq("status","SENDING");
      if(error)throw new Error("AI_CREDIT_NOTICE_STALE_RECOVERY_FAILED");
      candidate.status="FAILED_RETRYING";
    }
    if(candidate.next_retry_at&&new Date(candidate.next_retry_at).getTime()>Date.now()){summary.skipped++;continue;}
    if(candidate.attempt_count>=5){
      await db.from("ai_credit_refund_notice_deliveries").update({status:"FAILED_FINAL"})
        .eq("id",candidate.id).neq("status","SENT");
      summary.failedFinal++;continue;
    }
    const {data:claimed,error:claimError}=await db.from("ai_credit_refund_notice_deliveries")
      .update({status:"SENDING",attempt_count:candidate.attempt_count+1,updated_at:new Date().toISOString()})
      .eq("id",candidate.id).eq("status",candidate.status)
      .eq("attempt_count",candidate.attempt_count).select("id").maybeSingle();
    if(claimError)throw new Error("AI_CREDIT_NOTICE_CLAIM_FAILED");
    if(!claimed){summary.skipped++;continue;}
    try {
      const {data:refund,error:refundError}=await db.from("ai_credit_refund_requests")
        .select("id,user_id,status").eq("id",candidate.refund_id).single<RefundRow>();
      if(refundError||!refund)throw new Error("AI_CREDIT_NOTICE_REFUND_NOT_FOUND");
      if(refund.status!==candidate.refund_status){
        await db.from("ai_credit_refund_notice_deliveries").update({
          status:"SKIPPED",updated_at:new Date().toISOString(),
        }).eq("id",candidate.id).eq("status","SENDING");
        summary.skipped++;continue;
      }
      const {data:auth,error:authError}=await db.auth.admin.getUserById(refund.user_id);
      const email=auth.user?.email?.trim();
      if(authError||!email)throw new Error("AI_CREDIT_NOTICE_CUSTOMER_EMAIL_MISSING");
      const mail=textForStatus(refund.status);
      const text=mail.body+"\n\n환불 진행 상황 확인: "+CUSTOMER_URL+"\n고객지원: https://unboda.kr/support";
      const response=await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":candidate.id},
        body:JSON.stringify({
          from:FROM,to:[email],subject:mail.subject,text,
          html:"<p>"+mail.body+"</p><p><a href=\""+CUSTOMER_URL+"\">운보다 환불 진행 상황 확인</a></p>",
        }),
      });
      if(!response.ok)throw new Error(response.status>=500||response.status===429?"AI_CREDIT_NOTICE_PROVIDER_RETRY":"AI_CREDIT_NOTICE_PROVIDER_REJECTED");
      const result=await response.json().catch(()=>null) as {id?:string}|null;
      const {error:sentError}=await db.from("ai_credit_refund_notice_deliveries").update({
        status:"SENT",sent_at:new Date().toISOString(),provider_message_id:result?.id??null,
        updated_at:new Date().toISOString(),next_retry_at:null,
      }).eq("id",candidate.id).eq("status","SENDING");
      if(sentError)throw new Error("AI_CREDIT_NOTICE_COMPLETE_FAILED");
      summary.sent++;
    }catch(e){
      const terminal=e instanceof Error&&e.message==="AI_CREDIT_NOTICE_PROVIDER_REJECTED";
      const terminalCount=candidate.attempt_count+1>=5;
      const final=terminal||terminalCount;
      const {error}=await db.from("ai_credit_refund_notice_deliveries").update({
        status:final?"FAILED_FINAL":"FAILED_RETRYING",
        last_error_code:e instanceof Error&&/^AI_CREDIT_NOTICE_[A-Z_]+$/.test(e.message)?e.message:"AI_CREDIT_NOTICE_SEND_FAILED",
        next_retry_at:final?null:new Date(Date.now()+Math.min(60*60_000,5*60_000*2**candidate.attempt_count)).toISOString(),
        updated_at:new Date().toISOString(),
      }).eq("id",candidate.id).eq("status","SENDING");
      if(error)throw new Error("AI_CREDIT_NOTICE_FAILED_STATE_SAVE_FAILED");
      if(final)summary.failedFinal++;else summary.retrying++;
    }
  }
  return summary;
}
