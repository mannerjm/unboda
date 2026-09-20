"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  kind: "compatibility" | "premium";
  failed?: boolean;
};

/**
 * Shared waiting surface for all purchased reports. Time is an estimate,
 * not a promise or a fabricated progress percentage.
 */
export default function PaidReportPreparing({ kind, failed = false }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (failed) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 10_000);
    return () => window.clearInterval(timer);
  }, [failed]);

  const delayed = elapsedMs >= 3 * 60 * 1000;
  const isCompatibility = kind === "compatibility";

  return (
    <section aria-live="polite" className="mx-auto mt-8 w-full max-w-2xl rounded-[1.75rem] border border-[#dce1ef] bg-white p-6 text-center shadow-[0_16px_45px_rgba(33,40,83,0.07)] sm:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#6f5ce7]">{isCompatibility ? "궁합 리포트" : "개인 맞춤 유료 리포트"}</p>
      {!failed ? (
        <div aria-hidden="true" className="mx-auto mt-6 h-11 w-11 animate-spin rounded-full border-4 border-[#dce1ef] border-t-[#6f5ce7]" />
      ) : null}
      <h2 className="mt-4 text-2xl font-bold leading-9 text-[#11162d]">
        {failed ? "리포트 준비에 문제가 생겼어요" : delayed ? "리포트 생성이 조금 더 걸리고 있어요" : isCompatibility ? "두 사람의 궁합 리포트를 준비하고 있어요" : "나만의 심층분석 리포트를 준비하고 있어요"}
      </h2>
      <p className="mt-4 text-[15px] leading-7 text-slate-700">
        {failed
          ? "리포트 생성 중 문제가 발생했습니다. 결제 내역과 구매 권한은 유지됩니다. 구매한 분석에서 다시 확인하거나 고객지원으로 문의해 주세요."
          : isCompatibility
            ? "결제가 완료되었습니다. 두 사람의 관계 근거와 현재 흐름을 분석하고 개인 맞춤 리포트를 저장하는 중입니다."
            : "결제가 완료되었습니다. 사주 원국과 현재 흐름을 분석하고 개인 맞춤 리포트를 저장하는 중입니다."}
      </p>
      {!failed ? (
        <div className="mt-6 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-7 text-slate-700">
          <p className="font-bold text-[#11162d]">예상 소요 시간: 약 1~3분</p>
          <p>분석 내용과 시스템 상황에 따라 시간이 더 걸릴 수 있습니다. 완료되면 결과 화면으로 자동 전환됩니다.</p>
          {delayed ? <p className="mt-2 font-semibold text-[#5e4bd1]">예상 시간보다 오래 걸리고 있습니다. 진행 상태를 계속 확인하고 있으며, 문제가 확인되면 안내해 드립니다.</p> : null}
        </div>
      ) : null}
      <p className="mt-5 text-sm leading-6 text-slate-600">
        {failed ? "다시 결제하지 마세요. 기존 구매 내역을 통해 결과를 확인할 수 있습니다." : "화면을 닫아도 구매 내역은 보존됩니다. 다시 접속하면 구매한 분석에서 생성 상태와 결과를 확인할 수 있습니다."}
      </p>
      <Link href="/purchased-analyses" className="mt-6 inline-flex justify-center rounded-xl border border-[#cfd5e6] px-5 py-3 text-sm font-bold text-[#11162d] transition hover:bg-[#f7f8fc]">구매한 분석으로 이동</Link>
    </section>
  );
}
