"use client";

import { useEffect, useState } from "react";
import type { AccountLifecycleStatus, PaidEligibilityStatus } from "@/app/lib/accounts/server";

type Props = {
  accountStatus: AccountLifecycleStatus;
  emailVerified: boolean;
  eligibilityStatus: PaidEligibilityStatus;
};

type VerificationMessage = {
  type: "success" | "error" | "info";
  text: string;
} | null;

const allowedNiceHosts = new Set([
  "auth.niceid.co.kr",
  "nice.checkplus.co.kr",
  "cert.vno.co.kr",
  "cert.niceid.co.kr",
]);

export default function NiceAdultVerificationButton({
  accountStatus,
  emailVerified,
  eligibilityStatus,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<VerificationMessage>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; status?: string; message?: string } | null;
      if (!data || data.type !== "unboda:nice-verification") return;

      setSubmitting(false);
      if (data.status === "success") {
        setMessage({ type: "success", text: data.message || "본인/성인 인증이 완료되었습니다." });
        window.setTimeout(() => window.location.reload(), 500);
        return;
      }
      if (data.status === "underage") {
        setMessage({ type: "error", text: data.message || "만 19세 미만은 유료 서비스를 이용할 수 없습니다." });
        return;
      }
      if (data.status === "cancelled") {
        setMessage({ type: "info", text: data.message || "본인확인이 취소되었습니다." });
        return;
      }
      setMessage({ type: "error", text: data.message || "본인확인을 완료하지 못했습니다." });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (eligibilityStatus === "VERIFIED_ADULT") return null;

  const disabled = submitting || !emailVerified || accountStatus !== "ACTIVE";

  async function startVerification() {
    if (disabled) return;
    setSubmitting(true);
    setMessage(null);

    const popup = window.open(
      "about:blank",
      "unbodaNiceIdentity",
      "width=480,height=812,top=100,fullscreen=no,menubar=no,status=no,titlebar=yes,location=no,toolbar=no,scrollbars=yes",
    );

    if (!popup) {
      setSubmitting(false);
      setMessage({ type: "error", text: "팝업이 차단되었습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요." });
      return;
    }

    try {
      popup.document.title = "NICE 본인확인 준비 중";
      popup.document.body.innerHTML = "<p style='font-family:sans-serif;padding:24px'>본인확인 창을 준비하고 있습니다...</p>";

      const response = await fetch("/api/identity/nice/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      const json = (await response.json()) as { authUrl?: string; error?: string };
      if (!response.ok || typeof json.authUrl !== "string") {
        popup.close();
        setSubmitting(false);
        setMessage({ type: "error", text: json.error || "본인확인을 시작하지 못했습니다." });
        return;
      }

      const authUrl = new URL(json.authUrl);
      if (authUrl.protocol !== "https:" || !allowedNiceHosts.has(authUrl.hostname)) {
        popup.close();
        setSubmitting(false);
        setMessage({ type: "error", text: "본인확인 주소를 확인하지 못했습니다." });
        return;
      }

      popup.location.replace(authUrl.toString());
    } catch {
      popup.close();
      setSubmitting(false);
      setMessage({ type: "error", text: "본인확인 요청 중 오류가 발생했습니다." });
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void startVerification()}
        disabled={disabled}
        className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {submitting ? "본인확인 창 준비 중..." : eligibilityStatus === "REVOKED" ? "NICE 본인확인 다시 하기" : "NICE 휴대폰 본인확인"}
      </button>
      {!emailVerified && (
        <p className="mt-2 text-xs leading-5 text-amber-700">먼저 이메일 인증을 완료해 주세요.</p>
      )}
      {accountStatus !== "ACTIVE" && (
        <p className="mt-2 text-xs leading-5 text-amber-700">현재 계정 상태에서는 본인확인을 진행할 수 없습니다.</p>
      )}
      <p className="mt-2 text-xs leading-5 text-stone-500">
        NICE 휴대폰 본인확인 결과에서 만 19세 이상 여부만 판정하며, 성명·생년월일·휴대폰번호·CI/DI 등 원본 인증정보는 운보다 DB에 저장하지 않습니다.
      </p>
      {message && (
        <p className={`mt-3 text-xs leading-5 ${message.type === "success" ? "text-emerald-700" : message.type === "info" ? "text-stone-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
