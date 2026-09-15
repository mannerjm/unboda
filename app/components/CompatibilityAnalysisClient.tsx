"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { CompatibilityPairPerspectives } from "@/app/lib/compatibilityPairPerspective";
import type { CompatibilityReportOutput } from "@/app/lib/compatibilityReportContract";

type CompatibilityResponse = {
  report: CompatibilityReportOutput;
  perspectives: CompatibilityPairPerspectives;
  meta: {
    evaluationYear: number;
    myProfileLabel: string;
    partnerLabel: string;
    partnerBirthTimeKnown: boolean;
    natalDataQuality: { level: string; score: number; missing: readonly string[] };
    timingDataQuality: { level: string; score: number; missing: readonly string[] };
  };
};

type FormState = {
  label: string;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string;
  gender: "" | "남성" | "여성";
  calendarType: "양력" | "음력";
  isLeapMonth: boolean;
};

const INITIAL_FORM: FormState = {
  label: "",
  birthDate: "",
  birthTimeKnown: true,
  birthTime: "",
  gender: "",
  calendarType: "양력",
  isLeapMonth: false,
};

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
      <p className={`text-[11px] font-bold tracking-[0.18em] ${dark ? "text-stone-400" : "text-stone-400"}`}>{eyebrow}</p>
      <h3 className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${dark ? "text-white" : "text-stone-950"}`}>{title}</h3>
      {description ? <p className={`mt-2 text-sm leading-7 ${dark ? "text-stone-300" : "text-stone-500"}`}>{description}</p> : null}
    </div>
  );
}

function PointList({ points }: { points: readonly string[] }) {
  return (
    <ul className="mt-5 grid gap-3">
      {points.map((point) => (
        <li key={point} className="flex gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-7 text-stone-700 ring-1 ring-stone-200/80">
          <span aria-hidden="true" className="mt-[9px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">✓</span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryTile({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-bold tracking-[0.16em] text-stone-400">{eyebrow}</p>
      <h4 className="mt-3 text-base font-bold leading-7 text-stone-950">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-stone-600">{body}</p>
    </article>
  );
}

function PerspectiveCard({
  label,
  headline,
  summary,
  signals,
}: {
  label: string;
  headline: string;
  summary: string;
  signals: readonly string[];
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 sm:p-6">
      <p className="text-xs font-semibold text-stone-300">{label}</p>
      <h4 className="mt-3 text-lg font-bold leading-8 text-white">{headline}</h4>
      <p className="mt-3 text-sm leading-7 text-stone-300">{summary}</p>
      <div className="mt-5 space-y-2">
        {signals.map((signal) => (
          <p key={signal} className="flex gap-2 text-xs leading-6 text-stone-300">
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#dccaa7]" />
            <span>{signal}</span>
          </p>
        ))}
      </div>
    </article>
  );
}

function EditorialSection({
  eyebrow,
  title,
  summary,
  points,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  points?: readonly string[];
  children?: ReactNode;
}) {
  return (
    <section className="border-t border-stone-200/80 px-6 py-10 sm:px-10 sm:py-12">
      <ReportSectionHeader eyebrow={eyebrow} title={title} />
      <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-stone-700">{summary}</p>
      {points?.length ? <PointList points={points} /> : null}
      {children}
    </section>
  );
}

export default function CompatibilityAnalysisClient({ myProfileLabel }: { myProfileLabel: string }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<CompatibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = Boolean(
    form.label.trim()
      && form.birthDate
      && form.gender
      && (!form.birthTimeKnown || form.birthTime),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/special-analysis/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner: {
            label: form.label,
            birthDate: form.birthDate,
            birthTimeKnown: form.birthTimeKnown,
            birthTime: form.birthTimeKnown ? form.birthTime : null,
            gender: form.gender,
            calendarType: form.calendarType,
            isLeapMonth: form.calendarType === "음력" ? form.isLeapMonth : false,
          },
        }),
      });
      const body = await response.json().catch(() => null) as CompatibilityResponse | { error?: string } | null;
      if (!response.ok || !body || !("report" in body) || !("perspectives" in body)) {
        throw new Error(body && "error" in body && body.error ? body.error : "궁합 분석을 완료하지 못했습니다.");
      }
      setResult(body);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "궁합 분석을 완료하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const { report, perspectives, meta } = result;
    const firstStrength = report.strengths[0];
    const conflictPoint = report.conflict.keyPoints[0] ?? report.conflict.summary;
    const timingPoint = report.currentTiming?.keyPoints[0] ?? report.currentTiming?.summary ?? "현재 관계 흐름은 두 사람의 기본 관계 구조와 함께 살펴봅니다.";

    return (
      <div ref={resultRef} className="mt-8 scroll-mt-6">
        <article className="overflow-hidden rounded-[32px] border border-stone-200/80 bg-[#fffdfa] shadow-xl shadow-stone-200/60">
          <header className="relative overflow-hidden bg-[linear-gradient(135deg,#f8f2e7_0%,#fffdf8_55%,#f1ebe2_100%)] px-6 py-8 sm:px-10 sm:py-12">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-stone-300/80 bg-white/70 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-stone-600">궁합 리포트</span>
                    <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">연인·배우자</span>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-stone-500">{meta.myProfileLabel} <span className="mx-2 text-stone-300">×</span> {meta.partnerLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded-full border border-stone-300/80 bg-white/70 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-white"
                >
                  다른 상대 분석
                </button>
              </div>

              <div className="mt-8 max-w-4xl">
                <p className="text-[11px] font-bold tracking-[0.2em] text-stone-400">RELATIONSHIP CORE</p>
                <h2 className="mt-3 text-3xl font-bold leading-[1.3] tracking-tight text-stone-950 sm:text-4xl lg:text-[42px]">
                  {report.relationshipCore.headline}
                </h2>
                <p className="mt-5 max-w-3xl text-[15px] leading-8 text-stone-700 sm:text-base">
                  {report.relationshipCore.summary}
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">소통·갈등·회복 분석</span>
                <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">{meta.evaluationYear}년 관계 흐름 포함</span>
                <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">{meta.partnerBirthTimeKnown ? "출생시간 반영" : "확인 가능한 범위로 분석"}</span>
              </div>
            </div>
          </header>

          {!meta.partnerBirthTimeKnown ? (
            <div className="border-t border-[#eadfc9] bg-[#f8f1e4] px-6 py-4 text-sm leading-7 text-stone-600 sm:px-10">
              상대방 출생시간이 없어 시주와 상대방 대운은 제외하고, 확인 가능한 원국과 세운 범위만 반영했습니다.
            </div>
          ) : null}

          <section className="bg-[#faf8f4] px-6 py-9 sm:px-10 sm:py-10">
            <ReportSectionHeader
              eyebrow="AT A GLANCE"
              title="관계 핵심 요약"
              description="길게 읽기 전에 두 사람 관계에서 먼저 확인할 세 가지 포인트입니다."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <SummaryTile
                eyebrow="강점"
                title={firstStrength?.title ?? "함께 살릴 수 있는 강점"}
                body={firstStrength?.body ?? "두 사람이 함께 있을 때 살아나는 장점을 아래 리포트에서 구체적으로 확인할 수 있습니다."}
              />
              <SummaryTile
                eyebrow="조율"
                title="부딪히기 쉬운 지점"
                body={conflictPoint}
              />
              <SummaryTile
                eyebrow={`${meta.evaluationYear}년`}
                title={report.currentTiming?.headline ?? "현재 관계 흐름"}
                body={timingPoint}
              />
            </div>
          </section>

          {report.strengths.length ? (
            <section className="border-t border-stone-200/80 px-6 py-10 sm:px-10 sm:py-12">
              <ReportSectionHeader
                eyebrow="01 · STRENGTHS"
                title="잘 맞는 부분"
                description="두 사람 사이에서 자연스럽게 연결되거나 함께 살릴 수 있는 강점입니다."
              />
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {report.strengths.map((item, index) => (
                  <article key={item.title} className="rounded-3xl bg-stone-50 p-5 ring-1 ring-stone-200/70 sm:p-6">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                    <h4 className="mt-5 text-base font-bold leading-7 text-stone-950">{item.title}</h4>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section data-section="pair-perspective" className="border-t border-stone-200/80 bg-stone-900 px-6 py-10 text-white sm:px-10 sm:py-12">
            <ReportSectionHeader
              eyebrow="02 · DIRECTION"
              title="서로에게 미치는 방식"
              description="같은 관계라도 내가 상대에게 주는 영향과 상대가 나에게 주는 영향은 다르게 나타날 수 있습니다."
              tone="dark"
            />
            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              <PerspectiveCard
                label={`${meta.myProfileLabel} → ${meta.partnerLabel}`}
                headline={perspectives.meToPartner.headline}
                summary={perspectives.meToPartner.summary}
                signals={perspectives.meToPartner.signals}
              />
              <PerspectiveCard
                label={`${meta.partnerLabel} → ${meta.myProfileLabel}`}
                headline={perspectives.partnerToMe.headline}
                summary={perspectives.partnerToMe.summary}
                signals={perspectives.partnerToMe.signals}
              />
            </div>
          </section>

          <EditorialSection
            eyebrow="03 · FRICTION"
            title="부딪히기 쉬운 부분"
            summary={report.conflict.summary}
            points={report.conflict.keyPoints}
          />

          <section className="border-t border-stone-200/80 bg-[#faf8f4] px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
              <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7">
                <ReportSectionHeader eyebrow="04 · RECOVERY" title="갈등 뒤 회복 방식" />
                <p className="mt-5 text-[15px] leading-8 text-stone-700">{report.recovery.summary}</p>
                <PointList points={report.recovery.keyPoints} />
              </div>
              <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7">
                <ReportSectionHeader eyebrow="05 · LONG TERM" title="오래 가려면 맞춰야 할 기준" />
                <p className="mt-5 text-[15px] leading-8 text-stone-700">{report.longTerm.summary}</p>
                <PointList points={report.longTerm.keyPoints} />
              </div>
            </div>
          </section>

          {report.currentTiming ? (
            <section className="border-t border-[#e4d6bb] bg-[#f5ecdc] px-6 py-10 sm:px-10 sm:py-12">
              <ReportSectionHeader eyebrow="06 · NOW" title={`${meta.evaluationYear}년 현재 관계 흐름`} />
              <div className="mt-6 rounded-3xl border border-[#dfcfaf] bg-white/70 p-6 sm:p-8">
                <p className="text-xl font-bold leading-8 text-stone-950 sm:text-2xl">{report.currentTiming.headline}</p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-stone-700">{report.currentTiming.summary}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {report.currentTiming.keyPoints.map((point) => (
                    <div key={point} className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-stone-700 ring-1 ring-[#e6d9c2]">
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="border-t border-stone-200/80 px-6 py-10 sm:px-10 sm:py-12">
            <ReportSectionHeader
              eyebrow="07 · ACTION"
              title="지금 해볼 것"
              description="관계를 바꾸는 건 큰 결심보다 반복 가능한 작은 행동에 가깝습니다."
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {report.actionGuide.doNext.map((item, index) => (
                <article key={`${item.action}-${item.reason}`} className="rounded-3xl bg-[#f8f3e9] p-5 ring-1 ring-[#eadfc9] sm:p-6">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-stone-400">ACTION {String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-3 font-bold leading-7 text-stone-950">{item.action}</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{item.reason}</p>
                </article>
              ))}
            </div>

            <div className="mt-9 rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
              <h4 className="text-sm font-bold text-stone-900">줄이면 좋은 행동</h4>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {report.actionGuide.avoid.map((item) => (
                  <div key={`${item.action}-${item.reason}`} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/80">
                    <p className="text-sm font-semibold leading-7 text-stone-900">{item.action}</p>
                    <p className="mt-1 text-sm leading-7 text-stone-600">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </article>

        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-6 text-stone-500">
          궁합은 두 사람의 명리 구조와 현재 흐름을 해석한 참고 콘텐츠입니다. 관계의 결과를 확정하거나 대신 결정하지 않습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">나의 프로필</p>
        <p className="mt-2 text-lg font-bold text-stone-950">{myProfileLabel}</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">현재 분석 대상으로 선택된 내 사주를 기준으로 비교합니다.</p>
      </div>

      <div className="mt-6 rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm leading-6 text-stone-600">
        현재 궁합 분석은 연인·배우자 관계를 기준으로 살펴봅니다.
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold text-stone-800">상대방 이름 또는 별칭</span>
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            maxLength={40}
            required
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
            placeholder="예: 지민, 배우자"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-stone-800">생년월일</span>
          <input
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
            required
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
          />
        </label>

        <div>
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">출생시간</span>
            <input
              type="time"
              value={form.birthTime}
              disabled={!form.birthTimeKnown}
              onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
              required={form.birthTimeKnown}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition disabled:bg-stone-100 disabled:text-stone-400 focus:border-stone-500"
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={!form.birthTimeKnown}
              onChange={(event) => setForm((current) => ({ ...current, birthTimeKnown: !event.target.checked }))}
            />
            출생시간을 몰라요
          </label>
        </div>

        <label>
          <span className="text-sm font-semibold text-stone-800">성별</span>
          <select
            value={form.gender}
            onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as FormState["gender"] }))}
            required
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500"
          >
            <option value="" disabled>선택해 주세요</option>
            <option value="여성">여성</option>
            <option value="남성">남성</option>
          </select>
        </label>

        <div>
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">달력 기준</span>
            <select
              value={form.calendarType}
              onChange={(event) => setForm((current) => ({
                ...current,
                calendarType: event.target.value as FormState["calendarType"],
                isLeapMonth: event.target.value === "음력" ? current.isLeapMonth : false,
              }))}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500"
            >
              <option value="양력">양력</option>
              <option value="음력">음력</option>
            </select>
          </label>
          {form.calendarType === "음력" ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={form.isLeapMonth}
                onChange={(event) => setForm((current) => ({ ...current, isLeapMonth: event.target.checked }))}
              />
              윤달
            </label>
          ) : null}
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-600">
        상대방 정보는 이번 궁합 계산과 리포트 생성에만 사용하며 별도 프로필이나 궁합 기록으로 저장하지 않습니다.
      </div>

      {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {loading ? "두 사람의 관계를 분석하고 있어요..." : "궁합 분석하기"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-stone-400">분석에는 잠시 시간이 걸릴 수 있습니다.</p>
    </form>
  );
}
