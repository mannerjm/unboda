"use client";

import { useEffect, useState } from "react";
import { restoreStoredResult } from "@/app/lib/restoreStoredResult";

type PremiumReportContentProps = {
  productId: string;
};

type RestoreState =
  | {
      status: "loading";
      result: null;
      message: null;
    }
  | {
      status: "success";
      result: any;
      message: null;
    }
  | {
      status: "error";
      result: null;
      message: string;
    };

export default function PremiumReportContent({
  productId,
}: PremiumReportContentProps) {
  const [restoreState, setRestoreState] =
    useState<RestoreState>({
      status: "loading",
      result: null,
      message: null,
    });

  useEffect(() => {
    const savedResult =
      window.sessionStorage.getItem("sajuResult");

    const savedSaju =
      window.sessionStorage.getItem("sajuData");

    const restored = restoreStoredResult(
      savedResult,
      savedSaju
    );

    if (!restored.ok) {
      setRestoreState({
        status: "error",
        result: null,
        message: restored.message,
      });

      return;
    }

    setRestoreState({
      status: "success",
      result: restored.result,
      message: null,
    });
  }, []);

  if (restoreState.status === "loading") {
    return (
      <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <p className="text-sm text-stone-600">
          저장된 사주 분석 결과를 불러오는 중입니다...
        </p>
      </section>
    );
  }

  if (restoreState.status === "error") {
    return (
      <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
          RESULT REQUIRED
        </p>

        <h2 className="mt-3 text-2xl font-bold text-stone-900">
          저장된 무료 분석 결과를 찾을 수 없습니다
        </h2>

        <p className="mt-4 text-sm leading-7 text-stone-600">
          {restoreState.message}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
        REPORT DATA READY
      </p>

      <h2 className="mt-3 text-2xl font-bold text-stone-900">
        무료 분석 결과 복원이 완료되었습니다
      </h2>

      <p className="mt-4 text-sm leading-7 text-stone-600">
        현재 상품 ID는 <strong>{productId}</strong>이며,
        복원된 사주 결과를 바탕으로 유료 심층 분석 입력을 구성할 수 있습니다.
      </p>
    </section>
  );
}