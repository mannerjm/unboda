import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { requestCreditRefund, isAiCreditRefundAllowedForUser } from "@/app/lib/aiConsulting/creditRefunds";
export const dynamic="force-dynamic";

export async function POST(request:NextRequest) {
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
  if(!isAiCreditRefundAllowedForUser(user.id))return NextResponse.json({error:"자동 환불은 현재 준비 중입니다."},{status:503});
  const body=await request.json().catch(()=>null) as {profileId?:unknown;purchaseId?:unknown}|null;
  const profileId=body?.profileId,purchaseId=body?.purchaseId;
  if(typeof profileId!=="string"||typeof purchaseId!=="string"||!/^[-0-9a-f]{36}$/i.test(purchaseId))
    return NextResponse.json({error:"유효한 구매 내역을 선택해 주세요."},{status:400});
  const profile=await getUserProfile(profileId,user.id).catch(()=>null);
  if(!profile)return NextResponse.json({error:"분석 대상의 소유권을 확인하지 못했습니다."},{status:403});
  try {
    const result=await requestCreditRefund({userId:user.id,profileId:profile.id,purchaseId});
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"UNKNOWN_REFUND_ERROR";
    console.error("[ai-credit-self-refund]",message);
    if(message==="AI_CREDIT_ACTIVE_CONSULTATION")return NextResponse.json({error:"진행 중인 AI 답변이 끝난 다음 환불을 신청해 주세요."},{status:409});
    if(message==="AI_CREDIT_NO_REFUNDABLE_BALANCE")return NextResponse.json({error:"환불 가능한 미사용 질문권이 없습니다."},{status:409});
    if(message==="AI_CREDIT_EXPIRED_SUPPORT_REQUIRED")return NextResponse.json({error:"이용기간 만료 이후 환불은 고객지원센터에서 확인해 주세요."},{status:409});
    return NextResponse.json({error:"자동 환불 가능 여부를 확인하지 못했습니다. 고객지원센터로 문의해 주세요."},{status:500});
  }
}
