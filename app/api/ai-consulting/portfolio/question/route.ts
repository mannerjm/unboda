import { NextResponse } from "next/server";
import { answerAiConsultingPortfolioQuestion } from "@/app/lib/aiConsulting/portfolio";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCurrentUser } from "@/app/lib/supabase/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PortfolioQuestionInput = {
  profileId?: unknown;
  requestId?: unknown;
  question?: unknown;
  preferredProductId?: unknown;
  preferredEditionKey?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let input: PortfolioQuestionInput;
  try {
    input = (await request.json()) as PortfolioQuestionInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!isProfileId(input.profileId)) {
    return NextResponse.json({ error: "유효한 프로필이 필요합니다." }, { status: 400 });
  }
  if (typeof input.requestId !== "string" || !UUID_PATTERN.test(input.requestId)) {
    return NextResponse.json({ error: "유효한 요청 식별자가 필요합니다." }, { status: 400 });
  }
  if (typeof input.question !== "string" || input.question.trim().length < 2 || input.question.trim().length > 300) {
    return NextResponse.json({ error: "질문은 2자 이상 300자 이하로 입력해 주세요." }, { status: 400 });
  }

  const [profile, activeProfile] = await Promise.all([
    getUserProfile(input.profileId, user.id),
    getActiveProfile(user.id),
  ]);
  if (!profile || !activeProfile || activeProfile.id !== profile.id) {
    return NextResponse.json({ error: "현재 선택한 분석 대상만 상담할 수 있습니다." }, { status: 403 });
  }

  const preferredProductId = typeof input.preferredProductId === "string" && input.preferredProductId.trim()
    ? input.preferredProductId.trim()
    : null;
  const preferredEditionKey = typeof input.preferredEditionKey === "string" && input.preferredEditionKey.trim()
    ? input.preferredEditionKey.trim()
    : null;

  try {
    const result = await answerAiConsultingPortfolioQuestion({
      userId: user.id,
      profileId: profile.id,
      requestId: input.requestId,
      question: input.question.trim(),
      preferredProductId,
      preferredEditionKey,
    });

    if (result.state === "credit_required") {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai-consulting-portfolio-question] failed", error);
    const message = error instanceof Error ? error.message : "AI_CONSULTING_PORTFOLIO_QUESTION_FAILED";
    const status = message.includes("NO_PROFILE_CREDIT")
      ? 409
      : message.includes("BOUNDARY") || message.includes("ENTITLEMENT")
        ? 403
        : 500;
    return NextResponse.json(
      {
        error: status === 500
          ? "AI 상담 답변을 완료하지 못했습니다. 질문권은 차감되지 않습니다."
          : status === 409
            ? "사용 가능한 AI 질문권이 없습니다."
            : "현재 이 상담을 계속 이용할 수 없습니다.",
      },
      { status },
    );
  }
}
