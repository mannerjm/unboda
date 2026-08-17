import { z } from "zod";
import type { PeriodAnalysisProductType } from "./analysisPeriodProducts";
import { getPremiumProduct } from "./premiumProductRegistry";

const REFERENCE_PERIOD_SCALES = [
  "monthly",
  "monthly-series",
  "yearly",
  "yearly-series",
  "daeun",
  "lifetime",
] as const satisfies readonly PeriodAnalysisProductType[];

// Fails to compile if a new PeriodAnalysisProductType is added without a scale.
type UncoveredScale = Exclude<
  PeriodAnalysisProductType,
  (typeof REFERENCE_PERIOD_SCALES)[number]
>;
const _allScalesCovered: UncoveredScale[] = [];
void _allScalesCovered;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ReferencePeriodSnapshotSchema = z.object({
  productId: z.string().min(1),
  kind: z.literal("PERIOD"),
  scale: z.enum(REFERENCE_PERIOD_SCALES),
  anchorDate: z.string().regex(DATE_PATTERN),
  referenceYear: z.number().int().optional(),
  referenceMonth: z.number().int().min(1).max(12).optional(),
  coverage: z
    .object({
      from: z.string().regex(DATE_PATTERN),
      to: z.string().regex(DATE_PATTERN),
    })
    .optional(),
  daeunOrder: z.number().int().optional(),
  daeunGanji: z.string().min(1).optional(),
  seunGanji: z.string().min(1).optional(),
  labelSnapshot: z.string().min(1),
});

export type ReferencePeriodSnapshot = z.infer<typeof ReferencePeriodSnapshotSchema>;

/** Fortune values already computed by the saju engine; never recalculated here. */
export type ReferencePeriodFortuneInput = {
  daeunOrder?: number | null;
  daeunGanji?: string | null;
  seunGanji?: string | null;
};

export type BuildReferencePeriodSnapshotInput = {
  productId: string;
  anchorDate?: string;
  fortune?: ReferencePeriodFortuneInput;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getLastDayOfMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return month === 2 && isLeapYear(year) ? 29 : days[month - 1];
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;

  return {
    year: Math.floor(total / 12),
    month: (((total % 12) + 12) % 12) + 1,
  };
}

function parseAnchorDate(anchorDate: string): {
  year: number;
  month: number;
  day: number;
} {
  if (!DATE_PATTERN.test(anchorDate)) {
    throw new Error(`유효하지 않은 기준 날짜입니다: ${anchorDate}`);
  }

  const [year, month, day] = anchorDate.split("-").map(Number);

  if (month < 1 || month > 12 || day < 1 || day > getLastDayOfMonth(year, month)) {
    throw new Error(`유효하지 않은 기준 날짜입니다: ${anchorDate}`);
  }

  return { year, month, day };
}

/** Server-local calendar day; the only place production reads the clock. */
export function getServerAnchorDate(now: Date = new Date()): string {
  return toDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function buildMonthSnapshot(
  productId: string,
  anchorDate: string,
  monthOffset: number,
  labelSuffix: string,
): ReferencePeriodSnapshot {
  const anchor = parseAnchorDate(anchorDate);
  const { year, month } = addMonths(anchor.year, anchor.month, monthOffset);

  return {
    productId,
    kind: "PERIOD",
    scale: "monthly",
    anchorDate,
    referenceYear: year,
    referenceMonth: month,
    coverage: {
      from: toDateString(year, month, 1),
      to: toDateString(year, month, getLastDayOfMonth(year, month)),
    },
    labelSnapshot: `${year}년 ${month}월 ${labelSuffix}`,
  };
}

function buildYearSnapshot(
  productId: string,
  anchorDate: string,
  yearOffset: number,
  labelSuffix: string,
): ReferencePeriodSnapshot {
  const anchor = parseAnchorDate(anchorDate);
  const year = anchor.year + yearOffset;

  return {
    productId,
    kind: "PERIOD",
    scale: "yearly",
    anchorDate,
    referenceYear: year,
    coverage: {
      from: toDateString(year, 1, 1),
      to: toDateString(year, 12, 31),
    },
    labelSnapshot: `${year}년 ${labelSuffix}`,
  };
}

/**
 * Canonical, deterministic reference period for a PERIOD product.
 * Returns null for TOPIC and legacy products so they stay untouched.
 */
export function buildReferencePeriodSnapshot(
  input: BuildReferencePeriodSnapshotInput,
): ReferencePeriodSnapshot | null {
  const product = getPremiumProduct(input.productId);

  if (!product || product.kind !== "PERIOD" || !product.periodType) {
    return null;
  }

  const anchorDate = input.anchorDate ?? getServerAnchorDate();
  const anchor = parseAnchorDate(anchorDate);
  const productId = product.id;

  switch (productId) {
    case "monthly-current":
      return buildMonthSnapshot(productId, anchorDate, 0, "이번달 운");

    case "monthly-next":
      return buildMonthSnapshot(productId, anchorDate, 1, "다음달 운");

    case "annual-current":
      return buildYearSnapshot(productId, anchorDate, 0, "올해 운");

    case "annual-next":
      return buildYearSnapshot(productId, anchorDate, 1, "내년 운");

    case "annual-3years": {
      const lastYear = anchor.year + 2;

      return {
        productId,
        kind: "PERIOD",
        scale: "yearly-series",
        anchorDate,
        referenceYear: anchor.year,
        coverage: {
          from: toDateString(anchor.year, 1, 1),
          to: toDateString(lastYear, 12, 31),
        },
        labelSnapshot: `${anchor.year}~${lastYear}년 향후 3년 운`,
      };
    }

    case "monthly-12months": {
      const end = addMonths(anchor.year, anchor.month, 11);

      return {
        productId,
        kind: "PERIOD",
        scale: "monthly-series",
        anchorDate,
        referenceYear: anchor.year,
        referenceMonth: anchor.month,
        coverage: {
          from: toDateString(anchor.year, anchor.month, 1),
          to: toDateString(end.year, end.month, getLastDayOfMonth(end.year, end.month)),
        },
        labelSnapshot: `${anchor.year}년 ${anchor.month}월부터 12개월`,
      };
    }

    case "daeun-current": {
      const daeunGanji = input.fortune?.daeunGanji ?? undefined;
      const daeunOrder = input.fortune?.daeunOrder ?? undefined;
      const seunGanji = input.fortune?.seunGanji ?? undefined;

      return {
        productId,
        kind: "PERIOD",
        scale: "daeun",
        anchorDate,
        referenceYear: anchor.year,
        ...(daeunOrder === undefined ? {} : { daeunOrder }),
        ...(daeunGanji === undefined ? {} : { daeunGanji }),
        ...(seunGanji === undefined ? {} : { seunGanji }),
        labelSnapshot: daeunGanji
          ? `${anchor.year}년 기준 ${daeunGanji} 대운 · 10년 흐름`
          : `${anchor.year}년 기준 대운 · 10년 흐름`,
      };
    }

    case "lifetime-overview":
      return {
        productId,
        kind: "PERIOD",
        scale: "lifetime",
        anchorDate,
        referenceYear: anchor.year,
        labelSnapshot: `${anchor.year}년 기준 평생운`,
      };

    default:
      return null;
  }
}

export function formatReferencePeriodForPrompt(
  snapshot: ReferencePeriodSnapshot,
): string {
  const lines = [
    `분석 기준 기간: ${snapshot.labelSnapshot}`,
    `기준 상품: ${snapshot.productId} (${snapshot.scale})`,
    `기준 확정일: ${snapshot.anchorDate}`,
  ];

  if (snapshot.referenceYear !== undefined) {
    lines.push(`기준 연도: ${snapshot.referenceYear}년`);
  }

  if (snapshot.referenceMonth !== undefined) {
    lines.push(`기준 월: ${snapshot.referenceMonth}월`);
  }

  if (snapshot.coverage) {
    lines.push(`분석 대상 기간: ${snapshot.coverage.from} ~ ${snapshot.coverage.to}`);
  }

  if (snapshot.daeunGanji) {
    lines.push(`기준 대운: ${snapshot.daeunGanji}${snapshot.daeunOrder ? ` (${snapshot.daeunOrder}번째)` : ""}`);
  }

  if (snapshot.seunGanji) {
    lines.push(`기준 세운: ${snapshot.seunGanji}`);
  }

  lines.push(
    "'이번달', '내년'처럼 상대 표현만 쓰지 말고 위에 고정된 실제 연·월을 명시해 분석한다.",
  );

  return lines.join("\n");
}
