import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  guestAnalysisCookieOptions,
  hashGuestAnalysisSecret,
  parseGuestAnalysisCredential,
  GUEST_ANALYSIS_COOKIE_NAME,
} from "@/app/lib/guestFreeAnalyses/cookie";
import {
  getGuestFreeAnalysis,
  isUsableGuestFreeAnalysis,
  transferGuestFreeAnalysisToUser,
} from "@/app/lib/guestFreeAnalyses/server";

function transferErrorStatus(message: string): number {
  if (message.includes("SELF_PROFILE_CONFLICT")) return 409;
  if (message.includes("GUEST_ANALYSIS_ALREADY_CONSUMED")) return 409;
  if (message.includes("GUEST_ANALYSIS_EXPIRED") || message.includes("GUEST_ANALYSIS_NOT_FOUND")) return 404;
  return 500;
}

// supabase.rpc() without throwOnError() resolves its error as a plain
// PostgREST error object (not an Error instance), so message/code must be
// read defensively instead of relying on `instanceof Error`.
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const cookieStore = await cookies();
  const credential = parseGuestAnalysisCredential(cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value);
  if (!credential) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });

  try {
    const record = await getGuestFreeAnalysis(credential.analysisId, hashGuestAnalysisSecret(credential.secret));
    if (!record || (!isUsableGuestFreeAnalysis(record) && record.transferredUserId !== user.id)) {
      return NextResponse.json({ error: "비회원 분석 결과를 이전할 수 없습니다." }, { status: 404 });
    }

    const transfer = await transferGuestFreeAnalysisToUser({ record, userId: user.id });
    const response = NextResponse.json(transfer);
    response.cookies.set(GUEST_ANALYSIS_COOKIE_NAME, "", { ...guestAnalysisCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    const message = extractErrorMessage(error, "비회원 분석 결과를 이전하지 못했습니다.");
    const status = transferErrorStatus(message);
    const errorCode = message.includes("SELF_PROFILE_CONFLICT")
      ? "SELF_PROFILE_CONFLICT"
      : undefined;
    return NextResponse.json({ error: message, code: errorCode }, { status });
  }
}