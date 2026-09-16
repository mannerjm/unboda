import { createHash } from "node:crypto";
import type { CompatibilityCustomerSnapshot } from "./compatibilityCustomerInput";
import type {
  FamilyExtendedDirectionalInfluence,
  FamilyOtherRelationshipKind,
  FamilyOtherRole,
} from "./familyCompatibilityExtended";
import type {
  FamilyOtherReportOutput,
  FamilySiblingReportOutput,
} from "./familyCompatibilityExtendedReportContract";
import {
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
} from "./specialAnalysisProducts";

export const FAMILY_SIBLING_PAID_INPUT_VERSION = "family-sibling-input-v1" as const;
export const FAMILY_SIBLING_PAID_REPORT_VERSION = "family-sibling-paid-report-v1" as const;
export const FAMILY_OTHER_PAID_INPUT_VERSION = "family-other-input-v1" as const;
export const FAMILY_OTHER_PAID_REPORT_VERSION = "family-other-paid-report-v1" as const;

export type FamilySiblingPaidInputSnapshot = Readonly<{
  version: typeof FAMILY_SIBLING_PAID_INPUT_VERSION;
  productId: typeof COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID;
  relationshipType: "family_siblings";
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}>;

export type FamilyOtherPaidInputSnapshot = Readonly<{
  version: typeof FAMILY_OTHER_PAID_INPUT_VERSION;
  productId: typeof COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID;
  relationshipType: "family_other";
  relationshipKind: FamilyOtherRelationshipKind;
  userRole: FamilyOtherRole;
  familyMemberRole: FamilyOtherRole;
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}>;

export type FamilyExtendedDirectionCard = Readonly<{
  fromLabel: string;
  toLabel: string;
  headline: string;
  signals: readonly string[];
}>;

export type StoredFamilySiblingReport = Readonly<{
  schemaVersion: typeof FAMILY_SIBLING_PAID_REPORT_VERSION;
  report: FamilySiblingReportOutput;
  directions: Readonly<{
    userToSibling: FamilyExtendedDirectionCard;
    siblingToUser: FamilyExtendedDirectionCard;
  }>;
  meta: Readonly<{
    evaluationYear: number;
    myProfileLabel: string;
    familyMemberLabel: string;
    familyMemberBirthTimeKnown: boolean;
  }>;
}>;

export type StoredFamilyOtherReport = Readonly<{
  schemaVersion: typeof FAMILY_OTHER_PAID_REPORT_VERSION;
  report: FamilyOtherReportOutput;
  directions: Readonly<{
    userToFamily: FamilyExtendedDirectionCard;
    familyToUser: FamilyExtendedDirectionCard;
  }>;
  meta: Readonly<{
    evaluationYear: number;
    myProfileLabel: string;
    familyMemberLabel: string;
    familyMemberBirthTimeKnown: boolean;
    relationshipKind: FamilyOtherRelationshipKind;
    userRole: FamilyOtherRole;
    familyMemberRole: FamilyOtherRole;
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

function validBaseSnapshot(row: {
  evaluationDate?: unknown;
  evaluationYear?: unknown;
  myProfileLabel?: unknown;
  familyMemberLabel?: unknown;
  familyMemberBirthTimeKnown?: unknown;
  mine?: unknown;
  familyMember?: unknown;
}): boolean {
  return typeof row.evaluationDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(row.evaluationDate)
    && Number.isInteger(row.evaluationYear)
    && typeof row.myProfileLabel === "string"
    && row.myProfileLabel.trim().length > 0
    && typeof row.familyMemberLabel === "string"
    && row.familyMemberLabel.trim().length > 0
    && typeof row.familyMemberBirthTimeKnown === "boolean"
    && isSnapshotPerson(row.mine)
    && isSnapshotPerson(row.familyMember);
}

export function buildFamilySiblingPaidInputSnapshot(input: {
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}): FamilySiblingPaidInputSnapshot {
  return {
    version: FAMILY_SIBLING_PAID_INPUT_VERSION,
    productId: COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
    relationshipType: "family_siblings",
    ...input,
  };
}

export function buildFamilyOtherPaidInputSnapshot(input: {
  relationshipKind: FamilyOtherRelationshipKind;
  userRole: FamilyOtherRole;
  familyMemberRole: FamilyOtherRole;
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  familyMemberLabel: string;
  familyMemberBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  familyMember: CompatibilityCustomerSnapshot;
}): FamilyOtherPaidInputSnapshot {
  return {
    version: FAMILY_OTHER_PAID_INPUT_VERSION,
    productId: COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
    relationshipType: "family_other",
    ...input,
  };
}

export function parseFamilySiblingPaidInputSnapshot(value: unknown): FamilySiblingPaidInputSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("형제·자매 궁합 구매 입력 정보를 확인하지 못했습니다.");
  const row = value as Partial<FamilySiblingPaidInputSnapshot>;
  if (
    row.version !== FAMILY_SIBLING_PAID_INPUT_VERSION
    || row.productId !== COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID
    || row.relationshipType !== "family_siblings"
    || !validBaseSnapshot(row)
  ) throw new Error("형제·자매 궁합 구매 입력 정보가 올바르지 않습니다.");
  return row as FamilySiblingPaidInputSnapshot;
}

export function parseFamilyOtherPaidInputSnapshot(value: unknown): FamilyOtherPaidInputSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("기타 가족 궁합 구매 입력 정보를 확인하지 못했습니다.");
  const row = value as Partial<FamilyOtherPaidInputSnapshot>;
  if (
    row.version !== FAMILY_OTHER_PAID_INPUT_VERSION
    || row.productId !== COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID
    || row.relationshipType !== "family_other"
    || typeof row.relationshipKind !== "string"
    || typeof row.userRole !== "string"
    || typeof row.familyMemberRole !== "string"
    || !validBaseSnapshot(row)
  ) throw new Error("기타 가족 궁합 구매 입력 정보가 올바르지 않습니다.");
  return row as FamilyOtherPaidInputSnapshot;
}

function fingerprint(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

export function buildFamilySiblingPaidEditionKey(snapshot: FamilySiblingPaidInputSnapshot): string {
  return `FAMILY_SIBLINGS_YEAR:${snapshot.evaluationYear}:${fingerprint({
    mine: { person: snapshot.mine.person, birthTimeKnown: snapshot.mine.birthTimeKnown },
    familyMember: { person: snapshot.familyMember.person, birthTimeKnown: snapshot.familyMemberBirthTimeKnown },
  })}`;
}

export function buildFamilyOtherPaidEditionKey(snapshot: FamilyOtherPaidInputSnapshot): string {
  return `FAMILY_OTHER_YEAR:${snapshot.evaluationYear}:${fingerprint({
    relationshipKind: snapshot.relationshipKind,
    userRole: snapshot.userRole,
    mine: { person: snapshot.mine.person, birthTimeKnown: snapshot.mine.birthTimeKnown },
    familyMember: { person: snapshot.familyMember.person, birthTimeKnown: snapshot.familyMemberBirthTimeKnown },
  })}`;
}

export function buildFamilyExtendedDirectionCard(
  direction: FamilyExtendedDirectionalInfluence,
  fromLabel: string,
  toLabel: string,
): FamilyExtendedDirectionCard {
  const supportLeads = direction.supportPressure > direction.burdenPressure + 0.08;
  const burdenLeads = direction.burdenPressure > direction.supportPressure + 0.08;
  const hasSupport = direction.supportPressure > 0;
  const hasBurden = direction.burdenPressure > 0;
  const mixed = direction.level === "mixed" && hasSupport && hasBurden;
  const headline = mixed
    ? "힘이 되는 부분과 부담이 되는 부분이 함께 보여요"
    : supportLeads
      ? `${fromLabel} → ${toLabel} 방향은 힘이 되는 흐름이 더 커요`
      : burdenLeads
        ? `${fromLabel} → ${toLabel} 방향은 부담으로 느껴질 여지가 더 커요`
        : direction.level === "supportive"
          ? `${fromLabel} → ${toLabel} 방향은 힘이 되기 쉬워요`
          : "상황에 따라 체감이 달라질 수 있는 흐름이에요";
  const signals = [
    mixed
      ? `${fromLabel} → ${toLabel} 방향에서는 도움과 부담으로 느껴질 수 있는 작용이 함께 나타납니다.`
      : supportLeads
        ? `${fromLabel} → ${toLabel} 방향에서는 부담보다 힘이 되는 작용이 더 뚜렷합니다.`
        : burdenLeads
          ? `${fromLabel} → ${toLabel} 방향에서는 도움보다 부담으로 받아들여질 가능성을 먼저 살펴볼 필요가 있습니다.`
          : "강한 한 방향보다 상황과 대화 방식에 따라 달라질 여지가 큽니다.",
    hasSupport && hasBurden
      ? `${toLabel} 쪽의 상황에 따라 같은 행동도 도움과 부담으로 다르게 받아들여질 수 있습니다.`
      : hasSupport
        ? `${toLabel} 쪽의 필요와 맞을 때 관계를 안정시키는 방향으로 작용하기 쉽습니다.`
        : `${toLabel} 쪽의 선택 범위와 타이밍을 먼저 확인하는 편이 좋습니다.`,
  ];
  return { fromLabel, toLabel, headline, signals };
}

export function isStoredFamilySiblingReport(value: unknown): value is StoredFamilySiblingReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<StoredFamilySiblingReport>;
  return row.schemaVersion === FAMILY_SIBLING_PAID_REPORT_VERSION
    && Boolean(row.report)
    && Boolean(row.directions)
    && typeof row.meta?.evaluationYear === "number"
    && typeof row.meta?.myProfileLabel === "string"
    && typeof row.meta?.familyMemberLabel === "string";
}

export function isStoredFamilyOtherReport(value: unknown): value is StoredFamilyOtherReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<StoredFamilyOtherReport>;
  return row.schemaVersion === FAMILY_OTHER_PAID_REPORT_VERSION
    && Boolean(row.report)
    && Boolean(row.directions)
    && typeof row.meta?.evaluationYear === "number"
    && typeof row.meta?.myProfileLabel === "string"
    && typeof row.meta?.familyMemberLabel === "string"
    && typeof row.meta?.relationshipKind === "string"
    && typeof row.meta?.userRole === "string"
    && typeof row.meta?.familyMemberRole === "string";
}
