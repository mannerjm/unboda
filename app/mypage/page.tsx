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

type FreeAnalysisResultStatus = "none" | "generating" | "completed" | "failed" | "stale";

const freeAnalysisStatusLabels: Record<FreeAnalysisResultStatus, string> = {
  none: "무료 분석 없음",
  generating: "분석 생성 중",
  completed: "무료 분석 완료",
  failed: "분석 실패",
  stale: "재분석 필요",
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

const paidReportStatusLabels: Record<PaidReportStatus, string> = {
  none: "아직 생성되지 않음",
  generating: "생성 중",
  completed: "분석 완료",
  failed: "생성 실패",
};

// "none"/"failed" start a real generation, so they must never read as a plain view action.
const paidReportActionLabels: Record<PaidReportStatus, string> = {
  none: "심층 분석 생성하기",
  generating: "생성 중",
  completed: "리포트 보기",
  failed: "다시 생성하기",
};

type SummaryBody = {
  freeAnalysisResults?: Array<{ profileId: string; status: FreeAnalysisResultStatus }>;
  profileDeletability?: Array<{ profileId: string; deletable: boolean; reason?: ProfileDeleteReason }>;
  paidAnalysis?: PaidAnalysisSummary[];
};

type ProfileDeletabilityState = { deletable: boolean; reason?: ProfileDeleteReason };

export default function MyPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileDto[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [freeAnalysisStatusById, setFreeAnalysisStatusById] = useState<Record<string, FreeAnalysisResultStatus>>({});
  const [deletabilityById, setDeletabilityById] = useState<Record<string, ProfileDeletabilityState>>({});
  const [paidAnalysisByProfileId, setPaidAnalysisByProfileId] = useState<Record<string, PaidAnalysisSummary[]>>({});
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
      .catch(() => setMessage("로그인 상태를 확인한 뒤 다시 시도해 주세요."));
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
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">MY PROFILE</p>
        <h1 className="mt-3 text-3xl font-bold">사주 분석 대상</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">여기서 선택한 사람을 기준으로 무료 사주와 유료 심층분석이 진행됩니다.</p>
        <button
          type="button"
          onClick={openCreateForm}
          className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          인원 추가
        </button>
        {isFormOpen ? (
          <form
            className="mt-4 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => { event.preventDefault(); void submitForm(); }}
          >
            <p className="text-base font-bold">{editingProfileId ? "프로필 수정" : "인원 추가"}</p>
            <label className="block text-sm font-semibold">이름 또는 구분
              <input value={formInput.label} onChange={(event) => setFormInput({ ...formInput, label: event.target.value })} placeholder="이름 또는 구분" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
            </label>
            <label className="block text-sm font-semibold">관계
              <select value={formInput.relationshipType} onChange={(event) => setFormInput({ ...formInput, relationshipType: event.target.value as ProfileRelationshipType })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required>
                {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">생년월일
                <input type="date" min={GUEST_BIRTH_DATE_MIN} max={getGuestBirthDateMax()} value={formInput.birthDate} onChange={(event) => setFormInput({ ...formInput, birthDate: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
              </label>
              <label className="block text-sm font-semibold">태어난 시간
                <input type="time" value={formInput.birthTime} onChange={(event) => setFormInput({ ...formInput, birthTime: event.target.value })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">성별
                <select value={formInput.gender} onChange={(event) => setFormInput({ ...formInput, gender: event.target.value as ProfileInput["gender"] })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">달력
                <select value={formInput.calendarType} onChange={(event) => setFormInput({ ...formInput, calendarType: event.target.value as ProfileInput["calendarType"], isLeapMonth: event.target.value === "양력" ? false : formInput.isLeapMonth })} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" required>
                  <option value="양력">양력</option>
                  <option value="음력">음력</option>
                </select>
              </label>
            </div>
            {formInput.calendarType === "음력" ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formInput.isLeapMonth} onChange={(event) => setFormInput({ ...formInput, isLeapMonth: event.target.checked })} /> 윤달
              </label>
            ) : null}
            {editingProfileId ? (
              <p className="text-xs leading-6 text-stone-500">
                출생 정보가 변경되면 기존 무료 분석은 다시 분석이 필요할 수 있습니다.
                이미 구매한 심층 분석이 있다면 기존 리포트 내용과 새 출생 정보가 달라질 수 있습니다.
              </p>
            ) : null}
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" disabled={isSubmittingForm} className="flex-1 rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400">
                {isSubmittingForm ? "저장 중..." : editingProfileId ? "수정 저장" : "등록하기"}
              </button>
              <button type="button" onClick={closeForm} disabled={isSubmittingForm} className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed">
                취소
              </button>
            </div>
          </form>
        ) : null}
        <div className="mt-8 grid max-h-96 gap-3 overflow-y-auto pr-1">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={(event) => selectFromCardClick(event, profile.id)}
              className={profile.id === activeProfileId
                ? "border border-stone-900 bg-stone-900 p-5 text-left text-white"
                : "cursor-pointer border border-stone-200 bg-white p-5 text-left"}
            >
              <button
                type="button"
                onClick={() => void activate(profile.id)}
                className="block w-full text-left"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold">{profile.label}</span>
                  {profile.id === activeProfileId ? (
                    <span className="border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white">현재 선택</span>
                  ) : null}
                </span>
                <span className={profile.id === activeProfileId
                  ? "mt-1 block text-sm text-white/75"
                  : "mt-1 block text-sm text-stone-500"}
                >
                  {relationshipLabels[profile.relationshipType]}
                </span>
                <span className={profile.id === activeProfileId
                  ? "mt-2 block text-sm text-white/75"
                  : "mt-2 block text-sm text-stone-500"}
                >
                  {formatProfileDetails(profile)}
                </span>
              </button>
              <span className={profile.id === activeProfileId
                ? "mt-3 block text-xs text-white/60"
                : "mt-3 block text-xs text-stone-400"}
              >
                {formatFreeAnalysisStatusLabel(freeAnalysisStatusById[profile.id])}
              </span>
              {(paidAnalysisByProfileId[profile.id] ?? []).length > 0 ? (
                <div className={profile.id === activeProfileId
                  ? "mt-3 border-t border-white/20 pt-3"
                  : "mt-3 border-t border-stone-200 pt-3"}
                >
                  <p className={profile.id === activeProfileId
                    ? "text-xs font-semibold text-white/80"
                    : "text-xs font-semibold text-stone-600"}
                  >
                    구매한 심층 분석
                  </p>
                  <ul className="mt-2 space-y-2">
                    {(paidAnalysisByProfileId[profile.id] ?? []).map((item) => (
                      <li key={item.productId} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm">
                          <span className="font-semibold">{item.productName}</span>
                          <span className={profile.id === activeProfileId
                            ? "ml-2 text-xs text-white/70"
                            : "ml-2 text-xs text-stone-500"}
                          >
                            {paidReportStatusLabels[item.reportStatus]}
                          </span>
                        </span>
                        {item.reportStatus === "generating" ? (
                          <button
                            type="button"
                            disabled
                            className={profile.id === activeProfileId
                              ? "rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/50"
                              : "rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-400"}
                          >
                            {paidReportActionLabels[item.reportStatus]}
                          </button>
                        ) : (
                          <Link
                            href={`/paid-analysis/${item.productId}/report?profileId=${profile.id}`}
                            className={profile.id === activeProfileId
                              ? "rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                              : "rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"}
                          >
                            {paidReportActionLabels[item.reportStatus]}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(profile)}
                  className={profile.id === activeProfileId
                    ? "rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                    : "rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"}
                >
                  수정
                </button>
                {profile.id === activeProfileId ? (
                  <button
                    type="button"
                    onClick={() => void clearActiveSelection()}
                    disabled={isClearingActiveProfile}
                    className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClearingActiveProfile ? "해제 중..." : "분석 대상 선택 해제"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => { setMessage(null); setPendingDeleteProfileId(profile.id); }}
                  disabled={deletabilityById[profile.id]?.deletable === false}
                  className={profile.id === activeProfileId
                    ? "rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    : "rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"}
                >
                  삭제
                </button>
              </div>
              {getDeleteBlockMessage(profile.id) ? (
                <p className={profile.id === activeProfileId
                  ? "mt-2 text-xs leading-5 text-white/70"
                  : "mt-2 text-xs leading-5 text-stone-500"}
                >
                  {getDeleteBlockMessage(profile.id)}
                </p>
              ) : null}
              {pendingDeleteProfileId === profile.id ? (
                <div className={profile.id === activeProfileId
                  ? "mt-3 border border-white/30 bg-white/10 p-3"
                  : "mt-3 border border-red-200 bg-red-50 p-3"}
                >
                  <p className={profile.id === activeProfileId
                    ? "text-xs leading-6 text-white"
                    : "text-xs leading-6 text-red-800"}
                  >
                    프로필을 삭제하면 저장된 무료 분석 결과도 함께 삭제되며 복구할 수 없습니다.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteProfile(profile.id)}
                      disabled={isDeletingProfile}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                      {isDeletingProfile ? "삭제 중..." : "삭제 확인"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteProfileId(null)}
                      disabled={isDeletingProfile}
                      className={profile.id === activeProfileId
                        ? "rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed"
                        : "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed"}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeProfileId && freeAnalysisStatusById[activeProfileId] === "completed") {
              router.push(`/result?profileId=${activeProfileId}`);
              return;
            }
            router.push("/saju");
          }}
          disabled={!activeProfileId}
          className="mt-6 w-full rounded-xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {activeProfileId && freeAnalysisStatusById[activeProfileId] === "completed"
            ? "선택한 프로필의 무료 분석 결과 보기"
            : activeProfileId && freeAnalysisStatusById[activeProfileId] === "stale"
              ? "변경된 출생 정보로 다시 분석하기"
              : "선택한 프로필로 사주 조회하기"}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={isSigningOut}
          className="mt-4 w-full text-center text-sm text-stone-400 underline-offset-4 transition hover:text-stone-600 hover:underline disabled:cursor-not-allowed disabled:text-stone-300"
        >
          {isSigningOut ? "로그아웃 중..." : "로그아웃"}
        </button>
        {message ? <p className="mt-4 text-sm text-red-600">{message}</p> : null}
      </div>
    </main>
  );
}
