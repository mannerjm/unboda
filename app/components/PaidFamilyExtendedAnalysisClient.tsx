"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import CompatibilityReportValuePreview from "@/app/components/CompatibilityReportValuePreview";
import type { FamilyOtherRelationshipKind, FamilyOtherRole } from "@/app/lib/familyCompatibilityExtended";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_SESSION_KEY,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY,
} from "@/app/lib/specialAnalysisProducts";

type Mode = "siblings" | "other_family";
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
  relationshipKind: "" | FamilyOtherRelationshipKind;
  userRole: "" | FamilyOtherRole;
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
  relationshipKind: "",
  userRole: "",
};

const MIN_BIRTH_YEAR = 1900;
const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKoreaTodayParts() {
  const koreaTime = new Date(Date.now() + KOREA_UTC_OFFSET_MS);
  return {
    year: koreaTime.getUTCFullYear(),
    month: koreaTime.getUTCMonth() + 1,
    day: koreaTime.getUTCDate(),
  };
}

function getBirthDayLimit(year: string, month: string, calendarType: FormState["calendarType"]): number {
  if (!year || !month) return calendarType === "음력" ? 30 : 31;
  if (calendarType === "음력") return 30;
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

function buildBirthDate(parts: BirthDateParts): string {
  if (!parts.birthYear || !parts.birthMonth || !parts.birthDay) return "";
  return `${parts.birthYear}-${parts.birthMonth}-${parts.birthDay}`;
}

function BirthDateSelector({ birthYear, birthMonth, birthDay, calendarType, onChange }: BirthDateParts & {
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

  function updatePart(part: keyof BirthDateParts, value: string) {
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
      const currentMonthLimit = calendarType === "양력" && Number(next.birthYear) === today.year && Number(next.birthMonth) === today.month
        ? Math.min(dayLimit, today.day)
        : dayLimit;
      if (Number(next.birthDay) > currentMonthLimit) next.birthDay = "";
    }
    onChange(next);
  }

  const selectClass = "w-full appearance-none rounded-2xl border border-[#e3d9c8] bg-white px-4 py-3.5 pr-9 text-sm font-semibold text-stone-800 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";

  return (
    <div className="sm:col-span-2">
      <span className="text-sm font-semibold text-stone-800">생년월일</span>
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
      </div>
    </div>
  );
}

const OTHER_RELATIONSHIPS: readonly { value: FamilyOtherRelationshipKind; title: string; description: string }[] = [
  { value: "grandparent_grandchild", title: "조부모·손주", description: "세대 차이와 돌봄·독립의 거리를 함께 봅니다." },
  { value: "aunt_uncle_niece_nephew", title: "삼촌·이모·고모·조카", description: "가까움과 역할 기대, 조언의 경계를 살펴봅니다." },
  { value: "cousins", title: "사촌", description: "정서적 거리, 비교와 교류의 리듬을 살펴봅니다." },
  { value: "in_laws", title: "인척", description: "예의와 거리, 연락과 관여의 경계를 살펴봅니다." },
  { value: "other_relatives", title: "기타 친족", description: "가족 안의 역할과 기대, 반복되는 소통 패턴을 살펴봅니다." },
];

function roleOptions(kind: FormState["relationshipKind"]): readonly { value: FamilyOtherRole; title: string }[] {
  switch (kind) {
    case "grandparent_grandchild": return [{ value: "grandparent", title: "조부모예요" }, { value: "grandchild", title: "손주예요" }];
    case "aunt_uncle_niece_nephew": return [{ value: "aunt_uncle", title: "삼촌·이모·고모 쪽이에요" }, { value: "niece_nephew", title: "조카 쪽이에요" }];
    case "cousins": return [{ value: "cousin", title: "사촌 관계예요" }];
    case "in_laws": return [{ value: "in_law", title: "인척 관계예요" }];
    case "other_relatives": return [{ value: "relative", title: "기타 친족 관계예요" }];
    default: return [];
  }
}

export default function PaidFamilyExtendedAnalysisClient({ mode, myProfileLabel, profileId }: {
  mode: Mode;
  myProfileLabel: string;
  profileId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const birthDate = buildBirthDate(form);
  const evaluationYear = getKoreaTodayParts().year;
  const product = mode === "siblings" ? COMPATIBILITY_FAMILY_SIBLING_PRODUCT : COMPATIBILITY_FAMILY_OTHER_PRODUCT;
  const productId = mode === "siblings" ? COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID : COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID;
  const sessionKey = mode === "siblings" ? COMPATIBILITY_FAMILY_SIBLING_SESSION_KEY : COMPATIBILITY_FAMILY_OTHER_SESSION_KEY;
  const roles = useMemo(() => roleOptions(form.relationshipKind), [form.relationshipKind]);
  const selectedRelationship = OTHER_RELATIONSHIPS.find((option) => option.value === form.relationshipKind);
  const effectiveRole = mode === "other_family" && roles.length === 1 ? roles[0].value : form.userRole;
  const canSubmit = Boolean(
    form.label.trim()
      && birthDate
      && form.gender
      && (!form.birthTimeKnown || form.birthTime)
      && (mode === "siblings" || (form.relationshipKind && effectiveRole)),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const familyMember = {
        label: form.label.trim(),
        birthDate,
        birthTimeKnown: form.birthTimeKnown,
        birthTime: form.birthTimeKnown ? form.birthTime : null,
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === "음력" ? form.isLeapMonth : false,
      };
      const payload = mode === "siblings"
        ? { familyMember }
        : { relationshipKind: form.relationshipKind, userRole: effectiveRole, familyMember };
      window.sessionStorage.setItem(sessionKey, JSON.stringify(payload));
      router.push(`/checkout/${productId}?profileId=${encodeURIComponent(profileId)}`);
    } catch {
      setError("결제 단계로 이동하기 위한 가족 정보를 임시로 보관하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[30px] border border-[#e4dac9] bg-white shadow-[0_18px_50px_rgba(87,72,48,0.08)]">
      <div className="bg-[linear-gradient(135deg,#f7f1e6_0%,#fffdf9_58%,#f8f3ea_100%)] px-6 py-8 sm:px-8 sm:py-9">
        <p className="text-[11px] font-bold tracking-[0.18em] text-stone-400">분석 기준</p>
        <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-stone-950">{myProfileLabel}님의 사주 <span className="font-medium text-stone-400">×</span> 가족 사주</p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          {mode === "siblings"
            ? "형제·자매의 정보를 입력해 주세요. 비교와 경쟁, 역할과 경계, 회복을 부모·자녀와 다른 기준으로 분석합니다."
            : "먼저 어떤 가족 관계인지와 내 역할을 선택한 뒤 상대 가족의 정보를 입력해 주세요. 관계 유형에 맞는 역할과 거리 기준으로 분석합니다."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#e4dac9] bg-white/75 px-3 py-1.5 text-xs font-semibold text-stone-700">{mode === "siblings" ? "형제·자매 관계" : "기타 가족 관계"}</span>
          <span className="rounded-full border border-[#e4dac9] bg-white/75 px-3 py-1.5 text-xs font-semibold text-stone-700">{evaluationYear}년판 · 구매 후 저장</span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {mode === "other_family" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold text-stone-800">어떤 가족 관계인가요?</span>
              <select
                value={form.relationshipKind}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  relationshipKind: event.target.value as FormState["relationshipKind"],
                  userRole: "",
                }))}
                required
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-stone-500"
              >
                <option value="" disabled>선택해 주세요</option>
                {OTHER_RELATIONSHIPS.map((option) => (
                  <option key={option.value} value={option.value}>{option.title}</option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {selectedRelationship?.description ?? "분석할 가족 관계를 선택해 주세요."}
              </p>
            </label>

            {roles.length > 0 ? (
              <label className="sm:col-span-2">
                <span className="text-sm font-semibold text-stone-800">나는 이 관계에서</span>
                <select
                  value={effectiveRole}
                  onChange={(event) => setForm((current) => ({ ...current, userRole: event.target.value as FamilyOtherRole }))}
                  required
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-stone-500"
                >
                  <option value="" disabled>선택해 주세요</option>
                  {roles.map((option) => (
                    <option key={option.value} value={option.value}>{option.title}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-stone-800">{mode === "siblings" ? "형제·자매" : "상대 가족"} 이름 또는 별칭</span>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} maxLength={40} required className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-100" placeholder={mode === "siblings" ? "예: 언니, 동생, 민지" : "예: 할머니, 조카, 사촌, 형님"} />
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
              <option value="">선택</option><option value="남성">남성</option><option value="여성">여성</option>
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-stone-800">달력 기준</span>
            <select value={form.calendarType} onChange={(event) => setForm((current) => ({ ...current, calendarType: event.target.value as FormState["calendarType"], isLeapMonth: false, birthDay: "" }))} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-sm outline-none focus:border-stone-500"><option value="양력">양력</option><option value="음력">음력</option></select>
          </label>

          {form.calendarType === "음력" ? <label className="flex items-center gap-2 self-end pb-4 text-sm text-stone-600"><input type="checkbox" checked={form.isLeapMonth} onChange={(event) => setForm((current) => ({ ...current, isLeapMonth: event.target.checked }))} />윤달이에요</label> : null}
        </div>

        <CompatibilityReportValuePreview
          mode={mode === "siblings" ? "siblings" : "other_family"}
          evaluationYear={evaluationYear}
          relationshipLabel={mode === "other_family" ? selectedRelationship?.title : null}
        />

        <div className="mt-5 rounded-2xl bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-600">
          상대방 정보는 결제 연결을 위해 현재 브라우저에만 잠시 보관됩니다. 주문에는 분석에 필요한 계산 정보만 보관하며, 결제가 완료되면 브라우저에 남아 있던 상대방 정보는 자동으로 삭제됩니다. 구매 리포트는 {evaluationYear}년판으로 고정 저장됩니다.
        </div>
        <p className="mt-3 text-xs leading-6 text-stone-500">본인·성인 인증이 아직 완료되지 않았다면 결제 화면에서 NICE 본인확인을 먼저 진행합니다.</p>

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-7 overflow-hidden rounded-3xl border border-[#e5dac8] bg-[linear-gradient(135deg,#fbf7ef_0%,#fffdf9_100%)] shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-stone-400">전문 궁합 리포트</p>
              <p className="mt-2 text-sm font-semibold text-stone-800">{mode === "siblings" ? "형제·자매" : "기타 가족"} 관계 분석을 결제 후 바로 생성합니다.</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">결제 완료 후 생성된 {evaluationYear}년판 결과는 구매한 분석에서 다시 볼 수 있습니다.</p>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-medium text-stone-500">결제 금액</p>
              <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-stone-950">{product.amount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={!canSubmit} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300">결제하고 궁합 분석하기</button>
        <p className="mt-3 text-center text-xs leading-5 text-stone-400">결제가 승인되면 분석 생성이 시작되고 구매한 분석에 보관됩니다.</p>
      </div>
    </form>
  );
}
