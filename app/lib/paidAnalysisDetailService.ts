import { generateAnalysisText } from "./ai/generateAnalysisText";
import type {
  PaidAnalysisDetailOutput,
  PaidAnalysisDetailOutputV2,
} from "./paidAnalysisDetailOutput";
import {
  parsePaidAnalysisDetailOutput,
  parsePaidAnalysisDetailOutputV2,
} from "./paidAnalysisDetailOutputParser";
import {
  buildPaidAnalysisDetailPrompt,
  buildPaidAnalysisDetailPromptV2,
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

function parseGeneratedPaidAnalysisDetailV2(
  value: unknown,
): PaidAnalysisDetailOutputV2 {
  const parsedValue =
    typeof value === "string"
      ? JSON.parse(value)
      : value;

  return parsePaidAnalysisDetailOutputV2(parsedValue);
}

export async function generatePaidAnalysisDetail(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutput> {
  const prompt = buildPaidAnalysisDetailPrompt(input);

  const responseText = await generateAnalysisText(prompt);

  return parseGeneratedPaidAnalysisDetail(responseText);
}

export async function generatePaidAnalysisDetailV2(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutputV2> {
 const prompt = buildPaidAnalysisDetailPromptV2(input);

  const responseText = await generateAnalysisText(prompt);

  return parseGeneratedPaidAnalysisDetailV2(responseText);
}