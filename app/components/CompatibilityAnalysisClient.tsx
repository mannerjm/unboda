"use client";

import { useRef, useState, type FormEvent } from "react";
import type { CompatibilityReportOutput } from "@/app/lib/compatibilityReportContract";

type CompatibilityResponse = {
  report: CompatibilityReportOutput;
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
  gender: "남성" | "여성";
  calendarType: "양력" | "음력";
  isLeapMonth: boolean;
};

const INITIAL_FORM: FormState = {
  label: "상대방",
  birthDate: "",
  birthTimeKnown: true,
  birthTime: "",
  gender: "여성",
  calendarType: "양력",
  isLeapMonth: false,
};

function SectionCard({
  title,
  summary,
  points,
}: {
  title: string;
  summary: string;
  points?: readonly string[];
}) {
  return (
    <section className="border-t border-stone-200 py-7 first:border-t-0 first:pt-0">
      <h3 className="text-lg font-bold text-stone-950">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-stone-700">{summary}</p>
      {points?.length ? (
        <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-600">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function CompatibilityAnalysisClient({ myProfileLabel }: { myProfileLabel: string }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<CompatibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
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
      if (!response.ok || !body || !("report" in body)) {
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
    const { report, meta } = result;
    return (
      <div ref={resultRef} className="mt-8 scroll-mt-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">궁합 분석</p>
              <h2 className="mt-2 text-2xl font-bold text-stone-950 sm:text-3xl">{report.relationshipCore.headline}</h2>
              <p className="mt-3 text-sm text-stone-500">{meta.myProfileLabel} · {meta.partnerLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              다른 상대 분석
            </button>
          </div>

          {!meta.partnerBirthTimeKnown ? (
            <div className="mt-6 rounded-2xl bg-[#f7f3ea] px-4 py-3 text-sm leading-6 text-stone-600">
              상대방 출생시간이 없어 시주와 상대방 대운은 제외하고, 확인 가능한 원국과 세운 범위만 반영했습니다.
            </div>
          ) : null}

          <div className="py-7">
            <p className="text-[15px] leading-8 text-stone-700">{report.relationshipCore.summary}</p>
          </div>

          {report.strengths.length ? (
            <section className="border-t border-stone-200 py-7">
              <h3 className="text-lg font-bold text-stone-950">잘 맞는 부분</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {report.strengths.map((item) => (
                  <article key={item.title} className="rounded-2xl bg-stone-50 p-4">
                    <h4 className="font-bold text-stone-900">{item.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <SectionCard title="부딪히기 쉬운 부분" summary={report.conflict.summary} points={report.conflict.keyPoints} />
          <SectionCard title="관계를 회복시키는 조건" summary={report.recovery.summary} points={report.recovery.keyPoints} />
          <SectionCard title="장기 관계에서 중요한 기준" summary={report.longTerm.summary} points={report.longTerm.keyPoints} />

          {report.currentTiming ? (
            <SectionCard
              title={`${meta.evaluationYear}년 현재 관계 흐름`}
              summary={`${report.currentTiming.headline}\n${report.currentTiming.summary}`}
              points={report.currentTiming.keyPoints}
            />
          ) : null}

          <section className="border-t border-stone-200 py-7">
            <h3 className="text-lg font-bold text-stone-950">지금 해볼 것</h3>
            <div className="mt-4 space-y-4">
              {report.actionGuide.doNext.map((item) => (
                <div key={`${item.action}-${item.reason}`} className="rounded-2xl bg-[#f7f3ea] p-4">
                  <p className="font-semibold text-stone-900">{item.action}</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">{item.reason}</p>
                </div>
              ))}
            </div>
            <h4 className="mt-7 text-sm font-bold text-stone-800">줄이면 좋은 행동</h4>
            <div className="mt-3 space-y-3">
              {report.actionGuide.avoid.map((item) => (
                <div key={`${item.action}-${item.reason}`} className="border-l-2 border-stone-300 pl-4">
                  <p className="text-sm font-semibold text-stone-800">{item.action}</p>
                  <p className="mt-1 text-sm leading-7 text-stone-600">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <p className="mt-4 text-xs leading-6 text-stone-500">
          궁합은 두 사람의 명리 구조와 현재 흐름을 해석한 참고 콘텐츠입니다. 관계의 결과를 확정하거나 대신 결정하지 않습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-stone-400">나의 프로필</p>
        <p className="mt-2 text-lg font-bold text-stone-950">{myProfileLabel}</p>
        <p className="mt-2 text-sm leading-6 text-stone-500">현재 분석 대상으로 선택된 내 사주를 기준으로 비교합니다.</p>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold text-stone-800">상대방 구분 이름</span>
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            maxLength={40}
            required
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
            placeholder="예: 배우자, 연인, 상대방"
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
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500"
          >
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
        disabled={loading}
        className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {loading ? "두 사람의 관계를 분석하고 있어요..." : "궁합 분석하기"}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-stone-400">분석에는 잠시 시간이 걸릴 수 있습니다.</p>
    </form>
  );
}
