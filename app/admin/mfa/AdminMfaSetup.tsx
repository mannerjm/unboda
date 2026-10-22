"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

type MfaState = "loading" | "enroll" | "enrolling" | "verify-enrollment" | "challenge" | "verified" | "error";
type Enrollment = { id: string; qr: string } | null;
const supabase = createClient();

export default function AdminMfaSetup() {
  const router = useRouter();
  const [step, setStep] = useState<MfaState>("loading");
  const [enrollment, setEnrollment] = useState<Enrollment>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const [aal, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    setMessage(null);
    if (aal.error || factors.error) {
      setStep("error");
      setMessage("인증 상태를 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.");
      return;
    }
    if (aal.data.currentLevel === "aal2" && aal.data.nextLevel === "aal2") {
      setStep("verified");
      return;
    }
    const verifiedFactor = factors.data.totp.find((f) => f.status === "verified");
    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
      setStep("challenge");
    } else {
      setStep("enroll");
    }
  }, []);

  useEffect(() => { void refreshState(); }, [refreshState]);

  async function startEnrollment() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setStep("enrolling");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "운보다 관리자 인증 앱",
      });
      if (error || !data?.totp?.qr_code) throw error ?? new Error("QR코드를 생성하지 못했습니다.");
      setEnrollment({ id: data.id, qr: data.totp.qr_code });
      setStep("verify-enrollment");
    } catch {
      setStep("enroll");
      setMessage("인증 앱 등록을 시작하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const id = step === "verify-enrollment" ? enrollment?.id : factorId;
    if (busy || !id || !/^\d{6}$/.test(code)) {
      setMessage("인증 앱에 표시된 숫자 6자리를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code });
      if (error) throw error;
      setCode("");
      setEnrollment(null);
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aal?.currentLevel !== "aal2" || aal?.nextLevel !== "aal2") {
        throw new Error("추가 인증 세션을 확인하지 못했습니다.");
      }
      setStep("verified");
      router.refresh();
    } catch {
      setMessage("인증에 실패했습니다. 인증 앱의 최신 6자리 코드를 확인해 다시 입력해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrollment() {
    if (enrollment?.id) {
      // Abort an unverified factor. Do not offer a one-click removal of a verified MFA factor.
      await supabase.auth.mfa.unenroll({ factorId: enrollment.id }).catch(() => null);
    }
    setEnrollment(null);
    setCode("");
    void refreshState();
  }

  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    {message && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
    {step === "loading" || step === "enrolling" ? <p className="text-sm">인증 상태를 확인하고 있습니다…</p> : null}
    {step === "error" ? <button type="button" onClick={() => void refreshState()} className="rounded-lg border px-4 py-2">다시 확인</button> : null}
    {step === "enroll" && <>
      <h2 className="font-bold">1. 인증 앱 등록</h2>
      <p className="mt-2 text-sm leading-6">Google Authenticator, Microsoft Authenticator 또는 호환 인증 앱을 준비한 뒤 아래 버튼을 누르세요.</p>
      <button disabled={busy} type="button" onClick={() => void startEnrollment()} className="mt-4 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">인증 앱 등록 시작</button>
    </>}
    {step === "verify-enrollment" && enrollment && <>
      <h2 className="font-bold">2. QR코드 스캔 및 등록 확인</h2>
      <p className="mt-2 text-sm leading-6">인증 앱의 계정 추가 기능으로 QR코드를 스캔한 뒤 표시되는 6자리 코드를 입력하세요. QR코드는 비밀 인증정보이므로 보관·공유하지 마세요.</p>
      {/* Supabase provides an in-session SVG QR data URI; never persist or log it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrollment.qr} width={200} height={200} alt="관리자 인증 앱 등록용 일회성 QR코드" className="mt-4 rounded-lg border p-2" />
    </>}
    {(step === "verify-enrollment" || step === "challenge") && <>
      {step === "challenge" && <>
        <h2 className="font-bold">인증 앱으로 추가 로그인</h2>
        <p className="mt-2 text-sm">이미 등록된 인증 앱에서 최신 6자리 코드를 확인하세요.</p>
      </>}
      <label htmlFor="admin-mfa-code" className="mt-5 block text-sm font-semibold">인증 앱 6자리 코드</label>
      <input id="admin-mfa-code" name="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
        value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 px-4 py-3 text-lg tracking-widest" />
      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={busy || code.length !== 6} type="button" onClick={() => void verifyCode()}
          className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">
          {busy ? "인증 확인 중..." : "인증번호 확인"}
        </button>
        {step === "verify-enrollment" && <button type="button" disabled={busy} onClick={() => void cancelEnrollment()}
          className="rounded-xl border border-slate-300 px-4 py-3">등록 취소</button>}
      </div>
    </>}
    {step === "verified" && <>
      <h2 className="font-bold text-emerald-700">인증 앱 확인 완료</h2>
      <p className="mt-2 text-sm leading-6">현재 로그인 세션이 추가 인증(AAL2)을 통과했습니다. 이 상태만으로 카드 환불 기능이 자동 활성화되지는 않습니다. 운영자의 별도 금융 실행 승인과 검증이 필요합니다.</p>
      <Link href="/admin/support" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-3 font-bold text-white">고객지원 환불 관리로 이동</Link>
    </>}
  </section>;
}
