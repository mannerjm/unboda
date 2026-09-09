import Link from "next/link";
import { redirect } from "next/navigation";
import { getAiConsultingOperationsReport } from "@/app/lib/aiConsulting/operations";
import {
  OperatorAuthorizationError,
  requireOperator,
} from "@/app/lib/operators/server";

export const dynamic = "force-dynamic";

function number(value: number): string {
  return value.toLocaleString("ko-KR");
}

function percent(value: number | null): string {
  return value === null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function duration(value: number | null): string {
  if (value === null) return "-";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}초`;
}

function time(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
        <p className="mt-4 text-sm leading-7 text-stone-600">승인된 운영자만 AI 상담 운영 현황을 볼 수 있습니다.</p>
      </div>
    </main>
  );
}

export default async function AiConsultingOperationsPage() {
  try {
    await requireOperator();
  } catch (error) {
    if (error instanceof OperatorAuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?returnTo=/admin/ai-consulting/operations");
    }
    return accessDenied();
  }

  let report;
  try {
    report = await getAiConsultingOperationsReport(24);
  } catch (error) {
    console.error("[admin-ai-consulting-operations] read failed", error);
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <Link href="/admin/ai-consulting" className="text-sm font-semibold text-stone-600 underline underline-offset-4">← 품질·비용</Link>
          <h1 className="mt-6 text-3xl font-bold">AI 상담 운영 모니터링</h1>
          <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            현재 운영 데이터를 읽지 못했습니다. 상담·질문권 데이터는 변경하지 않았습니다.
          </p>
        </div>
      </main>
    );
  }

  const integrity = report.chargeIntegrity;
  const integrityIssueCount =
    integrity.chargedWithoutAssistant
    + integrity.chargedWithoutConsume
    + integrity.assistantWithoutCharge
    + integrity.consumeWithoutCharge
    + integrity.staleReservations
    + integrity.releasedWithoutFailureTelemetry;
  const failureCodes = Object.entries(report.failureCodeCounts).sort((a, b) => b[1] - a[1]);
  const failureStages = Object.entries(report.failureStageCounts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-10 text-stone-900 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <header className="border-b border-stone-200 pb-6">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-stone-600">
            <Link href="/admin" className="underline underline-offset-4">← 운영 콘솔</Link>
            <Link href="/admin/ai-consulting" className="underline underline-offset-4">품질·비용 보기</Link>
          </div>
          <p className="mt-7 text-xs font-semibold tracking-[0.2em] text-stone-500">AI CONSULTING · PHASE 12B</p>
          <h1 className="mt-3 text-3xl font-bold">AI 상담 운영 모니터링</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            최근 {number(report.windowHours)}시간의 실제 ALLOW 상담 결과와 질문권 차감 무결성을 읽기 전용으로 확인합니다.
            실패 텔레메트리는 질문·답변 본문을 복제하지 않고 안전한 실패 코드와 실행 메타데이터만 저장합니다.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="완료 시도" value={`${number(report.attempts)}건`} note="성공 + 실패 + 타임아웃" />
          <Stat label="성공률" value={percent(report.successRate)} note={`성공 ${number(report.succeeded)}건`} />
          <Stat label="실패" value={`${number(report.failed)}건`} note={`타임아웃 제외`} />
          <Stat label="타임아웃" value={`${number(report.timedOut)}건`} note="모델 호출 제한 시간 초과" />
          <Stat label="진행 중 예약" value={`${number(report.inFlight)}건`} note="아직 만료되지 않은 ALLOW 예약" />
        </section>

        <section className="mt-8 border-y border-stone-200 py-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">RUNTIME HEALTH</p>
              <h2 className="mt-2 text-xl font-bold">실행 상태</h2>
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">평균 성공 응답 시간</dt><dd className="mt-1 text-lg font-bold">{duration(report.averageSuccessDurationMs)}</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">실패 후 정상 해제</dt><dd className="mt-1 text-lg font-bold">{number(integrity.releasedUncharged)}건</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">만료됐지만 미해제</dt><dd className="mt-1 text-lg font-bold">{number(integrity.staleReservations)}건</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">실패 텔레메트리 누락</dt><dd className="mt-1 text-lg font-bold">{number(integrity.releasedWithoutFailureTelemetry)}건</dd></div>
              </dl>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">CHARGE INTEGRITY</p>
              <h2 className="mt-2 text-xl font-bold">질문권 차감 무결성</h2>
              <p className={`mt-3 text-sm font-semibold ${integrityIssueCount === 0 ? "text-emerald-700" : "text-red-700"}`}>
                {integrityIssueCount === 0 ? "현재 표본에서 차감 불일치 없음" : `확인 필요 ${number(integrityIssueCount)}건`}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">차감됐지만 답변 없음</dt><dd className="mt-1 font-bold">{number(integrity.chargedWithoutAssistant)}</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">차감됐지만 원장 없음</dt><dd className="mt-1 font-bold">{number(integrity.chargedWithoutConsume)}</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">답변 있지만 미차감</dt><dd className="mt-1 font-bold">{number(integrity.assistantWithoutCharge)}</dd></div>
                <div className="border border-stone-200 bg-white p-3"><dt className="text-xs text-stone-500">원장 있지만 미차감</dt><dd className="mt-1 font-bold">{number(integrity.consumeWithoutCharge)}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">FAILURE STAGE</p>
            <h2 className="mt-2 text-xl font-bold">실패 구간</h2>
            <div className="mt-4 border border-stone-200 bg-white">
              {failureStages.map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between border-t border-stone-100 px-4 py-3 first:border-t-0">
                  <span className="text-sm font-semibold text-stone-700">{stage}</span><span className="text-sm font-bold">{number(count)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">FAILURE CODE</p>
            <h2 className="mt-2 text-xl font-bold">실패 코드</h2>
            <div className="mt-4 border border-stone-200 bg-white">
              {failureCodes.length === 0 ? <p className="p-4 text-sm text-stone-500">기록된 실패가 없습니다.</p> : failureCodes.map(([code, count]) => (
                <div key={code} className="flex items-start justify-between gap-4 border-t border-stone-100 px-4 py-3 first:border-t-0">
                  <span className="break-all font-mono text-xs text-stone-700">{code}</span><span className="shrink-0 text-sm font-bold">{number(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold tracking-[0.16em] text-stone-500">RECENT FAILURES</p><h2 className="mt-2 text-xl font-bold">최근 실패 표본</h2></div>
            <p className="text-xs text-stone-500">조회 시각 {time(report.generatedAt)}</p>
          </div>
          {report.recentFailures.length === 0 ? (
            <div className="mt-4 border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">최근 24시간에 기록된 실패가 없습니다.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {report.recentFailures.map((failure, index) => (
                <article key={`${failure.startedAt}-${index}`} className="border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-500">{failure.productId ?? "상품 미확인"}{failure.analysisEditionKey ? ` · ${failure.analysisEditionKey}` : ""} · {time(failure.startedAt)}</p>
                    <span className={failure.status === "timed_out" ? "text-xs font-bold text-amber-700" : "text-xs font-bold text-red-700"}>{failure.status}</span>
                  </div>
                  <p className="mt-3 break-all font-mono text-xs text-stone-700">{failure.failureCode}</p>
                  <p className="mt-2 text-xs text-stone-500">구간 {failure.failureStage} · 처리 시간 {duration(failure.durationMs)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
