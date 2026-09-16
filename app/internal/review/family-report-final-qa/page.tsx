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
  type FamilyOtherRelationshipKind,
  type FamilyOtherRole,
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

type PersonFixture = Readonly<{
  label: string;
  birthDate: string;
  birthTime: string;
  gender: "남성" | "여성";
}>;

type ReviewCase = Readonly<{
  key: "siblings" | "cousins" | "in-laws";
  title: string;
  kind: "siblings" | "other";
  relationshipKind?: FamilyOtherRelationshipKind;
  userRole?: FamilyOtherRole;
  mine: PersonFixture;
  familyMember: PersonFixture;
}>;

const CASES: readonly ReviewCase[] = [
  {
    key: "siblings",
    title: "형제·자매 · 방향 차이",
    kind: "siblings",
    mine: { label: "누나", birthDate: "1985-02-14", birthTime: "06:40", gender: "여성" },
    familyMember: { label: "남동생", birthDate: "1994-09-03", birthTime: "21:10", gender: "남성" },
  },
  {
    key: "cousins",
    title: "기타 가족 · 사촌",
    kind: "other",
    relationshipKind: "cousins",
    userRole: "cousin",
    mine: { label: "나", birthDate: "1988-12-05", birthTime: "11:15", gender: "남성" },
    familyMember: { label: "사촌", birthDate: "1991-04-19", birthTime: "19:50", gender: "여성" },
  },
  {
    key: "in-laws",
    title: "기타 가족 · 인척",
    kind: "other",
    relationshipKind: "in_laws",
    userRole: "in_law",
    mine: { label: "나", birthDate: "1987-08-11", birthTime: "07:25", gender: "여성" },
    familyMember: { label: "인척", birthDate: "1962-10-02", birthTime: "13:05", gender: "여성" },
  },
];

function profileFromFixture(person: PersonFixture, suffix: string): ProfileDto {
  return {
    id: `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`,
    label: person.label,
    relationshipType: "self",
    birthDate: person.birthDate,
    birthTime: person.birthTime,
    gender: person.gender,
    calendarType: "양력",
    isLeapMonth: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildSnapshots(profile: ProfileDto, familyMember: PersonFixture) {
  const familyInput = validateCompatibilityPartnerInput({
    label: familyMember.label,
    birthDate: familyMember.birthDate,
    birthTimeKnown: true,
    birthTime: familyMember.birthTime,
    gender: familyMember.gender,
    calendarType: "양력",
    isLeapMonth: false,
  });
  if (!familyInput.valid) throw new Error("검수용 가족 입력을 계산하지 못했습니다.");

  return {
    mine: buildProfileCompatibilitySnapshot(profile, EVALUATION_DATE),
    familyMember: buildPartnerCompatibilitySnapshot(familyInput.value, EVALUATION_DATE),
  };
}

async function buildSiblingReport(testCase: ReviewCase): Promise<StoredFamilySiblingReport> {
  const profile = profileFromFixture(testCase.mine, "901");
  const snapshots = buildSnapshots(profile, testCase.familyMember);
  const timing = buildCompatibilityTiming(snapshots.mine.person, snapshots.familyMember.person, {
    evaluationYear: EVALUATION_YEAR,
    A: snapshots.mine.timing,
    B: snapshots.familyMember.timing,
  });
  const result = buildFamilySiblingCompatibility(timing);
  const generated = await generateFamilySiblingReport(result, {
    userLabel: profile.label,
    siblingLabel: testCase.familyMember.label,
  });

  return {
    schemaVersion: FAMILY_SIBLING_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToSibling: buildFamilyExtendedDirectionCard(result.directions.userToSibling, profile.label, testCase.familyMember.label),
      siblingToUser: buildFamilyExtendedDirectionCard(result.directions.siblingToUser, testCase.familyMember.label, profile.label),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: profile.label,
      familyMemberLabel: testCase.familyMember.label,
      familyMemberBirthTimeKnown: true,
    },
  };
}

async function buildOtherReport(testCase: ReviewCase): Promise<StoredFamilyOtherReport> {
  if (!testCase.relationshipKind || !testCase.userRole) throw new Error("검수용 관계 유형이 없습니다.");

  const profile = profileFromFixture(testCase.mine, testCase.key === "cousins" ? "902" : "903");
  const snapshots = buildSnapshots(profile, testCase.familyMember);
  const timing = buildCompatibilityTiming(snapshots.mine.person, snapshots.familyMember.person, {
    evaluationYear: EVALUATION_YEAR,
    A: snapshots.mine.timing,
    B: snapshots.familyMember.timing,
  });
  const roles = resolveFamilyOtherRolePair(testCase.relationshipKind, testCase.userRole);
  if (!roles) throw new Error("검수용 기타 가족 역할을 계산하지 못했습니다.");
  const result = buildFamilyOtherCompatibility(timing, testCase.relationshipKind, roles);
  const generated = await generateFamilyOtherReport(result, {
    userLabel: profile.label,
    familyLabel: testCase.familyMember.label,
  });

  return {
    schemaVersion: FAMILY_OTHER_PAID_REPORT_VERSION,
    report: generated.report,
    directions: {
      userToFamily: buildFamilyExtendedDirectionCard(result.directions.userToFamily, profile.label, testCase.familyMember.label),
      familyToUser: buildFamilyExtendedDirectionCard(result.directions.familyToUser, testCase.familyMember.label, profile.label),
    },
    meta: {
      evaluationYear: EVALUATION_YEAR,
      myProfileLabel: profile.label,
      familyMemberLabel: testCase.familyMember.label,
      familyMemberBirthTimeKnown: true,
      relationshipKind: testCase.relationshipKind,
      userRole: roles.user,
      familyMemberRole: roles.familyMember,
    },
  };
}

export default async function FamilyReportFinalQaPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  if (process.env.VERCEL_ENV !== "preview") notFound();

  const params = await searchParams;
  const selected = CASES.find((item) => item.key === params.case) ?? CASES[0];
  const reportView = selected.kind === "siblings"
    ? <FamilyExtendedPaidReportView mode="siblings" content={await buildSiblingReport(selected)} />
    : <FamilyExtendedPaidReportView mode="other_family" content={await buildOtherReport(selected)} />;

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-stone-700">
          <p className="font-bold text-stone-950">최종 품질 검수 · Preview 전용</p>
          <p className="mt-1">현재 Production의 강화된 리포트 생성 규칙을 그대로 사용해 실제 AI 결과를 생성합니다. 결제·구매권한·DB 저장은 발생하지 않습니다.</p>
          <p className="mt-2 text-xs font-semibold text-stone-500">현재 사례 · {selected.title}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CASES.map((item) => (
              <Link
                key={item.key}
                href={`?case=${item.key}`}
                className={`rounded-full px-4 py-2 text-xs font-bold ${selected.key === item.key ? "bg-stone-950 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        {reportView}
      </div>
    </main>
  );
}
