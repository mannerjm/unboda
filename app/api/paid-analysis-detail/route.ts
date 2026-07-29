import { NextResponse } from "next/server";
import { generatePaidAnalysisDetail } from "@/app/lib/paidAnalysisDetailService";
import type { PaidAnalysisDetailPromptInput } from "@/app/lib/paidAnalysisDetailPrompt";

export async function POST(request: Request) {
  const input =
    (await request.json()) as PaidAnalysisDetailPromptInput;

  const detail = await generatePaidAnalysisDetail(input);
  
  return NextResponse.json(detail);
}