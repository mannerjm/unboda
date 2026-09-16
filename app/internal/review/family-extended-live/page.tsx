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

type SiblingCase = Readonly<{
  key: string;
  title: string;
  mine: PersonFixture;
  familyMember: PersonFixture;
}>;

type OtherCase = Readonly<{
  key: string;
  title: string;
  relationshipKind: FamilyOtherRelationshipKind;
  userRole: FamilyOtherRole;
  mine: PersonFixture;
  familyMember: PersonFixture;
}>;

const SIBLING_CASES: readonly SiblingCase[] = [
  {
    key: "siblings-base",
    title: "형제·자매 기본 사례",
    mine: { label: "나", birthDate: "1990-05-15", birthTime: "10:30", gender: "남성" },
    familyMember: { label: "여동생", birthDate: "1992-07-20", birthTime: "14:20", gender: "여성" },
  },
  {
    key: "siblings-alt",
    title: "형제·자매 방향 차이 확인 사례",
    mine: { label: "누나", birthDate: "1985-02-14", birthTime: "06:40", gender: "여성" },
    familyMember: { label: "남동생", birthDate: "1994-09-03", birthTime: "21:10", gender: "남성" },
  },
];

const OTHER_CASES: readonly OtherCase[] = [
  {
    key: "grandparent",
    title: "조부모·손주",
    relationshipKind: "grandparent_grandchild",
    userRole: "grandparent",
    mine: { label: "조부모", birthDate: "1955-03-09", birthTime: "08:10", gender: "여성" },
    familyMember: { label: "손주", birthDate: "1998-11-22", birthTime: "15:40", gender: "남성" },
  },
  {
    key: "aunt-nephew",
    title: "삼촌·이모·고모·조카",
    relationshipKind: "aunt_uncle_niece_nephew",
    userRole: "aunt_uncle",
    mine: { label: "이모", birthDate: "1978-06-18", birthTime: "09:20", gender: "여성" },
    familyMember: { label: "조카", birthDate: "2004-01-27", birthTime: "17:35", gender: "남성" },
  },
  {
    key: "cousins",
    title: "사촌",
    relationshipKind: "cousins",
    userRole: "cousin",
    mine: { label: "나", birthDate: "1988-12-05", birthTime: "11:15", gender: "남성" },
    familyMember: { label: "사촌", birthDate: "1991-04-19", birthTime: "19:50", gender: "여성" },
  },
  {
    key: "in-laws",
    title: "인척",
    relationshipKind: "in_laws",
    userRole: "in_law",
    mine: { label: "나", birthDate: "1987-08-11", birthTime: "07:25", gender: "여성" },
    familyMember: { label: "인척", birthDate: "1962-10-02", birthTime: "13:05", gender: "여성" },
  },
];

function profileFromFixture(person: PersonFixture, idSuffix: string): ProfileDto {
  return {
    id: `00000000-0000-4000-8000-${idSuffix.padStart(12, "0")}`,
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
  if (!familyInput.valid) throw new Error("리뷰용 가족 입력을 계산하지 못했습니다.");
  return {
    mine: buildProfileCompatibilitySnapshot(profile, EVALUATION_DATE),
    familyMember: buildPartnerCompatibilitySnapshot(familyInput.value, EVALUATION_DATE),
  };
}

async function siblingReport(testCase: SiblingCase): Promise<StoredFamilySiblingReport> {
  const profile = profileFromFixture(testCase.mine, testCase.key === "siblings-alt" ? "202" : "201");
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

async function otherFamilyReport(testCase: OtherCase): Promise<StoredFamilyOtherReport> {
  const profile = profileFromFixture(testCase.mine, `3${OTHER_CASES.findIndex((item) => item.key === testCase.key) + 1}`);
  const snapshots = buildSnapshots(profile, testCase.familyMember);
  const timing = buildCompatibilityTiming(snapshots.mine.person, snapshots.familyMember.person, {
    evaluationYear: EVALUATION_YEAR,
    A: snapshots.mine.timing,
    B: snapshots.familyMember.timing,
  });
  const roles = resolveFamilyOtherRolePair(testCase.relationshipKind, testCase.userRole);
  if (!roles) throw new Error("리뷰용 기타 가족 역할을 계산하지 못했습니다.");
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

function caseLink(mode: "siblings" | "other", caseKey: string) {
  return `?mode=${mode}&case=${caseKey}`;
}

export default async function FamilyExtendedLiveReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; case?: string }>;
}) {
  if (process.env.VERCEL_ENV !== "preview") notFound();

  const params = await searchParams;
  const selectedMode = params.mode === "other" ? "other" : "siblings";
  const selectedSibling = SIBLING_CASES.find((item) => item.key === params.case) ?? SIBLING_CASES[0];
  const selectedOther = OTHER_CASES.find((item) => item.key === params.case) ?? OTHER_CASES[0];

  const reportView = selectedMode === "other"
    ? <FamilyExtendedPaidReportView mode="other_family" content={await otherFamilyReport(selectedOther)} />
    : <FamilyExtendedPaidReportView mode="siblings" content={await siblingReport(selectedSibling)} />;

  const selectedTitle = selectedMode === "other" ? selectedOther.title : selectedSibling.title;

  return (
    <main className="min-h-screen bg-[#f6f3ed] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-stone-700">
          <p className="font-bold text-stone-950">Preview 전용 실제 AI 출력 검수 화면</p>
          <p className="mt-1">결제·구매권한·DB 저장 없이 고정 테스트 생년월일로 실제 가족 궁합 생성 서비스를 호출합니다. Production에는 이 화면이 없습니다.</p>
          <p className="mt-2 text-xs font-semibold text-stone-500">현재 사례 · {selectedTitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SIBLING_CASES.map((item) => (
              <Link
                key={item.key}
                href={caseLink("siblings", item.key)}
                className={`rounded-full px-4 py-2 text-xs font-bold ${selectedMode === "siblings" && selectedSibling.key === item.key ? "bg-stone-950 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
              >
                {item.title}
              </Link>
            ))}
            {OTHER_CASES.map((item) => (
              <Link
                key={item.key}
                href={caseLink("other", item.key)}
                className={`rounded-full px-4 py-2 text-xs font-bold ${selectedMode === "other" && selectedOther.key === item.key ? "bg-stone-950 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"}`}
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
