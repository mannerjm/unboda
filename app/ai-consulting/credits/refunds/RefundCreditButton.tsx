"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function RefundCreditButton({profileId,purchaseId,quantity,amount}:{
  profileId:string;purchaseId:string;quantity:number;amount:number;
}) {
  const router=useRouter();
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  async function onRefund(){
    if(pending)return;
    if(!window.confirm(`남은 질문권 ${quantity}회를 취소하고 ${amount.toLocaleString("ko-KR")}원을 환불 신청하시겠습니까? 완료된 환불은 취소할 수 없습니다.`))return;
    setPending(true);setMessage(null);
    try{
      const response=await fetch("/api/ai-consulting/credits/refunds",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({profileId,purchaseId}),
      });
      const result=await response.json().catch(()=>({})) as {error?:string;status?:string;amount?:number};
      if(!response.ok)throw new Error(result.error??"환불 신청을 완료하지 못했습니다.");
      setMessage(result.status==="COMPLETED"?"환불 요청이 완료되었습니다. 카드사 반영까지 시간이 소요될 수 있습니다."
        :result.status==="REVIEW_REQUIRED"?"자동 취소가 어려워 담당자 확인이 필요합니다. 중복으로 신청하지 않아도 됩니다."
        :"환불 상태를 확인하고 있습니다. 이 화면에서 결과를 다시 확인할 수 있습니다.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"환불 상태를 확인하지 못했습니다.");}
    finally{setPending(false);}
  }
  return <div className="flex flex-col items-start gap-2">
    <button type="button" disabled={pending} onClick={onRefund}
      className="rounded-xl border border-[#6f5ce7] bg-white px-4 py-2 text-sm font-bold text-[#5143b0] hover:bg-[#f5f2ff] disabled:opacity-50">
      {pending?"환불 상태 확인 중...":"잔여 질문권 환불 신청"}
    </button>
    {message?<p role="status" className="text-sm leading-6 text-slate-700">{message}</p>:null}
  </div>;
}
