import Link from "next/link";
import RefundCreditButton from "./RefundCreditButton";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isAiCreditSelfRefundEnabled, listCreditLotViews } from "@/app/lib/aiConsulting/creditRefunds";
import { getUnusedQuestionRefundKrw } from "@/app/lib/commercialTerms";
export const dynamic="force-dynamic";
const packName:Record<string,string>={
  "ai-consulting-3":"AI 질문권 3회","ai-consulting-5":"AI 질문권 5회",
  "ai-consulting-10":"AI 질문권 10회",
};
function dateLabel(value:string):string{
  return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Seoul"}).format(new Date(value));
}
export default async function AiCreditRefundsPage({searchParams}:{searchParams:Promise<{profileId?:string}>}){
  const user=await getCurrentUser();
  if(!user)return <main className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">로그인이 필요합니다.</h1>
    <Link href="/auth/login?returnTo=%2Fai-consulting%2Fcredits%2Frefunds" className="mt-4 inline-block underline">로그인하기</Link></main>;
  const {profileId}=await searchParams;
  const profile=profileId?await getUserProfile(profileId,user.id).catch(()=>null):await getActiveProfile(user.id).catch(()=>null);
  if(!profile)return <main className="mx-auto max-w-2xl p-6">분석 대상 프로필을 확인하지 못했습니다.</main>;
  const lots=await listCreditLotViews(user.id,profile.id).catch(()=>null);
  const enabled=isAiCreditSelfRefundEnabled();
  return <main className="min-h-screen bg-[#f5f7fc] p-4 text-[#11162d] sm:p-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/mypage" className="text-sm font-semibold text-slate-600">← 마이페이지</Link>
      <h1 className="mt-5 text-2xl font-black">AI 질문권 구매·환불 관리</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">구매한 질문권은 회차별로 관리합니다. {enabled ? "미사용 질문권은 구매 건별로 자동 환불 신청할 수 있습니다." : "자동 카드 환불은 현재 검증 중입니다. 그동안 미사용 질문권의 환불은 고객지원센터에서 신청할 수 있습니다."}</p>
      {lots===null?<p className="mt-6 rounded-xl bg-white p-5">구매내역을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        :lots.length===0?<p className="mt-6 rounded-xl bg-white p-5">AI 질문권 구매 내역이 없습니다.</p>
        :<div className="mt-6 space-y-3">{lots.map(lot=>{
          const refunded=lot.refundStatus==="COMPLETED";
          const active=!lot.expiresAt||new Date(lot.expiresAt).getTime()>Date.now();
          const amount=getUnusedQuestionRefundKrw({paidAmount:lot.priceKrw,purchasedCount:lot.original,
            consumedCount:lot.original-lot.available});
          return <section key={lot.purchaseId} className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{packName[lot.bundleId]??"AI 질문권"}</h2>
              <span className="text-sm font-semibold text-slate-500">{refunded?"환불 완료":lot.refundStatus?"환불 확인 중":!active?"사용기간 만료":"이용 중"}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">구매 {dateLabel(lot.purchasedAt)} · 결제 {lot.priceKrw.toLocaleString("ko-KR")}원</p>
            <p className="mt-1 text-sm text-slate-600">이용기간 {lot.expiresAt?`~ ${dateLabel(lot.expiresAt)}`:"구매 당시 약정 기준"}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f6f7fb] p-3 text-sm">
              <span>사용 {lot.used}회 · 남은 질문 {lot.available}회</span>
              <strong>미사용분 {amount.toLocaleString("ko-KR")}원</strong>
            </div>
            {enabled&&active&&lot.available>0&&!lot.refundId
              ?<div className="mt-4"><RefundCreditButton profileId={profile.id} purchaseId={lot.purchaseId} quantity={lot.available} amount={amount}/></div>
              :null}
            {lot.refundStatus==="PROVIDER_UNKNOWN"?<p className="mt-3 text-sm text-amber-700">결제 취소 상태를 자동 재확인 중입니다.</p>:null}
            {lot.refundStatus==="REVIEW_REQUIRED"?<p className="mt-3 text-sm text-amber-700">자동 카드 취소가 어려워 별도 확인이 필요합니다. 고객지원센터에 문의해 주세요.</p>:null}
          </section>;
        })}</div>}
      <p className="mt-6 text-xs leading-6 text-slate-600">카드사 사정으로 취소가 불가능한 경우에는 확인 후 별도 환불 절차를 안내합니다. 만료 후 법정 환불·구제 권리는 고객지원센터를 통해 별도 신청할 수 있습니다.</p>
      <Link href="/support" className="mt-3 inline-block text-sm font-bold text-[#5143b0] underline">환불 문의 및 예외 처리 →</Link>
    </div>
  </main>;
}
