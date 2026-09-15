"use client";

import { useMemo } from "react";

const MIN_YEAR = 1900;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDate(value: string): { year: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

export default function CompatibilityBirthDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const selected = parseDate(value);

  const selectedYear = Number(selected.year) || 0;
  const selectedMonth = Number(selected.month) || 0;

  const years = useMemo(
    () => Array.from({ length: currentYear - MIN_YEAR + 1 }, (_, index) => currentYear - index),
    [currentYear],
  );

  const maxMonth = selectedYear === currentYear ? currentMonth : 12;
  const months = Array.from({ length: maxMonth }, (_, index) => index + 1);

  const naturalMaxDay = selectedYear && selectedMonth
    ? daysInMonth(selectedYear, selectedMonth)
    : 31;
  const maxDay = selectedYear === currentYear && selectedMonth === currentMonth
    ? Math.min(naturalMaxDay, currentDay)
    : naturalMaxDay;
  const days = Array.from({ length: maxDay }, (_, index) => index + 1);

  const commit = (nextYear: string, nextMonth: string, nextDay: string) => {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange("");
      return;
    }

    const year = Number(nextYear);
    const month = Number(nextMonth);
    const day = Number(nextDay);
    const dayLimit = year === currentYear && month === currentMonth
      ? Math.min(daysInMonth(year, month), currentDay)
      : daysInMonth(year, month);

    if (day > dayLimit) {
      onChange("");
      return;
    }

    onChange(`${year}-${pad2(month)}-${pad2(day)}`);
  };

  const updateYear = (nextYear: string) => {
    if (!nextYear) {
      onChange("");
      return;
    }
    const year = Number(nextYear);
    const month = selected.month && Number(selected.month) <= (year === currentYear ? currentMonth : 12)
      ? selected.month
      : "";
    const day = month && selected.day
      ? String(Math.min(Number(selected.day), year === currentYear && Number(month) === currentMonth
        ? Math.min(daysInMonth(year, Number(month)), currentDay)
        : daysInMonth(year, Number(month))))
      : "";
    commit(nextYear, month, day ? pad2(Number(day)) : "");
  };

  const updateMonth = (nextMonth: string) => {
    if (!selected.year || !nextMonth) {
      onChange("");
      return;
    }
    const month = Number(nextMonth);
    const day = selected.day
      ? Math.min(Number(selected.day), selectedYear === currentYear && month === currentMonth
        ? Math.min(daysInMonth(selectedYear, month), currentDay)
        : daysInMonth(selectedYear, month))
      : 0;
    commit(selected.year, pad2(month), day ? pad2(day) : "");
  };

  const updateDay = (nextDay: string) => {
    commit(selected.year, selected.month, nextDay ? pad2(Number(nextDay)) : "");
  };

  const selectClass = "w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-3.5 pr-10 text-sm font-semibold text-stone-800 shadow-sm outline-none transition hover:border-stone-300 focus:border-stone-500 focus:ring-4 focus:ring-stone-100";

  return (
    <fieldset className="sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <legend className="text-sm font-semibold text-stone-800">생년월일</legend>
          <p className="mt-1 text-xs leading-5 text-stone-400">연도·월·일을 각각 선택해 주세요.</p>
        </div>
        {value ? (
          <span className="rounded-full bg-[#f4ede1] px-3 py-1.5 text-xs font-semibold text-stone-600">
            {selected.year}년 {Number(selected.month)}월 {Number(selected.day)}일
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-[1.35fr_1fr_1fr] gap-2 sm:gap-3">
        <label className="relative">
          <span className="sr-only">출생 연도</span>
          <select
            aria-label="출생 연도"
            value={selected.year}
            onChange={(event) => updateYear(event.target.value)}
            className={selectClass}
          >
            <option value="">연도</option>
            {years.map((year) => <option key={year} value={year}>{year}년</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▼</span>
        </label>

        <label className="relative">
          <span className="sr-only">출생 월</span>
          <select
            aria-label="출생 월"
            value={selected.month ? String(Number(selected.month)) : ""}
            disabled={!selected.year}
            onChange={(event) => updateMonth(event.target.value)}
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-300`}
          >
            <option value="">월</option>
            {months.map((month) => <option key={month} value={month}>{month}월</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▼</span>
        </label>

        <label className="relative">
          <span className="sr-only">출생 일</span>
          <select
            aria-label="출생 일"
            value={selected.day ? String(Number(selected.day)) : ""}
            disabled={!selected.year || !selected.month}
            onChange={(event) => updateDay(event.target.value)}
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-300`}
          >
            <option value="">일</option>
            {days.map((day) => <option key={day} value={day}>{day}일</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▼</span>
        </label>
      </div>
    </fieldset>
  );
}
