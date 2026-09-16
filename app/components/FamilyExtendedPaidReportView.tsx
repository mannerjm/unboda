import Link from "next/link";
import { getFamilyOtherRelationshipLabel } from "@/app/lib/familyCompatibilityExtended";
import type {
  StoredFamilyOtherReport,
  StoredFamilySiblingReport,
} from "@/app/lib/familyCompatibilityExtendedPaidAnalysis";

type DirectionCard = Readonly<{
  fromLabel: string;
  toLabel: string;
  headline: string;
  signals: readonly string[];
}>;

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

function DirectionSection({ directions }: { directions: readonly DirectionCard[] }) {
  return (
    <section className="bg-stone-950 px-6 py-8 text-white sm:px-9 sm:py-10">
      <p className="text-[11px] font-bold tracking-[0.17em] text-stone-400">서로에게 미치는 방식</p>
      <h2 className="mt-2 text-2xl font-bold">같은 가족이라도 두 방향은 다르게 느껴질 수 있습니다.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">누가 누구에게 영향을 주는지 방향을 나누어 확인하고, 힘이 되는 부분과 부담으로 느껴질 수 있는 부분을 따로 살펴봅니다.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {directions.map((direction) => (
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
  );
}

function ActionSection({
  doNext,
  avoid,
}: {
  doNext: readonly { action: string; reason: string }[];
  avoid: readonly { action: string; reason: string }[];
}) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-6 sm:p-7">
      <SectionHeader number="07 · 지금 해볼 것" title="관계를 바꾸는 작은 행동" description="가족 관계에서 바로 시도할 수 있는 행동부터 정리했습니다." />
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {doNext.map((item, index) => (
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
          {avoid.map((item) => (
            <div key={item.action} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <p className="text-sm font-bold leading-6 text-stone-900">{item.action}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiblingReport({ content }: { content: StoredFamilySiblingReport }) {
  const { report, directions, meta } = content;
  return (
    <article className="mt-8 overflow-hidden rounded-[32px] border border-[#e3d9c8] bg-[#fffdf9] shadow-[0_22px_60px_rgba(72,59,41,0.10)]">
      <header className="bg-[linear-gradient(135deg,#f8f1e5_0%,#fffdf8_58%,#f1ebe2_100%)] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-stone-700 ring-1 ring-stone-200">가족 궁합 리포트</span>
            <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">형제·자매 · {meta.evaluationYear}년판</span>
          </div>
          <Link href="/special-analysis/compatibility/family/parent-child#family-relationship-selector" className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-white">다른 가족 분석</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-stone-500">{meta.myProfileLabel} <span className="mx-1 text-stone-300">×</span> {meta.familyMemberLabel}</p>
        <p className="mt-5 text-[11px] font-bold tracking-[0.17em] text-stone-400">관계 핵심</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.24] tracking-[-0.035em] text-stone-950 sm:text-4xl">{report.relationshipCore.headline}</h1>
        <p className="mt-5 max-w-4xl text-sm leading-8 text-stone-700">{report.relationshipCore.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">정서적 연결·대화</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">비교·경쟁·역할</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">{meta.evaluationYear}년 관계 흐름 포함</span>
        </div>
        {!meta.familyMemberBirthTimeKnown ? <p className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-6 text-stone-600 ring-1 ring-stone-200">상대 형제·자매의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 구매 연도 흐름을 중심으로 분석합니다.</p> : null}
      </header>

      <DirectionSection directions={[directions.userToSibling, directions.siblingToUser]} />

      <div className="space-y-5 bg-[#fcfbf8] p-6 sm:p-9">
        <div className="grid gap-5 lg:grid-cols-2">
          <EditorialSection number="01 · 정서적 연결" title="가까움과 거리감이 생기는 방식" summary={report.emotionalBond.summary} points={report.emotionalBond.keyPoints} />
          <EditorialSection number="02 · 대화 방식" title="말과 반응이 맞거나 엇갈리는 지점" summary={report.communication.summary} points={report.communication.keyPoints} />
          <EditorialSection number="03 · 비교와 경쟁" title="경쟁보다 협력이 쉬워지는 조건" summary={report.comparisonAndCompetition.summary} points={report.comparisonAndCompetition.keyPoints} />
          <EditorialSection number="04 · 역할과 경계" title="오래 굳어진 역할과 서로의 선택 범위" summary={report.rolesAndBoundaries.summary} points={report.rolesAndBoundaries.keyPoints} />
        </div>
        <EditorialSection number="05 · 갈등 뒤 회복" title="다시 연결되기 쉬운 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />
        {report.currentTiming ? (
          <section className="rounded-[28px] border border-[#dfcfb4] bg-[#f5ecdc] p-6 sm:p-7">
            <SectionHeader number="06 · 구매 연도 관계 흐름" title={`${meta.evaluationYear}년 형제·자매 관계 흐름`} />
            <div className="mt-5 rounded-[24px] border border-[#e1d0b4] bg-white/75 p-5 sm:p-6">
              <h3 className="text-xl font-bold leading-7 text-stone-950">{report.currentTiming.headline}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-700">{report.currentTiming.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">{report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-2xl border border-[#e5d7bf] bg-white px-4 py-4 text-sm leading-6 text-stone-700">{point}</div>)}</div>
            </div>
          </section>
        ) : null}
        <ActionSection doNext={report.actionGuide.doNext} avoid={report.actionGuide.avoid} />
      </div>
      <p className="border-t border-stone-200 bg-white px-6 py-5 text-center text-xs leading-6 text-stone-500">이 리포트의 연도 흐름은 구매 당시 {meta.evaluationYear}년판으로 저장됩니다. 가족 궁합은 명리 구조와 해당 연도 흐름을 해석한 참고 콘텐츠이며 한쪽의 성격이나 가족사의 원인을 단정하지 않습니다.</p>
    </article>
  );
}

function OtherFamilyReport({ content }: { content: StoredFamilyOtherReport }) {
  const { report, directions, meta } = content;
  const relationshipLabel = getFamilyOtherRelationshipLabel(meta.relationshipKind);
  return (
    <article className="mt-8 overflow-hidden rounded-[32px] border border-[#e3d9c8] bg-[#fffdf9] shadow-[0_22px_60px_rgba(72,59,41,0.10)]">
      <header className="bg-[linear-gradient(135deg,#f8f1e5_0%,#fffdf8_58%,#f1ebe2_100%)] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-stone-700 ring-1 ring-stone-200">가족 궁합 리포트</span>
            <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">{relationshipLabel} · {meta.evaluationYear}년판</span>
          </div>
          <Link href="/special-analysis/compatibility/family/parent-child#family-relationship-selector" className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-white">다른 가족 분석</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-stone-500">{meta.myProfileLabel} <span className="mx-1 text-stone-300">×</span> {meta.familyMemberLabel}</p>
        <p className="mt-5 text-[11px] font-bold tracking-[0.17em] text-stone-400">관계 핵심</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.24] tracking-[-0.035em] text-stone-950 sm:text-4xl">{report.relationshipCore.headline}</h1>
        <p className="mt-5 max-w-4xl text-sm leading-8 text-stone-700">{report.relationshipCore.summary}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-stone-600">
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">정서적 거리·대화</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">역할·기대·관여의 경계</span>
          <span className="rounded-full bg-white/75 px-3 py-1.5 ring-1 ring-stone-200">{meta.evaluationYear}년 관계 흐름 포함</span>
        </div>
        {!meta.familyMemberBirthTimeKnown ? <p className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-6 text-stone-600 ring-1 ring-stone-200">상대 가족의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 구매 연도 흐름을 중심으로 분석합니다.</p> : null}
      </header>

      <DirectionSection directions={[directions.userToFamily, directions.familyToUser]} />

      <div className="space-y-5 bg-[#fcfbf8] p-6 sm:p-9">
        <div className="grid gap-5 lg:grid-cols-2">
          <EditorialSection number="01 · 정서적 거리" title="가까움과 거리를 편안하게 조절하는 방식" summary={report.emotionalDistance.summary} points={report.emotionalDistance.keyPoints} />
          <EditorialSection number="02 · 대화 방식" title="연락과 표현이 맞거나 엇갈리는 지점" summary={report.communication.summary} points={report.communication.keyPoints} />
          <EditorialSection number="03 · 역할과 기대" title="가족 역할과 기대를 맞추는 기준" summary={report.roleAndExpectations.summary} points={report.roleAndExpectations.keyPoints} />
          <EditorialSection number="04 · 거리와 관여" title="연락·도움·조언이 편안해지는 경계" summary={report.boundariesAndContact.summary} points={report.boundariesAndContact.keyPoints} />
        </div>
        <EditorialSection number="05 · 갈등 뒤 회복" title="불편함 뒤 다시 연결되기 쉬운 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />
        {report.currentTiming ? (
          <section className="rounded-[28px] border border-[#dfcfb4] bg-[#f5ecdc] p-6 sm:p-7">
            <SectionHeader number="06 · 구매 연도 관계 흐름" title={`${meta.evaluationYear}년 ${relationshipLabel} 관계 흐름`} />
            <div className="mt-5 rounded-[24px] border border-[#e1d0b4] bg-white/75 p-5 sm:p-6">
              <h3 className="text-xl font-bold leading-7 text-stone-950">{report.currentTiming.headline}</h3>
              <p className="mt-4 text-sm leading-7 text-stone-700">{report.currentTiming.summary}</p>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">{report.currentTiming.keyPoints.map((point) => <div key={point} className="rounded-2xl border border-[#e5d7bf] bg-white px-4 py-4 text-sm leading-6 text-stone-700">{point}</div>)}</div>
            </div>
          </section>
        ) : null}
        <ActionSection doNext={report.actionGuide.doNext} avoid={report.actionGuide.avoid} />
      </div>
      <p className="border-t border-stone-200 bg-white px-6 py-5 text-center text-xs leading-6 text-stone-500">이 리포트의 연도 흐름은 구매 당시 {meta.evaluationYear}년판으로 저장됩니다. 가족 궁합은 명리 구조와 해당 연도 흐름을 해석한 참고 콘텐츠이며 가족의 서열이나 한쪽의 잘잘못을 판단하지 않습니다.</p>
    </article>
  );
}

export default function FamilyExtendedPaidReportView(props:
  | { mode: "siblings"; content: StoredFamilySiblingReport }
  | { mode: "other_family"; content: StoredFamilyOtherReport }
) {
  return props.mode === "siblings"
    ? <SiblingReport content={props.content} />
    : <OtherFamilyReport content={props.content} />;
}
