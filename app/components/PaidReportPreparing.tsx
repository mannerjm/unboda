"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MysticLoadingScreen from "@/app/components/MysticLoadingScreen";

type Props = {
  /** Existing callers may identify the report type; all types share the same copy. */
  kind?: "compatibility" | "premium" | "generic";
  failed?: boolean;
  stage?: "confirming" | "generating";
};

/**
 * Same visual system as the free-analysis loading page.
 * The three steps describe what the service prepares, not fabricated live progress.
 * Payment, entitlement and report data are not modified here.
 */
export default function PaidReportPreparing({
  failed = false,
  stage = "generating",
}: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (failed) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 10_000);
    return () => window.clearInterval(timer);
  }, [failed]);

  const delayed = elapsedMs >= 3 * 60 * 1000;
  const title = failed
    ? "리포트를 준비하는 중 문제가 생겼어요"
    : delayed
      ? "리포트 준비에 시간이 더 걸리고 있어요"
      : "나만의 리포트를 준비하고 있어요";

  return (
    <MysticLoadingScreen
      asSection
      showAnimation={!failed}
      eyebrow="운보다 맞춤 분석"
      title={title}
      description={failed
        ? "구매 내역과 열람 권한은 유지됩니다. 다시 결제하지 말고 구매한 분석에서 결과를 확인해 주세요."
        : stage === "confirming"
          ? "결제를 안전하게 확인하고 있습니다. 확인이 끝나면 구매한 분석을 바로 준비해 결과 화면으로 이어집니다."
          : "결제가 완료되었습니다. 고객님의 사주를 바탕으로 맞춤 리포트를 작성하고 있어요."}
      steps={["구매 정보 확인", "맞춤 분석 진행", "리포트 저장"]}
    >
      <div className="rounded-2xl border border-[#e4d4f6] bg-[#f7f1ff] px-4 py-3.5 text-left text-sm leading-6 text-[#514064] shadow-[0_6px_16px_rgba(100,67,166,.06)] sm:px-5">
        {!failed ? (
          <>
            <p className="font-bold text-[#31204d]">예상 소요 시간: 약 30초~1분</p>
            <p>실제 생성 시간은 분석 내용과 시스템 상황에 따라 달라질 수 있습니다.</p>
            {delayed ? (
              <p className="mt-2 font-semibold text-[#6b3bb5]">예상보다 오래 걸리고 있어요. 구매 내역에서 상태를 다시 확인할 수 있습니다.</p>
            ) : null}
          </>
        ) : (
          <p>결제한 상품을 다시 구매할 필요는 없습니다.</p>
        )}
        {stage === "generating" || failed ? (
          <p className="mt-2.5">이 화면을 닫아도 구매 내역은 보존됩니다. 구매한 분석에서 생성 상태와 결과를 다시 확인할 수 있습니다.</p>
        ) : (
          <p className="mt-2.5">결제 확인이 끝나면 별도 버튼 없이 리포트 준비 화면으로 이어집니다.</p>
        )}
      </div>
      {stage === "generating" || failed ? (
        <Link href="/purchased-analyses" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cdb0f1] bg-white px-5 py-2.5 text-sm font-bold text-[#593194] shadow-[0_6px_16px_rgba(110,73,178,.09)] transition hover:border-[#a784df] hover:bg-[#eee2ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8653d5]">
          구매한 분석으로 이동
        </Link>
      ) : null}
    </MysticLoadingScreen>
  );
}
