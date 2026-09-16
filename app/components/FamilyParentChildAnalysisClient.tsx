"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { FamilyParentChildReportOutput } from "@/app/lib/familyCompatibilityParentChildReportContract";

type FamilyRole = "" | "parent" | "child";
type FormState = {
  userRole: FamilyRole;
  label: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthTimeKnown: boolean;
  birthTime: string;
  gender: "" | "남성" | "여성";
  calendarType: "양력" | "음력";
  isLeapMonth: boolean;
};

type BirthDateParts = Pick<FormState, "birthYear" | "birthMonth" | "birthDay">;

type DirectionCard = {
  fromLabel: string;
  toLabel: string;
  headline: string;
  signals: string[];
};

type FamilyResponse = {
  report: FamilyParentChildReportOutput;
  directions: {
    parentToChild: DirectionCard;
    childToParent: DirectionCard;
  };
  meta: {
    evaluationYear: number;
    myProfileLabel: string;
    familyMemberLabel: string;
    userRole: "parent" | "child";
    familyMemberRole: "parent" | "child";
    familyMemberBirthTimeKnown: boolean;
  };
};

const INITIAL_FORM: FormState = {
  userRole: "",
  label: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  birthTimeKnown: true,
  birthTime: "",
  gender: "",
  calendarType: "양력",
  isLeapMonth: false,
};

const MIN_BIRTH_YEAR = 1900;
const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKoreaTodayParts(): { year: number; month: number; day: number } {
  const koreaTime = new Date(Date.now() + KOREA_UTC_OFFSET_MS);
  return {
    year: koreaTime.getUTCFullYear(),
    month: koreaTime.getUTCMonth() + 1,
    day: koreaTime.getUTCDate(),
  };
}

function getBirthDayLimit(birthYear: string, birthMonth: string, calendarType: FormState["calendarType"]): number {
  if (!birthYear || !birthMonth) return calendarType === "음력" ? 30 : 31;
  if (calendarType === "음력") return 30;
  return new Date(Date.UTC(Number(birthYear), Number(birthMonth), 0)).getUTCDate();
}

function buildBirthDate(parts: BirthDateParts): string {
  if (!parts.birthYear || !parts.birthMonth || !parts.birthDay) return "";
  return `${parts.birthYear}-${parts.birthMonth}-${parts.birthDay}`;
}

function BirthDateSelector({
  birthYear,
  birthMonth,
  birthDay,
  calendarType,
  onChange,
}: BirthDateParts & {
  calendarType: FormState["calendarType"];
  onChange: (next: BirthDateParts) => void;
}) {
  const today = getKoreaTodayParts();
  const selectedYear = Number(birthYear);
  const selectedMonth = Number(birthMonth);
  const maxMonth = selectedYear === today.year ? today.month : 12;
  const naturalDayLimit = getBirthDayLimit(birthYear, birthMonth, calendarType);
  const maxDay = calendarType === "양력" && selectedYear === today.year && selectedMonth === today.month
    ? Math.min(naturalDayLimit, today.day)
    : naturalDayLimit;
  const yearOptions = Array.from({ length: today.year - MIN_BIRTH_YEAR + 1 }, (_, index) => String(today.year - index));
  const monthOptions = Array.from({ length: maxMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const dayOptions = Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, "0"));

  const updatePart = (part: keyof BirthDateParts, value: string) => {
    const next: BirthDateParts = { birthYear, birthMonth, birthDay, [part]: value };
    if (part === "birthYear") {
      const nextMonthLimit = Number(value) === today.year ? today.month : 12;
      if (next.birthMonth && Number(next.birthMonth) > nextMonthLimit) {
        next.birthMonth = "";
        next.birthDay = "";
      }
    }
    if (part === "birthMonth" && !value) next.birthDay = "";
    if (next.birthYear && next.birthMonth && next.birthDay) {
      const dayLimit = getBirthDayLimit(next.birthYear, next.birthMonth, calendarType);
      const currentMonthLimit = calendarType === "양력"
        && Number(next.birthYear) === today.year
        && Number(next.birthMonth) === today.month
        ? Math.min(dayLimit, today.day)
        : dayLimit;
      if (Number(next.birthDay) > currentMonthLimit) next.birthDay = "";
    }
    onChange(next);
  };

  const selectClass = "w-full appearance-none rounded-2xl border border-[#e3d9c8] bg-white px-4 py-3.5 pr-9 text-sm font-semibold text-stone-800 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-semibold text-stone-800">생년월일</span>
        {birthYear && birthMonth && birthDay ? <span className="text-xs font-medium text-stone-500">{birthYear}년 {Number(birthMonth)}월 {Number(birthDay)}일</span> : null}
      </div>
      <div className="mt-2 rounded-3xl border border-[#e7ddcd] bg-[linear-gradient(135deg,#fbf8f2_0%,#fffdfa_100%)] p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2 sm:gap-3">
          {([
            ["birthYear", "년도", yearOptions, "년"],
            ["birthMonth", "월", monthOptions, "월"],
            ["birthDay", "일", dayOptions, "일"],
          ] as const).map(([part, placeholder, options, suffix]) => (
            <label key={part} className="relative">
              <span className="sr-only">{placeholder}</span>
              <select
                aria-label={placeholder}
                value={part === "birthYear" ? birthYear : part === "birthMonth" ? birthMonth : birthDay}
                disabled={(part === "birthMonth" && !birthYear) || (part === "birthDay" && (!birthYear || !birthMonth))}
                onChange={(event) => updatePart(part, event.target.value)}
                required
                className={selectClass}
              >
                <option value="">{placeholder}</option>
                {options.map((option) => <option key={option} value={option}>{Number(option)}{suffix}</option>)}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">⌄</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs leading-6 text-stone-500">년·월·일을 순서대로 선택해 주세요. 선택한 날짜만 정확하게 분석에 사용합니다.</p>
      </div>
    </div>
  );
}

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

function FamilyReport({ response, onReset }: { response: FamilyResponse; onReset: () => void }) {
  const { report, directions, meta } = response;
  const parentLabel = meta.userRole === "parent" ? meta.myProfileLabel : meta.familyMemberLabel;
  const childLabel = meta.userRole === "child" ? meta.myProfileLabel : meta.familyMemberLabel;

  return (
    <article data-section="family-parent-child-report" className="mt-8 overflow-hidden rounded-[32px] border border-[#e3d9c8] bg-[#fffdf9] shadow-[0_22px_60px_rgba(72,59,41,0.10)]">
      <header className="bg-[linear-gradient(135deg,#f8f1e5_0%,#fffdf8_58%,#f1ebe2_100%)] px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-stone-700 ring-1 ring-stone-200">가족 궁합 리포트</span>
            <span className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white">부모·자녀</span>
          </div>
          <button type="button" onClick={onReset} className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-white">다른 가족 분석</button>
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
          <p className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-6 text-stone-600 ring-1 ring-stone-200">상대 가족의 출생시간을 모르는 경우 확인 가능한 생년월일 범위와 현재 연도 흐름을 중심으로 분석합니다.</p>
        ) : null}
      </header>

      <section data-section="family-direction" className="bg-stone-950 px-6 py-8 text-white sm:px-9 sm:py-10">
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
            <SectionHeader number="06 · 현재 관계 흐름" title={`${meta.evaluationYear}년 부모·자녀 관계 흐름`} />
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
      <p className="border-t border-stone-200 bg-white px-6 py-5 text-center text-xs leading-6 text-stone-500">가족 궁합은 두 사람의 명리 구조와 현재 흐름을 해석한 참고 콘텐츠입니다. 가족 관계의 결과를 확정하거나 한쪽의 잘잘못을 판단하지 않습니다.</p>
    </article>
  );
}

export default function FamilyParentChildAnalysisClient({ myProfileLabel, profileId }: { myProfileLabel: string; profileId: string }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<FamilyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const birthDate = buildBirthDate(form);
  const counterpartRole = form.userRole === "parent" ? "자녀" : form.userRole === "child" ? "부모" : "가족";
  const canSubmit = Boolean(form.userRole && form.label.trim() && birthDate && form.gender && (!form.birthTimeKnown || form.birthTime));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !form.userRole) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/special-analysis/compatibility/family/parent-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          userRole: form.userRole,
          familyMember: {
            label: form.label.trim(),
            birthDate,
            birthTimeKnown: form.birthTimeKnown,
            birthTime: form.birthTimeKnown ? form.birthTime : null,
            gender: form.gender,
            calendarType: form.calendarType,
            isLeapMonth: form.calendarType === "음력" ? form.isLeapMonth : false,
          },
        }),
      });
      const payload = await response.json() as FamilyResponse | { error?: string };
      if (!response.ok || !("report" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "부모·자녀 궁합 리포트를 생성하지 못했습니다.");
      }
      setResult(payload);
      window.setTimeout(() => document.querySelector('[data-section="family-parent-child-report"]')?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "부모·자녀 궁합 리포트를 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <FamilyReport response={result} onReset={() => { setResult(null); setError(null); }} />;
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[30px] border border-[#e4dac9] bg-white shadow-[0_18px_50px_rgba(87,72,48,0.08)]">
      <div className="bg-[linear-gradient(135deg,#f7f1e6_0%,#fffdf9_60%,#f8f3ea_100%)] px-6 py-8 sm:px-8">
        <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">분석 기준</p>
        <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-stone-950">{myProfileLabel}님의 사주 <span className="font-medium text-stone-400">×</span> 가족 사주</p>
        <p className="mt-3 text-sm leading-7 text-stone-600">먼저 이 관계에서 내가 부모인지 자녀인지 선택한 뒤 상대 가족의 정보를 입력해 주세요.</p>
      </div>

      <div className="p-6 sm:p-8">
        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">나는 이 관계에서</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([[
              "parent",
              "부모예요",
              "내가 부모이고 상대방이 자녀인 관계",
            ], [
              "child",
              "자녀예요",
              "내가 자녀이고 상대방이 부모인 관계",
            ]] as const).map(([value, title, description]) => {
              const selected = form.userRole === value;
              return (
                <label key={value} className={`cursor-pointer rounded-2xl border p-4 transition ${selected ? "border-stone-900 bg-stone-950 text-white shadow-sm" : "border-stone-200 bg-white text-stone-900 hover:border-stone-400"}`}>
                  <input className="sr-only" type="radio" name="familyRole" value={value} checked={selected} onChange={() => setForm((current) => ({ ...current, userRole: value }))} />
                  <span className="block text-sm font-bold">{title}</span>
                  <span className={`mt-1.5 block text-xs leading-5 ${selected ? "text-stone-300" : "text-stone-500"}`}>{description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-stone-800">{counterpartRole} 이름 또는 별칭</span>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} maxLength={40} required className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-100" placeholder={form.userRole === "parent" ? "예: 아들, 딸, 민준" : form.userRole === "child" ? "예: 엄마, 아빠, 어머니" : "먼저 관계 역할을 선택해 주세요"} />
          </label>

          <BirthDateSelector birthYear={form.birthYear} birthMonth={form.birthMonth} birthDay={form.birthDay} calendarType={form.calendarType} onChange={(next) => setForm((current) => ({ ...current, ...next }))} />

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-stone-800">출생시간</span>
              <input type="time" value={form.birthTime} disabled={!form.birthTimeKnown} onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))} required={form.birthTimeKnown} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition disabled:bg-stone-100 disabled:text-stone-400 focus:border-stone-500" />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={!form.birthTimeKnown} onChange={(event) => setForm((current) => ({ ...current, birthTimeKnown: !event.target.checked }))} />출생시간을 몰라요</label>
          </div>

          <label>
            <span className="text-sm font-semibold text-stone-800">성별</span>
            <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as FormState["gender"] }))} required className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-stone-500">
              <option value="" disabled>선택해 주세요</option><option value="여성">여성</option><option value="남성">남성</option>
            </select>
          </label>

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-stone-800">달력 기준</span>
              <select value={form.calendarType} onChange={(event) => { const calendarType = event.target.value as FormState["calendarType"]; setForm((current) => ({ ...current, calendarType, birthDay: calendarType === "음력" && Number(current.birthDay) > 30 ? "" : current.birthDay, isLeapMonth: calendarType === "음력" ? current.isLeapMonth : false })); }} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-stone-500"><option value="양력">양력</option><option value="음력">음력</option></select>
            </label>
            {form.calendarType === "음력" ? <label className="mt-3 flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={form.isLeapMonth} onChange={(event) => setForm((current) => ({ ...current, isLeapMonth: event.target.checked }))} />윤달</label> : null}
          </div>
        </div>

        <div className="mt-7 rounded-3xl border border-[#eadfc9] bg-[#faf6ee] p-5">
          <p className="text-sm font-bold text-stone-900">이번 분석에서 살펴보는 내용</p>
          <div className="mt-3 grid gap-2 text-sm leading-7 text-stone-600 sm:grid-cols-2">
            <p>· 정서적 연결과 대화 방식</p><p>· 부모 → 자녀 / 자녀 → 부모의 영향</p><p>· 기대와 독립, 보호와 경계</p><p>· 갈등 뒤 회복과 현재 관계 흐름</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-600">입력한 가족 정보는 이번 리포트 생성에만 사용하며 별도 프로필이나 가족 궁합 기록으로 저장하지 않습니다.</div>
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button type="submit" disabled={!canSubmit || loading} className="mt-6 w-full rounded-2xl bg-stone-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300">
          {loading ? "부모·자녀 관계를 살펴보는 중..." : "부모·자녀 궁합 분석하기"}
        </button>
        <p className="mt-3 text-center text-xs leading-6 text-stone-500">분석에는 잠시 시간이 걸릴 수 있습니다.</p>
      </div>
    </form>
  );
}
