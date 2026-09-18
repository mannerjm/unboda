"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import CompatibilityReportValuePreview from "@/app/components/CompatibilityReportValuePreview";
import {
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
} from "@/app/lib/specialAnalysisProducts";

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

function getBirthDayLimit(
  birthYear: string,
  birthMonth: string,
  calendarType: FormState["calendarType"],
): number {
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
  const yearOptions = Array.from(
    { length: today.year - MIN_BIRTH_YEAR + 1 },
    (_, index) => String(today.year - index),
  );
  const monthOptions = Array.from(
    { length: maxMonth },
    (_, index) => String(index + 1).padStart(2, "0"),
  );
  const dayOptions = Array.from(
    { length: maxDay },
    (_, index) => String(index + 1).padStart(2, "0"),
  );

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

  const selectClass = "w-full appearance-none rounded-2xl border border-[#dfe3ef] bg-white px-4 py-3.5 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#6f5ce7] focus:ring-2 focus:ring-[#d8d3ff] disabled:cursor-not-allowed disabled:bg-[#eef0f6] disabled:text-slate-400";

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">생년월일</span>
        {birthYear && birthMonth && birthDay ? (
          <span className="text-xs font-medium text-slate-500">
            {birthYear}년 {Number(birthMonth)}월 {Number(birthDay)}일
          </span>
        ) : null}
      </div>
      <div className="mt-2 rounded-3xl border border-[#dce1ef] bg-[linear-gradient(135deg,#f5f6fc_0%,#fbfcff_100%)] p-4 shadow-sm sm:p-5">
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
                {options.map((option) => (
                  <option key={option} value={option}>{Number(option)}{suffix}</option>
                ))}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌄</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          년·월·일을 순서대로 선택해 주세요. 선택한 날짜만 정확하게 분석에 사용합니다.
        </p>
      </div>
    </div>
  );
}

export default function PaidFamilyParentChildAnalysisClient({
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
  const counterpartRole = form.userRole === "parent" ? "자녀" : form.userRole === "child" ? "부모" : "가족";
  const canSubmit = Boolean(
    form.userRole
      && form.label.trim()
      && birthDate
      && form.gender
      && (!form.birthTimeKnown || form.birthTime),
  );
  const evaluationYear = getKoreaTodayParts().year;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !form.userRole) return;
    setError(null);

    try {
      window.sessionStorage.setItem(
        COMPATIBILITY_FAMILY_PARENT_CHILD_SESSION_KEY,
        JSON.stringify({
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
      );
      router.push(`/checkout/${COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID}?profileId=${encodeURIComponent(profileId)}`);
    } catch {
      setError("결제 단계로 이동하기 위한 가족 정보를 임시로 보관하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[30px] border border-[#dfe3ef] bg-white shadow-[0_18px_50px_rgba(32,38,72,0.08)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_35%,rgba(112,88,229,0.28),transparent_24%),radial-gradient(circle_at_82%_65%,rgba(83,180,215,0.18),transparent_25%),linear-gradient(145deg,#0b1025_0%,#171a3d_58%,#24204d_100%)] px-6 py-8 text-white sm:px-8 sm:py-9">
        <div aria-hidden="true" className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-[#e4e7f1]/80 bg-white/40" />
        <div aria-hidden="true" className="absolute -bottom-14 right-20 h-24 w-24 rounded-full bg-[#ddd8ff]/45 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#b9b2f6]">두 흐름을 연결합니다</p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[#11162d]">
            {myProfileLabel}님의 사주 <span className="font-medium text-[#c9c3ff]">×</span> 가족 사주
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
            먼저 이 관계에서 내가 부모인지 자녀인지 선택한 뒤 상대 가족의 정보를 입력해 주세요. 결제 시점의 연도판으로 생성되어 구매한 분석에 그대로 보관됩니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-slate-100">부모·자녀 관계</span>
            <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-slate-100">{evaluationYear}년판 · 구매 후 저장</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">나는 이 관계에서</span>
          <select
            value={form.userRole}
            onChange={(event) => setForm((current) => ({ ...current, userRole: event.target.value as FamilyRole }))}
            required
            className="mt-2 w-full rounded-2xl border border-[#cfd5e6] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#6f5ce7]"
          >
            <option value="" disabled>선택해 주세요</option>
            <option value="parent">부모예요</option>
            <option value="child">자녀예요</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {form.userRole === "parent"
              ? "내가 부모이고 상대가 자녀인 관계"
              : form.userRole === "child"
                ? "내가 자녀이고 상대가 부모인 관계"
                : "분석할 관계에서 내 역할을 선택해 주세요."}
          </p>
        </label>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-800">{counterpartRole} 이름 또는 별칭</span>
            <input
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              maxLength={40}
              required
              className="mt-2 w-full rounded-2xl border border-[#cfd5e6] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#6f5ce7] focus:ring-2 focus:ring-[#e5e1ff]"
              placeholder={form.userRole === "parent" ? "예: 아들, 딸, 민준" : form.userRole === "child" ? "예: 엄마, 아빠, 어머니" : "먼저 관계 역할을 선택해 주세요"}
            />
          </label>

          <BirthDateSelector
            birthYear={form.birthYear}
            birthMonth={form.birthMonth}
            birthDay={form.birthDay}
            calendarType={form.calendarType}
            onChange={(next) => setForm((current) => ({ ...current, ...next }))}
          />

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">출생시간</span>
              <input
                type="time"
                value={form.birthTime}
                disabled={!form.birthTimeKnown}
                onChange={(event) => setForm((current) => ({ ...current, birthTime: event.target.value }))}
                required={form.birthTimeKnown}
                className="mt-2 w-full rounded-2xl border border-[#cfd5e6] bg-white px-4 py-3.5 text-sm outline-none transition disabled:bg-[#eef0f6] disabled:text-slate-400 focus:border-[#6f5ce7]"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={!form.birthTimeKnown}
                onChange={(event) => setForm((current) => ({ ...current, birthTimeKnown: !event.target.checked }))}
              />
              출생시간을 몰라요
            </label>
          </div>

          <label>
            <span className="text-sm font-semibold text-slate-800">성별</span>
            <select
              value={form.gender}
              onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as FormState["gender"] }))}
              required
              className="mt-2 w-full rounded-2xl border border-[#cfd5e6] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#6f5ce7]"
            >
              <option value="" disabled>선택해 주세요</option>
              <option value="여성">여성</option>
              <option value="남성">남성</option>
            </select>
          </label>

          <div>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">달력 기준</span>
              <select
                value={form.calendarType}
                onChange={(event) => {
                  const calendarType = event.target.value as FormState["calendarType"];
                  setForm((current) => ({
                    ...current,
                    calendarType,
                    birthDay: calendarType === "음력" && Number(current.birthDay) > 30 ? "" : current.birthDay,
                    isLeapMonth: calendarType === "음력" ? current.isLeapMonth : false,
                  }));
                }}
                className="mt-2 w-full rounded-2xl border border-[#cfd5e6] bg-white px-4 py-3.5 text-sm outline-none focus:border-[#6f5ce7]"
              >
                <option value="양력">양력</option>
                <option value="음력">음력</option>
              </select>
            </label>
            {form.calendarType === "음력" ? (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
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

        <CompatibilityReportValuePreview mode="parent_child" evaluationYear={evaluationYear} />

        <div className="mt-5 rounded-2xl bg-[#f7f8fc] px-4 py-4 text-sm leading-7 text-slate-600">
          상대방 정보는 결제 연결을 위해 현재 브라우저에만 잠시 보관됩니다. 주문에는 분석에 필요한 계산 정보만 보관하며, 결제가 완료되면 브라우저에 남아 있던 상대방 정보는 자동으로 삭제됩니다. 구매 리포트는 {evaluationYear}년판으로 고정 저장됩니다.
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">본인·성인 인증이 아직 완료되지 않았다면 결제 화면에서 NICE 본인확인을 먼저 진행합니다.</p>

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-7 overflow-hidden rounded-3xl border border-[#dfe3ef] bg-[linear-gradient(135deg,#f5f6fc_0%,#f9faff_100%)] shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400">전문 궁합 리포트</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">부모·자녀 관계 분석을 결제 후 바로 생성합니다.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">결제 완료 후 생성된 {evaluationYear}년판 결과는 구매한 분석에서 다시 볼 수 있습니다.</p>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-medium text-slate-500">결제 금액</p>
              <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[#11162d]">{COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT.amount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-[#6f5ce7] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(93,76,209,0.2)] transition hover:bg-[#5f4fd2] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          결제하고 궁합 분석하기
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-slate-400">결제가 승인되면 분석 생성이 시작되고 구매한 분석에 보관됩니다.</p>
      </div>
    </form>
  );
}
