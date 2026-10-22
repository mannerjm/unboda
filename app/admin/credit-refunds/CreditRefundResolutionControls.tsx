"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Action="manual_required"|"manual_paid"|"restore_credit";
export default function CreditRefundResolutionControls({refundId,status,finalFailure,bankSubmitted}:{
  refundId:string;status:string;finalFailure:boolean;bankSubmitted:boolean;
}) {
  const router=useRouter();
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [customerConfirmed,setCustomerConfirmed]=useState(false);
  const [transferConfirmed,setTransferConfirmed]=useState(false);
  async function submit(action:Action) {
    if(busy)return;
    if(action==="manual_paid"&&(!bankSubmitted||!transferConfirmed)){
      setMessage("환불 계좌가 접수되고 실제 송금이 완료됐는지 확인해야 합니다.");
      return;
    }
    const label=action==="manual_required"?"대체 환불 대상 지정":action==="manual_paid"?"이미 송금한 환불의 완료 기록":"고객 동의 확인 후 질문권 보류 해제";
    if(note.trim().length<6){setMessage("확인 메모는 6자 이상 작성해 주세요.");return;}
    if(!window.confirm(label+"을(를) 진행하시겠습니까? 실제 계좌송금은 이 버튼으로 실행되지 않습니다."))return;
    setBusy(true);setMessage(null);
    try {
      const response=await fetch("/api/internal/admin/credit-refunds/resolve",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({refundId,action,note,customerConfirmed,transferConfirmed}),
      });
      const data=await response.json().catch(()=>({})) as {status?:string;error?:string};
      if(!response.ok)throw new Error(data.error??"처리를 완료하지 못했습니다.");
      setMessage("처리 상태가 기록되었습니다: "+String(data.status??"확인 필요"));
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"상태 확인에 실패했습니다.");}
    finally{setBusy(false);}
  }
  if(!finalFailure) return <p className="mt-3 text-sm text-amber-800">취소 결과가 확정되지 않았습니다. 먼저 토스 결제·취소 이력을 검증해야 하며, 계좌 환불과 질문권 복구는 잠겨 있습니다.</p>;
  return <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="text-sm font-semibold text-amber-950">관리자 예외 처리 · 실제 카드 취소 내역을 먼저 확인하세요</p>
    <p className="text-xs text-amber-900">자동 계좌송금은 실행하지 않습니다. 계좌번호·주민번호 등 개인정보를 이 입력창에 기록하지 마세요.</p>
    <label className="block text-sm font-semibold text-slate-700" htmlFor={"refund-note-"+refundId}>확인 사유 / 이체 거래식별자</label>
    <textarea id={"refund-note-"+refundId} value={note} onChange={e=>setNote(e.target.value)} maxLength={180}
      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" rows={2}
      placeholder="예: 카드사 원결제 부분취소 최종 거절 확인 또는 송금완료 거래식별자"/>
    {(status==="REVIEW_REQUIRED")?<button type="button" disabled={busy} onClick={()=>submit("manual_required")}
      className="rounded-xl bg-[#171a3d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">대체 환불 처리 대상으로 지정</button>:null}
    {status==="MANUAL_BANK_REQUIRED"?<label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={transferConfirmed} onChange={e=>setTransferConfirmed(e.target.checked)} className="mt-0.5" disabled={!bankSubmitted}/>
      고객의 계좌와 예금주를 확인했고, 실제 계좌이체를 완료했으며, 확인 메모에 이체 거래식별자를 입력했습니다.
    </label>:null}
    {(status==="MANUAL_BANK_REQUIRED")?<button type="button" disabled={busy||!bankSubmitted||!transferConfirmed} onClick={()=>submit("manual_paid")}
      className="rounded-xl bg-[#171a3d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">실제 송금 완료 확인 후 기록</button>:null}
    {status==="MANUAL_BANK_REQUIRED"&&!bankSubmitted?<p className="text-xs text-amber-900">고객이 환불 계좌를 제출해야 완료 처리 버튼이 활성화됩니다.</p>:null}
    {["REVIEW_REQUIRED","MANUAL_BANK_REQUIRED"].includes(status)?<div className="space-y-2 border-t border-amber-200 pt-3">
      <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={customerConfirmed} onChange={e=>setCustomerConfirmed(e.target.checked)}
          className="mt-0.5"/> 고객이 환불 신청을 철회했으며, 금전 환불이 이루어지지 않았음을 확인했습니다.
      </label>
      <button type="button" disabled={busy||!customerConfirmed} onClick={()=>submit("restore_credit")}
        className="rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">환불 신청 종료 · 질문권 복구</button>
    </div>:null}
    {message?<p role="status" className="text-sm font-semibold text-slate-700">{message}</p>:null}
  </div>;
}
