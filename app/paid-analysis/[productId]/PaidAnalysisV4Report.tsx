import type {
  PaidAnalysisAvoidType,
  PaidAnalysisDecisionDirection,
  ResolvedPaidAnalysisDetailV4,
  ResolvedPaidAnalysisEvidence,
} from "@/app/lib/paidAnalysisDetailOutput";
import {
  formatPaidAnalysisEvidenceFactForCustomer,
  getPaidAnalysisEvidenceCustomerLabel,
} from "@/app/lib/paidAnalysisV4CustomerPresentation";
import PeriodTimelineSection from "./PeriodTimelineSection";

type PaidAnalysisV4ReportProps = {
  detail: ResolvedPaidAnalysisDetailV4;
  analysisType: string;
  evidenceOverride?: ResolvedPaidAnalysisEvidence[];
};

const DIRECTION_BADGE_CLASS: Record<PaidAnalysisDecisionDirection, string> = {
  확대: "border-emerald-300/60 bg-emerald-300/15 text-emerald-100",
  유지: "border-violet-300/60 bg-violet-300/15 text-violet-100",
  조정: "border-amber-300/60 bg-amber-300/15 text-amber-100",
  보류: "border-rose-300/60 bg-rose-300/15 text-rose-100",
};

const AVOID_TYPE_LABEL: Record<PaidAnalysisAvoidType, string> = {
  misjudgment: "흔한 오판",
  risky_action: "위험한 행동",
  bad_condition: "결정을 망치는 조건",
};

function SectionHeader({
  eyebrow,
  title,
  description,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2.5">
        <span className={`h-1.5 w-1.5 rounded-full ${tone === "inverse" ? "bg-[#c9c2ff] shadow-[0_0_0_5px_rgba(201,194,255,0.10)]" : "bg-[#7c68ea] shadow-[0_0_0_5px_rgba(124,104,234,0.08)]"}`} />
        <p className={`text-xs font-bold tracking-[0.16em] ${tone === "inverse" ? "text-[#c9c2ff]" : "text-[#6f5ce7]"}`}>{eyebrow}</p>
      </div>
      <h2 className={`mt-3 text-xl font-black tracking-[-0.025em] sm:text-2xl ${tone === "inverse" ? "text-white" : "text-[#11162d]"}`}>{title}</h2>
      {description ? <p className={`mt-2 max-w-2xl text-[15px] leading-7 ${tone === "inverse" ? "text-slate-300" : "text-slate-600"}`}>{description}</p> : null}
    </div>
  );
}

function ReadingCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(31,36,77,0.07)] ring-1 ring-[#e7e8f2]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#7662e8_0%,#b7aef7_48%,transparent_100%)] opacity-70" />
      <div className="relative">
        <p className="text-xs font-bold tracking-[0.12em] text-[#7065aa]">{eyebrow}</p>
        <h3 className="mt-3 text-base font-extrabold leading-7 text-[#11162d]">{title}</h3>
        <p className="mt-2 text-[15px] leading-7 text-slate-700">{body}</p>
      </div>
    </article>
  );
}

function DetailSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.9rem] border border-white/85 bg-white/94 p-5 shadow-[0_18px_48px_rgba(35,39,78,0.065)] ring-1 ring-[#e3e5ef] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#8d7cf0]/[0.045] blur-3xl" />
      <div className="relative">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export default function PaidAnalysisV4Report({
  detail,
  analysisType,
  evidenceOverride,
}: PaidAnalysisV4ReportProps) {
  const evidenceItems = evidenceOverride?.length ? evidenceOverride : detail.evidence;
  const firstOpportunity = detail.current.opportunities[0];
  const firstCaution = detail.current.cautions[0];
  const firstAction = detail.action[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7f7fb_0%,#f1f2f7_42%,#f6f7fb_100%)] text-[#11162d]">
      <div className="pointer-events-none absolute left-[-12rem] top-[-8rem] h-96 w-96 rounded-full bg-[#b9aff9]/15 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-[24rem] h-80 w-80 rounded-full bg-[#d9d4fb]/20 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-9">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_10px_30px_rgba(35,39,78,0.04)] backdrop-blur sm:px-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#6f5ce7]">PREMIUM REPORT</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-[#11162d] sm:text-3xl">{analysisType}</h1>
          </div>
          {detail.referencePeriod ? (
            <span className="rounded-full border border-[#d7d1fb] bg-[#f4f1ff] px-3.5 py-2 text-xs font-bold text-[#5e4bd1] shadow-sm">
              분석 기준 · {detail.referencePeriod.labelSnapshot}
            </span>
          ) : null}
        </div>

        <section className="relative mt-5 overflow-hidden rounded-[2.25rem] border border-[#332d65] bg-[radial-gradient(circle_at_82%_14%,rgba(155,139,255,0.34),transparent_26%),radial-gradient(circle_at_12%_90%,rgba(104,86,216,0.24),transparent_28%),linear-gradient(145deg,#17172f_0%,#242047_48%,#18192f_100%)] px-5 py-8 text-white shadow-[0_28px_80px_rgba(29,27,68,0.24)] sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute right-[-3rem] top-[-4rem] h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-3 top-3 h-28 w-28 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.025))]" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur ${DIRECTION_BADGE_CLASS[detail.conclusion.direction]}`}>
                {detail.conclusion.direction}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300">
                결론 먼저
              </span>
            </div>

            <h2 className="mt-6 max-w-4xl text-3xl font-black leading-[1.28] tracking-[-0.04em] text-white sm:text-4xl">
              {detail.conclusion.headline}
            </h2>
            <p className="mt-6 max-w-3xl text-[15px] leading-8 text-slate-200">
              <span className="font-bold text-white">대상 · </span>{detail.conclusion.focus}
            </p>
            <p className="mt-2 max-w-3xl text-[15px] leading-8 text-slate-300">{detail.conclusion.rationale}</p>

            <div className="mt-8 rounded-[1.6rem] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#b9aff9] shadow-[0_0_14px_rgba(185,175,249,0.7)]" />
                <p className="text-xs font-bold tracking-[0.14em] text-[#cec7ff]">지금 바로 할 것</p>
              </div>
              <p className="mt-3 text-base font-bold leading-7 text-white sm:text-[17px]">{detail.conclusion.immediateAction}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[1.9rem] border border-white/80 bg-white/72 p-5 shadow-[0_18px_48px_rgba(35,39,78,0.055)] ring-1 ring-[#e5e6ef] backdrop-blur sm:p-7">
          <SectionHeader
            eyebrow="KEY POINTS"
            title="핵심 포인트"
            description="전체 리포트를 읽기 전에 결론을 움직이는 핵심만 먼저 확인합니다."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ReadingCard eyebrow="핵심 문제" title={detail.coreProblem.title} body={detail.coreProblem.whyItMatters} />
            <ReadingCard
              eyebrow="현재 흐름"
              title={firstOpportunity?.situation ?? firstCaution?.situation ?? "지금의 기회와 주의"}
              body={firstOpportunity?.implication ?? firstCaution?.implication ?? detail.current.summary}
            />
            <ReadingCard
              eyebrow="행동 방향"
              title={firstAction?.action ?? detail.conclusion.immediateAction}
              body={firstAction ? `대상 · ${firstAction.target} · 조건 · ${firstAction.condition}` : detail.conclusion.immediateAction}
            />
          </div>
        </section>

        <div className="mt-5 rounded-[1.6rem] border border-[#dcd9ef] bg-[linear-gradient(135deg,#f7f5ff_0%,#ffffff_100%)] p-5 shadow-[0_10px_28px_rgba(53,45,109,0.04)] sm:p-6">
          <div className="flex gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#211f43] text-sm font-black text-white shadow-md">i</span>
            <div>
              <p className="text-base font-black text-[#11162d]">이 리포트는 이렇게 읽어 주세요</p>
              <p className="mt-2 text-[15px] leading-7 text-slate-700">먼저 위의 결론과 ‘지금 바로 할 것’을 확인하세요. 아래에는 왜 이런 판단이 나왔는지, 현실에서 무엇을 확인해야 하는지, 어떤 조건이면 판단을 바꿔야 하는지가 이어집니다. 전문 계산 내용은 필요한 경우에만 ‘계산 근거 펼쳐보기’에서 확인할 수 있어요.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <DetailSection
            eyebrow="01 · 문제 정의"
            title="지금 가장 중요한 문제"
            description="현재 판단에서 무엇을 먼저 정리해야 하는지 설명합니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.coreProblem.description}</p>
            <p className="mt-5 rounded-[1.35rem] border border-[#e1e2ec] bg-[linear-gradient(135deg,#f8f8fc_0%,#f3f2fb_100%)] px-5 py-4 text-[15px] font-medium leading-7 text-slate-700 shadow-inner">{detail.coreProblem.whyItMatters}</p>
          </DetailSection>

          <DetailSection
            eyebrow="02 · 원인"
            title="왜 이런 판단이 나왔을까"
            description="계산 결과를 생활 속 조건으로 번역해, 현재 판단과 어떻게 연결되는지 설명합니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.cause.summary}</p>
            <div className="mt-5 grid gap-4">
              {detail.cause.reasons.map((reason, index) => (
                <article key={reason.title} className="relative overflow-hidden rounded-[1.6rem] border border-[#e2e4ee] bg-[linear-gradient(135deg,#fcfcfe_0%,#f8f8fc_100%)] p-5 shadow-[0_10px_24px_rgba(35,39,78,0.04)] sm:p-6">
                  <div className="absolute bottom-0 left-0 top-0 w-1 bg-[linear-gradient(180deg,#7762e8_0%,#b7adf7_100%)]" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#211f43] text-xs font-bold text-white shadow-md">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm font-extrabold text-[#11162d]">{reason.title}</p>
                  </div>
                  <p className="mt-4 text-[15px] leading-7 text-slate-700">{reason.realWorldPattern}</p>
                  <p className="mt-2 text-[15px] leading-7 text-slate-700">{reason.problemLinkage}</p>
                  <details className="mt-4 rounded-[1.15rem] border border-[#dedbef] bg-white px-4 py-3.5 shadow-sm">
                    <summary className="cursor-pointer text-sm font-bold text-[#5e4bd1]">계산 근거 펼쳐보기</summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{reason.observedStructure}</p>
                  </details>
                </article>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            eyebrow="03 · 판단 근거"
            title="이 판단을 뒷받침하는 근거"
            description="먼저 생활 속 의미를 보여드리고, 전문 계산 내용은 원하는 경우에만 펼쳐볼 수 있습니다."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {evidenceItems.map((item) => (
                <article key={item.evidenceKey} className="relative overflow-hidden rounded-[1.6rem] border border-[#e1e2ed] bg-[linear-gradient(145deg,#ffffff_0%,#f8f8fc_100%)] p-5 shadow-[0_12px_28px_rgba(35,39,78,0.045)]">
                  <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-[#7c68ea]/[0.055]" />
                  <p className="relative text-xs font-bold tracking-[0.12em] text-[#6f5ce7]">이 결과가 뜻하는 것</p>
                  <p className="relative mt-3 text-[15px] font-medium leading-7 text-slate-700">{item.meaning}</p>
                  <p className="relative mt-2 text-sm leading-6 text-slate-600">{item.linkage}</p>
                  <details className="relative mt-4 rounded-[1.1rem] border border-[#ddd9ef] bg-white/90 px-4 py-3.5">
                    <summary className="cursor-pointer text-sm font-bold text-[#5e4bd1]">
                      계산 근거 펼쳐보기 · {getPaidAnalysisEvidenceCustomerLabel(item.evidenceKey)}
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {formatPaidAnalysisEvidenceFactForCustomer(item.evidenceKey, item.fact)}
                    </p>
                  </details>
                </article>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            eyebrow="04 · 현재 흐름"
            title="지금의 기회와 주의할 점"
            description="같은 시기에도 활용할 수 있는 힘과 조심할 조건을 따로 봅니다."
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.current.summary}</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.7rem] border border-emerald-200/80 bg-[linear-gradient(145deg,#f2fbf7_0%,#ffffff_100%)] p-5 shadow-[0_12px_30px_rgba(30,120,78,0.06)] sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.09)]" />
                  <p className="text-xs font-extrabold tracking-[0.12em] text-emerald-700">기회</p>
                </div>
                <div className="mt-5 space-y-3">
                  {detail.current.opportunities.map((item) => (
                    <article key={item.situation} className="rounded-[1.25rem] border border-emerald-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-sm font-extrabold text-[#11162d]">{item.situation}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.implication}</p>
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-6 text-slate-600">확인할 신호 · {item.observableSignal}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.7rem] border border-rose-200/80 bg-[linear-gradient(145deg,#fff5f6_0%,#ffffff_100%)] p-5 shadow-[0_12px_30px_rgba(176,56,81,0.055)] sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_5px_rgba(244,63,94,0.08)]" />
                  <p className="text-xs font-extrabold tracking-[0.12em] text-rose-700">주의</p>
                </div>
                <div className="mt-5 space-y-3">
                  {detail.current.cautions.map((item) => (
                    <article key={item.situation} className="rounded-[1.25rem] border border-rose-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-sm font-extrabold text-[#11162d]">{item.situation}</p>
                      <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.implication}</p>
                      <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm leading-6 text-slate-600">확인할 신호 · {item.observableSignal}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection eyebrow="05 · 변화 신호" title="앞으로 확인할 변화 신호">
            <ol className="relative space-y-4">
              <div className="pointer-events-none absolute bottom-6 left-[19px] top-6 w-px bg-[linear-gradient(180deg,#a89cf0_0%,#d8d4ec_100%)]" />
              {detail.timeline.map((item, index) => (
                <li key={item.label} className="relative grid gap-3 rounded-[1.55rem] border border-[#e1e3ed] bg-[linear-gradient(135deg,#fbfbfd_0%,#f6f6fb_100%)] p-5 shadow-[0_10px_24px_rgba(35,39,78,0.035)] sm:grid-cols-[42px_1fr]">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#211f43] text-xs font-bold text-white shadow-[0_7px_18px_rgba(33,31,67,0.18)]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-extrabold text-[#11162d]">{item.label}</p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.changeSignal}</p>
                    <p className="mt-3 rounded-xl border border-[#e5e3f0] bg-white px-3.5 py-2.5 text-[15px] leading-7 text-slate-600">준비 · {item.preparation}</p>
                  </div>
                </li>
              ))}
            </ol>
          </DetailSection>

          {detail.periodAnalysis ? <PeriodTimelineSection periodAnalysis={detail.periodAnalysis} /> : null}

          <section className="relative overflow-hidden rounded-[2rem] border border-[#2e295c] bg-[radial-gradient(circle_at_top_right,rgba(131,111,239,0.22),transparent_30%),linear-gradient(145deg,#1d1b3d_0%,#292550_100%)] p-5 text-white shadow-[0_24px_60px_rgba(31,28,72,0.18)] sm:p-7">
            <div className="relative">
              <SectionHeader
                eyebrow="ACTION GUIDE"
                title="행동 제안"
                description="읽고 끝나지 않도록 바로 실행할 행동과 피할 행동을 마지막에 모았습니다."
                tone="inverse"
              />
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[1.65rem] border border-white/12 bg-white/[0.08] p-5 backdrop-blur-sm">
                  <p className="text-xs font-bold tracking-[0.1em] text-[#c9c2ff]">무엇을 할 것인가</p>
                  <div className="mt-4 space-y-3">
                    {detail.action.map((item, index) => (
                      <article key={item.action} className="rounded-[1.25rem] border border-white/10 bg-white/[0.96] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                        <p className="text-xs font-bold tracking-[0.11em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                        <p className="mt-2 text-sm font-extrabold leading-6 text-[#11162d]">{item.action}</p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700">대상 · {item.target}</p>
                        <p className="mt-1 text-[15px] leading-7 text-slate-700">조건 · {item.condition}</p>
                        <p className="mt-2 rounded-xl bg-[#f3f1ff] px-3 py-2 text-sm leading-6 text-slate-600">완료 기준 · {item.completionCriteria}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.65rem] border border-white/12 bg-white/[0.06] p-5 backdrop-blur">
                  <p className="text-xs font-bold tracking-[0.1em] text-slate-300">무엇을 피할 것인가</p>
                  <div className="mt-4 space-y-3">
                    {detail.avoid.map((item) => (
                      <article key={item.behavior} className="rounded-[1.25rem] border border-white/10 bg-white/[0.95] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.07)]">
                        <p className="text-xs font-bold text-slate-500">{AVOID_TYPE_LABEL[item.type]}</p>
                        <p className="mt-2 text-sm font-extrabold leading-6 text-[#11162d]">{item.behavior}</p>
                        <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.reason}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {detail.decisionCheck ? (
            <DetailSection eyebrow="FINAL CHECK" title="결정 전 확인">
              <ul className="grid gap-3 sm:grid-cols-2">
                {detail.decisionCheck.map((question) => (
                  <li key={question} className="flex gap-3 rounded-[1.2rem] border border-[#dedfea] bg-[linear-gradient(135deg,#fafafe_0%,#f5f4fb_100%)] px-4 py-3.5 text-[15px] leading-7 text-slate-700 shadow-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[#211f43] text-xs font-bold text-white">✓</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          <DetailSection
            eyebrow="마지막 확인"
            title="이 분석에서 참고할 범위"
            description="비교적 분명하게 볼 수 있는 부분과 현실에서 추가로 확인해야 할 부분을 나눠 보여드립니다."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.6rem] border border-emerald-200/80 bg-[linear-gradient(145deg,#f1fbf6_0%,#ffffff_100%)] p-5">
                <p className="text-sm font-extrabold text-emerald-800">비교적 분명하게 볼 수 있는 부분</p>
                <ul className="mt-4 space-y-2.5">
                  {detail.confidence.strongestEvidence.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px] leading-7 text-slate-700">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.6rem] border border-[#dedfea] bg-[linear-gradient(145deg,#f7f8fc_0%,#ffffff_100%)] p-5">
                <p className="text-sm font-extrabold text-slate-700">현실에서 추가로 확인해야 할 부분</p>
                <ul className="mt-4 space-y-2.5">
                  {detail.confidence.uncertaintyFactors.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px] leading-7 text-slate-700">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-[1.35rem] border border-[#dedfea] bg-white px-5 py-4 shadow-sm">
              <p className="text-sm font-extrabold text-[#11162d]">이 분석만으로 정할 수 없는 것</p>
              <p className="mt-2 text-[15px] leading-7 text-slate-600">{detail.confidence.limitations}</p>
            </div>
          </DetailSection>
        </div>
      </div>
    </main>
  );
}
