import { NextResponse } from "next/server";
import {
  generatePaidAnalysisDetailV2,
} from "@/app/lib/paidAnalysisDetailService";
import type {
  PaidAnalysisDetailPromptInput,
} from "@/app/lib/paidAnalysisDetailPrompt";

export async function POST(request: Request) {
  const input =
    (await request.json()) as PaidAnalysisDetailPromptInput;

  const detail =
    await generatePaidAnalysisDetailV2(input);

  return NextResponse.json(detail);
}