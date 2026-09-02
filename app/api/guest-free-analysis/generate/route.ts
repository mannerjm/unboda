import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_ANALYSIS_COOKIE_NAME, hashGuestAnalysisSecret, parseGuestAnalysisCredential } from "@/app/lib/guestFreeAnalyses/cookie";
import { completeGuestFreeAnalysis, failGuestFreeAnalysis, getGuestFreeAnalysis, isUsableGuestFreeAnalysis, toGuestAnalyzeProfile } from "@/app/lib/guestFreeAnalyses/server";
import { buildFreeAnalysisResponse } from "@/app/lib/freeAnalysisPipeline/server";

export async function POST() {
  const cookieStore = await cookies();
  const credential = parseGuestAnalysisCredential(cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value);
  if (!credential) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });
  const record = await getGuestFreeAnalysis(credential.analysisId, hashGuestAnalysisSecret(credential.secret));
  if (!record || !isUsableGuestFreeAnalysis(record)) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });
  if (record.status === "completed" && record.content) return NextResponse.json({ analysis: record.content });
  if (record.status !== "generating") return NextResponse.json({ error: "무료 분석을 다시 시작해 주세요." }, { status: 409 });
  if (!record.profileInput) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });
  try {
    const content = await buildFreeAnalysisResponse({ profile: toGuestAnalyzeProfile(record.profileInput, record.id) });
    await completeGuestFreeAnalysis(record, content);
    return NextResponse.json({ analysis: content });
  } catch (error) {
    await failGuestFreeAnalysis(record);
    return NextResponse.json({ error: error instanceof Error ? error.message : "무료 분석에 실패했습니다." }, { status: 500 });
  }
}