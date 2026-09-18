import { createHash } from "node:crypto";
import type { CompatibilityCustomerSnapshot } from "./compatibilityCustomerInput";
import type { CompatibilityPairPerspectives } from "./compatibilityPairPerspective";
import type { CompatibilityReportOutput } from "./compatibilityReportContract";
import {
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  getCompatibilityPairRelationshipType,
  isCompatibilityPairProductId,
  type CompatibilityPairProductId,
  type CompatibilityPairRelationshipType,
} from "./specialAnalysisProducts";

export const COMPATIBILITY_PAID_INPUT_VERSION = "compatibility-romantic-input-v1" as const;
export const COMPATIBILITY_PAIR_PAID_INPUT_VERSION = "compatibility-pair-input-v2" as const;
export const COMPATIBILITY_PAID_REPORT_VERSION = "compatibility-romantic-report-v1" as const;
export const COMPATIBILITY_PAIR_PAID_REPORT_VERSION = "compatibility-pair-report-v2" as const;

export type CompatibilityPaidInputSnapshot = Readonly<{
  version: typeof COMPATIBILITY_PAID_INPUT_VERSION | typeof COMPATIBILITY_PAIR_PAID_INPUT_VERSION;
  productId: CompatibilityPairProductId;
  relationshipType: CompatibilityPairRelationshipType;
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  partnerLabel: string;
  partnerBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  partner: CompatibilityCustomerSnapshot;
}>;

export type StoredCompatibilityReport = Readonly<{
  schemaVersion: typeof COMPATIBILITY_PAID_REPORT_VERSION | typeof COMPATIBILITY_PAIR_PAID_REPORT_VERSION;
  report: CompatibilityReportOutput;
  perspectives: CompatibilityPairPerspectives;
  meta: {
    evaluationYear: number;
    myProfileLabel: string;
    partnerLabel: string;
    partnerBirthTimeKnown: boolean;
    productId?: CompatibilityPairProductId;
    relationshipType?: CompatibilityPairRelationshipType;
    natalDataQuality: { level: string; score: number; missing: readonly string[] };
    timingDataQuality: { level: string; score: number; missing: readonly string[] };
  };
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

export function buildCompatibilityPaidInputSnapshot(input: {
  productId?: CompatibilityPairProductId;
  evaluationDate: string;
  evaluationYear: number;
  myProfileLabel: string;
  partnerLabel: string;
  partnerBirthTimeKnown: boolean;
  mine: CompatibilityCustomerSnapshot;
  partner: CompatibilityCustomerSnapshot;
}): CompatibilityPaidInputSnapshot {
  const productId = input.productId ?? COMPATIBILITY_ROMANTIC_PRODUCT_ID;
  return {
    version: COMPATIBILITY_PAIR_PAID_INPUT_VERSION,
    productId,
    relationshipType: getCompatibilityPairRelationshipType(productId),
    evaluationDate: input.evaluationDate,
    evaluationYear: input.evaluationYear,
    myProfileLabel: input.myProfileLabel,
    partnerLabel: input.partnerLabel,
    partnerBirthTimeKnown: input.partnerBirthTimeKnown,
    mine: input.mine,
    partner: input.partner,
  };
}

export function parseCompatibilityPaidInputSnapshot(value: unknown): CompatibilityPaidInputSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("궁합 구매 입력 정보를 확인하지 못했습니다.");
  }

  const row = value as Partial<CompatibilityPaidInputSnapshot>;
  const legacyRomantic = row.version === COMPATIBILITY_PAID_INPUT_VERSION
    && row.productId === COMPATIBILITY_ROMANTIC_PRODUCT_ID
    && row.relationshipType === "romantic_partner";
  const pairV2 = row.version === COMPATIBILITY_PAIR_PAID_INPUT_VERSION
    && isCompatibilityPairProductId(row.productId)
    && row.relationshipType === getCompatibilityPairRelationshipType(row.productId);

  if (
    (!legacyRomantic && !pairV2)
    || typeof row.evaluationDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(row.evaluationDate)
    || !Number.isInteger(row.evaluationYear)
    || typeof row.myProfileLabel !== "string"
    || row.myProfileLabel.trim().length === 0
    || typeof row.partnerLabel !== "string"
    || row.partnerLabel.trim().length === 0
    || typeof row.partnerBirthTimeKnown !== "boolean"
    || !isSnapshotPerson(row.mine)
    || !isSnapshotPerson(row.partner)
  ) {
    throw new Error("궁합 구매 입력 정보가 올바르지 않습니다.");
  }

  return row as CompatibilityPaidInputSnapshot;
}

export function buildCompatibilityPaidEditionKey(snapshot: CompatibilityPaidInputSnapshot): string {
  const pairFingerprint = createHash("sha256")
    .update(JSON.stringify({
      mine: {
        person: snapshot.mine.person,
        timing: snapshot.mine.timing,
        birthTimeKnown: snapshot.mine.birthTimeKnown,
      },
      partner: {
        person: snapshot.partner.person,
        timing: snapshot.partner.timing,
        birthTimeKnown: snapshot.partnerBirthTimeKnown,
      },
    }))
    .digest("hex")
    .slice(0, 16);

  return `PAIR_YEAR:${snapshot.evaluationYear}:${pairFingerprint}`;
}

export function isStoredCompatibilityReport(value: unknown): value is StoredCompatibilityReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<StoredCompatibilityReport>;
  return (
    (row.schemaVersion === COMPATIBILITY_PAID_REPORT_VERSION
      || row.schemaVersion === COMPATIBILITY_PAIR_PAID_REPORT_VERSION)
    && Boolean(row.report)
    && Boolean(row.perspectives)
    && Boolean(row.meta)
    && typeof row.meta?.evaluationYear === "number"
    && typeof row.meta?.myProfileLabel === "string"
    && typeof row.meta?.partnerLabel === "string"
  );
}

export function resolveStoredCompatibilityRelationshipType(
  content: StoredCompatibilityReport,
): CompatibilityPairRelationshipType {
  return content.meta.relationshipType ?? "romantic_partner";
}
