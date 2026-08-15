import { generateMainAnalysis } from "../app/lib/analysisAIService";

async function main() {
  const generation = await generateMainAnalysis("테스트 프롬프트");

  if (!generation.text || generation.text.trim().length === 0) {
    throw new Error("main analysis generation should return a non-empty text field");
  }

  if (generation.status !== "completed" && generation.status !== "failed") {
    throw new Error(`main analysis generation status must be "completed" or "failed", got ${generation.status}`);
  }

  console.log(`main analysis fallback regression passed (status: ${generation.status})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
