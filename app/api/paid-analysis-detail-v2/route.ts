import { NextResponse } from "next/server";
import {
  generatePaidAnalysisDetailV2,
} from "@/app/lib/paidAnalysisDetailService";
import type {
  PaidAnalysisDetailPromptInput,
} from "@/app/lib/paidAnalysisDetailPrompt";

export async function POST(request: Request) {
  try {
    const input =
      (await request.json()) as PaidAnalysisDetailPromptInput;

    const detail =
      await generatePaidAnalysisDetailV2(input);

    return NextResponse.json(detail);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "심층 분석 생성 중 알 수 없는 오류가 발생했습니다.";

    console.error("[paid-analysis-detail-v2] route error", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}