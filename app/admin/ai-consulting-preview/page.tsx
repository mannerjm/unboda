import Link from "next/link";
import { redirect } from "next/navigation";
import AiConsultingChatClient, {
  type AiConsultingPreviewData,
} from "@/app/ai-consulting/AiConsultingChatClient";
import { OperatorAuthorizationError, requireOperator } from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

const PREVIEW_DATA: AiConsultingPreviewData = {
  session: {
    state: "ready",
    productId: "wealth",
    analysisEditionKey: "YEAR:2026",
    threadId: "preview-thread",
    questionsRemaining: 4,
    messages: [
      {
        id: "preview-user-1",
        role: "user",
        content: "리포트에서 수입을 늘리기보다 남는 구조를 먼저 만들라고 했는데, 내가 가장 먼저 확인해야 할 건 뭐야?",
        scopeDecision: "ALLOW",
        charged: true,
        createdAt: "2026-09-18T00:30:00.000Z",
      },
      {
        id: "preview-assistant-1",
        role: "assistant",
        content: "먼저 최근 2~3개월의 고정비와 반복 지출을 나눠서 보세요. 이 리포트에서는 수입 기회 자체보다 현금흐름이 여러 갈래로 새는 구조가 체감 안정성을 낮추는 쪽이 더 중요하게 나타납니다.\n\n지금 확인할 순서는 ① 자동결제·구독처럼 반복되는 비용, ② 수익이 확정되기 전에 먼저 집행하는 비용, ③ 동시에 여러 활동을 시작하면서 늘어난 관리비용입니다. 이 세 가지 중 하나만 먼저 줄여도 다음 판단이 훨씬 쉬워집니다.",
        scopeDecision: null,
        charged: false,
        createdAt: "2026-09-18T00:31:00.000Z",
      },
      {
        id: "preview-user-2",
        role: "user",
        content: "그러면 추가 수입 기회는 아예 미루는 게 좋아?",
        scopeDecision: "ALLOW",
        charged: true,
        createdAt: "2026-09-18T00:34:00.000Z",
      },
      {
        id: "preview-assistant-2",
        role: "assistant",
        content: "아예 미루라는 뜻은 아닙니다. 리포트의 핵심은 ‘확대 금지’가 아니라 ‘관리 가능한 범위에서 순서를 정하라’는 쪽에 가깝습니다. 이미 잘하는 일에서 반복 요청이 생기고, 추가 비용이 크지 않으며, 기존 일정 안에서 감당할 수 있다면 작은 범위로 먼저 확인해 볼 수 있습니다.\n\n반대로 선결제나 큰 장비비가 필요하거나 여러 기회를 동시에 시작해야 한다면, 현재 리포트의 주의 신호와 더 가깝습니다.",
        scopeDecision: null,
        charged: false,
        createdAt: "2026-09-18T00:35:00.000Z",
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
  backHref: "/admin/report-preview",
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
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[#d8d3ff] bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">ADMIN DESIGN PREVIEW</p>
            <h1 className="mt-2 text-xl font-black text-[#11162d]">Phase 7 AI 상담 UX 미리보기</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">실제 질문권·상담 기록·AI 호출을 만들지 않는 샘플 화면입니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/report-preview" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
              ← 리포트 미리보기
            </Link>
            <Link href="/admin" className="rounded-full border border-[#dce1ef] bg-[#f7f8fc] px-4 py-2 text-sm font-semibold text-slate-700">
              관리자 페이지
            </Link>
          </div>
        </div>
      </div>
      <AiConsultingChatClient
        profileId="00000000-0000-4000-8000-000000000001"
        productId="wealth"
        edition="YEAR:2026"
        previewData={PREVIEW_DATA}
      />
    </>
  );
}
