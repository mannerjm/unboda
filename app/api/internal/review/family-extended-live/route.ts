import { NextResponse } from "next/server";
import { buildCompatibilityTiming } from "@/app/lib/compatibilityTiming";
import {
  buildPartnerCompatibilitySnapshot,
  buildProfileCompatibilitySnapshot,
  validateCompatibilityPartnerInput,
} from "@/app/lib/compatibilityCustomerInput";
import {
  buildFamilyOtherCompatibility,
  buildFamilySiblingCompatibility,
  resolveFamilyOtherRolePair,
} from "@/app/lib/familyCompatibilityExtended";
import {
  buildFamilyExtendedDirectionCard,
  FAMILY_OTHER_PAID_REPORT_VERSION,
  FAMILY_SIBLING_PAID_REPORT_VERSION,
  type StoredFamilyOtherReport,
  type StoredFamilySiblingReport,
} from "@/app/lib/familyCompatibilityExtendedPaidAnalysis";
import {
  generateFamilyOtherReport,
  generateFamilySiblingReport,
} from "@/app/lib/familyCompatibilityExtendedReportService";
import type { ProfileDto } from "@/app/lib/profiles/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REVIEW_KEY = "family-review-20260917-v1";
const EVALUATION_DATE = "2026-09-17";
const EVALUATION_YEAR = 2026;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

function buildCustomerSnapshot(input: {
  profile: ProfileDto;
  familyMember: {
    label: string;
    birthDate: string;
    birthTime: string;
    gender: "남성" | "여성";
  };
}) {
  const familyInput = validateCompatibilityPartnerInput({
    label: input.familyMember.label,
    birthDate: input.familyMember.birthDate,
    birthTimeKnown: true,
    birthTime: input.familyMember.birthTime,
    gender: input.familyMember.gender,
    calendarType: "양력",
    isLeapMonth: false,
  });
  if (!familyInput.valid) throw new Error("리뷰용 가족 입력을 계산하지 못했습니다.");

  return {
    mine: buildProfileCompatibilitySnapshot(input.profile, EVALUATION_DATE),
    familyMember: buildPartnerCompatibilitySnapshot(familyInput.value, EVALUATION_DATE),
  };
}

function siblingFixture() {
  const profile: ProfileDto = {
    id: "00000000-0000-4000-8000-000000000101",
    label: "나",
    relationshipType: "self",
    birthDate: "1990-05-15",
    birthTime: "10:30",
    gender: "남성",
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    profile,
    familyMember: {
      label: "여동생",
      birthDate: "1992-07-20",
      birthTime: "14:20",
      gender: "여성" as const,
    },
  };
}

function otherFamilyFixture() {
  const profile: ProfileDto = {
    id: "00000000-0000-4000-8000-000000000102",
    label: "나",
    relationshipType: "self",
    birthDate: "1955-03-09",
    birthTime: "08:10",
    gender: "여성",
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    profile,
    familyMember: {
      label: "손주",
      birthDate: "1998-11-22",
      birthTime: "15:40",
      gender: "남성" as const,
    },
  };
}

async function generateSiblingReview() {
  const fixture = siblingFixture();
  const snapshots = buildCustomerSnapshot(fixture);
  const timing = buildCompatibilityTiming(
    snapshots.mine.person,
    snapshots.familyMember.person,
    {
      evaluationYear: EVALUATION_YEAR,
      A: snapshots.mine.timing,
      B: snapshots.familyMember.timing,
    },
  );
  const result = buildFamilySiblingCompatibility(timing);
  const generated = await generateFamilySiblingReport(result, {
    userLabel: fixture.profile.label,
    siblingLabel: fixture.familyMember.label,
  });

  const content: StoredFamilySiblingReport = {
    schemaVersion: FAMILY_SIBLING_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToSibling: buildFamilyExtendedDirectionCard(
        result.directions.userToSibling,
        fixture.profile.label,
        fixture.familyMember.label,
      ),
      siblingToUser: buildFamilyExtendedDirectionCard(
        result.directions.siblingToUser,
        fixture.familyMember.label,
        fixture.profile.label,
      ),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: fixture.profile.label,
      familyMemberLabel: fixture.familyMember.label,
      familyMemberBirthTimeKnown: true,
    },
  };

  return {
    mode: "siblings",
    fixture: {
      mine: `${fixture.profile.birthDate} ${fixture.profile.birthTime} ${fixture.profile.gender}`,
      familyMember: `${fixture.familyMember.birthDate} ${fixture.familyMember.birthTime} ${fixture.familyMember.gender}`,
    },
    content,
  };
}

async function generateOtherFamilyReview() {
  const fixture = otherFamilyFixture();
  const snapshots = buildCustomerSnapshot(fixture);
  const timing = buildCompatibilityTiming(
    snapshots.mine.person,
    snapshots.familyMember.person,
    {
      evaluationYear: EVALUATION_YEAR,
      A: snapshots.mine.timing,
      B: snapshots.familyMember.timing,
    },
  );
  const rolePair = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
  if (!rolePair) throw new Error("리뷰용 기타 가족 역할을 계산하지 못했습니다.");

  const result = buildFamilyOtherCompatibility(
    timing,
    "grandparent_grandchild",
    rolePair,
  );
  const generated = await generateFamilyOtherReport(result, {
    userLabel: fixture.profile.label,
    familyLabel: fixture.familyMember.label,
  });

  const content: StoredFamilyOtherReport = {
    schemaVersion: FAMILY_OTHER_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToFamily: buildFamilyExtendedDirectionCard(
        result.directions.userToFamily,
        fixture.profile.label,
        fixture.familyMember.label,
      ),
      familyToUser: buildFamilyExtendedDirectionCard(
        result.directions.familyToUser,
        fixture.familyMember.label,
        fixture.profile.label,
      ),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: fixture.profile.label,
      familyMemberLabel: fixture.familyMember.label,
      familyMemberBirthTimeKnown: true,
      relationshipKind: "grandparent_grandchild",
      userRole: rolePair.user,
      familyMemberRole: rolePair.familyMember,
    },
  };

  return {
    mode: "other_family",
    relationshipKind: "grandparent_grandchild",
    fixture: {
      mine: `${fixture.profile.birthDate} ${fixture.profile.birthTime} ${fixture.profile.gender}`,
      familyMember: `${fixture.familyMember.birthDate} ${fixture.familyMember.birthTime} ${fixture.familyMember.gender}`,
    },
    content,
  };
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return json({ error: "not found" }, 404);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("key") !== REVIEW_KEY) {
    return json({ error: "not found" }, 404);
  }

  const mode = url.searchParams.get("mode");
  try {
    if (mode === "siblings") return json(await generateSiblingReview());
    if (mode === "other") return json(await generateOtherFamilyReview());
    return json({ error: "mode must be siblings or other" }, 400);
  } catch (error) {
    console.error("[family-extended-live-review] generation failed", error);
    return json({ error: error instanceof Error ? error.message : "review generation failed" }, 500);
  }
}
