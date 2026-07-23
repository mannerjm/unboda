export function getAnalyzeErrorStatus(error: unknown): 500 | 502 {
  if (!(error instanceof Error)) {
    return 500;
  }

  const isOpenAIError =
    error.name.includes("OpenAI") ||
    error.message.includes("OpenAI") ||
    error.message.includes("API");

  return isOpenAIError ? 502 : 500;
}