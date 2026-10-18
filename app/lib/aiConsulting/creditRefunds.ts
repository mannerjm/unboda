import "server-only";
import { createAdminClient } from "../supabase/admin";
import { getTossPaymentRecordForOrder } from "../purchases/server";
import { cancelPaymentWithToss, getPaymentByOrderIdFromToss, TossCancellationError } from "../toss/server";
import { getTossConfigForAccount } from "../toss/config";

export function isAiCreditSelfRefundEnabled(): boolean {
  return process.env.AI_CREDIT_SELF_REFUNDS_ENABLED === "true";
}

export type CreditLotView = {
  purchaseId: string; bundleId: string; priceKrw: number; original: number;
  used: number; available: number; purchasedAt: string; expiresAt: string | null;
  refundId: string | null; refundStatus: string | null;
};

type Lot = {
  purchase_id: string; bundle_id: string; paid_amount_krw: number;
  purchased_quantity: number; consumed_quantity: number; held_quantity: number;
  refunded_quantity: number; expired_quantity: number;
  purchased_at: string; expires_at: string | null;
};
type RefundRow = {
  id: string; purchase_id: string; order_id: string; user_id: string; profile_id: string;
  refund_quantity: number; refund_amount_krw: number; status: string;
  idempotency_key: string; provider_transaction_key: string | null; retry_count: number;
};

export async function listCreditLotViews(userId: string, profileId: string): Promise<CreditLotView[]> {
  const supabase = createAdminClient();
  // Keep expirations synchronized with the existing profile-wide ledger.
  const { error: expirationError } = await supabase.rpc("expire_due_ai_credit_lots", {
    p_user_id: userId, p_profile_id: profileId,
  });
  if (expirationError) throw new Error("AI_CREDIT_EXPIRATION_SYNC_FAILED");
  const [lots, refunds] = await Promise.all([
    supabase.from("ai_credit_lots").select("*").eq("user_id", userId).eq("profile_id", profileId).order("purchased_at", {ascending:false}),
    supabase.from("ai_credit_refund_requests").select("id,purchase_id,status").eq("user_id", userId).eq("profile_id", profileId),
  ]);
  if (lots.error || refunds.error) throw new Error("AI_CREDIT_LOT_READ_FAILED");
  const statusMap = new Map((refunds.data??[]).map(r=>[r.purchase_id,{id:r.id,status:r.status}]));
  return ((lots.data??[]) as Lot[]).map(lot=>{
    const refund=statusMap.get(lot.purchase_id);
    return {
      purchaseId:lot.purchase_id, bundleId:lot.bundle_id, priceKrw:lot.paid_amount_krw,
      original:lot.purchased_quantity, used:lot.consumed_quantity,
      available:Math.max(0,lot.purchased_quantity-lot.consumed_quantity-lot.held_quantity-lot.refunded_quantity-lot.expired_quantity),
      purchasedAt:lot.purchased_at, expiresAt:lot.expires_at,
      refundId:refund?.id??null, refundStatus:refund?.status??null,
    };
  });
}

function refundReason(refundId: string): string {
  return `Unboda AI credit unused refund: ${refundId}`;
}
async function updateRefundStatus(id: string,status: string,error?: string): Promise<void> {
  const supabase=createAdminClient();
  const { data: old } = await supabase.from("ai_credit_refund_requests")
    .select("retry_count").eq("id",id).single<{retry_count:number}>();
  await supabase.from("ai_credit_refund_requests").update({
    status, provider_error:error?.slice(0,180)??null,
    retry_count:(old?.retry_count??0)+1,
    next_retry_at:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(old?.retry_count??0,6))).toISOString(),
    updated_at:new Date().toISOString(),
  }).eq("id",id).neq("status","COMPLETED");
}

export async function processCreditRefund(refund: RefundRow): Promise<{status:string;amount:number}> {
  if (!isAiCreditSelfRefundEnabled()) throw new Error("AI_CREDIT_REFUND_NOT_ENABLED");
  const accountConfig = getTossConfigForAccount(refund.user_id, "settlement"); // No cross-environment provider requests.
  if (refund.status==="COMPLETED") return {status:"COMPLETED",amount:refund.refund_amount_krw};
  if (!["PENDING","PROVIDER_UNKNOWN"].includes(refund.status)) {
    return {status:refund.status,amount:refund.refund_amount_krw};
  }
  if (refund.retry_count>=6) {
    await updateRefundStatus(refund.id,"REVIEW_REQUIRED","Automatic provider retries exhausted");
    return {status:"REVIEW_REQUIRED",amount:refund.refund_amount_krw};
  }
  const payment=await getTossPaymentRecordForOrder(refund.order_id);
  if (!payment?.paymentKey || payment.currency!=="KRW" || payment.confirmedAmount===null
    || payment.confirmedAmount<refund.refund_amount_krw) {
    await updateRefundStatus(refund.id,"REVIEW_REQUIRED","Provider payment evidence missing");
    return {status:"REVIEW_REQUIRED",amount:refund.refund_amount_krw};
  }
  const reason=refundReason(refund.id);
  try {
    // Read provider state first. Never issue an unrelated second cancellation on an ambiguous retry.
    const prior=await getPaymentByOrderIdFromToss(refund.order_id, accountConfig);
    if (prior.paymentKey!==payment.paymentKey || prior.orderId!==refund.order_id
      || prior.currency!=="KRW" || prior.totalAmount!==payment.confirmedAmount) {
      throw new Error("AI_CREDIT_PROVIDER_ORDER_MISMATCH");
    }
    let successful=(prior.cancels??[]).find(c=>c.cancelReason===reason
      && c.cancelAmount===refund.refund_amount_krw && c.cancelStatus==="DONE");
    if (!successful) {
      if (prior.method!=="카드" && prior.method!=="CARD") {
        await updateRefundStatus(refund.id,"REVIEW_REQUIRED","Card cancellation not supported for this method");
        return {status:"REVIEW_REQUIRED",amount:refund.refund_amount_krw};
      }
      const response=await cancelPaymentWithToss({
        paymentKey:payment.paymentKey, cancelAmount:refund.refund_amount_krw,
        cancelReason:reason, idempotencyKey:refund.idempotency_key, config:accountConfig,
      });
      if (response.orderId!==refund.order_id || response.paymentKey!==payment.paymentKey
        || response.totalAmount!==payment.confirmedAmount || response.currency!=="KRW") {
        throw new Error("AI_CREDIT_PROVIDER_CANCELLATION_MISMATCH");
      }
      successful=response.cancels.at(-1);
      if (!successful || successful.cancelAmount!==refund.refund_amount_krw
        || successful.cancelStatus!=="DONE") throw new Error("AI_CREDIT_CANCEL_NOT_PROVEN");
    }
    const {data,error}=await createAdminClient().rpc("complete_ai_credit_refund",{
      p_request_id:refund.id,p_transaction_key:successful.transactionKey,
    });
    if (error || !Array.isArray(data) || data[0]?.status!=="COMPLETED") {
      throw new Error("AI_CREDIT_REFUND_FINALIZATION_PENDING");
    }
    return {status:"COMPLETED",amount:refund.refund_amount_krw};
  } catch (error) {
    const retryable=error instanceof TossCancellationError
      ? error.failure.retryability==="RETRYABLE"
      : true; // Unknown provider state is NEVER proof of failure.
    await updateRefundStatus(refund.id,retryable?"PROVIDER_UNKNOWN":"REVIEW_REQUIRED",
      error instanceof TossCancellationError ? error.failure.providerErrorCode : "PROVIDER_RESULT_UNCERTAIN");
    return {status:retryable?"PROVIDER_UNKNOWN":"REVIEW_REQUIRED",amount:refund.refund_amount_krw};
  }
}

export async function requestCreditRefund(input:{userId:string;profileId:string;purchaseId:string}):Promise<{status:string;amount:number}> {
  if (!isAiCreditSelfRefundEnabled()) throw new Error("AI_CREDIT_REFUND_NOT_ENABLED");
  const {data,error}=await createAdminClient().rpc("begin_ai_credit_refund",{
    p_user_id:input.userId,p_profile_id:input.profileId,p_purchase_id:input.purchaseId,
  });
  if (error || !Array.isArray(data) || !data[0]) throw new Error(error?.message??"AI_CREDIT_REFUND_REQUEST_FAILED");
  return processCreditRefund(data[0] as RefundRow);
}

export async function retryDueCreditRefunds(limit=10):Promise<{checked:number;completed:number;exceptions:number}> {
  if (!isAiCreditSelfRefundEnabled()) return {checked:0,completed:0,exceptions:0};
  const {data,error}=await createAdminClient().from("ai_credit_refund_requests").select("*")
    .in("status",["PENDING","PROVIDER_UNKNOWN"]).or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order("created_at",{ascending:true}).limit(limit);
  if(error) throw new Error("AI_CREDIT_REFUND_RECOVERY_READ_FAILED");
  let completed=0,exceptions=0;
  for(const req of (data??[]) as RefundRow[]){
    const result=await processCreditRefund(req);
    if(result.status==="COMPLETED")completed++;else exceptions++;
  }
  return {checked:data?.length??0,completed,exceptions};
}
