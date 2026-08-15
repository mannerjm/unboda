import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_ANALYSIS_COOKIE_NAME, hashGuestAnalysisSecret, parseGuestAnalysisCredential } from "@/app/lib/guestFreeAnalyses/cookie";
import {
  getGuestFreeAnalysis,
  isUsableGuestFreeAnalysis,
  claimGuestMainAnalysisRetry,
  completeGuestMainAnalysisRetry,
} from "@/app/lib/guestFreeAnalyses/server";
import { regenerateMainAnalysis } from "@/app/lib/freeAnalysisPipeline/server";

export async function POST() {
  const cookieStore = await cookies();
  const credential = parseGuestAnalysisCredential(cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value);
  if (!credential) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });

  try {
    const record = await getGuestFreeAnalysis(credential.analysisId, hashGuestAnalysisSecret(credential.secret));
    if (!record || !isUsableGuestFreeAnalysis(record)) {
      return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });
    }

    if (record.content?.generationMeta?.mainAnalysisStatus !== "failed") {
      return NextResponse.json({ error: "다시 생성할 수 있는 상태가 아닙니다." }, { status: 409 });
    }

    const claimResult = await claimGuestMainAnalysisRetry(record);
    if (claimResult.state === "limit_exceeded") {
      return NextResponse.json(
        { error: "AI 해석 재시도 가능 횟수를 초과했습니다.", code: "RETRY_LIMIT_EXCEEDED" },
        { status: 429 },
      );
    }
    if (claimResult.state === "in_progress") {
      return NextResponse.json(
        { error: "이미 AI 해석을 다시 생성하는 중입니다.", code: "RETRY_IN_PROGRESS" },
        { status: 409 },
      );
    }
    const claimed = claimResult.record;

    let generation: { text: string; status: "completed" | "failed" };
    try {
      generation = await regenerateMainAnalysis({
        profile: claimed.content!.profile,
        freeAnalysis: claimed.content!.freeAnalysis,
      });
    } catch (error) {
      console.error("[guest-retry-main-analysis] generation failed", error);
      generation = { text: claimed.content!.result, status: "failed" };
    }

    const content = await completeGuestMainAnalysisRetry({
      record: claimed,
      result: generation.text,
      mainAnalysisStatus: generation.status,
    });

    return NextResponse.json({ result: content.result, generationMeta: content.generationMeta });
  } catch (error) {
    console.error("[guest-retry-main-analysis] failed", error);
    return NextResponse.json({ error: "AI 해석을 다시 생성하지 못했습니다." }, { status: 500 });
  }
}
