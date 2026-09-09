import { NextResponse } from "next/server";
import type { AiConsultingMemoryKind } from "@/app/lib/aiConsultingDataModel";
import {
  deleteAiConsultingUserMemory,
  getAiConsultingUserMemories,
  saveAiConsultingMemory,
} from "@/app/lib/aiConsulting/memory";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const USER_MEMORY_KINDS = ["user_fact", "life_event", "goal", "preference"] as const satisfies readonly AiConsultingMemoryKind[];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_MEMORY_MAX_CHARS = 300;

type MemoryWriteInput = {
  profileId?: unknown;
  threadId?: unknown;
  sourceMessageId?: unknown;
  writeRequestId?: unknown;
  kind?: unknown;
  content?: unknown;
};

type MemoryDeleteInput = {
  profileId?: unknown;
  memoryId?: unknown;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isUserMemoryKind(value: unknown): value is (typeof USER_MEMORY_KINDS)[number] {
  return typeof value === "string" && (USER_MEMORY_KINDS as readonly string[]).includes(value);
}

async function resolveProfileBoundary(profileId: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) } as const;
  }
  if (!isProfileId(profileId)) {
    return { error: NextResponse.json({ error: "유효한 프로필이 필요합니다." }, { status: 400 }) } as const;
  }

  const [profile, activeProfile] = await Promise.all([
    getUserProfile(profileId, user.id),
    getActiveProfile(user.id),
  ]);
  if (!profile || !activeProfile || activeProfile.id !== profile.id) {
    return { error: NextResponse.json({ error: "현재 선택한 분석 대상의 기억만 관리할 수 있습니다." }, { status: 403 }) } as const;
  }

  return { user, profile } as const;
}

function serializeMemory(memory: {
  id: string;
  kind: AiConsultingMemoryKind;
  content: string;
  source_message_id: string | null;
  created_at?: string;
  updated_at: string;
}) {
  return {
    id: memory.id,
    kind: memory.kind,
    content: memory.content,
    sourceMessageId: memory.source_message_id,
    createdAt: memory.created_at ?? memory.updated_at,
    updatedAt: memory.updated_at,
  };
}

export async function GET(request: Request) {
  const profileId = new URL(request.url).searchParams.get("profileId");
  const boundary = await resolveProfileBoundary(profileId);
  if ("error" in boundary) return boundary.error;

  try {
    const memories = await getAiConsultingUserMemories({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      limit: 20,
    });
    return NextResponse.json({ memories: memories.map(serializeMemory) });
  } catch (error) {
    console.error("[ai-consulting-memories] read failed", error);
    return NextResponse.json({ error: "AI 기억을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let input: MemoryWriteInput;
  try {
    input = (await request.json()) as MemoryWriteInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const boundary = await resolveProfileBoundary(input.profileId);
  if ("error" in boundary) return boundary.error;

  if (!isUuid(input.threadId) || !isUuid(input.sourceMessageId) || !isUuid(input.writeRequestId)) {
    return NextResponse.json({ error: "유효한 상담 메시지가 필요합니다." }, { status: 400 });
  }
  if (!isUserMemoryKind(input.kind)) {
    return NextResponse.json({ error: "유효한 기억 종류가 필요합니다." }, { status: 400 });
  }
  if (typeof input.content !== "string") {
    return NextResponse.json({ error: "기억할 내용을 입력해 주세요." }, { status: 400 });
  }

  const content = input.content.trim();
  if (content.length === 0 || content.length > USER_MEMORY_MAX_CHARS) {
    return NextResponse.json({ error: `기억할 내용은 ${USER_MEMORY_MAX_CHARS}자 이내로 입력해 주세요.` }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: thread, error: threadError } = await supabase
      .from("ai_consulting_threads")
      .select("id,user_id,profile_id,base_product_id,status")
      .eq("id", input.threadId)
      .eq("user_id", boundary.user.id)
      .eq("profile_id", boundary.profile.id)
      .eq("status", "active")
      .maybeSingle<{ id: string; user_id: string; profile_id: string; base_product_id: string; status: string }>();

    if (threadError || !thread) {
      return NextResponse.json({ error: "이 상담에서 저장할 수 있는 기억이 아닙니다." }, { status: 403 });
    }

    const { data: sourceMessage, error: sourceError } = await supabase
      .from("ai_consulting_messages")
      .select("id,thread_id,user_id,profile_id,role")
      .eq("id", input.sourceMessageId)
      .eq("thread_id", thread.id)
      .eq("user_id", boundary.user.id)
      .eq("profile_id", boundary.profile.id)
      .eq("role", "user")
      .maybeSingle<{ id: string; thread_id: string; user_id: string; profile_id: string; role: string }>();

    if (sourceError || !sourceMessage) {
      return NextResponse.json({ error: "내가 작성한 상담 메시지만 기억으로 저장할 수 있습니다." }, { status: 403 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("ai_consulting_memories")
      .select("id")
      .eq("user_id", boundary.user.id)
      .eq("profile_id", boundary.profile.id)
      .eq("provenance", "USER_STATED")
      .eq("status", "active")
      .eq("source_message_id", sourceMessage.id)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ error: "이 메시지에서 저장한 기억이 이미 있습니다." }, { status: 409 });
    }

    const memory = await saveAiConsultingMemory({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      writeRequestId: input.writeRequestId,
      kind: input.kind,
      provenance: "USER_STATED",
      content,
      tags: [thread.base_product_id, input.kind],
      sourceThreadId: thread.id,
      sourceMessageId: sourceMessage.id,
    });

    return NextResponse.json({ memory: serializeMemory(memory) }, { status: 201 });
  } catch (error) {
    console.error("[ai-consulting-memories] save failed", error);
    return NextResponse.json({ error: "AI 기억을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let input: MemoryDeleteInput;
  try {
    input = (await request.json()) as MemoryDeleteInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const boundary = await resolveProfileBoundary(input.profileId);
  if ("error" in boundary) return boundary.error;
  if (!isUuid(input.memoryId)) {
    return NextResponse.json({ error: "유효한 기억이 필요합니다." }, { status: 400 });
  }

  try {
    await deleteAiConsultingUserMemory({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      memoryId: input.memoryId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ai-consulting-memories] delete failed", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "삭제할 기억을 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "AI 기억을 삭제하지 못했습니다." }, { status: 500 });
  }
}
