import { createHash } from "node:crypto";
import type { CompatibilityCustomerSnapshot } from "./compatibilityCustomerInput";
import type {
  FamilyParentChildDirectionalInfluence,
  FamilyParentChildRole,
} from "./familyCompatibilityParentChild";
import type { FamilyParentChildReportOutput } from "./familyCompatibilityParentChildReportContract";
import { COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID } from "./specialAnalysisProducts";

export const FAMILY_PARENT_CHILD_PAID_INPUT_VERSION = "family-parent-child-input-v1" as const;
export const FAMILY_PARENT_CHILD_PAID_REPORT_VERSION = "family-parent-child-paid-report-v1" as const;

export type FamilyParentChildPaidInputSnapshot = Readonly<{
  version: typeof FAMILY_PARENT_CHILD_PAID_INPUT_VERSION;
  productId: typeof COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID;
  relationshipType: "family_parent_child";
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  userRole: FamilyParentChildRole;
  familyMemberRole: FamilyParentChildRole;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}>;

export type FamilyParentChildDirectionCard = Readonly<{
  fromLabel: string;
  toLabel: string;
  headline: string;
  signals: readonly string[];
}>;

export type StoredFamilyParentChildReport = Readonly<{
  schemaVersion: typeof FAMILY_PARENT_CHILD_PAID_REPORT_VERSION;
  report: FamilyParentChildReportOutput;
  directions: Readonly<{
    parentToChild: FamilyParentChildDirectionCard;
    childToParent: FamilyParentChildDirectionCard;
  }>;
  meta: Readonly<{
    evaluationYear: number;
    myProfileLabel: string;
    familyMemberLabel: string;
    userRole: FamilyParentChildRole;
    familyMemberRole: FamilyParentChildRole;
    familyMemberBirthTimeKnown: boolean;
  }>;
}>;

function isSnapshotPerson(value: unknown): value is CompatibilityCustomerSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<CompatibilityCustomerSnapshot>;
  const pillars = row.person?.pillars;
  const timing = row.timing;
  return Boolean(
    pillars
      && typeof pillars.year === "string"
      && typeof pillars.month === "string"
      && typeof pillars.day === "string"
      && (pillars.hour === null || typeof pillars.hour === "string")
      && timing
      && (timing.daeunGanji === null || typeof timing.daeunGanji === "string")
      && (timing.seunGanji === null || typeof timing.seunGanji === "string")
      && typeof row.birthTimeKnown === "boolean",
  );
}

function isFamilyRole(value: unknown): value is FamilyParentChildRole {
  return value === "parent" || value === "child";
}

export function buildFamilyParentChildPaidInputSnapshot(input: {
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  userRole: FamilyParentChildRole;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}): FamilyParentChildPaidInputSnapshot {
  return {
    version: FAMILY_PARENT_CHILD_PAID_INPUT_VERSION,
    productId: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
    relationshipType: "family_parent_child",
    evaluationDate: input.evaluationDate,
    evaluationYear: input.evaluationYear,
    myProfileLabel: input.myProfileLabel,
    familyMemberLabel: input.familyMemberLabel,
    userRole: input.userRole,
    familyMemberRole: input.userRole === "parent" ? "child" : "parent",
    familyMemberBirthTimeKnown: input.familyMemberBirthTimeKnown,
    mine: input.mine,
    familyMember: input.familyMember,
  };
}

export function parseFamilyParentChildPaidInputSnapshot(value: unknown): FamilyParentChildPaidInputSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("부모·자녀 궁합 구매 입력 정보를 확인하지 못했습니다.");
  }
  const row = value as Partial<FamilyParentChildPaidInputSnapshot>;
  if (
    row.version !== FAMILY_PARENT_CHILD_PAID_INPUT_VERSION
    || row.productId !== COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID
    || row.relationshipType !== "family_parent_child"
    || typeof row.evaluationDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(row.evaluationDate)
    || !Number.isInteger(row.evaluationYear)
    || typeof row.myProfileLabel !== "string"
    || row.myProfileLabel.trim().length === 0
    || typeof row.familyMemberLabel !== "string"
    || row.familyMemberLabel.trim().length === 0
    || !isFamilyRole(row.userRole)
    || !isFamilyRole(row.familyMemberRole)
    || row.userRole === row.familyMemberRole
    || typeof row.familyMemberBirthTimeKnown !== "boolean"
    || !isSnapshotPerson(row.mine)
    || !isSnapshotPerson(row.familyMember)
  ) {
    throw new Error("부모·자녀 궁합 구매 입력 정보가 올바르지 않습니다.");
  }
  return row as FamilyParentChildPaidInputSnapshot;
}

export function buildFamilyParentChildPaidEditionKey(snapshot: FamilyParentChildPaidInputSnapshot): string {
  const pairFingerprint = createHash("sha256")
    .update(JSON.stringify({
      userRole: snapshot.userRole,
      mine: {
        person: snapshot.mine.person,
        timing: snapshot.mine.timing,
        birthTimeKnown: snapshot.mine.birthTimeKnown,
      },
      familyMember: {
        person: snapshot.familyMember.person,
        timing: snapshot.familyMember.timing,
        birthTimeKnown: snapshot.familyMemberBirthTimeKnown,
      },
    }))
    .digest("hex")
    .slice(0, 16);

  return `FAMILY_PARENT_CHILD_YEAR:${snapshot.evaluationYear}:${pairFingerprint}`;
}

export function buildFamilyParentChildDirectionCard(
  direction: FamilyParentChildDirectionalInfluence,
  fromLabel: string,
  toLabel: string,
): FamilyParentChildDirectionCard {
  const supportLeads = direction.supportPressure > direction.burdenPressure + 0.08;
  const burdenLeads = direction.burdenPressure > direction.supportPressure + 0.08;
  const hasSupport = direction.supportPressure > 0;
  const hasBurden = direction.burdenPressure > 0;

  const headline = supportLeads
    ? `${fromLabel} → ${toLabel} 방향은 힘이 되는 작용이 더 커요`
    : burdenLeads
      ? `${fromLabel} → ${toLabel} 방향은 부담으로 느껴질 여지가 더 커요`
      : hasSupport && hasBurden
        ? "힘이 되는 부분과 부담이 되는 부분이 함께 보여요"
        : direction.level === "supportive"
          ? `${fromLabel} → ${toLabel} 방향은 힘이 되기 쉬워요`
          : "한쪽으로 강하게 치우치지 않는 흐름이에요";

  const signals: string[] = [];
  if (supportLeads) {
    signals.push(`${fromLabel} → ${toLabel} 방향에서는 부담으로 받아들여질 가능성보다 도움이 되는 작용이 더 뚜렷합니다.`);
  } else if (burdenLeads) {
    signals.push(`${fromLabel} → ${toLabel} 방향에서는 힘이 되는 작용보다 부담으로 받아들여질 가능성을 먼저 살펴볼 필요가 있습니다.`);
  } else if (hasSupport && hasBurden) {
    signals.push(`${fromLabel} → ${toLabel} 방향에서는 힘이 되는 작용과 부담으로 느껴질 수 있는 작용이 함께 나타납니다.`);
  } else {
    signals.push("강한 한 방향보다 상황과 대화 방식에 따라 달라질 여지가 큰 관계입니다.");
  }

  if (hasSupport && hasBurden) {
    signals.push(`${toLabel} 쪽의 상황에 따라 같은 행동도 도움과 압박으로 다르게 받아들여질 수 있습니다.`);
  } else if (hasSupport) {
    signals.push(`${toLabel} 쪽이 필요로 하는 방식과 맞을 때 관계를 안정시키는 쪽으로 작용하기 쉽습니다.`);
  } else if (hasBurden) {
    signals.push(`${toLabel} 쪽의 선택 범위와 타이밍을 먼저 확인하면 부담으로 번지는 것을 줄일 수 있습니다.`);
  }

  return { fromLabel, toLabel, headline, signals: signals.slice(0, 2) };
}

export function isStoredFamilyParentChildReport(value: unknown): value is StoredFamilyParentChildReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<StoredFamilyParentChildReport>;
  return row.schemaVersion === FAMILY_PARENT_CHILD_PAID_REPORT_VERSION
    && Boolean(row.report)
    && Boolean(row.directions)
    && Boolean(row.meta)
    && typeof row.meta?.evaluationYear === "number"
    && typeof row.meta?.myProfileLabel === "string"
    && typeof row.meta?.familyMemberLabel === "string"
    && isFamilyRole(row.meta?.userRole)
    && isFamilyRole(row.meta?.familyMemberRole);
}
