"use client";
import CoreAnalysisCard from "./CoreAnalysisCard";
import ElementRelationsCard from "./ElementRelationsCard";
import DaeunFlowCard from "./DaeunFlowCard";
import ReportReadyCard from "./ReportReadyCard";
import { useEffect, useState } from "react";
import { restoreStoredResult } from "@/app/lib/restoreStoredResult";
import ProductRecommendationsCard from "./ProductRecommendationsCard";
import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import type {
  AnalyzePremiumResponse,
  AnalyzeRequest,
} from "@/app/lib/analyzeApiTypes";

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
    result: string;
    premiumAnalysis: AnalyzePremiumResponse;
    productRecommendations: AnalysisProductRecommendation[];
    message: null;
    }
  | {
      status: "error";
      result: null;
      message: string;
    };

type PremiumRequestState =
  | {
      status: "idle";
      request: null;
    }
  | {
      status: "ready";
      request: AnalyzeRequest;
    }
  | {
      status: "error";
      request: null;
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
 
    const [premiumRequestState, setPremiumRequestState] =
  useState<PremiumRequestState>({
    status: "idle",
    request: null,
  });

  useEffect(() => {
    const savedResult =
      window.sessionStorage.getItem("sajuResult");

    const savedSaju =
      window.sessionStorage.getItem("sajuData");
    
      const savedAnalyzeRequest =
  window.sessionStorage.getItem("analyzeRequest");

  if (!savedAnalyzeRequest) {
  setRestoreState({
    status: "error",
    result: null,
    message: "유료 분석에 필요한 입력 정보를 찾을 수 없습니다.",
  });

  return;
}
let analyzeRequest: AnalyzeRequest;

try {
  analyzeRequest = JSON.parse(savedAnalyzeRequest) as AnalyzeRequest;
} catch {
  setPremiumRequestState({
    status: "error",
    request: null,
    message: "저장된 입력 정보를 불러올 수 없습니다.",
  });

  setRestoreState({
    status: "error",
    result: null,
    message: "저장된 입력 정보를 불러올 수 없습니다.",
  });

  return;
}
setPremiumRequestState({
  status: "ready",
  request: analyzeRequest,
});

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

const fetchPremiumAnalysis = async () => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...analyzeRequest,
        productId,
      }),
    });

    const data = await response.json();

    if (!response.ok || "error" in data) {
      throw new Error(
        "error" in data
          ? data.error
          : "유료 분석을 생성하지 못했습니다."
      );
    }

    if (!data.premiumAnalysis) {
  throw new Error("유료 분석 데이터를 받지 못했습니다.");
}

setRestoreState({
  status: "success",
  result: data.result,
  premiumAnalysis: data.premiumAnalysis,
  productRecommendations: data.productRecommendations,
  message: null,
});

  } catch (error) {
    setRestoreState({
      status: "error",
      result: null,
      message:
        error instanceof Error
          ? error.message
          : "유료 분석을 생성하지 못했습니다.",
    });
  }
};

void fetchPremiumAnalysis();


 }, [productId]);

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

    <CoreAnalysisCard
      fortuneBrain={restoreState.premiumAnalysis.fortuneBrain}
    />
<ElementRelationsCard
  elementRelations={
    restoreState.premiumAnalysis.elementRelations
  }
/>
<DaeunFlowCard
  daeunAnalysis={restoreState.premiumAnalysis.daeunAnalysis}
/>
<ProductRecommendationsCard
  recommendations={restoreState.productRecommendations}
/>
   <ReportReadyCard productId={productId} />
    </section>
  );
}