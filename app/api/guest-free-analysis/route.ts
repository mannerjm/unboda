import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateGuestProfileInput } from "@/app/lib/guestFreeAnalyses/input";
import { getAnalyzeErrorStatus } from "@/app/lib/getAnalyzeErrorStatus";
import { buildFreeAnalysisResponse } from "@/app/lib/freeAnalysisPipeline/server";
import {
  createGuestAnalysisCredential,
  encodeGuestAnalysisCredential,
  guestAnalysisCookieOptions,
  hashGuestAnalysisSecret,
  parseGuestAnalysisCredential,
  GUEST_ANALYSIS_COOKIE_NAME,
} from "@/app/lib/guestFreeAnalyses/cookie";
import {
  completeGuestFreeAnalysis,
  createGuestFreeAnalysis,
  failGuestFreeAnalysis,
  getGuestFreeAnalysis,
  isUsableGuestFreeAnalysis,
  toGuestAnalyzeProfile,
} from "@/app/lib/guestFreeAnalyses/server";

function clearGuestCookie(response: NextResponse): NextResponse {
  response.cookies.set(GUEST_ANALYSIS_COOKIE_NAME, "", { ...guestAnalysisCookieOptions, maxAge: 0 });
  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  const credential = parseGuestAnalysisCredential(cookieStore.get(GUEST_ANALYSIS_COOKIE_NAME)?.value);
  if (!credential) return NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 });

  try {
    const record = await getGuestFreeAnalysis(credential.analysisId, hashGuestAnalysisSecret(credential.secret));
    if (!record || !isUsableGuestFreeAnalysis(record) || record.status !== "completed" || !record.content) {
      return clearGuestCookie(NextResponse.json({ error: "비회원 분석 결과를 찾을 수 없습니다." }, { status: 404 }));
    }

    return NextResponse.json({ analysis: record.content });
  } catch (error) {
    console.error("[guest-free-analysis] get failed", error);
    return NextResponse.json({ error: "비회원 분석 결과를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let record: Awaited<ReturnType<typeof createGuestFreeAnalysis>> | null = null;

  try {
    const body: unknown = await request.json();
    const validation = validateGuestProfileInput(body);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

    const seed = crypto.randomUUID();
    const credential = createGuestAnalysisCredential(seed);
    record = await createGuestFreeAnalysis({
      secretHash: hashGuestAnalysisSecret(credential.secret),
      profileInput: validation.value,
    });
    const content = await buildFreeAnalysisResponse({
      profile: toGuestAnalyzeProfile(validation.value, record.id),
    });
    await completeGuestFreeAnalysis(record, content);

    const response = NextResponse.json({ analysis: content }, { status: 201 });
    response.cookies.set(
      GUEST_ANALYSIS_COOKIE_NAME,
      encodeGuestAnalysisCredential({ ...credential, analysisId: record.id }),
      guestAnalysisCookieOptions,
    );
    return response;
  } catch (error) {
    if (record) {
      try { await failGuestFreeAnalysis(record); } catch (persistError) {
        console.error("[guest-free-analysis] fail status update failed", persistError);
      }
    }
    console.error("[guest-free-analysis] create failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "비회원 무료 분석에 실패했습니다." },
      { status: getAnalyzeErrorStatus(error) },
    );
  }
}