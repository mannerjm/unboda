"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CompatibilityPaidReportPreparing({ failed = false }: { failed?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (failed) return;
    const timer = window.setInterval(() => router.refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [failed, router]);

  return (
    <section className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-[#dce1ef] bg-white p-8 text-center shadow-[0_16px_45px_rgba(33,40,83,0.07)]">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#6f5ce7]">궁합 리포트</p>
      <h2 className="mt-3 text-2xl font-bold text-[#11162d]">{failed ? "리포트 준비에 문제가 생겼어요" : "두 사람의 궁합 리포트를 준비하고 있어요"}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {failed
          ? "결제 내역은 보존되어 있습니다. 구매한 분석에서 다시 확인하거나 고객지원으로 문의해 주세요."
          : "결제는 완료되었습니다. 관계 근거와 현재 흐름을 정리해 저장하는 중이며, 이 화면은 자동으로 갱신됩니다."}
      </p>
    </section>
  );
}
