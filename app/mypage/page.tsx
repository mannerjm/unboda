"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ProfileDeleteReason,
  ProfileDto,
  ProfileInput,
  ProfileRelationshipType,
} from "@/app/lib/profiles/types";
import { profileDeleteBlockMessages } from "@/app/lib/profiles/types";
import { createClient } from "@/app/lib/supabase/client";
import { GUEST_BIRTH_DATE_MIN, getGuestBirthDateMax } from "@/app/lib/guestFreeAnalyses/date";
import AppShell from "@/app/components/AppShell";

function formatProfileBirthDate(birthDate: string): string {
  return birthDate.replace(/-/g, ".");
}

const relationshipLabels: Record<ProfileDto["relationshipType"], string> = {
  self: "본인",
  spouse: "배우자",
  child: "자녀",
  parent: "부모",
  sibling: "형제자매",
  other: "기타",
};

function formatProfileDetails(profile: ProfileDto): string {
  const leapMonthSuffix = profile.calendarType === "음력" && profile.isLeapMonth ? " · 윤달" : "";
  return `${formatProfileBirthDate(profile.birthDate)} · ${profile.birthTime} · ${profile.gender} · ${profile.calendarType}${leapMonthSuffix}`;
}

type FreeAnalysisResultStatus = "none" | "generating" | "completed" | "failed" | "stale" | "needs_retry";

const freeAnalysisStatusLabels: Record<FreeAnalysisResultStatus, string> = {
  none: "무료 분석 없음",
  generating: "분석 생성 중",
  completed: "무료 분석 완료",
  failed: "분석 실패",
  stale: "재분석 필요",
  needs_retry: "AI 해석 재생성 필요",
};

function formatFreeAnalysisStatusLabel(status: FreeAnalysisResultStatus | undefined): string {
  return status ? freeAnalysisStatusLabels[status] : "무료 분석 없음";
}

const relationshipOptions: Array<{ value: ProfileRelationshipType; label: string }> = [
  { value: "self", label: "본인" },
  { value: "spouse", label: "배우자" },
  { value: "child", label: "자녀" },
  { value: "parent", label: "부모" },
  { value: "sibling", label: "형제자매" },
  { value: "other", label: "기타" },
];

const emptyProfileInput: ProfileInput = {
  label: "",
  relationshipType: "other",
  birthDate: "",
  birthTime: "12:00",
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
};

type PaidReportStatus = "none" | "generating" | "completed" | "failed";

type PaidAnalysisSummary = {
  profileId: string;
  productId: string;
  productName: string;
  reportStatus: PaidReportStatus;
};

type RefundSummary = {
  orderId: string;
  status: "REFUND_REQUESTED" | "REFUND_PROCESSING" | "REFUND_FAILED_RETRYING" | "REFUND_COMPLETED" | "OWNER_REVIEW_REQUIRED";
  customerMessage: string;
  requestedAt: string;
  completedAt: string | null;
};

type PurchaseHistoryItem = {
  purchaseId: string;
  orderId: string;
  profileId: string;
  productId: string;
  productName: string;
  categoryLabel: string;
  purchasedAt: string;
  amount: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "failed" | "canceled";
  refund: RefundSummary | null;
};

const paidReportStatusLabels: Record<PaidReportStatus, string> = {
  none: "분석 준비 중",
  generating: "분석 준비 중",
  completed: "분석 완료",
  failed: "생성 실패",
};

const paidReportActionLabels: Record<PaidReportStatus, string> = {
  none: "분석을 준비하고 있어요",
  generating: "분석을 준비하고 있어요",
  completed: "리포트 보기",
  failed: "다시 준비하기",
};

const paymentStatusLabels: Record<PurchaseHistoryItem["paymentStatus"], string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  canceled: "결제 취소",
};

const refundStatusLabels: Record<RefundSummary["status"], string> = {
  REFUND_REQUESTED: "환불 요청 접수",
  REFUND_PROCESSING: "환불 처리 중",
  REFUND_FAILED_RETRYING: "환불 재처리 중",
  REFUND_COMPLETED: "환불 완료",
  OWNER_REVIEW_REQUIRED: "담당자 확인 중",
};

type StatusTone = "neutral" | "positive" | "warning" | "critical";

const freeAnalysisStatusTones: Record<FreeAnalysisResultStatus, StatusTone> = {
  none: "neutral",
  generating: "neutral",
  completed: "positive",
  failed: "critical",
  stale: "warning",
  needs_retry: "warning",
};

const freeAnalysisStatusHints: Partial<Record<FreeAnalysisResultStatus, string>> = {
  stale: "출생 정보가 바뀌어 저장된 결과를 열 수 없습니다. 변경된 정보로 다시 분석해 주세요.",
  failed: "분석이 완료되지 않았습니다. 다시 분석해 주세요.",
  needs_retry: "사주·오행·대운·추천 결과는 그대로 저장되어 있습니다. 결과 화면에서 AI 종합 해석만 다시 생성하면 됩니다.",
};

const paidReportStatusTones: Record<PaidReportStatus, StatusTone> = {
  none: "neutral",
  generating: "neutral",
  completed: "positive",
  failed: "critical",
};

const statusToneClasses: Record<StatusTone, string> = {
  neutral: "border-stone-200 bg-stone-50 text-stone-600",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const activeFocusRing = `${focusRing} focus-visible:ring-white focus-visible:ring-offset-stone-900`;
const restingFocusRing = `${focusRing} focus-visible:ring-stone-900 focus-visible:ring-offset-[#f7f3ea]`;

// The active card is charcoal, so tone colors would drop below contrast on it.
function statusBadgeClass(isActive: boolean, tone: StatusTone): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
    isActive ? "border-[#cdbb98] bg-[#f3eee4] text-stone-800" : statusToneClasses[tone]
  }`;
}

function cardActionClass(isActive: boolean): string {
  return isActive
    ? `rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 ${restingFocusRing}`
    : `rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 ${restingFocusRing}`;
}

function deleteActionClass(isActive: boolean): string {
  return isActive
    ? `rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${restingFocusRing}`
    : `rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 ${restingFocusRing}`;
}

function subCardClass(isActive: boolean): string {
  return isActive
    ? "mt-5 rounded-2xl border border-[#dfd3bd] bg-[#fbf7ef] p-4"
    : "mt-5 rounded-2xl border border-stone-200 bg-stone-50/60 p-4";
}

type SummaryBody = {
  freeAnalysisResults?: Array<{ profileId: string; status: FreeAnalysisResultStatus }>;
  profileDeletability?: Array<{ profileId: string; deletable: boolean; reason?: ProfileDeleteReason }>;
  paidAnalysis?: PaidAnalysisSummary[];
  purchaseHistory?: PurchaseHistoryItem[];
};

type ProfileDeletabilityState = { deletable: boolean; reason?: ProfileDeleteReason };

type AccountStatus = {
  email: string;
  emailVerified: boolean;
  account: {
    status: "ACTIVE" | "DELETION_REQUESTED" | "CLOSED";
    paidEligibilityStatus: "UNVERIFIED" | "VERIFIED_ADULT" | "REVOKED";
  };
};

const accountLifecycleLabels: Record<AccountStatus["account"]["status"], string> = {
  ACTIVE: "사용 중",
  DELETION_REQUESTED: "탈퇴 처리 중",
  CLOSED: "종료됨",
};

const paidEligibilityLabels: Record<AccountStatus["account"]["paidEligibilityStatus"], string> = {
  UNVERIFIED: "인증 전",
  VERIFIED_ADULT: "인증 완료 · 유료 이용 가능",
  REVOKED: "재확인 필요",
};

export default function MyPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [isProfilesLoaded, setIsProfilesLoaded] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [freeAnalysisStatusById, setFreeAnalysisStatusById] = useState<Record<string, FreeAnalysisResultStatus>>({});
  const [deletabilityById, setDeletabilityById] = useState<Record<string, ProfileDeletabilityState>>({});
  const [paidAnalysisByProfileId, setPaidAnalysisByProfileId] = useState<Record<string, PaidAnalysisSummary[]>>({});
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [pendingDeleteProfileId, setPendingDeleteProfileId] = useState<string | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isClearingActiveProfile, setIsClearingActiveProfile] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [formInput, setFormInput] = useState<ProfileInput>(emptyProfileInput);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const confirmedActiveProfileIdRef = useRef<string | null>(null);
  const pendingActiveProfileIdRef = useRef<string | null>(null);
  const isPersistingActiveProfileRef = useRef(false);

  useEffect(() => {
    void Promise.all([fetch("/api/profiles"), fetch("/api/profiles/active")])
      .then(async ([profilesResponse, activeResponse]) => {
        const profilesBody = await profilesResponse.json() as { profiles?: ProfileDto[] };
        const activeBody = await activeResponse.json() as { profile?: ProfileDto | null };

        if (!profilesResponse.ok || !activeResponse.ok) {
          throw new Error("프로필 정보를 불러오지 못했습니다.");
        }

        setProfiles(profilesBody.profiles ?? []);
        setActiveProfileId(activeBody.profile?.id ?? null);
        confirmedActiveProfileIdRef.current = activeBody.profile?.id ?? null;
      })
      .catch(() => setMessage("로그인 상태를 확인한 뒤 다시 시도해 주세요."))
      .finally(() => setIsProfilesLoaded(true));
  }, []);

  useEffect(() => {
    void fetch("/api/account/status")
      .then(async (response) => {
        if (!response.ok) return;
        setAccountStatus(await response.json() as AccountStatus);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void fetch("/api/mypage/summary")
      .then(async (response) => {
        const body = await response.json() as SummaryBody;
        if (!response.ok) return;
        applySummaryBody(body);
      })
      .catch(() => {});
  }, []);

  function applySummaryBody(body: SummaryBody) {
    const statusById: Record<string, FreeAnalysisResultStatus> = {};
    for (const item of body.freeAnalysisResults ?? []) statusById[item.profileId] = item.status;
    setFreeAnalysisStatusById(statusById);

    const deletableById: Record<string, ProfileDeletabilityState> = {};
    for (const item of body.profileDeletability ?? []) {
      deletableById[item.profileId] = { deletable: item.deletable, reason: item.reason };
    }
    setDeletabilityById(deletableById);

    const paidByProfileId: Record<string, PaidAnalysisSummary[]> = {};
    for (const item of body.paidAnalysis ?? []) {
      (paidByProfileId[item.profileId] ??= []).push(item);
    }
    setPaidAnalysisByProfileId(paidByProfileId);
    setPurchaseHistory(body.purchaseHistory ?? []);
  }

  function formatPurchaseDate(value: string): string {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeZone: "Asia/Seoul",
    }).format(new Date(value));
  }

  function formatPurchaseAmount(amount: number, currency: string): string {
    return `${amount.toLocaleString("ko-KR")} ${currency}`;
  }

  function activate(profileId: string) {
    if (profileId === activeProfileId) return;

    // Every click updates the UI immediately and is never blocked by an in-flight PUT.
    setActiveProfileId(profileId);
    setMessage(null);
    pendingActiveProfileIdRef.current = profileId;
    void persistPendingActiveProfile();
  }

  // Mouse users may click anywhere on the card; the header button stays the
  // keyboard control, so nothing here is nested inside another interactive element.
  function selectFromCardClick(event: MouseEvent<HTMLDivElement>, profileId: string) {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.closest("button, a, input, select, textarea")) return;
    activate(profileId);
  }

  // Serializes PUT /api/profiles/active: only one request runs at a time. Clicks that
  // happen while a request is in flight update pendingActiveProfileIdRef and are picked
  // up by this same call once it finishes, skipping any intermediate selections.
  async function persistPendingActiveProfile() {
    if (isPersistingActiveProfileRef.current) return;

    const profileId = pendingActiveProfileIdRef.current;
    if (profileId === null || profileId === confirmedActiveProfileIdRef.current) return;

    isPersistingActiveProfileRef.current = true;
    try {
      const response = await fetch("/api/profiles/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });

      if (response.ok) {
        confirmedActiveProfileIdRef.current = profileId;
      } else if (pendingActiveProfileIdRef.current === profileId) {
        // Still the user's latest desired selection: surface the failure and roll back.
        pendingActiveProfileIdRef.current = confirmedActiveProfileIdRef.current;
        setActiveProfileId(confirmedActiveProfileIdRef.current);
        setMessage("활성 프로필을 변경하지 못했습니다.");
      }
    } catch {
      if (pendingActiveProfileIdRef.current === profileId) {
        pendingActiveProfileIdRef.current = confirmedActiveProfileIdRef.current;
        setActiveProfileId(confirmedActiveProfileIdRef.current);
        setMessage("활성 프로필을 변경하지 못했습니다.");
      }
    } finally {
      isPersistingActiveProfileRef.current = false;
      if (pendingActiveProfileIdRef.current !== confirmedActiveProfileIdRef.current) {
        void persistPendingActiveProfile();
      }
    }
  }

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setMessage("로그아웃하지 못했습니다. 다시 시도해 주세요.");
      setIsSigningOut(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function reloadMypageData() {
    const [profilesResponse, activeResponse, summaryResponse] = await Promise.all([
      fetch("/api/profiles"),
      fetch("/api/profiles/active"),
      fetch("/api/mypage/summary"),
    ]);

    const profilesBody = await profilesResponse.json() as { profiles?: ProfileDto[] };
    const activeBody = await activeResponse.json() as { profile?: ProfileDto | null };
    const summaryBody = await summaryResponse.json() as SummaryBody;

    if (profilesResponse.ok) setProfiles(profilesBody.profiles ?? []);
    if (activeResponse.ok) setActiveProfileId(activeBody.profile?.id ?? null);
    if (summaryResponse.ok) applySummaryBody(summaryBody);
  }

  // The summary flag is only a hint; the server re-checks every rule on DELETE.
  async function deleteProfile(profileId: string) {
    if (isDeletingProfile) return;
    setIsDeletingProfile(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });

      if (response.status !== 204) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setMessage(body.error ?? "프로필을 삭제하지 못했습니다.");
      }

      setPendingDeleteProfileId(null);
      await reloadMypageData();
    } catch {
      setMessage("프로필을 삭제하지 못했습니다.");
    } finally {
      setIsDeletingProfile(false);
    }
  }

  function getDeleteBlockMessage(profileId: string): string | null {
    const state = deletabilityById[profileId];
    return state && !state.deletable && state.reason ? profileDeleteBlockMessages[state.reason] : null;
  }

  async function clearActiveSelection() {
    if (isClearingActiveProfile) return;
    setIsClearingActiveProfile(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profiles/active", { method: "DELETE" });

      if (response.status !== 204) {
        setMessage("분석 대상 선택을 해제하지 못했습니다.");
        return;
      }

      setActiveProfileId(null);
      confirmedActiveProfileIdRef.current = null;
      pendingActiveProfileIdRef.current = null;
      await reloadMypageData();
    } catch {
      setMessage("분석 대상 선택을 해제하지 못했습니다.");
    } finally {
      setIsClearingActiveProfile(false);
    }
  }

  function openCreateForm() {
    setEditingProfileId(null);
    setFormInput(emptyProfileInput);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(profile: ProfileDto) {
    setEditingProfileId(profile.id);
    setFormInput({
      label: profile.label,
      relationshipType: profile.relationshipType,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      gender: profile.gender,
      calendarType: profile.calendarType,
      isLeapMonth: profile.isLeapMonth,
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingProfileId(null);
    setFormInput(emptyProfileInput);
    setFormError(null);
  }

  async function submitForm() {
    setIsSubmittingForm(true);
    setFormError(null);
    const fallback = editingProfileId
      ? "프로필을 수정하지 못했습니다. 다시 시도해 주세요."
      : "프로필을 등록하지 못했습니다. 다시 시도해 주세요.";

    try {
      const response = await fetch(
        editingProfileId ? `/api/profiles/${editingProfileId}` : "/api/profiles",
        {
          method: editingProfileId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formInput),
        },
      );
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? fallback);

      closeForm();
      await reloadMypageData();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : fallback);
    } finally {
      setIsSubmittingForm(false);
    }
  }

  return (
    <AppShell activeProfileId={activeProfileId}>
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">MY PAGE</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">마이페이지</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">계정 상태와 분석 대상을 관리하고, 저장하거나 구매한 분석을 확인하세요.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={openCreateForm}
                className={`rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 ${restingFocusRing}`}
              >
                인원 추가
              </button>
              {profiles.length > 0 ? (
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500">
                  {profiles.length}명 등록
                </span>
              ) : null}
            </div>
          </header>
          <section className="mt-8 border-y border-stone-200 py-6" aria-labelledby="account-status-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">ACCOUNT STATUS</p>
                <h2 id="account-status-heading" className="mt-2 text-xl font-bold text-stone-900">계정 상태</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">계정 인증 상태는 분석 대상 프로필의 출생 정보와 별개로 관리됩니다.</p>
              </div>
              <Link href="/account" className={`shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-stone-700 transition hover:bg-stone-50 ${restingFocusRing}`}>
                계정 설정에서 확인하기
              </Link>
            </div>
            {accountStatus ? (
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="min-w-0 border-t border-stone-100 pt-3 sm:border-t-0 sm:border-r sm:pr-4 sm:pt-0">
                  <dt className="text-xs font-semibold text-stone-500">로그인 이메일</dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-stone-800">{accountStatus.email}</dd>
                </div>
                <div className="border-t border-stone-100 pt-3 sm:border-t-0 sm:border-r sm:px-4 sm:pt-0">
                  <dt className="text-xs font-semibold text-stone-500">이메일 인증</dt>
                  <dd className="mt-1 text-sm font-semibold text-stone-800">{accountStatus.emailVerified ? "인증됨" : "인증 필요"}</dd>
                </div>
                <div className="border-t border-stone-100 pt-3 sm:border-t-0 sm:pl-4 sm:pt-0">
                  <dt className="text-xs font-semibold text-stone-500">본인/성인 인증</dt>
                  <dd className="mt-1 text-sm font-semibold text-stone-800">{paidEligibilityLabels[accountStatus.account.paidEligibilityStatus]}</dd>
                </div>
              </dl>
            ) : null}
          </section>
          <section className="mt-8" aria-labelledby="library-heading">
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">MY LIBRARY</p>
            <h2 id="library-heading" className="mt-2 text-xl font-bold text-stone-900">내 보관함</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/interests" className={`rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:bg-stone-50 ${restingFocusRing}`}>
                <p className="text-base font-semibold text-stone-900">관심 분석</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">저장한 분석 주제와 현재 회차 상태를 확인합니다.</p>
              </Link>
              <Link href="/purchased-analyses" className={`rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:bg-stone-50 ${restingFocusRing}`}>
                <p className="text-base font-semibold text-stone-900">구매한 분석</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">보유한 분석과 이전 회차 리포트를 확인합니다.</p>
              </Link>
            </div>
          </section>
        {isFormOpen ? (
          <form
            className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            onSubmit={(event) => { event.preventDefault(); void submitForm(); }}
          >
            <p className="text-base font-bold">{editingProfileId ? "프로필 수정" : "인원 추가"}</p>
            <label className="block text-sm font-semibold">이름 또는 구분
              <input value={formInput.label} onChange={(event) => setFormInput({ ...formInput, label: event.target.value })} placeholder="이름 또는 구분" className={`mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal ${restingFocusRing}`} required />
            </label>
            <label className="block text-sm font-semibold">관계
              <select value={formInput.relationshipType} onChange={(event) => setFormInput({ ...formInput, relationshipType: event.target.value as ProfileRelationshipType })} className={`mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal ${restingFocusRing}`} required>
                {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">생년월일
                <input type="date" min={GUEST_BIRTH_DATE_MIN} max={getGuestBirthDateMax()} value={formInput.birthDate} onChange={(event) => setFormInput({ ...formInput, birthDate: event.target.value })} className={`mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal ${restingFocusRing}`} required />
              </label>
              <label className="block text-sm font-semibold">태어난 시간
                <input type="time" value={formInput.birthTime} onChange={(event) => setFormInput({ ...formInput, birthTime: event.target.value })} className={`mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal ${restingFocusRing}`} required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">성별
                <select value={formInput.gender} onChange={(event) => setFormInput({ ...formInput, gender: event.target.value as ProfileInput["gender"] })} className={`mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal ${restingFocusRing}`} required>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">달력
                <select value={formInput.calendarType} onChange={(event) => setFormInput({ ...formInput, calendarType: event.target.value as ProfileInput["calendarType"], isLeapMonth: event.target.value === "양력" ? false : formInput.isLeapMonth })} className={`mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal ${restingFocusRing}`} required>
                  <option value="양력">양력</option>
                  <option value="음력">음력</option>
                </select>
              </label>
            </div>
            {formInput.calendarType === "음력" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formInput.isLeapMonth} onChange={(event) => setFormInput({ ...formInput, isLeapMonth: event.target.checked })} className={restingFocusRing} /> 윤달
              </label>
            ) : null}
            {editingProfileId ? (
              <p className="rounded-xl bg-stone-50 px-4 py-3 text-xs leading-6 text-stone-500">
                출생 정보가 변경되면 기존 무료 분석은 다시 분석이 필요할 수 있습니다.
                이미 구매한 심층 분석이 있다면 기존 리포트 내용과 새 출생 정보가 달라질 수 있습니다.
              </p>
            ) : null}
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={isSubmittingForm} className={`flex-1 rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 ${restingFocusRing}`}>
                {isSubmittingForm ? "저장 중..." : editingProfileId ? "수정 저장" : "등록하기"}
              </button>
              <button type="button" onClick={closeForm} disabled={isSubmittingForm} className={`rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed ${restingFocusRing}`}>
                취소
              </button>
            </div>
          </form>
        ) : null}
        {isProfilesLoaded && profiles.length === 0 && !isFormOpen ? (
          <section className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white/70 p-8 text-center">
            <p className="text-base font-bold">아직 등록된 분석 대상이 없습니다</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              본인이나 가족의 출생 정보를 등록하면 무료 사주와 심층 분석을 이어서 볼 수 있습니다.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className={`mt-6 rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 ${restingFocusRing}`}
            >
              첫 분석 대상 추가
            </button>
          </section>
        ) : null}
        <section className="mt-10" aria-labelledby="profile-management-heading">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PROFILE MANAGEMENT</p>
          <h2 id="profile-management-heading" className="mt-2 text-xl font-bold text-stone-900">프로필 관리</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">프로필은 분석 대상이며 계정 본인 인증과 별개입니다.</p>
        <div className="mt-5">
          {profiles.length > 0 ? <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-stone-500">내 프로필 및 이용 가능한 분석</p> : null}
          <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={(event) => selectFromCardClick(event, profile.id)}
              className={profile.id === activeProfileId
                ? "rounded-2xl border border-[#cdbb98] bg-[#fffdf8] p-4 text-left text-stone-900 shadow-sm sm:p-5"
                : "cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-stone-300 hover:shadow-md sm:p-5"}
            >
              <button
                type="button"
                onClick={() => void activate(profile.id)}
                className={profile.id === activeProfileId
                  ? `block w-full rounded-2xl text-left ${activeFocusRing}`
                  : `block w-full rounded-2xl text-left ${restingFocusRing}`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-bold">{profile.label}</span>
                  {profile.id === activeProfileId ? (
                    <span className="rounded-full border border-[#cdbb98] bg-[#f3eee4] px-3 py-1 text-xs font-semibold text-stone-800">현재 분석 대상</span>
                  ) : null}
                </span>
                <span className={profile.id === activeProfileId
                  ? "mt-1.5 block text-sm text-stone-600"
                  : "mt-1.5 block text-sm text-stone-500"}
                >
                  {relationshipLabels[profile.relationshipType]}
                </span>
                <span className={profile.id === activeProfileId
                  ? "mt-0.5 block text-sm text-stone-600"
                  : "mt-0.5 block text-sm text-stone-500"}
                >
                  {formatProfileDetails(profile)}
                </span>
              </button>
              <div className={profile.id === activeProfileId
                ? "mt-3 rounded-xl border border-[#dfd3bd] bg-[#fbf7ef] px-3 py-2.5"
                : "mt-3 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5"}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={profile.id === activeProfileId
                    ? "text-xs font-semibold tracking-[0.14em] text-stone-500"
                    : "text-xs font-semibold tracking-[0.14em] text-stone-500"}
                  >
                    무료 사주
                  </p>
                  <span className={statusBadgeClass(
                    profile.id === activeProfileId,
                    freeAnalysisStatusTones[freeAnalysisStatusById[profile.id] ?? "none"],
                  )}
                  >
                    {formatFreeAnalysisStatusLabel(freeAnalysisStatusById[profile.id])}
                  </span>
                </div>
                {freeAnalysisStatusHints[freeAnalysisStatusById[profile.id] ?? "none"] ? (
                  <p className={profile.id === activeProfileId
                    ? "mt-1.5 text-xs leading-5 text-stone-500"
                    : "mt-1.5 text-xs leading-5 text-stone-500"}
                  >
                    {freeAnalysisStatusHints[freeAnalysisStatusById[profile.id] ?? "none"]}
                  </p>
                ) : null}
              </div>
              <div className={profile.id === activeProfileId
                ? "mt-2 rounded-xl border border-[#dfd3bd] bg-[#fbf7ef] px-3 py-2.5"
                : "mt-2 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5"}
              >
                  <p className={profile.id === activeProfileId
                    ? "text-xs font-semibold tracking-[0.14em] text-stone-500"
                    : "text-xs font-semibold tracking-[0.14em] text-stone-500"}
                  >
                    구매한 심층 분석
                  </p>
                  {(paidAnalysisByProfileId[profile.id] ?? []).length > 0 ? (
                    <ul className="mt-2 divide-y divide-stone-200">
                      {(paidAnalysisByProfileId[profile.id] ?? []).map((item) => (
                      <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.productName}</span>
                          <span className={`mt-1.5 ${statusBadgeClass(profile.id === activeProfileId, paidReportStatusTones[item.reportStatus])}`}>
                            {paidReportStatusLabels[item.reportStatus]}
                          </span>
                        </span>
                        {item.reportStatus === "none" || item.reportStatus === "generating" ? (
                          <button
                            type="button"
                            disabled
                            className={profile.id === activeProfileId
                              ? "shrink-0 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/50"
                              : "shrink-0 rounded-full border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-400"}
                          >
                            {paidReportActionLabels[item.reportStatus]}
                          </button>
                        ) : (
                          <Link
                            href={`/paid-analysis/${item.productId}/report?profileId=${profile.id}`}
                            className={profile.id === activeProfileId
                              ? `shrink-0 ${cardActionClass(true)}`
                              : `shrink-0 ${cardActionClass(false)}`}
                          >
                            {paidReportActionLabels[item.reportStatus]}
                          </Link>
                        )}
                      </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">아직 구매한 심층 분석이 없습니다.</p>
                  )}
                </div>
              <div className={profile.id === activeProfileId
                ? "mt-3 flex flex-wrap gap-2 border-t border-stone-200 pt-3"
                : "mt-3 flex flex-wrap gap-2 border-t border-stone-200 pt-3"}
              >
                {profile.id === activeProfileId ? (
                  <button
                    type="button"
                    onClick={() => void clearActiveSelection()}
                    disabled={isClearingActiveProfile}
                    className={cardActionClass(true)}
                  >
                    {isClearingActiveProfile ? "해제 중..." : "분석 대상 선택 해제"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEditForm(profile)}
                  className={cardActionClass(profile.id === activeProfileId)}
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => { setMessage(null); setPendingDeleteProfileId(profile.id); }}
                  disabled={deletabilityById[profile.id]?.deletable === false}
                  className={deleteActionClass(profile.id === activeProfileId)}
                >
                  삭제
                </button>
              </div>
              {getDeleteBlockMessage(profile.id) ? (
                <p className={profile.id === activeProfileId
                  ? "mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500"
                  : "mt-3 rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500"}
                >
                  {getDeleteBlockMessage(profile.id)}
                </p>
              ) : null}
              {pendingDeleteProfileId === profile.id ? (
                <div className={profile.id === activeProfileId
                  ? "mt-3 rounded-2xl border border-[#dfd3bd] bg-[#fbf7ef] p-4"
                  : "mt-3 rounded-2xl border border-red-200 bg-red-50 p-4"}
                >
                  <p className={profile.id === activeProfileId
                    ? "text-xs leading-6 text-stone-700"
                    : "text-xs leading-6 text-red-800"}
                  >
                    프로필을 삭제하면 저장된 무료 분석 결과도 함께 삭제되며 복구할 수 없습니다.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteProfile(profile.id)}
                      disabled={isDeletingProfile}
                      className={`rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-400 ${restingFocusRing}`}
                    >
                      {isDeletingProfile ? "삭제 중..." : "삭제 확인"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteProfileId(null)}
                      disabled={isDeletingProfile}
                      className={cardActionClass(profile.id === activeProfileId)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          </div>
          {profiles.length > 0 ? (
            <section className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="selected-profile-action-heading">
              <div>
                <p id="selected-profile-action-heading" className="text-sm font-semibold text-stone-900">선택한 프로필로 분석 이어가기</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {activeProfileId
                    ? "현재 분석 대상의 무료 사주 결과를 확인하거나 새로 분석할 수 있습니다."
                    : "먼저 위에서 분석 대상을 선택해 주세요."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const status = activeProfileId ? freeAnalysisStatusById[activeProfileId] : undefined;

                  if (activeProfileId && (status === "completed" || status === "needs_retry")) {
                    router.push(`/result?profileId=${activeProfileId}`);
                    return;
                  }
                  router.push("/saju");
                }}
                disabled={!activeProfileId}
                className={`w-full shrink-0 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto ${restingFocusRing}`}
              >
                {activeProfileId && freeAnalysisStatusById[activeProfileId] === "completed"
                  ? "선택한 프로필의 무료 분석 결과 보기"
                  : activeProfileId && freeAnalysisStatusById[activeProfileId] === "needs_retry"
                    ? "저장된 결과 열고 AI 해석 다시 생성하기"
                    : activeProfileId && freeAnalysisStatusById[activeProfileId] === "stale"
                      ? "변경된 출생 정보로 다시 분석하기"
                      : "선택한 프로필로 사주 조회하기"}
              </button>
            </section>
          ) : null}
        </div>
        </section>
        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7" aria-labelledby="payment-history-heading">
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">PAYMENT HISTORY</p>
            <h2 id="payment-history-heading" className="mt-2 text-2xl font-bold text-stone-900">결제 내역</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">구매한 분석은 보관함에서, 결제와 환불 기록은 여기에서 확인합니다.</p>
            {purchaseHistory.length > 0 ? (
            <ul className="mt-5 divide-y divide-stone-200">
              {purchaseHistory.map((item) => {
                const profile = profiles.find((candidate) => candidate.id === item.profileId);
                return (
                  <li key={item.purchaseId} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900">{item.productName}</p>
                        <p className="mt-1 text-xs text-stone-500">{item.categoryLabel} · 분석 대상: {profile?.label ?? "등록된 프로필"}</p>
                        <p className="mt-2 text-sm text-stone-600">{formatPurchaseDate(item.purchasedAt)} · {formatPurchaseAmount(item.amount, item.currency)}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">{paymentStatusLabels[item.paymentStatus]}</span>
                        {item.refund ? <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${item.refund.status === "REFUND_COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : item.refund.status === "OWNER_REVIEW_REQUIRED" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-50 text-stone-600"}`}>{refundStatusLabels[item.refund.status]}</span> : null}
                      </div>
                    </div>
                    {item.refund ? <p className="mt-2 text-xs leading-5 text-stone-500">{item.refund.customerMessage}</p> : null}
                  </li>
                );
              })}
            </ul>
            ) : <p className="mt-5 border-t border-stone-100 pt-5 text-sm leading-6 text-stone-500">아직 결제 또는 환불 내역이 없습니다.</p>}
        </section>
        {message ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
        <section className="mt-10 border-t border-stone-200 pt-6" aria-labelledby="account-management-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">ACCOUNT MANAGEMENT</p>
              <h2 id="account-management-heading" className="mt-2 text-xl font-bold text-stone-900">계정 관리</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">이메일, 비밀번호, 회원탈퇴 같은 민감한 설정은 계정 관리에서 변경합니다.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href="/account" className={`rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 ${restingFocusRing}`}>계정 관리</Link>
              <button type="button" onClick={() => void signOut()} disabled={isSigningOut} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-stone-500 underline-offset-4 transition hover:text-stone-700 hover:underline disabled:cursor-not-allowed disabled:text-stone-300 ${restingFocusRing}`}>
                {isSigningOut ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          </div>
        </section>
      </div>
      </main>
    </AppShell>
  );
}
