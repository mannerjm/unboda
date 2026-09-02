import { getCanonicalPremiumProductId } from "./premiumProductRegistry";
import { getAnalysisEditionPolicy } from "./analysisEditionPolicy";
import {
  buildReferencePeriodSnapshot,
  getServerAnchorDate,
  parseAnchorDate,
  type ReferencePeriodFortuneInput,
} from "./analysisReferencePeriod";

export type ComputeAnalysisEditionKeyInput = {
  productId: string;
  /** Server-computed default (getServerAnchorDate). Never accept this from the browser. */
  anchorDate?: string;
  /** Required only for the DAEUN policy; already computed by the saju engine, never recalculated here. */
  fortune?: ReferencePeriodFortuneInput;
};

/** Fails closed: unknown/non-launch productIds must never silently produce a key. */
export class UnresolvableEditionPolicyError extends Error {
  constructor(productId: unknown) {
    super(`분석 에디션 정책을 확인할 수 없습니다: ${String(productId)}`);
    this.name = "UnresolvableEditionPolicyError";
  }
}

/** DAEUN identity requires the profile's own saju fortune data; never guessed. */
export class MissingDaeunFortuneInputError extends Error {
  constructor(productId: unknown) {
    super(`대운 에디션 계산에 필요한 정보가 없습니다: ${String(productId)}`);
    this.name = "MissingDaeunFortuneInputError";
  }
}

/**
 * Server-authoritative, deterministic commercial edition identity for a
 * canonical launch product. Never trusts a client-supplied edition key.
 *
 * Reuses buildReferencePeriodSnapshot() for all PERIOD products so the
 * commercial edition and the report's own reference period can never
 * disagree with each other.
 */
export function computeAnalysisEditionKey(
  input: ComputeAnalysisEditionKeyInput,
): string {
  const canonicalProductId = getCanonicalPremiumProductId(input.productId);

  if (!canonicalProductId) {
    throw new UnresolvableEditionPolicyError(input.productId);
  }

  const policy = getAnalysisEditionPolicy(canonicalProductId);

  if (!policy) {
    throw new UnresolvableEditionPolicyError(canonicalProductId);
  }

  if (policy === "LIFETIME") {
    return "LIFETIME";
  }

  const anchorDate = input.anchorDate ?? getServerAnchorDate();
  // Validates the anchor date shape/range; throws on malformed input.
  parseAnchorDate(anchorDate);

  if (policy === "MONTHLY") {
    return `MONTH:${anchorDate.slice(0, 7)}`;
  }

  if (policy === "YEARLY") {
    return `YEAR:${anchorDate.slice(0, 4)}`;
  }

  // TARGET_MONTH / TARGET_YEAR / ROLLING_MULTIYEAR / DAEUN are all PERIOD
  // products: derive identity from the exact same snapshot report generation
  // consumes, instead of recomputing month/year/range/daeun math here.
  const snapshot = buildReferencePeriodSnapshot({
    productId: canonicalProductId,
    anchorDate,
    fortune: input.fortune,
  });

  if (!snapshot) {
    throw new UnresolvableEditionPolicyError(canonicalProductId);
  }

  switch (policy) {
    case "TARGET_MONTH": {
      if (snapshot.referenceYear === undefined || snapshot.referenceMonth === undefined) {
        throw new UnresolvableEditionPolicyError(canonicalProductId);
      }

      return `TARGET_MONTH:${snapshot.referenceYear}-${String(snapshot.referenceMonth).padStart(2, "0")}`;
    }

    case "TARGET_YEAR": {
      if (snapshot.referenceYear === undefined) {
        throw new UnresolvableEditionPolicyError(canonicalProductId);
      }

      return `TARGET_YEAR:${snapshot.referenceYear}`;
    }

    case "ROLLING_MULTIYEAR": {
      if (snapshot.referenceYear === undefined || !snapshot.coverage) {
        throw new UnresolvableEditionPolicyError(canonicalProductId);
      }

      const endYear = Number(snapshot.coverage.to.slice(0, 4));

      return `RANGE:${snapshot.referenceYear}-${endYear}`;
    }

    case "DAEUN": {
      // Ordinal alone is not commercially safe: a profile birth-data edit can
      // recompute the same numeric order for a materially different 10-year
      // segment. The ganji is the structural fact tying the ordinal to the
      // exact chart segment it represents, so both are required together.
      if (snapshot.daeunOrder === undefined || !snapshot.daeunGanji) {
        throw new MissingDaeunFortuneInputError(canonicalProductId);
      }

      return `DAEUN:${snapshot.daeunOrder}:${snapshot.daeunGanji}`;
    }

    default:
      throw new UnresolvableEditionPolicyError(canonicalProductId);
  }
}
