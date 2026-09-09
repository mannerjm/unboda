import "server-only";

import { createAdminClient } from "@/app/lib/supabase/admin";

const REQUIRED_ANSWER_HEADINGS = [
  "확인된 사용자 사실",
  "운보다 명리 해석",
  "AI 상담 해석",
  "지금 확인할 점",
] as const;

export const AI_CONSULTING_PRICING_REFERENCE = {
  checkedAt: "2026-09-09",
  note: "USD per 1M text tokens. Cached-input token counts are not persisted for AI consulting, so cost is an uncached upper-bound estimate.",
} as const;

type ModelPrice = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

const MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-5": { inputUsdPerMillion: 1.25, outputUsdPerMillion: 10 },
  "gpt-5.6-luna": { inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.2 },
  "gpt-5.6-terra": { inputUsdPerMillion: 2, outputUsdPerMillion: 12 },
  "gpt-5.6-sol": { inputUsdPerMillion: 4, outputUsdPerMillion: 20 },
  "gpt-5.6": { inputUsdPerMillion: 4, outputUsdPerMillion: 20 },
};

type AssistantRow = {
  id: string;
  thread_id: string;
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  reply_to_message_id: string | null;
};

type UserRow = {
  id: string;
  content: string;
  scope_decision: "ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT" | null;
  charged: boolean;
  created_at: string;
};

type ThreadRow = {
  id: string;
  base_product_id: string;
  analysis_edition_key: string;
};

export type AiConsultingQualitySample = {
  assistantMessageId: string;
  createdAt: string;
  productId: string | null;
  analysisEditionKey: string | null;
  questionPreview: string;
  answerPreview: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  formatPass: boolean;
  lengthPass: boolean;
  telemetryPass: boolean;
};

export type AiConsultingQualityCostReport = {
  generatedAt: string;
  sampleLimit: number;
  successfulAnswers: number;
  formatPassCount: number;
  telemetryCompleteCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedTotalCostUsd: number | null;
  estimatedAverageCostUsd: number | null;
  unknownPriceCount: number;
  scopeCounts: Record<"ALLOW" | "CLARIFY" | "DENY" | "SAFETY_REDIRECT", number>;
  recentUserQuestions: number;
  recentChargedQuestions: number;
  modelCounts: Record<string, number>;
  samples: AiConsultingQualitySample[];
};

function clip(value: string | null | undefined, maxChars: number): string {
  const text = (value ?? "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

function resolveModelPrice(model: string | null): ModelPrice | null {
  if (!model) return null;
  const normalized = model.trim().toLowerCase();
  if (MODEL_PRICES[normalized]) return MODEL_PRICES[normalized];
  if (normalized.startsWith("gpt-5-2025-")) return MODEL_PRICES["gpt-5"];
  if (normalized.startsWith("gpt-5.6-luna-")) return MODEL_PRICES["gpt-5.6-luna"];
  if (normalized.startsWith("gpt-5.6-terra-")) return MODEL_PRICES["gpt-5.6-terra"];
  if (normalized.startsWith("gpt-5.6-sol-")) return MODEL_PRICES["gpt-5.6-sol"];
  return null;
}

export function estimateAiConsultingCostUsd(input: {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}): number | null {
  const price = resolveModelPrice(input.model);
  if (!price || input.inputTokens === null || input.outputTokens === null) return null;
  if (input.inputTokens < 0 || input.outputTokens < 0) return null;

  return (
    (input.inputTokens / 1_000_000) * price.inputUsdPerMillion
    + (input.outputTokens / 1_000_000) * price.outputUsdPerMillion
  );
}

export function evaluateAiConsultingAnswerStructure(content: string): {
  formatPass: boolean;
  lengthPass: boolean;
} {
  const trimmed = content.trim();
  return {
    formatPass: REQUIRED_ANSWER_HEADINGS.every((heading) => trimmed.includes(heading)),
    lengthPass: trimmed.length >= 300 && trimmed.length <= 1_800,
  };
}

export async function getAiConsultingQualityCostReport(
  sampleLimit = 100,
): Promise<AiConsultingQualityCostReport> {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(sampleLimit)));
  const supabase = createAdminClient();

  const [assistantResult, userStatsResult] = await Promise.all([
    supabase
      .from("ai_consulting_messages")
      .select("id,thread_id,content,model,input_tokens,output_tokens,created_at,reply_to_message_id")
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("ai_consulting_messages")
      .select("id,content,scope_decision,charged,created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (assistantResult.error) {
    throw new Error(`AI_CONSULTING_QUALITY_ASSISTANT_READ_FAILED: ${assistantResult.error.message}`);
  }
  if (userStatsResult.error) {
    throw new Error(`AI_CONSULTING_QUALITY_USER_READ_FAILED: ${userStatsResult.error.message}`);
  }

  const assistantRows = (assistantResult.data ?? []) as AssistantRow[];
  const userStatsRows = (userStatsResult.data ?? []) as UserRow[];
  const replyIds = assistantRows
    .map((row) => row.reply_to_message_id)
    .filter((value): value is string => Boolean(value));
  const threadIds = [...new Set(assistantRows.map((row) => row.thread_id))];

  let questionRows: UserRow[] = [];
  if (replyIds.length > 0) {
    const { data, error } = await supabase
      .from("ai_consulting_messages")
      .select("id,content,scope_decision,charged,created_at")
      .in("id", replyIds);
    if (error) {
      throw new Error(`AI_CONSULTING_QUALITY_QUESTION_READ_FAILED: ${error.message}`);
    }
    questionRows = (data ?? []) as UserRow[];
  }

  let threadRows: ThreadRow[] = [];
  if (threadIds.length > 0) {
    const { data, error } = await supabase
      .from("ai_consulting_threads")
      .select("id,base_product_id,analysis_edition_key")
      .in("id", threadIds);
    if (error) {
      throw new Error(`AI_CONSULTING_QUALITY_THREAD_READ_FAILED: ${error.message}`);
    }
    threadRows = (data ?? []) as ThreadRow[];
  }

  const questionById = new Map(questionRows.map((row) => [row.id, row]));
  const threadById = new Map(threadRows.map((row) => [row.id, row]));

  const samples = assistantRows.map<AiConsultingQualitySample>((row) => {
    const structure = evaluateAiConsultingAnswerStructure(row.content);
    const question = row.reply_to_message_id ? questionById.get(row.reply_to_message_id) : undefined;
    const thread = threadById.get(row.thread_id);
    const telemetryPass = Boolean(
      row.model
      && row.input_tokens !== null
      && row.output_tokens !== null,
    );

    return {
      assistantMessageId: row.id,
      createdAt: row.created_at,
      productId: thread?.base_product_id ?? null,
      analysisEditionKey: thread?.analysis_edition_key ?? null,
      questionPreview: clip(question?.content, 220),
      answerPreview: clip(row.content, 700),
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      estimatedCostUsd: estimateAiConsultingCostUsd({
        model: row.model,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
      }),
      formatPass: structure.formatPass,
      lengthPass: structure.lengthPass,
      telemetryPass,
    };
  });

  const pricedSamples = samples.filter(
    (sample): sample is AiConsultingQualitySample & { estimatedCostUsd: number } =>
      sample.estimatedCostUsd !== null,
  );
  const estimatedTotalCostUsd = pricedSamples.length > 0
    ? pricedSamples.reduce((sum, sample) => sum + sample.estimatedCostUsd, 0)
    : null;

  const scopeCounts = {
    ALLOW: 0,
    CLARIFY: 0,
    DENY: 0,
    SAFETY_REDIRECT: 0,
  };
  for (const row of userStatsRows) {
    if (row.scope_decision && row.scope_decision in scopeCounts) {
      scopeCounts[row.scope_decision] += 1;
    }
  }

  const modelCounts: Record<string, number> = {};
  for (const sample of samples) {
    const key = sample.model?.trim() || "unknown";
    modelCounts[key] = (modelCounts[key] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    sampleLimit: safeLimit,
    successfulAnswers: samples.length,
    formatPassCount: samples.filter((sample) => sample.formatPass && sample.lengthPass).length,
    telemetryCompleteCount: samples.filter((sample) => sample.telemetryPass).length,
    totalInputTokens: samples.reduce((sum, sample) => sum + (sample.inputTokens ?? 0), 0),
    totalOutputTokens: samples.reduce((sum, sample) => sum + (sample.outputTokens ?? 0), 0),
    estimatedTotalCostUsd,
    estimatedAverageCostUsd: estimatedTotalCostUsd === null || pricedSamples.length === 0
      ? null
      : estimatedTotalCostUsd / pricedSamples.length,
    unknownPriceCount: samples.filter(
      (sample) => sample.telemetryPass && sample.estimatedCostUsd === null,
    ).length,
    scopeCounts,
    recentUserQuestions: userStatsRows.length,
    recentChargedQuestions: userStatsRows.filter((row) => row.charged).length,
    modelCounts,
    samples,
  };
}
