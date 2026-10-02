import "server-only";

import { getAiConsultingPresentation } from "../aiConsultingPresentation";
import { listUserPaidAnalysisSummaries } from "../paidReports/server";
import { createAdminClient } from "../supabase/admin";
import type { AiConsultingMemoryKind } from "../aiConsultingDataModel";

export type MyUnbodaMemory = {
  id: string;
  kind: Extract<AiConsultingMemoryKind, "user_fact" | "life_event" | "goal" | "preference">;
  content: string;
  status: "active" | "superseded";
  supersedesMemoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MyUnbodaTimelineItem = {
  id: string;
  type: "memory" | "memory_update" | "report" | "consultation";
  occurredAt: string;
  label: string;
  title: string;
  description: string;
  href: string | null;
};

export type MyUnbodaJourney = {
  currentMemories: MyUnbodaMemory[];
  activeMemoryCount: number;
  completedReportCount: number;
  consultationCount: number;
  timeline: MyUnbodaTimelineItem[];
};

type MemoryRow = {
  id: string;
  kind: MyUnbodaMemory["kind"];
  content: string;
  status: "active" | "superseded";
  supersedes_memory_id: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadRow = {
  id: string;
  base_product_id: string;
  analysis_edition_key: string;
  created_at: string;
  updated_at: string;
};

const MEMORY_LABELS: Record<MyUnbodaMemory["kind"], string> = {
  user_fact: "현재 상황",
  life_event: "최근 변화",
  goal: "목표",
  preference: "내 기준",
};

export async function getMyUnbodaJourney(input: {
  userId: string;
  profileId: string;
}): Promise<MyUnbodaJourney> {
  const client = createAdminClient();
  const [paidSummaries, memoriesResult, threadsResult] = await Promise.all([
    listUserPaidAnalysisSummaries(input.userId),
    client
      .from("ai_consulting_memories")
      .select("id,kind,content,status,supersedes_memory_id,created_at,updated_at")
      .eq("user_id", input.userId)
      .eq("profile_id", input.profileId)
      .eq("provenance", "USER_STATED")
      .in("status", ["active", "superseded"])
      .order("created_at", { ascending: true }),
    client
      .from("ai_consulting_threads")
      .select("id,base_product_id,analysis_edition_key,created_at,updated_at")
      .eq("user_id", input.userId)
      .eq("profile_id", input.profileId)
      .order("updated_at", { ascending: false }),
  ]);

  if (memoriesResult.error) {
    throw new Error(`MY_UNBODA_MEMORY_HISTORY_FAILED: ${memoriesResult.error.message}`);
  }
  if (threadsResult.error) {
    throw new Error(`MY_UNBODA_CONSULTATION_HISTORY_FAILED: ${threadsResult.error.message}`);
  }

  const memories = (memoriesResult.data ?? []) as MemoryRow[];
  const currentMemories = memories
    .filter((memory) => memory.status === "active")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((memory) => ({
      id: memory.id,
      kind: memory.kind,
      content: memory.content,
      status: memory.status,
      supersedesMemoryId: memory.supersedes_memory_id,
      createdAt: memory.created_at,
      updatedAt: memory.updated_at,
    }));

  const reportItems: MyUnbodaTimelineItem[] = paidSummaries
    .filter((summary) => summary.profileId === input.profileId && summary.reportStatus === "completed")
    .map((summary) => ({
      id: `report:${summary.productId}:${summary.analysisEditionKey ?? "legacy"}:${summary.acquiredAt}`,
      type: "report",
      occurredAt: summary.acquiredAt,
      label: "구매 리포트",
      title: summary.productName,
      description: "구매한 분석이 나의 운보다 기록에 추가됐어요.",
      href: summary.analysisEditionKey
        ? `/paid-analysis/${encodeURIComponent(summary.productId)}/report?edition=${encodeURIComponent(summary.analysisEditionKey)}`
        : null,
    }));

  const memoryItems: MyUnbodaTimelineItem[] = memories.map((memory) => ({
    id: `memory:${memory.id}`,
    type: memory.supersedes_memory_id ? "memory_update" : "memory",
    occurredAt: memory.created_at,
    label: memory.supersedes_memory_id ? "상황 변화" : MEMORY_LABELS[memory.kind],
    title: memory.supersedes_memory_id ? "내 상황을 업데이트했어요" : `${MEMORY_LABELS[memory.kind]}을 저장했어요`,
    description: memory.content,
    href: "/ai-consulting",
  }));

  const consultationItems: MyUnbodaTimelineItem[] = ((threadsResult.data ?? []) as ThreadRow[]).map((thread) => {
    const presentation = getAiConsultingPresentation(
      thread.base_product_id,
      thread.analysis_edition_key,
    );
    const continued = thread.updated_at !== thread.created_at;
    return {
      id: `consultation:${thread.id}`,
      type: "consultation",
      occurredAt: thread.updated_at,
      label: "AI 상담",
      title: continued ? "상담을 이어갔어요" : "상담을 시작했어요",
      description: `${presentation.productTitle} · ${presentation.editionLabel}`,
      href: `/ai-consulting?productId=${encodeURIComponent(thread.base_product_id)}&edition=${encodeURIComponent(thread.analysis_edition_key)}`,
    };
  });

  const timeline = [...reportItems, ...memoryItems, ...consultationItems]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 100);

  return {
    currentMemories,
    activeMemoryCount: currentMemories.length,
    completedReportCount: reportItems.length,
    consultationCount: consultationItems.length,
    timeline,
  };
}
