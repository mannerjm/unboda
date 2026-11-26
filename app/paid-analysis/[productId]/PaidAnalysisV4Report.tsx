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
import WealthTeacherCard from "@/app/components/WealthTeacherCard";
import TopicTeacherCard from "@/app/components/TopicTeacherCard";
import NewYearTeacherCard from "@/app/components/NewYearTeacherCard";
import { getTopicTeacher } from "@/app/lib/topicTeachers";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import type { CSSProperties } from "react";

type PaidAnalysisV4ReportProps = {
  detail: ResolvedPaidAnalysisDetailV4;
  analysisType: string;
  productId?: string;
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
  bad_condition: "조심하면 좋은 상황",
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
        <span className={`h-1.5 w-1.5 rounded-full ${tone === "inverse" ? "bg-[#c9c2ff] shadow-[0_0_0_5px_rgba(201,194,255,0.10)]" : "bg-[#7c68ea] shadow-[0_0_0_5px_rgba(124,104,234,0.08)]"}`} style={tone === "inverse" ? undefined : { backgroundColor: "var(--topic-report-accent,#7c68ea)" }} />
        <p className={`text-xs font-bold tracking-[0.16em] ${tone === "inverse" ? "text-[#c9c2ff]" : "text-[#6f5ce7]"}`} style={tone === "inverse" ? undefined : { color: "var(--topic-report-accent,#6f5ce7)" }}>{eyebrow}</p>
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
    <article className="group relative overflow-hidden rounded-[1.65rem] border border-[#eadffa] bg-[linear-gradient(145deg,#ffffff,#fbf7ff)] p-5 shadow-[0_14px_36px_rgba(111,74,171,.10)] ring-1 ring-white/90" style={{ borderColor: "var(--topic-report-border,#eadffa)", backgroundImage: "linear-gradient(145deg,#ffffff,var(--topic-report-pale,#fbf7ff))" }}>
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#7662e8_0%,#b7aef7_48%,transparent_100%)] opacity-70" style={{ backgroundImage: "linear-gradient(90deg,var(--topic-report-accent,#7662e8),transparent)" }} />
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
  productId,
  evidenceOverride,
}: PaidAnalysisV4ReportProps) {
  const isNewYear = productId === "new-year-fortune";
  const reportYear = detail.referencePeriod?.labelSnapshot.match(/\b\d{4}년/u)?.[0];
  const evidenceItems = evidenceOverride?.length ? evidenceOverride : detail.evidence;
  const firstOpportunity = detail.current.opportunities[0];
  const firstCaution = detail.current.cautions[0];
  const firstAction = detail.action[0];
  const teacher = getTopicTeacher(productId ? getPremiumProduct(productId)?.category : null);
  const reportStyle = teacher ? {
    "--topic-report-accent": teacher.accent,
    "--topic-report-pale": teacher.pale,
    "--topic-report-border": teacher.border,
    backgroundImage: `linear-gradient(160deg,#fffefe 0%,${teacher.pale} 47%,#f0eaff 100%)`,
  } as CSSProperties : undefined;
  const darkSectionStyle = teacher ? {
    borderColor: teacher.dark,
    backgroundImage: `radial-gradient(circle at 82% 14%,${teacher.accent}77,transparent 35%),linear-gradient(145deg,${teacher.dark} 0%,${teacher.darkEnd} 100%)`,
  } : undefined;

  return (
    <main data-topic-report-category={teacher?.category} style={reportStyle} className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#fffefe_0%,#faf6ff_45%,#f0eaff_100%)] text-[#281744]">
      <div className="pointer-events-none absolute left-[-12rem] top-[-8rem] h-96 w-96 rounded-full bg-[#b9aff9]/15 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-[24rem] h-80 w-80 rounded-full bg-[#d9d4fb]/20 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-9">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-[#e6d8f5] bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(105,68,170,.09)] backdrop-blur sm:px-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#6f5ce7]" style={teacher ? { color: teacher.accent } : undefined}>{isNewYear ? "나만의 새해 운세" : "나만의 사주 이야기"}</p>
            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.03em] text-[#11162d] sm:text-3xl">{analysisType}</h1>
          </div>
          {detail.referencePeriod ? (
            <span className="rounded-full border border-[#d7d1fb] bg-[#f4f1ff] px-3.5 py-2 text-xs font-bold text-[#5e4bd1] shadow-sm">
              분석 기준 · {detail.referencePeriod.labelSnapshot}
            </span>
          ) : null}
        </div>

        {productId && (productId === "wealth" || productId.startsWith("money-")) ? <WealthTeacherCard variant="report" /> : null}
        {productId === "new-year-fortune" ? <NewYearTeacherCard variant="report" /> : teacher ? <TopicTeacherCard category={teacher.category} variant="report" /> : null}

        <section data-report-feature="conclusion" style={darkSectionStyle} className="relative mt-5 overflow-hidden rounded-[2.25rem] border border-[#332d65] bg-[radial-gradient(circle_at_82%_14%,rgba(155,139,255,0.34),transparent_26%),radial-gradient(circle_at_12%_90%,rgba(104,86,216,0.24),transparent_28%),linear-gradient(145deg,#17172f_0%,#242047_48%,#18192f_100%)] px-5 py-8 text-white shadow-[0_28px_80px_rgba(29,27,68,0.24)] sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute right-[-3rem] top-[-4rem] h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-3 top-3 h-28 w-28 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.025))]" />

          <div className="relative">
            {isNewYear ? <p className="text-sm font-bold tracking-wide text-[#e2d6ff]">{reportYear ? `${reportYear} 나의 총운` : "나의 새해 총운"}</p> : <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur ${DIRECTION_BADGE_CLASS[detail.conclusion.direction]}`}>
                {detail.conclusion.direction}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300">
                결론 먼저
              </span>
            </div>}

            <h2 className="mt-6 max-w-4xl text-3xl font-black leading-[1.28] tracking-[-0.04em] text-white sm:text-4xl">
              {detail.conclusion.headline}
            </h2>
            <p className="mt-6 max-w-3xl text-[15px] leading-8 text-slate-200">
              <span className="font-bold text-white">{isNewYear ? "눈여겨볼 일 · " :  "눈여겨볼 일 · "}</span>{detail.conclusion.focus}
            </p>
            <p className="mt-2 max-w-3xl text-[15px] leading-8 text-slate-300">{detail.conclusion.rationale}</p>

            <div className="mt-8 rounded-[1.6rem] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:p-6">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#b9aff9] shadow-[0_0_14px_rgba(185,175,249,0.7)]" />
                <p className="text-xs font-bold tracking-[0.14em] text-[#cec7ff]">{isNewYear ? "태운 선생님의 한마디" : "선생님의 한마디"}</p>
              </div>
              <p className="mt-3 text-base font-bold leading-7 text-white sm:text-[17px]">{detail.conclusion.immediateAction}</p>
            </div>
          </div>
        </section>

        {isNewYear && detail.periodAnalysis ? <div className="mt-5"><PeriodTimelineSection periodAnalysis={detail.periodAnalysis} seasonalView="summary" /></div> : null}

        <section className="mt-5 rounded-[1.9rem] border border-white/80 bg-white/72 p-5 shadow-[0_18px_48px_rgba(35,39,78,0.055)] ring-1 ring-[#e5e6ef] backdrop-blur sm:p-7">
          <SectionHeader
            eyebrow={isNewYear ? "새해의 핵심" : "한눈에 보는 내 운세"}
            title={isNewYear ? "올해 기억할 세 가지" : "기억할 세 가지"}
            description={isNewYear ? "올해 어떤 흐름을 만날 수 있고 무엇을 챙기면 좋을지 살펴보세요." : "내 사주에서 어떤 이야기를 읽었는지 먼저 살펴보세요."}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ReadingCard eyebrow={isNewYear ? "올해의 중심 이야기" : "지금 중요한 이야기"} title={detail.coreProblem.title} body={detail.coreProblem.whyItMatters} />
            <ReadingCard
              eyebrow={isNewYear ? "기대해 볼 변화" : "기대해 볼 변화"}
              title={firstOpportunity?.situation ?? firstCaution?.situation ?? "지금의 기회와 주의"}
              body={firstOpportunity?.implication ?? firstCaution?.implication ?? detail.current.summary}
            />
            <ReadingCard
              eyebrow={isNewYear ? "나를 위한 한 가지 조언" : "나를 위한 한 가지 조언"}
              title={firstAction?.action ?? detail.conclusion.immediateAction}
              body={firstAction ? (isNewYear ? `${firstAction.target} · ${firstAction.condition}` : `${firstAction.target} · ${firstAction.condition}`) : detail.conclusion.immediateAction}
            />
          </div>
        </section>

        {isNewYear && detail.periodAnalysis ? <div className="mt-5"><PeriodTimelineSection periodAnalysis={detail.periodAnalysis} seasonalView="details" /></div> : null}

        <div className="mt-5 rounded-[1.6rem] border border-[#dcd9ef] bg-[linear-gradient(135deg,#f7f5ff_0%,#ffffff_100%)] p-5 shadow-[0_10px_28px_rgba(53,45,109,0.04)] sm:p-6">
          <div className="flex gap-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#211f43] text-sm font-black text-white shadow-md">i</span>
            <div>
              <p className="text-base font-black text-[#11162d]">이 리포트는 이렇게 읽어 주세요</p>
              <p className="mt-2 text-[15px] leading-7 text-slate-700">{isNewYear ? "위에서 궁금한 운세와 달을 골라 읽어 보세요. 아래에는 내 사주에서 왜 이런 흐름을 읽었는지 쉽게 풀어 놓았어요. 어려운 계산은 궁금할 때만 펼쳐보세요." : "위에서 내 운세의 핵심을 읽어 보세요. 아래에는 왜 이런 흐름을 읽었는지, 일상에서 어떤 점을 챙기면 좋을지 풀어 놓았어요. 어려운 계산은 궁금할 때만 펼쳐보세요."}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <DetailSection
            eyebrow={isNewYear ? "01 · 새해 이야기" : "01 · 나의 이야기"}
            title={isNewYear ? "올해 나에게 중요한 것은?" : "지금 나에게 중요한 것은?"}
            description={isNewYear ? "한 해의 중심이 되는 흐름을 쉽게 알아봅니다." : "지금 내 사주에서 가장 눈여겨볼 부분을 알아봐요."}
          >
            <p className="text-[15px] leading-8 text-slate-700">{detail.coreProblem.description}</p>
            <p className="mt-5 rounded-[1.35rem] border border-[#e1e2ec] bg-[linear-gradient(135deg,#f8f8fc_0%,#f3f2fb_100%)] px-5 py-4 text-[15px] font-medium leading-7 text-slate-700 shadow-inner">{detail.coreProblem.whyItMatters}</p>
          </DetailSection>

          <DetailSection
            eyebrow="02 · 이런 이유가 있어요"
            title={isNewYear ? "내 사주에서 왜 이런 운을 읽었을까?" : "내 사주에서 왜 이런 흐름을 읽었을까?"}
            description={isNewYear ? "내 사주와 새해의 운이 만나 어떤 변화를 만들 수 있는지 풀어드려요." : "내 사주의 흐름이 일상에서 어떤 모습으로 느껴질 수 있는지 풀어드려요."}
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
            eyebrow="03 · 사주 속 힌트"
            title={isNewYear ? "내 사주에서 찾은 힌트" : "내 사주에서 찾은 힌트"}
            description="생활 속 이야기를 먼저 읽고, 사주 계산은 궁금할 때만 펼쳐보세요."
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
                      계산 근거 펼쳐보기 · {isNewYear ? ({monthly_cycle: "대상 월의 운과 내 사주", seun: "새해의 운", yongshin: "나에게 도움이 되는 힘"} as Record<string, string>)[item.evidenceKey] ?? getPaidAnalysisEvidenceCustomerLabel(item.evidenceKey) : getPaidAnalysisEvidenceCustomerLabel(item.evidenceKey)}
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
            title={isNewYear ? "새해에 기대할 일과 조심할 일" : "지금 기대할 일과 조심할 일"}
            description="힘을 얻을 수 있는 부분과 조심하면 좋은 부분을 나눠 봐요."
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
                      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-6 text-slate-600">이런 모습이 보인다면 · {item.observableSignal}</p>
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
                      <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm leading-6 text-slate-600">이런 모습이 보인다면 · {item.observableSignal}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </DetailSection>

          <DetailSection eyebrow={isNewYear ? "05 · 세 달씩 보는 운세" : "05 · 달라지는 흐름"} title={isNewYear ? "세 달마다 달라지는 나의 운세" : "어떤 변화를 눈여겨보면 좋을까요?"}>
            <ol className="relative space-y-4">
              <div className="pointer-events-none absolute bottom-6 left-[19px] top-6 w-px bg-[linear-gradient(180deg,#a89cf0_0%,#d8d4ec_100%)]" />
              {detail.timeline.map((item, index) => (
                <li key={item.label} className="relative grid gap-3 rounded-[1.55rem] border border-[#e1e3ed] bg-[linear-gradient(135deg,#fbfbfd_0%,#f6f6fb_100%)] p-5 shadow-[0_10px_24px_rgba(35,39,78,0.035)] sm:grid-cols-[42px_1fr]">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#211f43] text-xs font-bold text-white shadow-[0_7px_18px_rgba(33,31,67,0.18)]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-extrabold text-[#11162d]">{isNewYear ? item.label.replace(/([1-4])분기/u, (_, quarter: string) => (["1~3월 · 한 해의 시작", "4~6월 · 한 해의 중반을 준비하는 시기", "7~9월 · 하반기의 흐름", "10~12월 · 한 해의 마무리"][Number(quarter) - 1])) : item.label}</p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">{item.changeSignal}</p>
                    <p className="mt-3 rounded-xl border border-[#e5e3f0] bg-white px-3.5 py-2.5 text-[15px] leading-7 text-slate-600">준비 · {item.preparation}</p>
                  </div>
                </li>
              ))}
            </ol>
          </DetailSection>

          {!isNewYear && detail.periodAnalysis ? <PeriodTimelineSection periodAnalysis={detail.periodAnalysis} /> : null}

          <section data-report-feature="action" style={darkSectionStyle} className="relative overflow-hidden rounded-[2rem] border border-[#2e295c] bg-[radial-gradient(circle_at_top_right,rgba(131,111,239,0.22),transparent_30%),linear-gradient(145deg,#1d1b3d_0%,#292550_100%)] p-5 text-white shadow-[0_24px_60px_rgba(31,28,72,0.18)] sm:p-7">
            <div className="relative">
              <SectionHeader
                eyebrow={isNewYear ? "새해를 위한 조언" : "나를 위한 조언"}
                title={isNewYear ? "올해 이렇게 보내보세요" : "이렇게 해보세요"}
                description={isNewYear ? "태운 선생님이 전하는 새해 생활 조언입니다." : "일상에서 가볍게 해볼 일과 조심할 일을 모았어요."}
                tone="inverse"
              />
              <div className={`mt-6 grid gap-5 lg:grid-cols-2 ${isNewYear ? "items-start" : ""}`}>
                <div className={isNewYear ? "rounded-[1.65rem] border border-emerald-200 bg-[#f0faf4] p-4 sm:p-5" : "rounded-[1.65rem] border border-white/12 bg-white/[0.08] p-5 backdrop-blur-sm"}>
                  <p className={isNewYear ? "text-base font-bold text-emerald-800" : "text-xs font-bold tracking-[0.1em] text-[#c9c2ff]"}>{isNewYear ? "하면 좋은 것" : "하면 좋은 것"}</p>
                  <div className="mt-4 space-y-3">
                    {detail.action.map((item, index) => (
                      <article key={item.action} className="rounded-[1.25rem] border border-white/10 bg-white/[0.96] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                        <p className="text-xs font-bold tracking-[0.11em] text-[#6f5ce7]">실천 {String(index + 1).padStart(2, "0")}</p>
                        <p className="mt-2 text-sm font-extrabold leading-6 text-[#11162d]">{item.action}</p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700">{isNewYear ? "챙겨볼 일" : "챙겨볼 일"} · {item.target}</p>
                        <p className="mt-1 text-[15px] leading-7 text-slate-700">{isNewYear ? "이럴 때는" : "이럴 때는"} · {item.condition}</p>
                        <p className="mt-2 rounded-xl bg-[#f3f1ff] px-3 py-2 text-sm leading-6 text-slate-600">{isNewYear ? "이렇게 해보세요" : "이렇게 해보세요"} · {item.completionCriteria}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className={isNewYear ? "rounded-[1.65rem] border border-rose-200 bg-[#fff3f4] p-4 sm:p-5" : "rounded-[1.65rem] border border-white/12 bg-white/[0.06] p-5 backdrop-blur"}>
                  <p className={isNewYear ? "text-base font-bold text-rose-800" : "text-xs font-bold tracking-[0.1em] text-slate-300"}>{isNewYear ? "조심하면 좋은 것" : "조심하면 좋은 것"}</p>
                  <div className="mt-4 space-y-3">
                    {detail.avoid.map((item) => (
                      <article key={item.behavior} className="rounded-[1.25rem] border border-white/10 bg-white/[0.95] p-4 text-[#11162d] shadow-[0_10px_24px_rgba(0,0,0,0.07)]">
                        <p className="text-xs font-bold text-slate-500">{isNewYear ? "미리 조심해요" : AVOID_TYPE_LABEL[item.type]}</p>
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
            <DetailSection eyebrow="한 번 더 생각해요" title="선택하기 전에 살펴볼 점">
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
            title={isNewYear ? "운세를 읽을 때 기억해 주세요" : "운세를 읽을 때 기억해 주세요"}
            description="사주에서 읽은 이야기와 실제 생활에서 더 확인할 점을 나눠 알려드려요."
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
        {productId && (productId === "wealth" || productId.startsWith("money-")) ? <WealthTeacherCard variant="closing" conclusion={detail.conclusion.headline} immediateAction={detail.conclusion.immediateAction} /> : null}
        {productId === "new-year-fortune" ? <NewYearTeacherCard variant="closing" conclusion={detail.conclusion.headline} immediateAction={detail.conclusion.immediateAction} /> : teacher ? <TopicTeacherCard category={teacher.category} variant="closing" conclusion={detail.conclusion.headline} immediateAction={detail.conclusion.immediateAction} /> : null}
      </div>
    </main>
  );
}
