import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AI_CONSULTING_PRICING_REFERENCE,
  getAiConsultingQualityCostReport,
} from "@/app/lib/aiConsulting/qualityCost";
import {
  OperatorAuthorizationError,
  requireOperator,
} from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function number(value: number): string {
  return value.toLocaleString("ko-KR");
}

function percent(part: number, total: number): string {
  if (total <= 0) return "-";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function usd(value: number | null): string {
  if (value === null) return "측정 불가";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(3)}`;
}

function time(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-950">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p> : null}
    </div>
  );
}

function accessDenied() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">AI CONSULTING OPS</p>
        <h1 className="mt-3 text-3xl font-bold">접근 권한 없음</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">승인된 운영자만 AI 상담 품질·비용 현황을 볼 수 있습니다.</p>
      </div>
    </main>
  );
}

export default async function AiConsultingAdminPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/ai-consulting");
    }
    return accessDenied();
  }

  let report;
  try {
    report = await getAiConsultingQualityCostReport(100);
  } catch (error) {
    console.error("[admin-ai-consulting-quality] read failed", error);
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <Link href="/admin" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 운영 콘솔</Link>
          <h1 className="mt-6 text-3xl font-bold">AI 상담 품질·비용</h1>
          <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">현재 상담 품질 데이터를 읽지 못했습니다. Production 데이터는 변경하지 않았습니다.</p>
        </div>
      </main>
    );
  }

  const modelEntries = Object.entries(report.modelCounts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border-b border-stone-200 pb-6">
          <Link href="/admin" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 운영 콘솔</Link>
          <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-stone-500">AI CONSULTING · PHASE 12A</p>
          <h1 className="mt-3 text-3xl font-bold">AI 상담 품질·비용</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            최근 완료된 AI 상담 답변을 읽기 전용으로 점검합니다. 자동 검사는 답변 형식·길이·토큰 기록만 확인하며,
            명리 근거의 정확성이나 실제 상담 품질은 별도 수동 검토가 필요합니다.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="최근 완료 답변"
            value={`${number(report.successfulAnswers)}건`}
            note={`최대 ${number(report.sampleLimit)}건 표본`}
          />
          <Stat
            label="구조 검사 통과"
            value={percent(report.formatPassCount, report.successfulAnswers)}
            note="4개 필수 구획 + 300~1,800자"
          />
          <Stat
            label="토큰 기록 완전성"
            value={percent(report.telemetryCompleteCount, report.successfulAnswers)}
            note={`입력 ${number(report.totalInputTokens)} · 출력 ${number(report.totalOutputTokens)} 토큰`}
          />
          <Stat
            label="답변당 API 원가 추정"
            value={usd(report.estimatedAverageCostUsd)}
            note="캐시 할인 미반영 상한 추정"
          />
        </section>

        <section className="mt-8 border-y border-stone-200 py-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">SCOPE ROUTING</p>
              <h2 className="mt-2 text-xl font-bold">최근 질문 분류</h2>
              <p className="mt-2 text-sm text-stone-600">최근 사용자 질문 최대 200건 기준입니다.</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(report.scopeCounts).map(([key, count]) => (
                  <div key={key} className="border border-stone-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-stone-500">{key}</dt>
                    <dd className="mt-1 text-lg font-bold">{number(count)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-5 text-stone-500">
                최근 질문 {number(report.recentUserQuestions)}건 중 실제 차감 완료 {number(report.recentChargedQuestions)}건입니다.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">COST TELEMETRY</p>
              <h2 className="mt-2 text-xl font-bold">모델·원가 기준</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                가격 기준일 {AI_CONSULTING_PRICING_REFERENCE.checkedAt}. 저장된 cached-input 토큰 수가 없으므로 입력 전체를 일반 입력 요금으로 계산한 보수적 추정치입니다.
              </p>
              <div className="mt-4 border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold">표본 총 원가 추정 {usd(report.estimatedTotalCostUsd)}</p>
                <p className="mt-1 text-xs text-stone-500">가격을 알 수 없는 모델/텔레메트리 {number(report.unknownPriceCount)}건</p>
                {modelEntries.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-stone-700">
                    {modelEntries.map(([model, count]) => <li key={model}>{model} · {number(count)}건</li>)}
                  </ul>
                ) : <p className="mt-3 text-sm text-stone-500">아직 완료된 AI 상담이 없습니다.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">RECENT SAMPLES</p>
              <h2 className="mt-2 text-xl font-bold">최근 완료 답변 표본</h2>
            </div>
            <p className="text-xs text-stone-500">조회 시각 {time(report.generatedAt)}</p>
          </div>

          {report.samples.length === 0 ? (
            <div className="mt-4 border border-dashed border-stone-300 bg-white p-8 text-center text-sm leading-7 text-stone-500">
              아직 완료된 AI 상담 답변이 없습니다. 실제 상담이 발생하면 이 화면에서 토큰·원가와 구조 검사를 확인할 수 있습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {report.samples.map((sample) => (
                <article key={sample.assistantMessageId} className="border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-500">
                      {sample.productId ?? "상품 미확인"}{sample.analysisEditionKey ? ` · ${sample.analysisEditionKey}` : ""} · {time(sample.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className={sample.formatPass && sample.lengthPass ? "text-emerald-700" : "text-red-700"}>
                        구조 {sample.formatPass && sample.lengthPass ? "통과" : "확인 필요"}
                      </span>
                      <span className={sample.telemetryPass ? "text-emerald-700" : "text-amber-700"}>
                        토큰 {sample.telemetryPass ? "기록됨" : "누락"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-stone-500">사용자 질문</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">{sample.questionPreview || "질문 연결 정보 없음"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-500">답변 미리보기</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{sample.answerPreview}</p>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
                    {sample.model ?? "모델 미기록"} · input {sample.inputTokens ?? "-"} · output {sample.outputTokens ?? "-"} · 원가 추정 {usd(sample.estimatedCostUsd)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
