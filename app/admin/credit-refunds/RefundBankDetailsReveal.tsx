"use client";
import { useEffect, useState } from "react";
import { REFUND_BANK_OPTIONS } from "@/app/lib/aiConsulting/refundBankOptions";

type Details={bankCode:string;accountNumber:string;accountHolder:string};
export default function RefundBankDetailsReveal({refundId,bankCode,last4}:{
  refundId:string;bankCode:string;last4:string;
}) {
  const [reason,setReason]=useState("대체 환불 송금 전 계좌 확인");
  const [details,setDetails]=useState<Details|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{
    if(!details)return;
    const timeout=setTimeout(()=>setDetails(null),60_000);
    return ()=>clearTimeout(timeout);
  },[details]);
  async function reveal(){
    if(busy)return;setBusy(true);setError(null);
    try {
      const res=await fetch("/api/internal/admin/credit-refunds/bank",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({refundId,reason}),
        cache:"no-store",
      });
      const body=await res.json().catch(()=>({})) as {error?:string}&Partial<Details>;
      if(!res.ok)throw new Error(body.error??"계좌 조회에 실패했습니다.");
      if(!body.accountNumber||!body.accountHolder||!body.bankCode)throw new Error("계좌 응답이 올바르지 않습니다.");
      setDetails({bankCode:body.bankCode,accountNumber:body.accountNumber,accountHolder:body.accountHolder});
    }catch(e){setError(e instanceof Error?e.message:"안전한 계좌 조회를 완료하지 못했습니다.");}
    finally{setBusy(false);}
  }
  const label=REFUND_BANK_OPTIONS.find(item=>item.value===(details?.bankCode??bankCode))?.label??"은행";
  return <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
    <p className="font-bold">접수된 환불 계좌 · {label} · ****{last4}</p>
    <p className="text-xs leading-5 text-slate-600">조회 기록이 남습니다. 송금할 때만 확인하고, 사용 후 즉시 숨기세요. 계좌번호를 메모나 이메일에 복사해 보관하지 마세요.</p>
    <label className="block text-xs font-semibold">조회 사유
      <input value={reason} onChange={e=>setReason(e.target.value)} maxLength={180}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2"/>
    </label>
    <button type="button" disabled={busy||reason.trim().length<6} onClick={reveal}
      className="rounded-lg border border-slate-500 px-3 py-2 font-bold disabled:opacity-50">
      {busy?"계좌 확인 중...":details?"계좌 다시 확인":"계좌 확인하기"}
    </button>
    {details?<div className="rounded-lg bg-[#f2f3fa] p-3">
      <dl className="grid grid-cols-[90px_1fr] gap-2">
        <dt className="font-semibold">은행</dt><dd>{label}</dd>
        <dt className="font-semibold">계좌번호</dt><dd className="select-all break-all font-mono">{details.accountNumber}</dd>
        <dt className="font-semibold">예금주</dt><dd>{details.accountHolder}</dd>
      </dl>
      <button type="button" className="mt-3 rounded-lg bg-slate-800 px-3 py-2 font-bold text-white"
        onClick={()=>setDetails(null)}>계좌 정보 숨기기</button>
      <p className="mt-2 text-xs text-slate-600">보안을 위해 1분 후 자동으로 숨겨집니다.</p>
    </div>:null}
    {error?<p role="alert" className="text-red-700">{error}</p>:null}
  </div>;
}
