"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { REFUND_BANK_OPTIONS } from "@/app/lib/aiConsulting/refundBankOptions";

export default function RefundBankIntakeForm({refundId,refundAmount,refundQuantity}:{
  refundId:string;refundAmount:number;refundQuantity:number;
}) {
  const router=useRouter();
  const [bankCode,setBankCode]=useState<string>(REFUND_BANK_OPTIONS[0].value);
  const [accountNumber,setAccountNumber]=useState("");
  const [accountHolder,setAccountHolder]=useState("");
  const [acknowledged,setAcknowledged]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting||!acknowledged)return;
    setSubmitting(true);setMessage(null);
    try {
      const response=await fetch("/api/ai-consulting/credits/refunds/bank",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({refundId,bankCode,accountNumber,accountHolder,acknowledged}),
      });
      const result=await response.json().catch(()=>({})) as {error?:string;message?:string};
      if(!response.ok)throw new Error(result.error??"환불 계좌를 제출하지 못했습니다.");
      setAccountNumber("");setAccountHolder("");
      setMessage(result.message??"환불 계좌를 안전하게 접수했습니다.");
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"계좌 접수 상태를 확인할 수 없습니다.");}
    finally{setSubmitting(false);}
  }
  return <form onSubmit={submit} autoComplete="off" className="mt-4 space-y-4 rounded-xl border border-[#d8d5fb] bg-[#f9f8ff] p-4">
    <div>
      <h3 className="font-extrabold text-[#171a3d]">대체 환불 계좌 입력</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">카드 취소가 최종 어려워 계좌이체로 환불하는 경우입니다. 메일로 계좌번호를 보내지 말고 이 화면에 직접 입력해 주세요.</p>
      <p className="mt-2 text-sm font-semibold text-[#5143b0]">환불 예정: {refundAmount.toLocaleString("ko-KR")}원 · {refundQuantity}회</p>
    </div>
    <label className="block text-sm font-bold text-slate-800">은행
      <select value={bankCode} onChange={e=>setBankCode(e.target.value)} required
        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">
        {REFUND_BANK_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <label className="block text-sm font-bold text-slate-800">환불받을 계좌번호
      <input value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/[^0-9-\s]/g,""))}
        required inputMode="numeric" maxLength={25} autoComplete="off"
        placeholder="계좌번호 입력 (숫자만)" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"/>
    </label>
    <label className="block text-sm font-bold text-slate-800">예금주
      <input value={accountHolder} onChange={e=>setAccountHolder(e.target.value)}
        required maxLength={40} autoComplete="off" placeholder="예금주 성명"
        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"/>
    </label>
    <label className="flex items-start gap-3 text-xs leading-5 text-slate-700">
      <input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}
        className="mt-1 h-4 w-4" required/>
      <span>입력한 은행·계좌번호·예금주는 대체 환불 처리 목적으로만 사용됩니다. 계좌 정보는 암호화하여 보관하고 승인된 담당자만 조회하며, 환불 완료 또는 환불 신청 철회 시 삭제합니다. 법정 거래·처리 기록은 계좌정보와 구분하여 보존됩니다. 계좌가 본인 명의인지 확인하고 제출합니다.</span>
    </label>
    <p className="text-xs leading-5 text-slate-600">계좌 제출 후에는 임의로 바꿀 수 없습니다. 입력 오류가 있으면 환불 송금 전 고객지원센터에 문의해 주세요.</p>
    <button type="submit" disabled={submitting||!acknowledged||!accountNumber.trim()||!accountHolder.trim()}
      className="w-full rounded-xl bg-[#5143b0] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
      {submitting?"안전하게 계좌 접수 중...":"대체 환불 계좌 제출"}
    </button>
    {message?<p role="status" className="text-sm font-semibold text-slate-800">{message}</p>:null}
  </form>;
}
