import { NextResponse } from "next/server";
import { getActiveProfile } from "@/app/lib/profiles/activeServer";
import { getUserProfile } from "@/app/lib/profiles/server";
import { isProfileId } from "@/app/lib/profiles/types";
import { getCanonicalPremiumProductId, getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import {
  getAiConsultingSessionState,
  getOrCreateAiConsultingThread,
} from "@/app/lib/aiConsulting/session";

type SessionInput = {
  profileId?: unknown;
  productId?: unknown;
  edition?: unknown;
};

async function resolveBoundary(input: SessionInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) } as const;
  }

  if (!isProfileId(input.profileId)) {
    return { error: NextResponse.json({ error: "유효한 프로필이 필요합니다." }, { status: 400 }) } as const;
  }

  if (typeof input.productId !== "string" || !getPremiumProduct(input.productId)) {
    return { error: NextResponse.json({ error: "유효한 분석 상품이 필요합니다." }, { status: 400 }) } as const;
  }

  if (typeof input.edition !== "string" || input.edition.trim().length === 0) {
    return { error: NextResponse.json({ error: "분석 에디션이 필요합니다." }, { status: 400 }) } as const;
  }

  const profile = await getUserProfile(input.profileId, user.id);
  const activeProfile = await getActiveProfile(user.id);
  if (!profile || !activeProfile || activeProfile.id !== profile.id) {
    return { error: NextResponse.json({ error: "현재 선택한 분석 대상만 상담할 수 있습니다." }, { status: 403 }) } as const;
  }

  return {
    user,
    profile,
    productId: getCanonicalPremiumProductId(input.productId),
    edition: input.edition,
  } as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const boundary = await resolveBoundary({
    profileId: url.searchParams.get("profileId"),
    productId: url.searchParams.get("productId"),
    edition: url.searchParams.get("edition"),
  });

  if ("error" in boundary) return boundary.error;

  try {
    const state = await getAiConsultingSessionState({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      productId: boundary.productId,
      analysisEditionKey: boundary.edition,
    });
    return NextResponse.json(state);
  } catch (error) {
    console.error("[ai-consulting-session] read failed", error);
    return NextResponse.json({ error: "AI 상담 상태를 확인하지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let input: SessionInput;
  try {
    input = (await request.json()) as SessionInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const boundary = await resolveBoundary(input);
  if ("error" in boundary) return boundary.error;

  try {
    const initial = await getAiConsultingSessionState({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      productId: boundary.productId,
      analysisEditionKey: boundary.edition,
    });

    if (initial.state !== "ready") {
      return NextResponse.json(initial);
    }

    if (!initial.threadId) {
      await getOrCreateAiConsultingThread({
        grantId: initial.grantId,
        title: `${boundary.productId} AI 상담`,
      });
    }

    const state = await getAiConsultingSessionState({
      userId: boundary.user.id,
      profileId: boundary.profile.id,
      productId: boundary.productId,
      analysisEditionKey: boundary.edition,
    });
    return NextResponse.json(state);
  } catch (error) {
    console.error("[ai-consulting-session] start failed", error);
    return NextResponse.json({ error: "AI 상담을 시작하지 못했습니다." }, { status: 500 });
  }
}
