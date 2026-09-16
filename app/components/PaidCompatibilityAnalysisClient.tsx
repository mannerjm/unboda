"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  COMPATIBILITY_ROMANTIC_PRODUCT,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_SESSION_KEY,
} from "@/app/lib/specialAnalysisProducts";

type FormState = {
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

const INITIAL_FORM: FormState = {
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
    const nextYear = Number(next.birthYear);
    if (part === "birthYear") {
      const nextMonthLimit = nextYear === today.year ? today.month : 12;
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

export default function PaidCompatibilityAnalysisClient({
  myProfileLabel,
  profileId,
}: {
  myProfileLabel: string;
  profileId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const birthDate = buildBirthDate(form);
  const canSubmit = Boolean(
    form.label.trim()
      && birthDate
      && form.gender
      && (!form.birthTimeKnown || form.birthTime),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    try {
      const partner = {
        label: form.label.trim(),
        birthDate,
        birthTimeKnown: form.birthTimeKnown,
        birthTime: form.birthTimeKnown ? form.birthTime : null,
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === "음력" ? form.isLeapMonth : false,
      };
      window.sessionStorage.setItem(COMPATIBILITY_ROMANTIC_SESSION_KEY, JSON.stringify(partner));
      router.push(`/checkout/${COMPATIBILITY_ROMANTIC_PRODUCT_ID}?profileId=${encodeURIComponent(profileId)}`);
    } catch {
      setError("결제 화면으로 이동할 정보를 준비하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[30px] border border-[#e4dac9] bg-white shadow-[0_18px_50px_rgba(87,72,48,0.08)]">
      <div className="bg-[linear-gradient(135deg,#f7f1e6_0%,#fffdf9_100%)] px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">분석 기준</p>
            <p className="mt-2 text-xl font-bold text-stone-950">{myProfileLabel}님의 사주 × 상대방 사주</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">현재 선택된 내 프로필을 기준으로 연인·배우자 관계를 살펴봅니다.</p>
          </div>
          <div className="rounded-2xl bg-stone-900 px-4 py-3 text-right text-white">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-300">전문 궁합 리포트</p>
            <p className="mt-1 text-lg font-bold">{COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-stone-800">상대방 이름 또는 별칭</span>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} maxLength={40} required className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-100" placeholder="예: 지민, 배우자" />
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
          <p className="text-sm font-bold text-stone-900">결제 후 제공되는 내용</p>
          <div className="mt-3 grid gap-2 text-sm leading-7 text-stone-600 sm:grid-cols-2">
            <p>· 잘 맞는 부분과 갈등 패턴</p><p>· 나 → 상대 / 상대 → 나의 영향</p><p>· 갈등 뒤 회복 방식과 장기 기준</p><p>· 현재 연도 관계 흐름과 행동 가이드</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-600">
          상대방 정보는 결제 연결을 위해 현재 브라우저에만 잠시 보관됩니다. 주문에는 분석에 필요한 계산 정보만 보관하며, 결제가 완료되면 브라우저에 남아 있던 상대방 정보는 자동으로 삭제됩니다.
        </div>
        <p className="mt-3 text-xs leading-6 text-stone-500">본인·성인 인증이 아직 완료되지 않았다면 결제 화면에서 NICE 본인확인을 먼저 진행합니다.</p>

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={!canSubmit} className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300">
          {COMPATIBILITY_ROMANTIC_PRODUCT.amount.toLocaleString("ko-KR")}원 결제 후 궁합 분석하기
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-stone-400">결제가 승인되면 분석 생성이 시작되고 구매한 분석에 보관됩니다.</p>
      </div>
    </form>
  );
}