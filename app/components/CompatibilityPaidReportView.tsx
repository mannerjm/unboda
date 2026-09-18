import Link from "next/link";
import {
  resolveStoredCompatibilityRelationshipType,
  type StoredCompatibilityReport,
} from "@/app/lib/compatibilityPaidAnalysis";
import { getPairCompatibilityConfigByRelationshipType } from "@/app/lib/pairCompatibilityConfig";

function ReportSectionHeader({
  eyebrow,
  title,
  description,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
}) {
  const dark = false;
  void tone;
  return (
    <div className="max-w-3xl">
      <p className={`text-xs font-bold tracking-[0.15em] ${dark ? "text-slate-500" : "text-slate-500"}`}>{eyebrow}</p>
      <h3 className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${dark ? "text-white" : "text-[#11162d]"}`}>{title}</h3>
      {description ? <p className={`mt-2 text-sm leading-7 ${dark ? "text-slate-300" : "text-slate-500"}`}>{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {points.map((point) => (
        <li key={point} className="flex gap-3 rounded-2xl bg-white/80 px-4 py-3 text-[15px] leading-7 text-slate-700 ring-1 ring-[#dce1ef]/80">
          <span aria-hidden="true" className="mt-[9px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">✓</span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryTile({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-[#dce1ef]/80 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold tracking-[0.13em] text-slate-500">{eyebrow}</p>
      <h4 className="mt-3 text-base font-bold leading-7 text-[#11162d]">{title}</h4>
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{body}</p>
    </article>
  );
}

function PerspectiveCard({ label, headline, summary, signals }: { label: string; headline: string; summary: string; signals: readonly string[] }) {
  return (
    <article className="rounded-3xl border border-[#d8d3ff] bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold text-[#5e4bd1]">{label}</p>
      <h4 className="mt-3 text-lg font-bold leading-8 text-[#11162d]">{headline}</h4>
      <p className="mt-3 text-[15px] leading-7 text-slate-700">{summary}</p>
      <div className="mt-5 space-y-2">
        {signals.map((signal) => (
          <p key={signal} className="flex gap-2 text-sm leading-6 text-slate-600">
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#dccaa7]" />
            <span>{signal}</span>
          </p>
        ))}
      </div>
    </article>
  );
}

function EditorialSection({ eyebrow, title, summary, points }: { eyebrow: string; title: string; summary: string; points?: readonly string[] }) {
  return (
    <section className="border-t border-[#dce1ef]/80 px-6 py-10 sm:px-10 sm:py-12">
      <ReportSectionHeader eyebrow={eyebrow} title={title} />
      <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-slate-700">{summary}</p>
      {points?.length ? <PointList points={points} /> : null}
    </section>
  );
}

export default function CompatibilityPaidReportView({ content }: { content: StoredCompatibilityReport }) {
  const { report, perspectives, meta } = content;
  const config = getPairCompatibilityConfigByRelationshipType(
    resolveStoredCompatibilityRelationshipType(content),
  );
  const firstStrength = report.strengths[0];
  const conflictPoint = report.conflict.keyPoints[0] ?? report.conflict.summary;
  const timingPoint = report.currentTiming?.keyPoints[0] ?? report.currentTiming?.summary ?? "현재 관계 흐름은 두 사람의 기본 관계 구조와 함께 살펴봅니다.";
  const strengthGridClass = report.strengths.length <= 1
    ? "lg:grid-cols-1"
    : report.strengths.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";

  return (
    <div className="mx-auto mt-8 w-full max-w-5xl">
      <article className="overflow-hidden rounded-[32px] border border-[#dce1ef]/80 bg-[#ffffff] shadow-xl shadow-[0_22px_60px_rgba(33,40,83,0.08)]">
        <header className="relative overflow-hidden bg-[linear-gradient(135deg,#f3f1ff_0%,#fbfcff_55%,#eef1fb_100%)] px-6 py-8 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#cfd5e6]/80 bg-white/70 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-slate-600">궁합 리포트</span>
                  <span className="rounded-full bg-[#6f5ce7] px-3 py-1.5 text-xs font-bold text-white">{config.reportBadge}</span>
                </div>
                <p className="mt-5 text-sm font-semibold text-slate-500">{meta.myProfileLabel} <span className="mx-2 text-slate-300">×</span> {meta.partnerLabel}</p>
              </div>
              <Link href="/special-analysis/compatibility" className="rounded-full border border-[#cfd5e6]/80 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white">다른 상대 분석</Link>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-bold tracking-[0.16em] text-[#6f5ce7]">{config.reportCoreEyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold leading-[1.3] tracking-tight text-[#11162d] sm:text-4xl lg:text-[42px]">{report.relationshipCore.headline}</h2>
              <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700 sm:text-base">{report.relationshipCore.summary}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-[#dce1ef]">{config.label} 관계 패턴</span>
              <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-[#dce1ef]">{meta.evaluationYear}년 흐름 함께 보기</span>
            </div>
          </div>
        </header>

        {!meta.partnerBirthTimeKnown ? (
          <div className="border-t border-[#d8d3ff] bg-[#f3f1ff] px-6 py-4 text-[15px] leading-7 text-slate-700 sm:px-10">
            상대방 출생시간이 없어 시간대에 따라 달라지는 세부 요소와 일부 장기 흐름은 제외하고, 확인 가능한 생년월일 기준과 올해 흐름을 반영했습니다.
          </div>
        ) : null}

        <section className="bg-[#f7f8fc] px-6 py-9 sm:px-10 sm:py-10">
          <ReportSectionHeader eyebrow="KEY POINTS" title={`${config.label} 핵심 포인트`} description={config.reportKeyPointsDescription} />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <SummaryTile eyebrow="강점" title={firstStrength?.title ?? "함께 살릴 수 있는 강점"} body={firstStrength?.body ?? "두 사람이 함께 있을 때 살아나는 장점을 아래 리포트에서 구체적으로 확인할 수 있습니다."} />
            <SummaryTile eyebrow="조율" title={config.reportConflictTitle} body={conflictPoint} />
            <SummaryTile eyebrow={`${meta.evaluationYear}년`} title={report.currentTiming?.headline ?? config.reportTimingTitle} body={timingPoint} />
          </div>
        </section>

        {report.strengths.length ? (
          <section className="border-t border-[#dce1ef]/80 px-6 py-10 sm:px-10 sm:py-12">
            <ReportSectionHeader eyebrow={config.reportStrengthEyebrow} title={config.reportStrengthTitle} description={config.reportStrengthDescription} />
            <div className={`mt-6 grid gap-4 ${strengthGridClass}`}>
              {report.strengths.map((item, index) => (
                <article key={item.title} className="rounded-3xl bg-[#f7f8fc] p-5 ring-1 ring-[#dce1ef]/70 sm:p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                  <h4 className="mt-5 text-base font-bold leading-7 text-[#11162d]">{item.title}</h4>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section data-section="pair-perspective" className="border-t border-[#dce1ef] bg-[#f3f1ff] px-6 py-10 sm:px-10 sm:py-12">
          <ReportSectionHeader eyebrow="02 · 양방향 영향" title={config.reportDirectionTitle} description={config.reportDirectionDescription} />
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <PerspectiveCard label={`${meta.myProfileLabel} → ${meta.partnerLabel}`} headline={perspectives.meToPartner.headline} summary={perspectives.meToPartner.summary} signals={perspectives.meToPartner.signals} />
            <PerspectiveCard label={`${meta.partnerLabel} → ${meta.myProfileLabel}`} headline={perspectives.partnerToMe.headline} summary={perspectives.partnerToMe.summary} signals={perspectives.partnerToMe.signals} />
          </div>
        </section>

        <EditorialSection eyebrow={config.reportConflictEyebrow} title={config.reportConflictTitle} summary={report.conflict.summary} points={report.conflict.keyPoints} />

        <section className="border-t border-[#dce1ef]/80 bg-[#f7f8fc] px-6 py-10 sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
            <div className="rounded-3xl border border-[#dce1ef]/80 bg-white p-6 sm:p-7">
              <ReportSectionHeader eyebrow={config.reportRecoveryEyebrow} title={config.reportRecoveryTitle} />
              <p className="mt-5 text-[15px] leading-8 text-slate-700">{report.recovery.summary}</p><PointList points={report.recovery.keyPoints} />
            </div>
            <div className="rounded-3xl border border-[#dce1ef]/80 bg-white p-6 sm:p-7">
              <ReportSectionHeader eyebrow={config.reportLongTermEyebrow} title={config.reportLongTermTitle} />
              <p className="mt-5 text-[15px] leading-8 text-slate-700">{report.longTerm.summary}</p><PointList points={report.longTerm.keyPoints} />
            </div>
          </div>
        </section>

        {report.currentTiming ? (
          <section className="border-t border-[#d8d3ff] bg-[#f3f1ff] px-6 py-10 sm:px-10 sm:py-12">
            <ReportSectionHeader eyebrow="06 · 현재 흐름" title={`${meta.evaluationYear}년 ${config.reportTimingTitle}`} />
            <div className="mt-6 rounded-3xl border border-[#d8d3ff] bg-white/70 p-6 sm:p-8">
              <p className="text-xl font-bold leading-8 text-[#11162d] sm:text-2xl">{report.currentTiming.headline}</p>
              <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">{report.currentTiming.summary}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-2xl bg-white px-4 py-4 text-[15px] leading-7 text-slate-700 ring-1 ring-[#e5e1ff]">{point}</div>)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-t border-[#dce1ef]/80 px-6 py-10 sm:px-10 sm:py-12">
          <ReportSectionHeader eyebrow="07 · 행동 가이드" title={config.reportActionTitle} description="큰 결론보다 실제 관계에서 반복 가능한 작은 조정 기준으로 정리합니다." />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {report.actionGuide.doNext.map((item, index) => (
              <article key={`${item.action}-${item.reason}`} className="rounded-3xl bg-[#f7f6ff] p-5 ring-1 ring-[#d8d3ff] sm:p-6">
                <p className="text-xs font-bold tracking-[0.13em] text-slate-500">실천 {String(index + 1).padStart(2, "0")}</p>
                <p className="mt-3 font-bold leading-7 text-[#11162d]">{item.action}</p>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.reason}</p>
              </article>
            ))}
          </div>
          <div className="mt-9 rounded-3xl border border-[#dce1ef] bg-[#f7f8fc] p-5 sm:p-6">
            <h4 className="text-sm font-bold text-[#11162d]">줄이면 좋은 행동</h4>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {report.actionGuide.avoid.map((item) => (
                <div key={`${item.action}-${item.reason}`} className="rounded-2xl bg-white p-4 ring-1 ring-[#dce1ef]/80">
                  <p className="text-sm font-semibold leading-7 text-[#11162d]">{item.action}</p>
                  <p className="mt-1 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
      <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-6 text-slate-600">{config.label} 궁합은 두 사람의 명리 구조와 현재 흐름을 해석한 참고 콘텐츠입니다. 상대의 의도나 관계·사업의 결과를 확정하거나 대신 결정하지 않습니다.</p>
    </div>
  );
}
