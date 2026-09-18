import Link from "next/link";
import type { StoredFamilyParentChildReport } from "@/app/lib/familyCompatibilityPaidAnalysis";

function SectionHeader({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">{number}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <div className="mt-5 space-y-2.5">
      {points.map((point, index) => (
        <div key={`${point}-${index}`} className="flex gap-3 rounded-2xl border border-[#dce1ef] bg-white px-4 py-3 text-sm leading-6 text-slate-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">✓</span>
          <span>{point}</span>
        </div>
      ))}
    </div>
  );
}

function EditorialSection({ number, title, summary, points }: { number: string; title: string; summary: string; points: readonly string[] }) {
  return (
    <section className="rounded-[28px] border border-[#dce1ef] bg-white p-6 sm:p-7">
      <SectionHeader number={number} title={title} />
      <p className="mt-5 text-[15px] leading-7 text-slate-700">{summary}</p>
      <PointList points={points} />
    </section>
  );
}

export default function FamilyParentChildPaidReportView({ content }: { content: StoredFamilyParentChildReport }) {
  const { report, directions, meta } = content;
  const parentLabel = meta.userRole === "parent" ? meta.myProfileLabel : meta.familyMemberLabel;
  const childLabel = meta.userRole === "child" ? meta.myProfileLabel : meta.familyMemberLabel;

  return (
    <article className="mt-8 overflow-hidden rounded-[32px] border border-[#dfe3ef] bg-[#f9faff] shadow-[0_22px_60px_rgba(32,38,72,0.09)]">
      <header className="bg-[linear-gradient(135deg,#f1f0ff_0%,#fbfcff_58%,#eef1fb_100%)] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-[#dce1ef]">가족 궁합 리포트</span>
            <span className="rounded-full bg-[#6f5ce7] px-3 py-1.5 text-xs font-bold text-white">부모·자녀 · {meta.evaluationYear}년판</span>
          </div>
          <Link href="/special-analysis/compatibility/family/parent-child#family-relationship-selector" className="rounded-full border border-[#cfd5e6] bg-white/70 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-white">다른 가족 분석</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-500">{parentLabel} <span className="mx-1 text-slate-300">×</span> {childLabel}</p>
        <p className="mt-5 text-xs font-bold tracking-[0.14em] text-slate-400">관계 핵심</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.24] tracking-[-0.035em] text-[#11162d] sm:text-4xl">{report.relationshipCore.headline}</h1>
        <p className="mt-5 max-w-4xl text-sm leading-8 text-slate-700">{report.relationshipCore.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-[#dce1ef]">정서적 연결·대화</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-[#dce1ef]">기대·독립·경계</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-[#dce1ef]">{meta.evaluationYear}년 관계 흐름 포함</span>
        </div>
        {!meta.familyMemberBirthTimeKnown ? (
          <p className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-[#dce1ef]">상대 가족의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 구매 연도 흐름을 중심으로 분석합니다.</p>
        ) : null}
      </header>

      <section className="border-y border-[#d8d3ff] bg-[#f3f1ff] px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-xs font-bold tracking-[0.14em] text-[#6f5ce7]">서로에게 미치는 방식</p>
        <h2 className="mt-2 text-2xl font-bold text-[#11162d]">부모에서 자녀로, 자녀에서 부모로 나누어 봅니다.</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">가까운 가족이라도 같은 행동이 서로에게 다르게 느껴질 수 있어 두 방향을 따로 확인합니다.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[directions.parentToChild, directions.childToParent].map((direction) => (
            <div key={`${direction.fromLabel}-${direction.toLabel}`} className="rounded-[24px] border border-[#d8d3ff] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold text-[#5e4bd1]">{direction.fromLabel} → {direction.toLabel}</p>
              <h3 className="mt-3 text-xl font-bold leading-7">{direction.headline}</h3>
              <div className="mt-4 space-y-2 text-[15px] leading-7 text-slate-700">
                {direction.signals.map((signal) => <p key={signal}>· {signal}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4 bg-[#f7f8fc] p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <EditorialSection number="01 · 정서적 연결" title="가까워지는 방식과 정서적 거리" summary={report.emotionalConnection.summary} points={report.emotionalConnection.keyPoints} />
          <EditorialSection number="02 · 대화 방식" title="말과 반응이 엇갈리기 쉬운 지점" summary={report.communication.summary} points={report.communication.keyPoints} />
          <EditorialSection number="03 · 기대와 독립" title="기대와 스스로 결정할 영역" summary={report.expectationAndAutonomy.summary} points={report.expectationAndAutonomy.keyPoints} />
          <EditorialSection number="04 · 보호와 경계" title="도움이 힘이 되는 선, 부담이 되는 선" summary={report.boundariesAndPressure.summary} points={report.boundariesAndPressure.keyPoints} />
        </div>

        <EditorialSection number="05 · 갈등 뒤 회복" title="다시 연결되기 쉬운 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />

        {report.currentTiming ? (
          <section className="rounded-[28px] border border-[#d8d3ff] bg-[#f3f1ff] p-6 sm:p-7">
            <SectionHeader number="06 · 구매 연도 관계 흐름" title={`${meta.evaluationYear}년 부모·자녀 관계 흐름`} />
            <div className="mt-5 rounded-[24px] border border-[#d8d3ff] bg-white/75 p-5 sm:p-6">
              <h3 className="text-xl font-bold leading-7 text-[#11162d]">{report.currentTiming.headline}</h3>
              <p className="mt-4 text-[15px] leading-7 text-slate-700">{report.currentTiming.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-2xl border border-[#e5e1ff] bg-white px-4 py-4 text-sm leading-6 text-slate-700">{point}</div>)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[28px] border border-[#dce1ef] bg-white p-6 sm:p-7">
          <SectionHeader number="07 · 지금 해볼 것" title="관계를 바꾸는 작은 행동" description="가족 관계에서 바로 시도할 수 있는 행동부터 정리했습니다." />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {report.actionGuide.doNext.map((item, index) => (
              <article key={`${item.action}-${index}`} className="rounded-[24px] border border-[#d8d3ff] bg-[#f7f6ff] p-5">
                <p className="text-xs font-bold tracking-[0.11em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-base font-bold leading-7 text-[#11162d]">{item.action}</h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.reason}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-[24px] bg-[#f7f8fc] p-5 ring-1 ring-[#dce1ef]">
            <p className="text-sm font-bold text-[#11162d]">줄이면 좋은 행동</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {report.actionGuide.avoid.map((item) => (
                <div key={item.action} className="rounded-2xl bg-white p-4 ring-1 ring-[#dce1ef]">
                  <p className="text-sm font-bold leading-6 text-[#11162d]">{item.action}</p>
                  <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <p className="border-t border-[#dce1ef] bg-white px-6 py-5 text-center text-sm leading-6 text-slate-600">이 리포트의 연도 흐름은 구매 당시 {meta.evaluationYear}년판으로 고정되어 보관됩니다. 가족 궁합은 명리 구조와 해당 연도 흐름을 해석한 참고 콘텐츠이며 가족 관계의 결과를 확정하거나 한쪽의 잘잘못을 판단하지 않습니다.</p>
    </article>
  );
}
