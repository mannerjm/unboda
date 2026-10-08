import Link from "next/link";
import {
  resolveStoredCompatibilityRelationshipType,
  type StoredCompatibilityReport,
} from "@/app/lib/compatibilityPaidAnalysis";
import { getPairCompatibilityConfigByRelationshipType } from "@/app/lib/pairCompatibilityConfig";
import { getWorkplaceRelation } from "@/app/lib/workplaceCompatibilityRelation";

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
  const dark = tone === "dark";
  return (
    <div className="max-w-3xl">
      <p className={`text-xs font-extrabold tracking-[0.16em] ${dark ? "text-[#c8c1ff]" : "text-[#6f5ce7]"}`}>{eyebrow}</p>
      <h3 className={`mt-2 text-xl font-black tracking-[-0.025em] sm:text-2xl ${dark ? "text-white" : "text-[#11162d]"}`}>{title}</h3>
      {description ? <p className={`mt-2 text-sm leading-7 ${dark ? "text-slate-300" : "text-slate-500"}`}>{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-4 grid gap-3">
      {points.map((point) => (
        <li key={point} className="flex gap-3 rounded-[1.2rem] border border-[#e1e2ed] bg-[linear-gradient(135deg,#ffffff_0%,#f8f8fc_100%)] px-4 py-3.5 text-[15px] leading-7 text-slate-700 shadow-[0_8px_20px_rgba(35,39,78,0.035)]">
          <span aria-hidden="true" className="mt-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#211f43] text-xs font-bold text-white shadow-sm">✓</span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryTile({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <article className="relative overflow-hidden rounded-[1.55rem] border border-[#e1e2ed] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-5 shadow-[0_12px_28px_rgba(35,39,78,0.045)] sm:p-6">
      <p className="text-xs font-extrabold tracking-[0.14em] text-[#6f5ce7]">{eyebrow}</p>
      <h4 className="mt-3 text-base font-extrabold leading-7 text-[#11162d]">{title}</h4>
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{body}</p>
    </article>
  );
}

function PerspectiveCard({ label, headline, summary, signals }: { label: string; headline: string; summary: string; signals: readonly string[] }) {
  return (
    <article className="relative overflow-hidden rounded-[1.7rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f7f5ff_100%)] p-5 shadow-[0_14px_34px_rgba(73,61,145,0.08)] sm:p-6">
      <p className="text-xs font-extrabold tracking-[0.08em] text-[#5e4bd1]">{label}</p>
      <h4 className="mt-3 text-lg font-black leading-8 text-[#11162d]">{headline}</h4>
      <p className="mt-3 text-[15px] leading-7 text-slate-700">{summary}</p>
      <div className="mt-5 space-y-2">
        {signals.map((signal) => (
          <p key={signal} className="flex gap-2 text-sm leading-6 text-slate-600">
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8171ea] shadow-[0_0_0_4px_rgba(129,113,234,0.08)]" />
            <span>{signal}</span>
          </p>
        ))}
      </div>
    </article>
  );
}

function EditorialSection({ eyebrow, title, summary, points }: { eyebrow: string; title: string; summary: string; points?: readonly string[] }) {
  return (
    <section className="border-t border-[#e4e5ef] bg-white px-6 py-10 sm:px-10 sm:py-12">
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
  const workplaceRole = meta.relationshipType === "workplace_colleague" && meta.workplaceRelation
    ? getWorkplaceRelation(meta.workplaceRelation)
    : null;
  const firstStrength = report.strengths[0];
  const conflictPoint = report.conflict.keyPoints[0] ?? report.conflict.summary;
  const timingPoint = report.currentTiming?.keyPoints[0] ?? report.currentTiming?.summary ?? "현재 관계 흐름은 두 사람의 기본 관계 구조와 함께 살펴봅니다.";
  const strengthGridClass = report.strengths.length <= 1
    ? "lg:grid-cols-1"
    : report.strengths.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";

  return (
    <div className="relative mx-auto mt-8 w-full max-w-5xl">
      <article className="overflow-hidden rounded-[2.25rem] border border-[#d8d9e6] bg-[linear-gradient(180deg,#ffffff_0%,#f8f8fc_100%)] shadow-[0_30px_90px_rgba(31,28,72,0.14)] ring-1 ring-white/80">
        <header className="relative overflow-hidden border-b border-[#332d65] bg-[radial-gradient(circle_at_84%_16%,rgba(155,139,255,0.36),transparent_27%),radial-gradient(circle_at_12%_92%,rgba(104,86,216,0.24),transparent_30%),linear-gradient(145deg,#17172f_0%,#242047_48%,#18192f_100%)] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div aria-hidden="true" className="absolute -right-12 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute right-12 top-10 h-36 w-36 rounded-full border border-white/[0.06]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.025))]" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-slate-200 backdrop-blur">궁합 리포트</span>
                  <span className="rounded-full border border-[#9383ff]/40 bg-[#7966ea]/80 px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(111,92,231,0.24)] backdrop-blur">{config.reportBadge}</span>
                  {workplaceRole ? <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-[#d7d1ff] backdrop-blur">{workplaceRole.shortLabel}</span> : null}
                </div>
                <p className="mt-5 text-sm font-semibold text-slate-300">{meta.myProfileLabel} <span className="mx-2 text-slate-500">×</span> {meta.partnerLabel}</p>
              </div>
              <Link href="/special-analysis/compatibility" className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/[0.14]">다른 상대 분석</Link>
            </div>

            {workplaceRole ? (
              <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur">
                나: {workplaceRole.myRole} · 상대방: {workplaceRole.partnerRole} — 선택한 실제 업무 관계를 기준으로 해석합니다.
              </div>
            ) : null}

            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-extrabold tracking-[0.17em] text-[#c8c1ff]">{config.reportCoreEyebrow}</p>
              <h2 className="mt-3 text-3xl font-black leading-[1.28] tracking-[-0.04em] text-white sm:text-4xl lg:text-[42px]">{report.relationshipCore.headline}</h2>
              <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-300 sm:text-base">{report.relationshipCore.summary}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur">{config.label} 관계 패턴</span>
              <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur">{meta.evaluationYear}년 흐름 함께 보기</span>
            </div>
          </div>
        </header>

        {!meta.partnerBirthTimeKnown ? (
          <div className="border-t border-[#dedbf3] bg-[linear-gradient(135deg,#f5f2ff_0%,#fbfbff_100%)] px-6 py-4 text-[15px] leading-7 text-slate-700 sm:px-10">
            상대방 출생시간이 없어 시간대에 따라 달라지는 세부 요소와 일부 장기 흐름은 제외하고, 확인 가능한 생년월일 기준과 올해 흐름을 반영했습니다.
          </div>
        ) : null}

        <section className="bg-[linear-gradient(180deg,#f7f7fb_0%,#f3f4f9_100%)] px-6 py-9 sm:px-10 sm:py-10">
          <ReportSectionHeader eyebrow="KEY POINTS" title={`${config.label} 핵심 포인트`} description={config.reportKeyPointsDescription} />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <SummaryTile eyebrow="강점" title={firstStrength?.title ?? "함께 살릴 수 있는 강점"} body={firstStrength?.body ?? "두 사람이 함께 있을 때 살아나는 장점을 아래 리포트에서 구체적으로 확인할 수 있습니다."} />
            <SummaryTile eyebrow="조율" title={config.reportConflictTitle} body={conflictPoint} />
            <SummaryTile eyebrow={`${meta.evaluationYear}년`} title={report.currentTiming?.headline ?? config.reportTimingTitle} body={timingPoint} />
          </div>
        </section>

        {report.strengths.length ? (
          <section className="border-t border-[#e4e5ef] bg-white px-6 py-10 sm:px-10 sm:py-12">
            <ReportSectionHeader eyebrow={config.reportStrengthEyebrow} title={config.reportStrengthTitle} description={config.reportStrengthDescription} />
            <div className={`mt-6 grid gap-4 ${strengthGridClass}`}>
              {report.strengths.map((item, index) => (
                <article key={item.title} className="relative overflow-hidden rounded-[1.6rem] border border-[#e1e2ed] bg-[linear-gradient(145deg,#ffffff_0%,#f7f7fb_100%)] p-5 shadow-[0_12px_26px_rgba(35,39,78,0.04)] sm:p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#211f43] text-xs font-bold text-white shadow-[0_7px_18px_rgba(33,31,67,0.18)]">{String(index + 1).padStart(2, "0")}</span>
                  <h4 className="mt-5 text-base font-bold leading-7 text-[#11162d]">{item.title}</h4>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section data-section="pair-perspective" className="border-t border-[#dedbf3] bg-[radial-gradient(circle_at_90%_10%,rgba(143,124,255,0.12),transparent_25%),linear-gradient(135deg,#f2efff_0%,#f8f7ff_58%,#f2f4fb_100%)] px-6 py-10 sm:px-10 sm:py-12">
          <ReportSectionHeader eyebrow="02 · 양방향 영향" title={config.reportDirectionTitle} description={config.reportDirectionDescription} />
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <PerspectiveCard label={`${meta.myProfileLabel}${workplaceRole ? ` (${workplaceRole.myRole})` : ""} → ${meta.partnerLabel}${workplaceRole ? ` (${workplaceRole.partnerRole})` : ""}`} headline={perspectives.meToPartner.headline} summary={perspectives.meToPartner.summary} signals={perspectives.meToPartner.signals} />
            <PerspectiveCard label={`${meta.partnerLabel}${workplaceRole ? ` (${workplaceRole.partnerRole})` : ""} → ${meta.myProfileLabel}${workplaceRole ? ` (${workplaceRole.myRole})` : ""}`} headline={perspectives.partnerToMe.headline} summary={perspectives.partnerToMe.summary} signals={perspectives.partnerToMe.signals} />
          </div>
        </section>

        <EditorialSection eyebrow={config.reportConflictEyebrow} title={config.reportConflictTitle} summary={report.conflict.summary} points={report.conflict.keyPoints} />

        <section className="border-t border-[#e3e4ee] bg-[linear-gradient(180deg,#f7f7fb_0%,#f2f3f8_100%)] px-6 py-10 sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
            <div className="rounded-[1.75rem] border border-[#e0e1eb] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-6 shadow-[0_14px_34px_rgba(35,39,78,0.05)] sm:p-7">
              <ReportSectionHeader eyebrow={config.reportRecoveryEyebrow} title={config.reportRecoveryTitle} />
              <p className="mt-5 text-[15px] leading-8 text-slate-700">{report.recovery.summary}</p><PointList points={report.recovery.keyPoints} />
            </div>
            <div className="rounded-[1.75rem] border border-[#e0e1eb] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-6 shadow-[0_14px_34px_rgba(35,39,78,0.05)] sm:p-7">
              <ReportSectionHeader eyebrow={config.reportLongTermEyebrow} title={config.reportLongTermTitle} />
              <p className="mt-5 text-[15px] leading-8 text-slate-700">{report.longTerm.summary}</p><PointList points={report.longTerm.keyPoints} />
            </div>
          </div>
        </section>

        {report.currentTiming ? (
          <section className="border-t border-[#dedbf3] bg-[radial-gradient(circle_at_82%_18%,rgba(125,104,234,0.12),transparent_28%),linear-gradient(135deg,#f1efff_0%,#f8f7ff_55%,#f3f4fa_100%)] px-6 py-10 sm:px-10 sm:py-12">
            <ReportSectionHeader eyebrow="06 · 현재 흐름" title={`${meta.evaluationYear}년 ${config.reportTimingTitle}`} />
            <div className="mt-6 rounded-[1.8rem] border border-[#d8d3ff] bg-white/[0.85] p-6 shadow-[0_18px_42px_rgba(71,58,140,0.08)] backdrop-blur sm:p-8">
              <p className="text-xl font-bold leading-8 text-[#11162d] sm:text-2xl">{report.currentTiming.headline}</p>
              <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">{report.currentTiming.summary}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-[1.2rem] border border-[#e5e1ff] bg-[linear-gradient(145deg,#ffffff_0%,#faf9ff_100%)] px-4 py-4 text-[15px] leading-7 text-slate-700 shadow-sm">{point}</div>)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden border-t border-[#2e295c] bg-[radial-gradient(circle_at_top_right,rgba(131,111,239,0.24),transparent_30%),linear-gradient(145deg,#1d1b3d_0%,#292550_100%)] px-6 py-10 text-white shadow-[0_-10px_40px_rgba(31,28,72,0.08)] sm:px-10 sm:py-12">
          <ReportSectionHeader eyebrow="07 · 행동 가이드" title={config.reportActionTitle} description="큰 결론보다 실제 관계에서 반복 가능한 작은 조정 기준으로 정리합니다." tone="dark" />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {report.actionGuide.doNext.map((item, index) => (
              <article key={`${item.action}-${item.reason}`} className="rounded-[1.55rem] border border-white/10 bg-white/[0.96] p-5 text-[#11162d] shadow-[0_12px_30px_rgba(0,0,0,0.10)] sm:p-6">
                <p className="text-xs font-extrabold tracking-[0.14em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                <p className="mt-3 font-bold leading-7 text-[#11162d]">{item.action}</p>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.reason}</p>
              </article>
            ))}
          </div>
          <div className="mt-9 rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur sm:p-6">
            <h4 className="text-sm font-bold text-white">줄이면 좋은 행동</h4>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {report.actionGuide.avoid.map((item) => (
                <div key={`${item.action}-${item.reason}`} className="rounded-[1.2rem] border border-white/10 bg-white/[0.95] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.07)]">
                  <p className="text-sm font-semibold leading-7 text-[#11162d]">{item.action}</p>
                  <p className="mt-1 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
      <p className="mx-auto mt-5 max-w-3xl rounded-[1.35rem] border border-[#e1e2ec] bg-white/80 px-5 py-4 text-center text-sm leading-6 text-slate-600 shadow-sm">{config.label} 궁합은 두 사람의 명리 구조와 현재 흐름을 해석한 참고 콘텐츠입니다. 상대의 의도나 관계·사업의 결과를 확정하거나 대신 결정하지 않습니다.</p>
    </div>
  );
}
