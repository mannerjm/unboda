import Link from "next/link";
import { redirect } from "next/navigation";
import AiConsultingPortfolioClient, {
  type AiConsultingPortfolioPreviewData,
} from "@/app/ai-consulting/AiConsultingPortfolioClient";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const PREVIEW_DATA: AiConsultingPortfolioPreviewData = {
  state: {
    profileId: "00000000-0000-4000-8000-000000000001",
    questionsRemaining: 4,
    analyses: [
      {
        productId: "wealth",
        analysisEditionKey: "YEAR:2026",
        productTitle: "재물·수입 안정성 심층 분석",
        editionLabel: "2026년 분석",
        acquiredAt: "2026-09-17T05:20:00.000Z",
        scopeLabel: "이 구매 리포트의 계산 결과와 해석 범위 안에서 다음 질문을 이어갑니다.",
        suggestedQuestions: [
          "이 리포트에서 지금 가장 먼저 행동으로 옮길 부분은 뭐야?",
          "주의 신호가 실제 생활에서는 어떤 모습으로 나타날 수 있어?",
          "다음에 다시 확인해야 할 기준을 3가지로 정리해줘.",
        ],
      },
      {
        productId: "career-job-change",
        analysisEditionKey: "MONTH:2026-09",
        productTitle: "이직·전환 판단 분석",
        editionLabel: "2026년 9월 분석",
        acquiredAt: "2026-09-12T03:20:00.000Z",
        scopeLabel: "이 구매 리포트의 계산 결과와 해석 범위 안에서 다음 질문을 이어갑니다.",
        suggestedQuestions: [
          "지금 이직을 서두르기보다 먼저 확인해야 할 조건은 뭐야?",
          "현재 자리에 남을 때 확인할 신호를 정리해줘.",
          "이동 준비가 됐다고 볼 수 있는 기준은 뭐야?",
        ],
      },
      {
        productId: "relationship-current",
        analysisEditionKey: "MONTH:2026-09",
        productTitle: "현재 연애 관계의 지속성과 조정",
        editionLabel: "2026년 9월 분석",
        acquiredAt: "2026-09-03T08:10:00.000Z",
        scopeLabel: "이 구매 리포트의 계산 결과와 해석 범위 안에서 다음 질문을 이어갑니다.",
        suggestedQuestions: [
          "지금 관계에서 내가 먼저 조정해볼 수 있는 부분은 뭐야?",
          "반복되는 갈등이 생길 때 확인할 신호는 뭐야?",
          "관계를 유지할지 판단할 때 어떤 기준을 보면 돼?",
        ],
      },
    ],
    messages: [
      {
        id: "preview-user-1",
        threadId: "preview-thread-wealth",
        role: "user",
        content: "수입을 늘리기보다 남는 구조를 먼저 만들라고 했는데, 가장 먼저 뭘 확인해야 해?",
        scopeDecision: "ALLOW",
        charged: true,
        createdAt: "2026-09-18T00:30:00.000Z",
        sourceProductId: "wealth",
        sourceEditionKey: "YEAR:2026",
        sourceTitle: "재물·수입 안정성 심층 분석",
        sourceEditionLabel: "2026년 분석",
      },
      {
        id: "preview-assistant-1",
        threadId: "preview-thread-wealth",
        role: "assistant",
        content: "먼저 최근 2~3개월의 고정비와 반복 지출을 나눠서 보세요. 재물 리포트에서는 수입 기회 자체보다 현금흐름이 여러 갈래로 새는 구조를 먼저 점검하는 쪽이 중요하게 나타납니다.",
        scopeDecision: null,
        charged: false,
        createdAt: "2026-09-18T00:31:00.000Z",
        sourceProductId: "wealth",
        sourceEditionKey: "YEAR:2026",
        sourceTitle: "재물·수입 안정성 심층 분석",
        sourceEditionLabel: "2026년 분석",
      },
      {
        id: "preview-user-2",
        threadId: "preview-thread-career",
        role: "user",
        content: "그럼 이직은 지금 바로 움직이는 게 나아, 아니면 준비를 더 해야 해?",
        scopeDecision: "ALLOW",
        charged: true,
        createdAt: "2026-09-18T00:34:00.000Z",
        sourceProductId: "career-job-change",
        sourceEditionKey: "MONTH:2026-09",
        sourceTitle: "이직·전환 판단 분석",
        sourceEditionLabel: "2026년 9월 분석",
      },
      {
        id: "preview-assistant-2",
        threadId: "preview-thread-career",
        role: "assistant",
        content: "이 질문은 재물 리포트가 아니라 보유한 이직·전환 판단 분석으로 자동 연결됩니다. 현재는 이동 자체보다 역할·보상·정착 조건을 먼저 확인하고, 실제 제안이 그 기준을 충족할 때 움직이는 흐름으로 보는 편이 안전합니다.",
        scopeDecision: null,
        charged: false,
        createdAt: "2026-09-18T00:35:00.000Z",
        sourceProductId: "career-job-change",
        sourceEditionKey: "MONTH:2026-09",
        sourceTitle: "이직·전환 판단 분석",
        sourceEditionLabel: "2026년 9월 분석",
      },
    ],
  },
  memories: [
    {
      id: "preview-memory-1",
      content: "현재 본업 외에 주말 부업을 하나 검토하고 있다.",
      sourceMessageId: null,
      createdAt: "2026-09-17T23:50:00.000Z",
      updatedAt: "2026-09-17T23:50:00.000Z",
    },
  ],
};

export default async function AdminAiConsultingPreviewPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/ai-consulting-preview");
    }

    return (
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-14 text-slate-900">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">AI CONSULTING PREVIEW</p>
          <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">이 미리보기는 승인된 운영자만 사용할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="bg-[#f5f7fc] px-4 pt-7 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[#d8d3ff] bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">ADMIN DESIGN PREVIEW</p>
            <h1 className="mt-2 text-xl font-black text-[#11162d]">통합 AI 상담 UX 미리보기</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">재물·이직·관계 리포트를 한 상담에서 자동 연결하는 샘플입니다. 실제 질문권·AI 호출·기억 저장은 동작하지 않습니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/purchased-analyses-preview" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
              ← 보관함 미리보기
            </Link>
            <Link href="/admin" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
              관리자 페이지
            </Link>
          </div>
        </div>
      </div>
      <AiConsultingPortfolioClient
        profileId="00000000-0000-4000-8000-000000000001"
        focusProductId="wealth"
        focusEdition="YEAR:2026"
        previewData={PREVIEW_DATA}
      />
    </>
  );
}
