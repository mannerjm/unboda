import { NextRequest, NextResponse } from "next/server";
import { requireOperator, OperatorAuthorizationError } from "@/app/lib/operators/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { decryptBankDetails } from "@/app/lib/aiConsulting/refundBankVault";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store"};
function fail(message:string,status:number){return NextResponse.json({error:message},{status,headers:noStore});}
export async function POST(request:NextRequest) {
  const origin=request.headers.get("origin");
  try{if(!origin||new URL(origin).host!==request.nextUrl.host||new URL(origin).protocol!=="https:")return fail("요청 출처가 올바르지 않습니다.",403);}
  catch{return fail("요청 출처가 올바르지 않습니다.",403);}
  let operator;
  try{operator=await requireOperator();}
  catch(e){return fail("관리자 권한이 필요합니다.",e instanceof OperatorAuthorizationError&&e.code==="UNAUTHENTICATED"?401:403);}
  const input=await request.json().catch(()=>null) as {refundId?:unknown;reason?:unknown}|null;
  if(!input||typeof input.refundId!=="string"
    ||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.refundId)
    ||typeof input.reason!=="string"||input.reason.trim().length<6||input.reason.length>180)
    return fail("환불 건과 조회 사유를 확인해 주세요.",400);
  // Never store bank numbers, payee names or their fragments in the audit reason.
  const reason=input.reason.trim();
  if(/[0-9]{5,}/.test(reason))return fail("조회 사유에 계좌번호나 개인정보를 입력하지 마세요.",400);
  const db=createAdminClient();
  const {data:refund,error:refundErr}=await db.from("ai_credit_refund_requests")
    .select("id,status,provider_final_failure").eq("id",input.refundId).maybeSingle();
  if(refundErr||!refund)return fail("환불 요청을 찾을 수 없습니다.",404);
  if(refund.status!=="MANUAL_BANK_REQUIRED"||refund.provider_final_failure!==true)
    return fail("담당자 대체 환불 대상이 아닙니다.",409);
  const since=new Date(Date.now()-60*60*1000).toISOString();
  const {count,error:limitError}=await db.from("ai_credit_refund_bank_access_audit")
    .select("id",{count:"exact",head:true}).eq("operator_auth_id",operator.authUserId).gte("accessed_at",since);
  if(limitError)return fail("조회 제한을 확인하지 못했습니다.",503);
  if((count??0)>=20)return fail("보안 조회 제한에 도달했습니다. 고객지원센터에서 확인해 주세요.",429);
  const {data:row,error:bankError}=await db.from("ai_credit_refund_bank_details")
    .select("refund_id,bank_code,encrypted_details").eq("refund_id",refund.id).maybeSingle();
  if(bankError||!row)return fail("아직 고객이 계좌를 제출하지 않았습니다.",409);
  const {error:auditError}=await db.from("ai_credit_refund_bank_access_audit").insert({
    refund_id:refund.id,operator_auth_id:operator.authUserId,reason,
  });
  if(auditError)return fail("보안 조회 기록을 저장하지 못했습니다.",503);
  try {
    const data=decryptBankDetails(refund.id,row.encrypted_details);
    return NextResponse.json({bankCode:row.bank_code,accountNumber:data.accountNumber,accountHolder:data.accountHolder},{headers:noStore});
  } catch {
    return fail("환불 계좌 복호화를 완료하지 못했습니다. 운영 설정을 확인해 주세요.",503);
  }
}
