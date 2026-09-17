import Link from "next/link";
import type { StoredFamilyParentChildReport } from "@/app/lib/familyCompatibilityPaidAnalysis";

function SectionHeader({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.17em] text-stone-400">{number}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-stone-950">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-stone-500">{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <div className="mt-5 space-y-2.5">
      {points.map((point, index) => (
        <div key={`${point}-${index}`} className="flex gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">✓</span>
          <span>{point}</span>
        </div>
      ))}
    </div>
  );
}

function EditorialSection({ number, title, summary, points }: { number: string; title: string; summary: string; points: readonly string[] }) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-7">
      <SectionHeader number={number} title={title} />
      <p className="mt-5 text-sm leading-7 text-stone-700">{summary}</p>
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
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-stone-700 ring-1 ring-stone-200">가족 궁합 리포트</span>
            <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">부모·자녀 · {meta.evaluationYear}년판</span>
          </div>
          <Link href="/special-analysis/compatibility/family/parent-child#family-relationship-selector" className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-white">다른 가족 분석</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-stone-500">{parentLabel} <span className="mx-1 text-stone-300">×</span> {childLabel}</p>
        <p className="mt-5 text-[11px] font-bold tracking-[0.17em] text-stone-400">관계 핵심</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.24] tracking-[-0.035em] text-stone-950 sm:text-4xl">{report.relationshipCore.headline}</h1>
        <p className="mt-5 max-w-4xl text-sm leading-8 text-stone-700">{report.relationshipCore.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">정서적 연결·대화</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">기대·독립·경계</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">{meta.evaluationYear}년 관계 흐름 포함</span>
        </div>
        {!meta.familyMemberBirthTimeKnown ? (
          <p className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-6 text-stone-600 ring-1 ring-stone-200">상대 가족의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 구매 연도 흐름을 중심으로 분석합니다.</p>
        ) : null}
      </header>

      <section className="bg-stone-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="text-[11px] font-bold tracking-[0.17em] text-stone-400">서로에게 미치는 방식</p>
        <h2 className="mt-2 text-2xl font-bold">부모에서 자녀로, 자녀에서 부모로 나누어 봅니다.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">가까운 가족이라도 같은 행동이 서로에게 다르게 느껴질 수 있어 두 방향을 따로 확인합니다.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[directions.parentToChild, directions.childToParent].map((direction) => (
            <div key={`${direction.fromLabel}-${direction.toLabel}`} className="rounded-[24px] border border-white/10 bg-white/[0.07] p-6">
              <p className="text-xs font-bold text-stone-300">{direction.fromLabel} → {direction.toLabel}</p>
              <h3 className="mt-3 text-xl font-bold leading-7">{direction.headline}</h3>
              <div className="mt-4 space-y-2 text-sm leading-7 text-stone-300">
                {direction.signals.map((signal) => <p key={signal}>· {signal}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-5 bg-[#fcfbf8] p-6 sm:p-9">
        <div className="grid gap-5 lg:grid-cols-2">
          <EditorialSection number="01 · 정서적 연결" title="가까워지는 방식과 정서적 거리" summary={report.emotionalConnection.summary} points={report.emotionalConnection.keyPoints} />
          <EditorialSection number="02 · 대화 방식" title="말과 반응이 엇갈리기 쉬운 지점" summary={report.communication.summary} points={report.communication.keyPoints} />
          <EditorialSection number="03 · 기대와 독립" title="기대와 스스로 결정할 영역" summary={report.expectationAndAutonomy.summary} points={report.expectationAndAutonomy.keyPoints} />
          <EditorialSection number="04 · 보호와 경계" title="도움이 힘이 되는 선, 부담이 되는 선" summary={report.boundariesAndPressure.summary} points={report.boundariesAndPressure.keyPoints} />
        </div>

        <EditorialSection number="05 · 갈등 뒤 회복" title="다시 연결되기 쉬운 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />

        {report.currentTiming ? (
          <section className="rounded-[28px] border border-[#dfcfb4] bg-[#f5ecdc] p-6 sm:p-7">
            <SectionHeader number="06 · 구매 연도 관계 흐름" title={`${meta.evaluationYear}년 부모·자녀 관계 흐름`} />
            <div className="mt-5 rounded-[24px] border border-[#e1d0b4] bg-white/75 p-5 sm:p-6">
              <h3 className="text-xl font-bold leading-7 text-stone-950">{report.currentTiming.headline}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-700">{report.currentTiming.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-2xl border border-[#e5d7bf] bg-white px-4 py-4 text-sm leading-6 text-stone-700">{point}</div>)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-7">
          <SectionHeader number="07 · 지금 해볼 것" title="관계를 바꾸는 작은 행동" description="가족 관계에서 바로 시도할 수 있는 행동부터 정리했습니다." />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {report.actionGuide.doNext.map((item, index) => (
              <article key={`${item.action}-${index}`} className="rounded-[24px] border border-[#e7dcc8] bg-[#faf6ee] p-5">
                <p className="text-[11px] font-bold tracking-[0.13em] text-stone-400">실천 {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-base font-bold leading-7 text-stone-950">{item.action}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{item.reason}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-[24px] bg-stone-50 p-5 ring-1 ring-stone-200">
            <p className="text-sm font-bold text-stone-900">줄이면 좋은 행동</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {report.actionGuide.avoid.map((item) => (
                <div key={item.action} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                  <p className="text-sm font-bold leading-6 text-stone-900">{item.action}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <p className="border-t border-stone-200 bg-white px-6 py-5 text-center text-xs leading-6 text-stone-500">이 리포트의 연도 흐름은 구매 당시 {meta.evaluationYear}년판으로 고정되어 보관됩니다. 가족 궁합은 명리 구조와 해당 연도 흐름을 해석한 참고 콘텐츠이며 가족 관계의 결과를 확정하거나 한쪽의 잘잘못을 판단하지 않습니다.</p>
    </article>
  );
}
