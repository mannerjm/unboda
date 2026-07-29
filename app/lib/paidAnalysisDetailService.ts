import { generateAnalysisText } from "./ai/generateAnalysisText";
import type { PaidAnalysisDetailOutput } from "./paidAnalysisDetailOutput";
import { parsePaidAnalysisDetailOutput } from "./paidAnalysisDetailOutputParser";
import {
  buildPaidAnalysisDetailPrompt,
  type PaidAnalysisDetailPromptInput,
} from "./paidAnalysisDetailPrompt";

function parseGeneratedPaidAnalysisDetail(
  value: unknown,
): PaidAnalysisDetailOutput {
  const parsedValue =
    typeof value === "string"
      ? JSON.parse(value)
      : value;

  return parsePaidAnalysisDetailOutput(parsedValue);
}


export async function generatePaidAnalysisDetail(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutput> {
  const prompt = buildPaidAnalysisDetailPrompt(input);

  const responseText = await generateAnalysisText(prompt);

  return parseGeneratedPaidAnalysisDetail(responseText);
}