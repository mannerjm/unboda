import Link from "next/link";
import type { StoredFamilyParentChildReport } from "@/app/lib/familyCompatibilityPaidAnalysis";

function SectionHeader({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.15em] text-[#6f5ce7]">{number}</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#11162d]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <div className="mt-5 space-y-2.5">
      {points.map((point, index) => (
        <div key={`${point}-${index}`} className="flex gap-3 rounded-[1.2rem] border border-[#e1e2ed] bg-[linear-gradient(135deg,#ffffff_0%,#f8f8fc_100%)] px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_8px_20px_rgba(35,39,78,0.035)]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#211f43] text-xs font-bold text-white shadow-sm">✓</span>
          <span>{point}</span>
        </div>
      ))}
    </div>
  );
}

function EditorialSection({ number, title, summary, points }: { number: string; title: string; summary: string; points: readonly string[] }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#e0e1eb] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-6 shadow-[0_14px_34px_rgba(35,39,78,0.05)] sm:p-7">
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
    <article className="mt-8 overflow-hidden rounded-[2.25rem] border border-[#d8d9e6] bg-[linear-gradient(180deg,#ffffff_0%,#f8f8fc_100%)] shadow-[0_30px_90px_rgba(31,28,72,0.14)] ring-1 ring-white/80">
      <header className="relative overflow-hidden border-b border-[#332d65] bg-[radial-gradient(circle_at_84%_16%,rgba(155,139,255,0.36),transparent_27%),radial-gradient(circle_at_12%_92%,rgba(104,86,216,0.24),transparent_30%),linear-gradient(145deg,#17172f_0%,#242047_48%,#18192f_100%)] px-6 py-9 text-white sm:px-9 sm:py-11">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-bold text-slate-200 backdrop-blur">가족 궁합 리포트</span>
            <span className="rounded-full border border-[#9383ff]/40 bg-[#7966ea]/80 px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(111,92,231,0.24)] backdrop-blur">부모·자녀 · {meta.evaluationYear}년판</span>
          </div>
          <Link href="/special-analysis/compatibility/family/parent-child#family-relationship-selector" className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/[0.14]">다른 가족 분석</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-300">{parentLabel} <span className="mx-1 text-slate-500">×</span> {childLabel}</p>
        <p className="mt-5 text-xs font-extrabold tracking-[0.16em] text-[#c8c1ff]">관계 핵심</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black leading-[1.24] tracking-[-0.04em] text-white sm:text-4xl">{report.relationshipCore.headline}</h1>
        <p className="mt-5 max-w-4xl text-sm leading-8 text-slate-300">{report.relationshipCore.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
          <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 backdrop-blur">정서적 연결·대화</span>
          <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 backdrop-blur">기대·독립·경계</span>
          <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 backdrop-blur">{meta.evaluationYear}년 관계 흐름 포함</span>
        </div>
        {!meta.familyMemberBirthTimeKnown ? (
          <p className="mt-5 rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 text-sm leading-6 text-slate-300 backdrop-blur">상대 가족의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 구매 연도 흐름을 중심으로 분석합니다.</p>
        ) : null}
      </header>

      <section className="border-y border-[#dedbf3] bg-[radial-gradient(circle_at_90%_10%,rgba(143,124,255,0.12),transparent_25%),linear-gradient(135deg,#f2efff_0%,#f8f7ff_58%,#f2f4fb_100%)] px-6 py-9 sm:px-9 sm:py-11">
        <p className="text-xs font-extrabold tracking-[0.15em] text-[#6f5ce7]">서로에게 미치는 방식</p>
        <h2 className="mt-2 text-2xl font-bold text-[#11162d]">부모에서 자녀로, 자녀에서 부모로 나누어 봅니다.</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">가까운 가족이라도 같은 행동이 서로에게 다르게 느껴질 수 있어 두 방향을 따로 확인합니다.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[directions.parentToChild, directions.childToParent].map((direction) => (
            <div key={`${direction.fromLabel}-${direction.toLabel}`} className="relative overflow-hidden rounded-[1.7rem] border border-[#d8d3ff] bg-[linear-gradient(145deg,#ffffff_0%,#f7f5ff_100%)] p-6 shadow-[0_14px_34px_rgba(73,61,145,0.08)]">
              <p className="text-xs font-extrabold tracking-[0.08em] text-[#5e4bd1]">{direction.fromLabel} → {direction.toLabel}</p>
              <h3 className="mt-3 text-xl font-black leading-7">{direction.headline}</h3>
              <div className="mt-4 space-y-2 text-[15px] leading-7 text-slate-700">
                {direction.signals.map((signal) => <p key={signal}>· {signal}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-5 bg-[linear-gradient(180deg,#f7f7fb_0%,#f1f2f7_42%,#f6f7fb_100%)] p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <EditorialSection number="01 · 정서적 연결" title="가까워지는 방식과 정서적 거리" summary={report.emotionalConnection.summary} points={report.emotionalConnection.keyPoints} />
          <EditorialSection number="02 · 대화 방식" title="말과 반응이 엇갈리기 쉬운 지점" summary={report.communication.summary} points={report.communication.keyPoints} />
          <EditorialSection number="03 · 기대와 독립" title="기대와 스스로 결정할 영역" summary={report.expectationAndAutonomy.summary} points={report.expectationAndAutonomy.keyPoints} />
          <EditorialSection number="04 · 보호와 경계" title="도움이 힘이 되는 선, 부담이 되는 선" summary={report.boundariesAndPressure.summary} points={report.boundariesAndPressure.keyPoints} />
        </div>

        <EditorialSection number="05 · 갈등 뒤 회복" title="다시 연결되기 쉬운 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />

        {report.currentTiming ? (
          <section className="rounded-[1.9rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_82%_18%,rgba(125,104,234,0.12),transparent_28%),linear-gradient(135deg,#f1efff_0%,#f8f7ff_55%,#f3f4fa_100%)] p-6 shadow-[0_16px_38px_rgba(71,58,140,0.07)] sm:p-7">
            <SectionHeader number="06 · 구매 연도 관계 흐름" title={`${meta.evaluationYear}년 부모·자녀 관계 흐름`} />
            <div className="mt-5 rounded-[1.6rem] border border-[#d8d3ff] bg-white/88 p-5 shadow-[0_14px_32px_rgba(71,58,140,0.07)] backdrop-blur sm:p-6">
              <h3 className="text-xl font-bold leading-7 text-[#11162d]">{report.currentTiming.headline}</h3>
              <p className="mt-4 text-[15px] leading-7 text-slate-700">{report.currentTiming.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-[1.15rem] border border-[#e5e1ff] bg-[linear-gradient(145deg,#ffffff_0%,#faf9ff_100%)] px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm">{point}</div>)}
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-[1.75rem] border border-[#e0e1eb] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-6 shadow-[0_14px_34px_rgba(35,39,78,0.05)] sm:p-7">
          <div className="[&_h2]:text-white [&_p:first-child]:text-[#c8c1ff] [&_p:last-child]:text-slate-300"><SectionHeader number="07 · 지금 해볼 것" title="관계를 바꾸는 작은 행동" description="가족 관계에서 바로 시도할 수 있는 행동부터 정리했습니다." /></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {report.actionGuide.doNext.map((item, index) => (
              <article key={`${item.action}-${index}`} className="rounded-[1.55rem] border border-white/10 bg-white/[0.96] p-5 text-[#11162d] shadow-[0_12px_30px_rgba(0,0,0,0.10)]">
                <p className="text-xs font-extrabold tracking-[0.11em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-base font-bold leading-7 text-[#11162d]">{item.action}</h3>
                <p className="mt-3 text-[15px] leading-7 text-slate-700">{item.reason}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur">
            <p className="text-sm font-bold text-white">줄이면 좋은 행동</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {report.actionGuide.avoid.map((item) => (
                <div key={item.action} className="rounded-[1.2rem] border border-white/10 bg-white/[0.95] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.07)]">
                  <p className="text-sm font-bold leading-6 text-[#11162d]">{item.action}</p>
                  <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <p className="border-t border-[#e1e2ec] bg-[linear-gradient(135deg,#ffffff_0%,#f7f7fb_100%)] px-6 py-5 text-center text-sm leading-6 text-slate-600">이 리포트의 연도 흐름은 구매 당시 {meta.evaluationYear}년판으로 고정되어 보관됩니다. 가족 궁합은 명리 구조와 해당 연도 흐름을 해석한 참고 콘텐츠이며 가족 관계의 결과를 확정하거나 한쪽의 잘잘못을 판단하지 않습니다.</p>
    </article>
  );
}
