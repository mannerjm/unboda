import { NextResponse } from "next/server";
import { guestAgeSelfAttestationError, hasGuestAgeSelfAttestation, validateGuestProfileInput } from "@/app/lib/guestFreeAnalyses/input";
import { createGuestAnalysisCredential, encodeGuestAnalysisCredential, guestAnalysisCookieOptions, hashGuestAnalysisSecret, GUEST_ANALYSIS_COOKIE_NAME } from "@/app/lib/guestFreeAnalyses/cookie";
import { createGuestFreeAnalysis } from "@/app/lib/guestFreeAnalyses/server";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!hasGuestAgeSelfAttestation(body)) {
      return NextResponse.json(guestAgeSelfAttestationError(), { status: 400 });
    }
    const validation = validateGuestProfileInput(body);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
    const seed = crypto.randomUUID();
    const credential = createGuestAnalysisCredential(seed);
    const record = await createGuestFreeAnalysis({ secretHash: hashGuestAnalysisSecret(credential.secret), profileInput: validation.value });
    const response = NextResponse.json({ status: "generating" }, { status: 201 });
    response.cookies.set(GUEST_ANALYSIS_COOKIE_NAME, encodeGuestAnalysisCredential({ ...credential, analysisId: record.id }), guestAnalysisCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "무료 분석을 시작하지 못했습니다." }, { status: 500 });
  }
}