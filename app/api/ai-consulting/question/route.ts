import { NextResponse } from "next/server";
import { answerAiConsultingQuestion } from "@/app/lib/aiConsulting/answerPipeline";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QuestionInput = {
  profileId?: unknown;
  threadId?: unknown;
  requestId?: unknown;
  question?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let input: QuestionInput;
  try {
    input = (await request.json()) as QuestionInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!isProfileId(input.profileId)) {
    return NextResponse.json({ error: "유효한 프로필이 필요합니다." }, { status: 400 });
  }
  if (typeof input.threadId !== "string" || !UUID_PATTERN.test(input.threadId)) {
    return NextResponse.json({ error: "유효한 상담 세션이 필요합니다." }, { status: 400 });
  }
  if (typeof input.requestId !== "string" || !UUID_PATTERN.test(input.requestId)) {
    return NextResponse.json({ error: "유효한 요청 식별자가 필요합니다." }, { status: 400 });
  }
  if (typeof input.question !== "string" || input.question.trim().length < 2 || input.question.trim().length > 300) {
    return NextResponse.json({ error: "질문은 2자 이상 300자 이하로 입력해 주세요." }, { status: 400 });
  }

  const profile = await getUserProfile(input.profileId, user.id);
  const activeProfile = await getActiveProfile(user.id);
  if (!profile || !activeProfile || activeProfile.id !== profile.id) {
    return NextResponse.json({ error: "현재 선택한 분석 대상만 상담할 수 있습니다." }, { status: 403 });
  }

  try {
    const result = await answerAiConsultingQuestion({
      userId: user.id,
      profileId: profile.id,
      threadId: input.threadId,
      requestId: input.requestId,
      question: input.question.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai-consulting-question] failed", error);
    const message = error instanceof Error ? error.message : "AI_CONSULTING_QUESTION_FAILED";
    const status = message.includes("EXHAUSTED") || message.includes("NOT_ACTIVE") || message.includes("EXPIRED")
      ? 409
      : message.includes("BOUNDARY") || message.includes("ENTITLEMENT")
        ? 403
        : 500;
    return NextResponse.json(
      { error: status === 500 ? "AI 상담 답변을 완료하지 못했습니다. 질문 횟수는 차감되지 않습니다." : "현재 이 상담을 계속 이용할 수 없습니다." },
      { status },
    );
  }
}
