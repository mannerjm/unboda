import { NextResponse } from "next/server";
import { buildCompatibilityTiming } from "@/app/lib/compatibilityTiming";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "@/app/lib/compatibilityCustomerInput";
import { getKoreaEvaluationDate } from "@/app/lib/evaluationContext";
import {
  buildFamilyParentChildCompatibility,
  type FamilyParentChildDirectionalInfluence,
  type FamilyParentChildRole,
} from "@/app/lib/familyCompatibilityParentChild";
import { generateFamilyParentChildReport } from "@/app/lib/familyCompatibilityParentChildReportService";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getCurrentUser } from "@/app/lib/supabase/auth";

function isFamilyRole(value: unknown): value is FamilyParentChildRole {
  return value === "parent" || value === "child";
}

function directionCard(
  direction: FamilyParentChildDirectionalInfluence,
  fromLabel: string,
  toLabel: string,
) {
  const supportLeads = direction.supportPressure > direction.burdenPressure + 0.08;
  const burdenLeads = direction.burdenPressure > direction.supportPressure + 0.08;
  const hasSupport = direction.supportPressure > 0;
  const hasBurden = direction.burdenPressure > 0;

  const headline = supportLeads
    ? `${fromLabel}의 방식은 ${toLabel}에게 지지로 전달되는 힘이 더 커요`
    : burdenLeads
      ? `${fromLabel}의 방식은 ${toLabel}에게 부담으로 먼저 느껴질 수 있어요`
      : hasSupport && hasBurden
        ? "힘이 되는 부분과 부담이 되는 부분이 함께 보여요"
        : direction.level === "supportive"
          ? `${fromLabel}의 방식이 ${toLabel}에게 힘이 되기 쉬워요`
          : "한쪽으로 강하게 치우치지 않는 흐름이에요";

  const signals: string[] = [];
  if (supportLeads) {
    signals.push(`${fromLabel}에서 ${toLabel}로 향하는 영향은 부담 신호보다 지지로 전달되는 흐름이 더 뚜렷합니다.`);
  } else if (burdenLeads) {
    signals.push(`${fromLabel}에서 ${toLabel}로 향하는 영향은 지지보다 부담 신호가 더 크게 잡힙니다.`);
  } else if (hasSupport && hasBurden) {
    signals.push(`${fromLabel}의 반응은 ${toLabel}에게 힘과 부담으로 모두 작용할 수 있어 상황에 따른 차이가 큽니다.`);
  } else {
    signals.push("강한 한 방향보다 상황과 대화 방식에 따라 달라질 여지가 큰 관계입니다.");
  }

  if (hasSupport && hasBurden) {
    signals.push(`같은 행동도 ${toLabel}의 상황에 따라 도움과 압박으로 다르게 받아들여질 수 있습니다.`);
  } else if (hasSupport) {
    signals.push(`${toLabel}가 필요로 하는 방식과 맞을 때 관계를 안정시키는 쪽으로 작용하기 쉽습니다.`);
  } else if (hasBurden) {
    signals.push(`${toLabel}의 선택 범위와 타이밍을 먼저 확인하면 부담으로 번지는 것을 줄일 수 있습니다.`);
  }

  return {
    fromLabel,
    toLabel,
    headline,
    signals: signals.slice(0, 2),
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "입력 정보를 다시 확인해 주세요." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "입력 정보를 다시 확인해 주세요." }, { status: 400 });
  }

  const row = body as { profileId?: unknown; userRole?: unknown; familyMember?: unknown };
  const profileId = typeof row.profileId === "string" ? row.profileId : "";
  if (!profileId) {
    return NextResponse.json({ error: "분석할 내 프로필을 확인하지 못했습니다." }, { status: 400 });
  }
  if (!isFamilyRole(row.userRole)) {
    return NextResponse.json({ error: "이 관계에서 내가 부모인지 자녀인지 선택해 주세요." }, { status: 400 });
  }

  const validatedFamilyMember = validateCompatibilityPartnerInput(row.familyMember);
  if (!validatedFamilyMember.valid) {
    return NextResponse.json({ error: validatedFamilyMember.error }, { status: 400 });
  }

  try {
    const profile = await getUserProfile(profileId, user.id);
    if (!profile) {
      return NextResponse.json({ error: "분석할 내 프로필을 찾지 못했습니다." }, { status: 404 });
    }

    const evaluationDate = getKoreaEvaluationDate();
    const evaluationYear = Number(evaluationDate.slice(0, 4));
    const mine = buildProfileCompatibilitySnapshot(profile, evaluationDate);
    const familyMember = buildPartnerCompatibilitySnapshot(validatedFamilyMember.value, evaluationDate);
    const timing = buildCompatibilityTiming(mine.person, familyMember.person, {
      evaluationYear,
      A: mine.timing,
      B: familyMember.timing,
    });
    const familyResult = buildFamilyParentChildCompatibility(timing, row.userRole);
    const parentLabel = row.userRole === "parent" ? profile.label : validatedFamilyMember.value.label;
    const childLabel = row.userRole === "child" ? profile.label : validatedFamilyMember.value.label;
    const generated = await generateFamilyParentChildReport(familyResult, {
      parentLabel,
      childLabel,
    });

    return NextResponse.json({
      report: generated.report,
      directions: {
        parentToChild: directionCard(familyResult.directions.parentToChild, parentLabel, childLabel),
        childToParent: directionCard(familyResult.directions.childToParent, childLabel, parentLabel),
      },
      meta: {
        evaluationYear,
        myProfileLabel: profile.label,
        familyMemberLabel: validatedFamilyMember.value.label,
        userRole: row.userRole,
        familyMemberRole: row.userRole === "parent" ? "child" : "parent",
        familyMemberBirthTimeKnown: validatedFamilyMember.value.birthTimeKnown,
      },
    });
  } catch (error) {
    console.error("[family-parent-child] report generation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown report generation error",
    });
    return NextResponse.json(
      { error: "리포트 생성 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
