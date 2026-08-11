import { generateMainAnalysis } from "../app/lib/analysisAIService";

async function main() {
  const fallback = await generateMainAnalysis("테스트 프롬프트");

  if (!fallback || fallback.trim().length === 0) {
    throw new Error("main analysis fallback should return a non-empty string");
  }

  console.log("main analysis fallback regression passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
