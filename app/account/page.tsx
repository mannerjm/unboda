"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AccountLifecycleStatus, PaidEligibilityStatus } from "@/app/lib/accounts/server";

const statusLabels: Record<AccountLifecycleStatus, string> = {
  ACTIVE: "사용 중",
  DELETION_REQUESTED: "탈퇴 처리 중",
  CLOSED: "종료됨",
};

/**
 * Canonical labels for paid eligibility status.
 * IMPORTANT: These labels describe only the eligibility enrollment state, NOT account holder age.
 * - UNVERIFIED: Eligibility has not been confirmed (enrollment incomplete, no provider data collected).
 * - VERIFIED_ADULT: Adult eligibility has been verified (external provider confirmed).
 * - REVOKED: Eligibility has been revoked (provider revocation or account action).
 *
 * Profile birth date is NOT used here. Relationship=self is NOT identity proof.
 */
const eligibilityLabels: Record<PaidEligibilityStatus, string> = {
  UNVERIFIED: "확인 전",
  VERIFIED_ADULT: "유료 이용 가능",
  REVOKED: "확인 만료",
};

type AccountStatusResponse = {
  email: string;
  emailVerified: boolean;
  account: {
    generation: number;
    status: AccountLifecycleStatus;
    paidEligibilityStatus: PaidEligibilityStatus;
  };
};

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Email change state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Resend verification state
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account closure state
  const [showClosureConfirm, setShowClosureConfirm] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);
  const [closureMessage, setClosureMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadAccountStatus() {
    try {
      const res = await fetch("/api/account/status");
      if (res.status === 401) {
        router.push("/auth/login?returnTo=/account");
        return;
      }
      if (!res.ok) {
        throw new Error("계정 정보를 불러오지 못했습니다.");
      }
      const json: AccountStatusResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccountStatus();
  }, []);

  async function handleResendVerification() {
    setResendSubmitting(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/account/resend-verification", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setResendMessage({ type: "error", text: json.error || "발송 실패" });
      } else {
        setResendMessage({ type: "success", text: json.message });
      }
    } catch {
      setResendMessage({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setResendSubmitting(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSubmitting(true);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEmailMessage({ type: "error", text: json.error || "변경 실패" });
      } else {
        setEmailMessage({ type: "success", text: json.message });
        setNewEmail("");
      }
    } catch {
      setEmailMessage({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSubmitting(true);
    setPasswordMessage(null);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: json.error || "변경 실패" });
      } else {
        setPasswordMessage({ type: "success", text: json.message });
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleRequestClosure() {
    setClosureSubmitting(true);
    setClosureMessage(null);
    try {
      const res = await fetch("/api/account/request-closure", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setClosureMessage({ type: "error", text: json.error || "요청 실패" });
      } else {
        setClosureMessage({ type: "success", text: json.message });
        setShowClosureConfirm(false);
        await loadAccountStatus();
      }
    } catch {
      setClosureMessage({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setClosureSubmitting(false);
    }
  }

  async function handleCancelClosure() {
    setClosureSubmitting(true);
    setClosureMessage(null);
    try {
      const res = await fetch("/api/account/cancel-closure", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setClosureMessage({ type: "error", text: json.error || "취소 실패" });
      } else {
        setClosureMessage({ type: "success", text: json.message });
        await loadAccountStatus();
      }
    } catch {
      setClosureMessage({ type: "error", text: "요청 중 오류가 발생했습니다." });
    } finally {
      setClosureSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:py-16">
        <div className="mx-auto w-full max-w-xl text-center">
          <p className="text-sm font-semibold text-stone-600">계정 정보를 불러오는 중입니다...</p>
        </div>
      </main>
    );
  }

  if (fetchError || !data) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:py-16">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-sm text-red-600">{fetchError || "계정 정보를 불러올 수 없습니다."}</p>
          <Link href="/mypage" className="mt-4 inline-block text-sm font-semibold text-stone-600">마이페이지로 돌아가기</Link>
        </div>
      </main>
    );
  }

  const { email, emailVerified, account } = data;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-stone-900 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/mypage" className="text-sm font-semibold text-stone-600">마이페이지로 돌아가기</Link>
        <p className="mt-10 text-xs font-semibold tracking-[0.25em] text-stone-500">ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-bold">계정 정보</h1>

        <section className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {/* 로그인 이메일 & 이메일 변경 */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500">로그인 이메일</p>
              <button
                type="button"
                onClick={() => { setShowEmailChange(!showEmailChange); setEmailMessage(null); }}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
              >
                {showEmailChange ? "취소" : "이메일 변경"}
              </button>
            </div>
            <p className="mt-2 break-all text-sm font-semibold">{email}</p>

            {showEmailChange && (
              <form onSubmit={(e) => void handleChangeEmail(e)} className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4 border border-stone-200">
                <label htmlFor="newEmailInput" className="block text-xs font-semibold text-stone-700">
                  새 이메일 주소
                </label>
                <input
                  id="newEmailInput"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new-email@example.com"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal outline-none focus:border-stone-900"
                  required
                />
                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white disabled:bg-stone-400"
                >
                  {emailSubmitting ? "요청 중..." : "이메일 변경 확인 메일 발송"}
                </button>
                {emailMessage && (
                  <p className={`text-xs ${emailMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {emailMessage.text}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* 이메일 인증 */}
          <div className="border-t border-stone-100 pt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-stone-600">이메일 인증</span>
              <span className="text-sm font-semibold">{emailVerified ? "인증됨" : "인증 필요"}</span>
            </div>
            {!emailVerified && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void handleResendVerification()}
                  disabled={resendSubmitting}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:bg-stone-100"
                >
                  {resendSubmitting ? "발송 중..." : "인증메일 재전송"}
                </button>
                {resendMessage && (
                  <p className={`mt-2 text-xs ${resendMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {resendMessage.text}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 계정 상태 */}
          <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-5">
            <span className="text-sm text-stone-600">계정 상태</span>
            <span className="text-sm font-semibold">{statusLabels[account.status]}</span>
          </div>

          {/* 유료 이용 자격 */}
          <div className="flex items-center justify-between gap-4 border-t border-stone-100 pt-5">
            <span className="text-sm text-stone-600">유료 이용 자격</span>
            <span className="text-sm font-semibold">{eligibilityLabels[account.paidEligibilityStatus]}</span>
          </div>

          {/* 비밀번호 변경 */}
          <div className="border-t border-stone-100 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">비밀번호 변경</span>
              <button
                type="button"
                onClick={() => { setShowPasswordChange(!showPasswordChange); setPasswordMessage(null); }}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
              >
                {showPasswordChange ? "닫기" : "비밀번호 변경하기"}
              </button>
            </div>

            {showPasswordChange ? (
              <form onSubmit={(e) => void handleChangePassword(e)} className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4 border border-stone-200">
                <div>
                  <label htmlFor="newPasswordInput" className="block text-xs font-semibold text-stone-700">
                    새 비밀번호 (8자 이상)
                  </label>
                  <input
                    id="newPasswordInput"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPasswordInput" className="block text-xs font-semibold text-stone-700">
                    비밀번호 확인
                  </label>
                  <input
                    id="confirmPasswordInput"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white disabled:bg-stone-400"
                >
                  {passwordSubmitting ? "변경 중..." : "비밀번호 변경"}
                </button>
                {passwordMessage && (
                  <p className={`text-xs ${passwordMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {passwordMessage.text}
                  </p>
                )}
              </form>
            ) : (
              <div className="mt-2 text-right">
                <Link href="/auth/forgot-password?returnTo=/account" className="text-xs text-stone-500 hover:underline">
                  비밀번호가 기억나지 않으신가요? (재설정 이메일 보내기)
                </Link>
              </div>
            )}
          </div>

          {/* 회원탈퇴 요청 / 취소 */}
          <div className="border-t border-stone-100 pt-5">
            {account.status === "ACTIVE" ? (
              <div>
                {!showClosureConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClosureConfirm(true)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    회원탈퇴 요청하기
                  </button>
                ) : (
                  <div className="rounded-2xl bg-red-50 p-4 border border-red-200 space-y-3">
                    <p className="text-xs font-semibold text-red-900">회원탈퇴 요청 안내</p>
                    <p className="text-xs leading-5 text-red-700">
                      탈퇴를 요청하시면 계정이 &apos;탈퇴 처리 중&apos; 상태로 전환되며 새 유료 결제가 제한됩니다.
                      진행 중인 환불이나 결제 확인 건이 없어야 탈퇴 요청이 접수됩니다.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleRequestClosure()}
                        disabled={closureSubmitting}
                        className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-400"
                      >
                        {closureSubmitting ? "처리 중..." : "네, 탈퇴 요청합니다"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClosureConfirm(false)}
                        className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : account.status === "DELETION_REQUESTED" ? (
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 space-y-3">
                <p className="text-xs font-semibold text-amber-900">현재 회원탈퇴 요청 처리 중입니다.</p>
                <p className="text-xs leading-5 text-amber-800">
                  탈퇴 요청 취소를 원하시면 아래 버튼을 누르면 계정이 다시 활성화됩니다.
                </p>
                <button
                  type="button"
                  onClick={() => void handleCancelClosure()}
                  disabled={closureSubmitting}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:bg-amber-400"
                >
                  {closureSubmitting ? "처리 중..." : "회원탈퇴 요청 취소하기"}
                </button>
              </div>
            ) : null}

            {closureMessage && (
              <p className={`mt-3 text-xs ${closureMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {closureMessage.text}
              </p>
            )}
          </div>
        </section>

        <p className="mt-5 text-xs leading-6 text-stone-500">
          성인 본인확인은 별도 외부 인증 연동 이후 제공됩니다. 프로필의 출생 정보는 계정 자격을 대신하지 않습니다.
        </p>
      </div>
    </main>
  );
}
