import Link from "next/link";
import RefundCreditButton from "./RefundCreditButton";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isAiCreditRefundAllowedForUser, listCreditLotViews, type CreditLotView } from "@/app/lib/aiConsulting/creditRefunds";
import { getUnusedQuestionRefundKrw } from "@/app/lib/commercialTerms";

export const dynamic = "force-dynamic";
const packName:Record<string,string>={
  "ai-consulting-3":"AI 질문권 3회","ai-consulting-5":"AI 질문권 5회",
  "ai-consulting-10":"AI 질문권 10회",
};
function dateLabel(value:string):string {
  return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Seoul"}).format(new Date(value));
}
function statusLabel(lot:CreditLotView,active:boolean):string {
  switch(lot.refundStatus) {
    case "COMPLETED":case "MANUAL_BANK_PAID":return "환불 완료";
    case "PENDING":case "PROVIDER_UNKNOWN":return "환불 처리 중";
    case "REVIEW_REQUIRED":return "담당자 확인 중";
    case "MANUAL_BANK_REQUIRED":return "대체 환불 안내 중";
    case "CANCELLED_NO_REFUND":return "환불 신청 종료";
    default:return active?"이용 중":"사용기간 만료";
  }
}
function statusDetails(status:string|null):string|null {
  switch(status) {
    case "PENDING":return "환불 요청이 접수되었습니다. 중복 신청하실 필요가 없습니다.";
    case "PROVIDER_UNKNOWN":return "카드 취소 결과를 확인하고 있습니다. 확정 전까지 환불 대상 질문권의 사용이 보류됩니다.";
    case "REVIEW_REQUIRED":return "자동 카드 취소가 어려워 담당자가 확인하고 있습니다. 카드 취소 결과 확인 후 환불 방법을 안내합니다.";
    case "MANUAL_BANK_REQUIRED":return "카드 취소가 불가능한 것으로 확인되어 고객지원센터에서 대체 환불을 안내하고 있습니다. 중복 신청은 필요하지 않습니다.";
    case "COMPLETED":return "카드 환불이 완료되었습니다. 실제 청구 취소 반영 시점은 카드사에 따라 다릅니다.";
    case "MANUAL_BANK_PAID":return "대체 환불 처리가 완료되었습니다. 환불 상세 내역은 고객지원센터에서 확인할 수 있습니다.";
    case "CANCELLED_NO_REFUND":return "요청한 환불은 진행되지 않았습니다. 사용 가능한 질문권은 이용기간 내 다시 사용할 수 있습니다.";
    default:return null;
  }
}
export default async function AiCreditRefundsPage({searchParams}:{searchParams:Promise<{profileId?:string}>}) {
  const user=await getCurrentUser();
  if(!user)return <main className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">로그인이 필요합니다.</h1><Link href="/auth/login?returnTo=%2Fai-consulting%2Fcredits%2Frefunds" className="mt-4 inline-block underline">로그인하기</Link></main>;
  const {profileId}=await searchParams;
  const profile=profileId?await getUserProfile(profileId,user.id).catch(()=>null):await getActiveProfile(user.id).catch(()=>null);
  if(!profile)return <main className="mx-auto max-w-2xl p-6">분석 대상 프로필을 확인하지 못했습니다.</main>;
  const lots=await listCreditLotViews(user.id,profile.id).catch(()=>null);
  const enabled=isAiCreditRefundAllowedForUser(user.id);
  return <main className="min-h-screen bg-[#f5f7fc] p-4 text-[#11162d] sm:p-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/mypage" className="text-sm font-semibold text-slate-600">← 마이페이지</Link>
      <h1 className="mt-5 text-2xl font-black">AI 질문권 구매·환불 관리</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">질문권은 구매 건별로 사용·환불 보류·환불 완료 횟수를 나누어 관리합니다. {enabled?"미사용 질문권은 구매 건별로 자동 환불 신청할 수 있습니다.":"현재 자동 카드 환불은 검증 중입니다. 미사용 질문권의 환불은 고객지원센터에서 신청할 수 있습니다."}</p>
      {lots===null?<p className="mt-6 rounded-xl bg-white p-5">구매내역을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        :lots.length===0?<p className="mt-6 rounded-xl bg-white p-5">AI 질문권 구매 내역이 없습니다.</p>
        :<div className="mt-6 space-y-4">{lots.map(lot=>{
          const active=!lot.expiresAt||new Date(lot.expiresAt).getTime()>Date.now();
          const status=statusLabel(lot,active);
          const info=statusDetails(lot.refundStatus);
          const amount=lot.refundAmountKrw??getUnusedQuestionRefundKrw({
            paidAmount:lot.priceKrw,purchasedCount:lot.original,
            consumedCount:lot.original-lot.available,
          });
          return <section key={lot.purchaseId} className="rounded-2xl border border-[#dce1ef] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold">{packName[lot.bundleId]??"AI 질문권"}</h2>
              <span className="rounded-full bg-[#eeeafe] px-3 py-1 text-xs font-bold text-[#5143b0]">{status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">구매 {dateLabel(lot.purchasedAt)} · 결제 {lot.priceKrw.toLocaleString("ko-KR")}원</p>
            <p className="mt-1 text-sm text-slate-600">이용기간 {lot.expiresAt?"~ "+dateLabel(lot.expiresAt):"구매 당시 약정 기준"}</p>
            <div className="mt-5 grid grid-cols-3 gap-2" aria-label="질문권 사용 상태">
              {[
                {label:"사용 완료",value:lot.used},
                {label:"환불 보류",value:lot.held},
                {label:"사용 가능",value:lot.available},
              ].map(entry=><div key={entry.label} className="rounded-xl bg-[#f5f6fb] p-3 text-center">
                <p className="text-xs font-semibold text-slate-600">{entry.label}</p>
                <p className="mt-2 text-2xl font-black">{entry.value}<span className="ml-0.5 text-sm">회</span></p>
              </div>)}
            </div>
            {lot.refunded>0?<p className="mt-3 text-sm text-slate-600">환불 완료한 질문권 {lot.refunded}회</p>:null}
            {lot.expired>0?<p className="mt-1 text-sm text-slate-600">기간 만료된 질문권 {lot.expired}회</p>:null}
            {lot.refundId?<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e8f0] pt-4">
              <strong>환불 신청금액</strong><strong className="text-xl">{amount.toLocaleString("ko-KR")}원</strong>
            </div>:<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e8f0] pt-4">
              <strong>현재 미사용분 환불 예상액</strong><strong className="text-xl">{amount.toLocaleString("ko-KR")}원</strong>
            </div>}
            {info?<p role="status" className="mt-4 rounded-xl bg-[#f5f3ff] p-4 text-sm leading-6 text-slate-800">{info}</p>:null}
            {enabled&&active&&lot.available>0&&!lot.refundId
              ?<div className="mt-4"><RefundCreditButton profileId={profile.id} purchaseId={lot.purchaseId} quantity={lot.available} amount={amount}/></div>
              :null}
            {lot.refundId&&lot.refundStatus!=="COMPLETED"&&lot.refundStatus!=="MANUAL_BANK_PAID"
              ?<Link href="/support" className="mt-3 inline-block text-sm font-bold text-[#5143b0] underline">환불 진행 상황 문의 →</Link>:null}
          </section>;
        })}</div>}
      <p className="mt-6 text-xs leading-6 text-slate-600">환불 신청된 질문권은 결제 취소 결과가 확정될 때까지 사용이 보류됩니다. 카드 취소가 불가능하면 고객지원센터에서 대체 환불을 안내합니다. 이용기간 만료 이후 법령상 환불·구제 권리는 별도 확인합니다.</p>
      <Link href="/support" className="mt-3 inline-block text-sm font-bold text-[#5143b0] underline">환불 문의 및 예외 처리 →</Link>
    </div>
  </main>;
}
