import Link from "next/link";
import { notFound } from "next/navigation";
import FamilyExtendedPaidReportView from "@/app/components/FamilyExtendedPaidReportView";
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

const EVALUATION_DATE = "2026-09-17";
const EVALUATION_YEAR = 2026;

function buildSnapshots(profile: ProfileDto, familyMember: {
  label: string;
  birthDate: string;
  birthTime: string;
  gender: "남성" | "여성";
}) {
  const familyInput = validateCompatibilityPartnerInput({
    label: familyMember.label,
    birthDate: familyMember.birthDate,
    birthTimeKnown: true,
    birthTime: familyMember.birthTime,
    gender: familyMember.gender,
    calendarType: "양력",
    isLeapMonth: false,
  });
  if (!familyInput.valid) throw new Error("리뷰용 가족 입력을 계산하지 못했습니다.");
  return {
    mine: buildProfileCompatibilitySnapshot(profile, EVALUATION_DATE),
    familyMember: buildPartnerCompatibilitySnapshot(familyInput.value, EVALUATION_DATE),
  };
}

async function siblingReport(): Promise<StoredFamilySiblingReport> {
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
  const familyMember = {
    label: "여동생",
    birthDate: "1992-07-20",
    birthTime: "14:20",
    gender: "여성" as const,
  };
  const snapshots = buildSnapshots(profile, familyMember);
  const timing = buildCompatibilityTiming(snapshots.mine.person, snapshots.familyMember.person, {
    evaluationYear: EVALUATION_YEAR,
    A: snapshots.mine.timing,
    B: snapshots.familyMember.timing,
  });
  const result = buildFamilySiblingCompatibility(timing);
  const generated = await generateFamilySiblingReport(result, {
    userLabel: profile.label,
    siblingLabel: familyMember.label,
  });

  return {
    schemaVersion: FAMILY_SIBLING_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToSibling: buildFamilyExtendedDirectionCard(result.directions.userToSibling, profile.label, familyMember.label),
      siblingToUser: buildFamilyExtendedDirectionCard(result.directions.siblingToUser, familyMember.label, profile.label),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: profile.label,
      familyMemberLabel: familyMember.label,
      familyMemberBirthTimeKnown: true,
    },
  };
}

async function otherFamilyReport(): Promise<StoredFamilyOtherReport> {
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
  const familyMember = {
    label: "손주",
    birthDate: "1998-11-22",
    birthTime: "15:40",
    gender: "남성" as const,
  };
  const snapshots = buildSnapshots(profile, familyMember);
  const timing = buildCompatibilityTiming(snapshots.mine.person, snapshots.familyMember.person, {
    evaluationYear: EVALUATION_YEAR,
    A: snapshots.mine.timing,
    B: snapshots.familyMember.timing,
  });
  const roles = resolveFamilyOtherRolePair("grandparent_grandchild", "grandparent");
  if (!roles) throw new Error("리뷰용 기타 가족 역할을 계산하지 못했습니다.");
  const result = buildFamilyOtherCompatibility(timing, "grandparent_grandchild", roles);
  const generated = await generateFamilyOtherReport(result, {
    userLabel: profile.label,
    familyLabel: familyMember.label,
  });

  return {
    schemaVersion: FAMILY_OTHER_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToFamily: buildFamilyExtendedDirectionCard(result.directions.userToFamily, profile.label, familyMember.label),
      familyToUser: buildFamilyExtendedDirectionCard(result.directions.familyToUser, familyMember.label, profile.label),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: profile.label,
      familyMemberLabel: familyMember.label,
      familyMemberBirthTimeKnown: true,
      relationshipKind: "grandparent_grandchild",
      userRole: roles.user,
      familyMemberRole: roles.familyMember,
    },
  };
}

export default async function FamilyExtendedLiveReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (process.env.VERCEL_ENV !== "preview") notFound();

  const { mode } = await searchParams;
  const selectedMode = mode === "other" ? "other" : "siblings";
  const content = selectedMode === "other" ? await otherFamilyReport() : await siblingReport();

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-stone-700">
          <p className="font-bold text-stone-950">Preview 전용 실제 AI 출력 검수 화면</p>
          <p className="mt-1">결제·구매권한·DB 저장 없이 고정 테스트 생년월일로 실제 가족 궁합 생성 서비스를 호출합니다. Production에는 이 화면이 없습니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="?mode=siblings" className={`rounded-full px-4 py-2 text-xs font-bold ${selectedMode === "siblings" ? "bg-stone-950 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>형제·자매 실제 출력</Link>
            <Link href="?mode=other" className={`rounded-full px-4 py-2 text-xs font-bold ${selectedMode === "other" ? "bg-stone-950 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}>기타 가족 실제 출력</Link>
          </div>
        </div>
        <FamilyExtendedPaidReportView mode={selectedMode === "other" ? "other_family" : "siblings"} content={content} />
      </div>
    </main>
  );
}
