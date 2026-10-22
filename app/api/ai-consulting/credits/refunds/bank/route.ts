import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { encryptBankDetails, isBankCode, validBankDetails } from "@/app/lib/aiConsulting/refundBankVault";
import type { BankRefundDetails } from "@/app/lib/aiConsulting/refundBankVault";

export const dynamic="force-dynamic";
const responseHeaders={"Cache-Control":"no-store"};
function response(error:string,status:number){return NextResponse.json({error},{status,headers:responseHeaders});}
export async function POST(request:NextRequest) {
  // Fail closed on CSRF / forged form posts; no GET endpoint accepts secrets.
  const origin=request.headers.get("origin");
  if(!origin){return response("안전한 접속을 확인하지 못했습니다.",403);}
  try{if(new URL(origin).host!==request.nextUrl.host||new URL(origin).protocol!=="https:")return response("안전한 접속을 확인하지 못했습니다.",403);}
  catch{return response("안전한 접속을 확인하지 못했습니다.",403);}
  const user=await getCurrentUser();
  if(!user)return response("로그인이 필요합니다.",401);
  const body=await request.json().catch(()=>null) as {
    refundId?:unknown; bankCode?:unknown; accountNumber?:unknown; accountHolder?:unknown; acknowledged?:unknown;
  } | null;
  if(!body||typeof body.refundId!=="string"||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.refundId)
    ||typeof body.bankCode!=="string"||!isBankCode(body.bankCode)
    ||typeof body.accountNumber!=="string"||typeof body.accountHolder!=="string"
    ||body.acknowledged!==true)return response("필수 계좌 정보와 이용 안내 확인이 필요합니다.",400);
  const details:BankRefundDetails={
    accountNumber:body.accountNumber.replace(/[-\s]/g,""),
    accountHolder:body.accountHolder.trim().replace(/\s+/g," "),
  };
  if(!validBankDetails(details))return response("계좌번호와 예금주를 확인해 주세요.",400);
  const db=createAdminClient();
  // The login's user ID is mandatory. Never accept ownership, profile or status from the browser.
  const {data:refund,error:lookupError}=await db.from("ai_credit_refund_requests")
    .select("id,status,user_id,provider_final_failure,refund_amount_krw")
    .eq("id",body.refundId).eq("user_id",user.id).maybeSingle<{
      id:string;status:string;user_id:string;provider_final_failure:boolean;refund_amount_krw:number;
    }>();
  if(lookupError)return response("환불 내역을 확인하지 못했습니다.",503);
  if(!refund||refund.status!=="MANUAL_BANK_REQUIRED"||!refund.provider_final_failure||refund.refund_amount_krw<=0)
    return response("현재 대체 환불 계좌를 제출할 수 있는 상태가 아닙니다.",409);
  const {data:already,error:alreadyError}=await db.from("ai_credit_refund_bank_details")
    .select("refund_id").eq("refund_id",refund.id).maybeSingle();
  if(alreadyError)return response("등록 상태를 확인하지 못했습니다.",503);
  if(already)return response("계좌정보가 이미 제출되었습니다. 변경이 필요하면 고객지원센터에 문의해 주세요.",409);
  let encrypted:string;
  try{encrypted=encryptBankDetails(refund.id,details);}
  catch{return response("보안 계좌 접수를 준비 중입니다. 고객지원센터에 문의해 주세요.",503);}
  const {error}=await db.from("ai_credit_refund_bank_details").insert({
    refund_id:refund.id,user_id:user.id,
    bank_code:body.bankCode,account_last4:details.accountNumber.slice(-4),
    encrypted_details:encrypted,
  });
  if(error) {
    // Unique constraint prevents replacing an account while a manual transfer is underway.
    if(error.code==="23505")return response("계좌정보가 이미 등록되어 있습니다.",409);
    return response("계좌정보를 저장하지 못했습니다. 다시 시도해 주세요.",503);
  }
  return NextResponse.json({ok:true,message:"환불 계좌 접수가 완료되었습니다. 담당자가 확인한 뒤 환불을 진행합니다."},{headers:responseHeaders});
}
