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
  const headline = direction.level === "supportive"
    ? `${fromLabel}의 방식이 ${toLabel}에게 힘이 되기 쉬워요`
    : direction.level === "burdensome"
      ? `${toLabel}에게는 부담으로 느껴질 여지가 있어요`
      : direction.level === "mixed"
        ? "힘이 되는 부분과 부담이 되는 부분이 함께 보여요"
        : "한쪽으로 강하게 치우치지 않는 흐름이에요";

  const signals: string[] = [];
  if (direction.supportPressure > 0) {
    signals.push(`${fromLabel}의 반응과 방식이 ${toLabel}에게 보탬이 되는 작용이 확인됩니다.`);
  }
  if (direction.burdenPressure > 0) {
    signals.push(`상황에 따라 같은 방식이 ${toLabel}에게는 압박이나 부담으로 느껴질 수 있습니다.`);
  }
  if (signals.length === 0) {
    signals.push("강한 방향성보다 상황과 대화 방식에 따라 달라질 여지가 큰 관계입니다.");
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
    const generated = await generateFamilyParentChildReport(familyResult);

    const parentLabel = row.userRole === "parent" ? profile.label : validatedFamilyMember.value.label;
    const childLabel = row.userRole === "child" ? profile.label : validatedFamilyMember.value.label;

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
    const message = error instanceof Error ? error.message : "부모·자녀 궁합을 생성하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
