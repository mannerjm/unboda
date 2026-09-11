"use client";

import type { DaeunAnalysis } from "@/app/lib/daeun";
import type { SeunAnalysis } from "@/app/lib/seun";
import { getFortuneCycleIndicators } from "@/app/lib/fortuneCycleIndicators";

const stemHanja: Record<string, string> = {
  갑: "甲",
  을: "乙",
  병: "丙",
  정: "丁",
  무: "戊",
  기: "己",
  경: "庚",
  신: "辛",
  임: "壬",
  계: "癸",
};

const branchHanja: Record<string, string> = {
  자: "子",
  축: "丑",
  인: "寅",
  묘: "卯",
  진: "辰",
  사: "巳",
  오: "午",
  미: "未",
  신: "申",
  유: "酉",
  술: "戌",
  해: "亥",
};

const elementTextClass: Record<string, string> = {
  甲: "text-emerald-700",
  乙: "text-emerald-700",
  寅: "text-emerald-700",
  卯: "text-emerald-700",
  丙: "text-red-600",
  丁: "text-red-600",
  巳: "text-red-600",
  午: "text-red-600",
  戊: "text-amber-700",
  己: "text-amber-700",
  辰: "text-amber-700",
  戌: "text-amber-700",
  丑: "text-amber-700",
  未: "text-amber-700",
  庚: "text-slate-600",
  辛: "text-slate-600",
  申: "text-slate-600",
  酉: "text-slate-600",
  壬: "text-blue-700",
  癸: "text-blue-700",
  子: "text-blue-700",
  亥: "text-blue-700",
};

const highlightedElementTextClass: Record<string, string> = {
  甲: "text-emerald-300",
  乙: "text-emerald-300",
  寅: "text-emerald-300",
  卯: "text-emerald-300",
  丙: "text-red-300",
  丁: "text-red-300",
  巳: "text-red-300",
  午: "text-red-300",
  戊: "text-amber-300",
  己: "text-amber-300",
  辰: "text-amber-300",
  戌: "text-amber-300",
  丑: "text-amber-300",
  未: "text-amber-300",
  庚: "text-slate-200",
  辛: "text-slate-200",
  申: "text-slate-200",
  酉: "text-slate-200",
  壬: "text-sky-300",
  癸: "text-sky-300",
  子: "text-sky-300",
  亥: "text-sky-300",
};

function toHanja(ganji: string): string {
  const stem = ganji[0] ?? "";
  const branch = ganji[1] ?? "";
  return `${stemHanja[stem] ?? stem}${branchHanja[branch] ?? branch}`;
}

function cycleElementClass(character: string, selected: boolean): string {
  return selected
    ? highlightedElementTextClass[character] ?? "text-white"
    : elementTextClass[character] ?? "text-stone-900";
}

function IndicatorCard({
  label,
  footer,
  ganji,
  dayStem,
  dayBranch,
  selected = false,
  onClick,
}: {
  label: string;
  footer: string;
  ganji: string;
  dayStem: string;
  dayBranch: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const hanja = toHanja(ganji);
  const indicators = getFortuneCycleIndicators({ dayStem, dayBranch, ganji });
  const subdued = selected ? "text-white/70" : "text-stone-500";
  const detail = selected ? "text-white/80" : "text-stone-600";

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center rounded-2xl px-3 py-4 text-center transition ${
        selected ? "bg-stone-900 text-white" : "bg-stone-50 text-stone-900"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`text-sm font-semibold ${selected ? "text-white/80" : "text-stone-700"}`}>
        {label}
      </span>

      <span className={`mt-2 min-h-5 text-xs font-semibold ${subdued}`}>
        {indicators.stemTenGod || " "}
      </span>

      <div className="mt-1 flex flex-col items-center text-3xl font-bold leading-none">
        <span className={cycleElementClass(hanja[0] ?? "", selected)}>{hanja[0]}</span>
        <span className={`mt-1 ${cycleElementClass(hanja[1] ?? "", selected)}`}>{hanja[1]}</span>
      </div>

      <span className={`mt-2 min-h-5 text-xs font-semibold ${subdued}`}>
        {indicators.branchTenGod || " "}
      </span>

      <div className={`mt-1 flex min-h-11 flex-col items-center justify-start text-xs font-medium leading-5 ${detail}`}>
        <span>{indicators.twelveStage || " "}</span>
        <span>{indicators.twelveSpirit || " "}</span>
      </div>

      <span className={`mt-2 text-[13px] font-medium ${subdued}`}>{footer}</span>
    </button>
  );
}

export default function FortuneCycleSections({
  daeunAnalysis,
  displayedSeun,
  dayStem,
  dayBranch,
  effectiveDaeunOrder,
  onSelectDaeun,
}: {
  daeunAnalysis?: DaeunAnalysis | null;
  displayedSeun?: SeunAnalysis | null;
  dayStem: string;
  dayBranch: string;
  effectiveDaeunOrder: number | null;
  onSelectDaeun: (order: number) => void;
}) {
  return (
    <>
      {daeunAnalysis ? (
        <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm tracking-[0.25em] text-stone-500">DAEUN ANALYSIS</p>
          <h2 className="mt-1 text-2xl font-bold">대운 분석</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-sm text-stone-500">대운 방향</p>
              <p className="mt-2 text-lg font-bold">{daeunAnalysis.direction}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-sm text-stone-500">대운 시작</p>
              <p className="mt-2 text-lg font-bold">{daeunAnalysis.startAge}세</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto pb-1">
            <div className="grid min-w-[980px] grid-cols-10 gap-2">
              {[...daeunAnalysis.daeuns].reverse().map((daeun) => (
                <IndicatorCard
                  key={daeun.order}
                  label={`${daeun.order}대운`}
                  footer={`${daeunAnalysis.startAge + (daeun.order - 1) * 10}세`}
                  ganji={daeun.ganji}
                  dayStem={dayStem}
                  dayBranch={dayBranch}
                  selected={effectiveDaeunOrder === daeun.order}
                  onClick={() => onSelectDaeun(daeun.order)}
                />
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-stone-500">
            각 대운은 위에서부터 천간 십성, 간지, 지지 십성, 십이운성, 십이신살 순으로 표시합니다.
          </p>
        </div>
      ) : null}

      {displayedSeun ? (
        <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-sm tracking-[0.25em] text-stone-500">SEUN ANALYSIS</p>
          <h2 className="mt-1 text-2xl font-bold">세운 분석</h2>

          <div className="mt-5 overflow-x-auto pb-1">
            <div className="grid min-w-[980px] grid-cols-10 gap-2">
              {[...displayedSeun.items].reverse().map((item) => (
                <IndicatorCard
                  key={item.year}
                  label={`${item.year}`}
                  footer={`${item.age}세`}
                  ganji={item.ganji}
                  dayStem={dayStem}
                  dayBranch={dayBranch}
                />
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-stone-500">
            세운도 일간·일지 기준으로 천간/지지 십성, 십이운성, 십이신살을 함께 표시합니다.
          </p>
        </div>
      ) : null}
    </>
  );
}
