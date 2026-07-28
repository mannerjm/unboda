import { openAIClient } from "./openAIClient";

export async function generateAnalysisText(
  prompt: string
): Promise<string> {
  const response = await openAIClient.responses.create({
    model: "gpt-5",
    input: prompt,
  });

  return response.output_text;
}