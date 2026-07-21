"use client";
import { calculateWeightedElements } from "../lib/elements";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { getSaju } from "../lib/manse";
type SajuResult = ReturnType<typeof getSaju>;

const titleIcons: Record<string, string> = {
  "한눈에 보는 핵심": "✨",
  "성격과 강점": "💪",
  "보완하면 좋은 점": "⚠️",
  "직업과 일": "💼",
  재물운: "💰",
  인간관계: "❤️",
  "올해 실천하면 좋은 것": "🎯",
  "운보다 한마디": "💬",
};

function formatUnbodaMessage(text: string) {
  const headingPattern = /^#{1,6}\s*운보다 한마디\s*$/m;
  const match = headingPattern.exec(text);

  if (!match) {
    return text;
  }

  const headingEnd = match.index + match[0].length;
  const beforeMessage = text.slice(0, headingEnd);
  const message = text.slice(headingEnd).trim();

  if (!message) {
    return text;
  }

  const quotedMessage = message
    .split("\n")
    .map((line) => (line.trim() ? `> ${line.trim()}` : ">"))
    .join("\n");

  return `${beforeMessage}\n\n${quotedMessage}`;
}
type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

const fiveElementMap: Record<string, FiveElement> = {
  // 천간
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",

  // 지지
  寅: "wood",
  卯: "wood",
  巳: "fire",
  午: "fire",
  辰: "earth",
  戌: "earth",
  丑: "earth",
  未: "earth",
  申: "metal",
  酉: "metal",
  子: "water",
  亥: "water",
};

const fiveElementStyles: Record<
  FiveElement,
  {
    label: string;
    normal: string;
    highlighted: string;
  }
> = {
  wood: {
    label: "목",
    normal: "text-emerald-700",
    highlighted: "text-emerald-300",
  },
  fire: {
    label: "화",
    normal: "text-red-600",
    highlighted: "text-red-300",
  },
  earth: {
    label: "토",
    normal: "text-amber-700",
    highlighted: "text-amber-300",
  },
  metal: {
    label: "금",
    normal: "text-slate-600",
    highlighted: "text-slate-200",
  },
  water: {
    label: "수",
    normal: "text-blue-700",
    highlighted: "text-sky-300",
  },
};

function getFiveElementStyle(
  character: string | undefined,
  highlighted = false
) {
  const element = character ? fiveElementMap[character] : undefined;

  if (!element) {
    return {
      label: "",
      textClass: highlighted ? "text-white" : "text-stone-900",
    };
  }

  const style = fiveElementStyles[element];

  return {
    label: style.label,
    textClass: highlighted ? style.highlighted : style.normal,
  };
}
function ganjiToHanja(ganji: string) {
  const stemMap: Record<string, string> = {
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

  const branchMap: Record<string, string> = {
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

  const stem = ganji[0] ?? "";
  const branch = ganji[1] ?? "";

  return `${stemMap[stem] ?? stem}${branchMap[branch] ?? branch}`;
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState("");
const [sajuData, setSajuData] = useState<SajuResult | null>(null);
  const birthDate = searchParams.get("birthDate") || "입력 없음";
  const birthTime = searchParams.get("birthTime") || "입력 없음";
  const gender = searchParams.get("gender") || "입력 없음";

  useEffect(() => {
    const savedResult = sessionStorage.getItem("sajuResult");
const savedSaju = sessionStorage.getItem("sajuData");
    if (savedResult) {
      setAiResult(savedResult);
    } 
    if (savedSaju) {
    setSajuData(JSON.parse(savedSaju));
    console.log("저장된 사주 데이터:", JSON.parse(savedSaju));
}
    else {
      setAiResult("AI 분석 결과를 찾을 수 없습니다.");
    }
  }, []);

 if (!sajuData) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
      <p className="text-sm text-stone-500">
        사주 데이터를 불러오는 중입니다...
      </p>
    </main>
  );
}
console.log("저장된 사주 데이터", sajuData);
console.log("신강신약", sajuData.strengthAnalysis);
console.log("오행해석", sajuData.elementInterpretation);


if (
  !sajuData.strengthAnalysis ||
  !sajuData.elementInterpretation ||
  !sajuData.elementRelations
) {

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-stone-900">
          새 분석 데이터가 없습니다.
        </p>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          사주 입력 화면으로 돌아가서 다시 조회해 주세요.
        </p>
      </div>
    </main>
  );
}

const elementAnalysis = calculateWeightedElements(
  [
    sajuData.yearStem,
    sajuData.monthStem,
    sajuData.dayStem,
    sajuData.hourStem,
  ],
  [
    sajuData.yearBranch,
    sajuData.monthBranch,
    sajuData.dayBranch,
    sajuData.hourBranch,
  ]
);
const strengthAnalysis = sajuData.strengthAnalysis;
const elementInterpretation = sajuData.elementInterpretation;
const elementRelations = sajuData.elementRelations;

const elementItems = [
  { key: "목", label: "목" },
  { key: "화", label: "화" },
  { key: "토", label: "토" },
  { key: "금", label: "금" },
  { key: "수", label: "수" },
] as const;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-14 text-stone-900">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 text-center">
          <p className="mb-4 text-xs tracking-[0.35em] text-stone-500">
            UNBODA AI REPORT
          </p>

          <h1 className="text-4xl font-bold sm:text-5xl">
            당신의 사주 리포트
          </h1>

          <p className="mt-4 text-sm leading-7 text-stone-600">
            입력하신 출생 정보를 바탕으로 만든
            <br className="sm:hidden" />
            운보다 AI 참고용 분석입니다.
          </p>
        </header>

        <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
          <p className="mb-5 text-sm font-semibold tracking-wider text-stone-500">
            입력 정보
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <InfoCard label="생년월일" value={birthDate} />
            <InfoCard label="태어난 시간" value={birthTime} />
            <InfoCard label="성별" value={gender} />
          </div>
        </section>
<section className="mb-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
  <div className="mb-8 flex items-end justify-between">
    <div>
      <p className="mb-2 text-xs tracking-[0.3em] text-stone-500">
        FOUR PILLARS
      </p>

      <h2 className="text-2xl font-bold text-stone-900">
        사주팔자
      </h2>
    </div>

    <p className="text-sm text-stone-500">
      시 · 일 · 월 · 년
    </p>
  </div>

  <div className="grid grid-cols-4 gap-2 sm:gap-4">
    {[
      {
        label: "시주",
        stem: sajuData.hourStem,
        branch: sajuData.hourBranch,
         tenGod: sajuData.hourTenGod,
          branchTenGod: sajuData.hourBranchTenGod,
          stage: sajuData.hourStage,
           hiddenStems: sajuData.hourHiddenStems,
           spirit: sajuData.hourSpirit,
            noble: sajuData.hourNoble,
              nobles: sajuData.hourNobles,
      },
      {
        label: "일주",
        stem: sajuData.dayStem,
        branch: sajuData.dayBranch,
         tenGod: sajuData.dayTenGod,
          branchTenGod: sajuData.dayBranchTenGod,
        highlighted: true,
        stage: sajuData.dayStage,
          hiddenStems: sajuData.dayHiddenStems,
            spirit: sajuData.daySpirit,
            noble: sajuData.dayNoble,
             nobles: sajuData.dayNobles,
      },
      {
        label: "월주",
        stem: sajuData.monthStem,
        branch: sajuData.monthBranch,
          tenGod: sajuData.monthTenGod,
           branchTenGod: sajuData.monthBranchTenGod,
           stage: sajuData.monthStage,
             hiddenStems: sajuData.monthHiddenStems,
               spirit: sajuData.monthSpirit,
                noble: sajuData.monthNoble,
                  nobles: sajuData.monthNobles,
      },
      {
         label: "년주",
  stem: sajuData.yearStem,
  branch: sajuData.yearBranch,
  tenGod: sajuData.yearTenGod,
  branchTenGod: sajuData.yearBranchTenGod,
  stage: sajuData.yearStage,
    hiddenStems: sajuData.yearHiddenStems,
     spirit: sajuData.yearSpirit,
       noble: sajuData.yearNoble,
        nobles: sajuData.yearNobles,
      },
    ].map((pillar) => {
  const stemStyle = getFiveElementStyle(
    pillar.stem,
    pillar.highlighted
  );

  const branchStyle = getFiveElementStyle(
    pillar.branch,
    pillar.highlighted
  );

  return (
  <div
    key={pillar.label}
    className={`h-full overflow-hidden rounded-2xl border text-center ${
      pillar.highlighted
        ? "border-stone-900 bg-stone-900 text-white shadow-md"
        : "border-stone-200 bg-stone-50 text-stone-900"
    }`}
  >
    <div
      className={`border-b px-2 py-3 ${
        pillar.highlighted
          ? "border-white/20"
          : "border-stone-200"
      }`}
    >
      <p className="text-sm font-semibold">{pillar.label}</p>

      {pillar.tenGod && (
        <p
          className={`mt-1 text-xs ${
            pillar.highlighted
              ? "text-white/60"
              : "text-stone-500"
          }`}
        >
          {pillar.tenGod}
        </p>
      )}
    </div>

    <div className="flex min-h-[125px] flex-col items-center justify-center px-2 py-4">
      <p
        className={`mb-1 text-[11px] ${
          pillar.highlighted
            ? "text-white/50"
            : "text-stone-400"
        }`}
      >
        천간
      </p>

      <p
        className={`text-4xl font-bold sm:text-5xl ${stemStyle.textClass}`}
      >
        {pillar.stem || "-"}
      </p>

      {stemStyle.label && (
        <p
          className={`mt-1 text-[11px] ${
            pillar.highlighted
              ? "text-white/60"
              : "text-stone-400"
          }`}
        >
          {stemStyle.label}
        </p>
      )}
    </div>

    <div
      className={`flex min-h-[155px] flex-col items-center justify-center border-t px-2 py-4 ${
        pillar.highlighted
          ? "border-white/20"
          : "border-stone-200"
      }`}
    >
      <p
        className={`mb-1 text-[11px] ${
          pillar.highlighted
            ? "text-white/50"
            : "text-stone-400"
        }`}
      >
        지지
      </p>

      <p
        className={`mb-1 text-xs ${
          pillar.highlighted
            ? "text-white/70"
            : "text-stone-500"
        }`}
      >
        {pillar.branchTenGod || ""}
      </p>

      <p
        className={`text-4xl font-bold sm:text-5xl ${branchStyle.textClass}`}
      >
        {pillar.branch || "-"}
      </p>

      {branchStyle.label && (
        <p
          className={`mt-1 text-[11px] ${
            pillar.highlighted
              ? "text-white/60"
              : "text-stone-400"
          }`}
        >
          {branchStyle.label}
        </p>
      )}
      {Array.isArray(pillar.hiddenStems) &&
  pillar.hiddenStems.length > 0 && (
    <div className="mt-3">
      <p
        className={`mb-1 text-[10px] ${
          pillar.highlighted
            ? "text-white/50"
            : "text-stone-400"
        }`}
      >
        지장간
      </p>

      <div className="flex flex-wrap justify-center gap-1">
        {pillar.hiddenStems.map(
          (hiddenStem: string, index: number) => (
            <span
              key={`${hiddenStem}-${index}`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                pillar.highlighted
                  ? "bg-white/10 text-white/75"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {hiddenStem}
            </span>
          )
        )}
      </div>
    </div>
  )}

      {pillar.stage && (
        <span
          className={`mt-3 rounded-full px-3 py-1 text-[11px] font-medium ${
            pillar.highlighted
              ? "bg-white/10 text-white/75"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {pillar.stage}
        </span>
      )}
      {pillar.spirit && (
  <span
    className={`mt-2 rounded-full px-3 py-1 text-[11px] font-medium ${
      pillar.highlighted
        ? "bg-white/10 text-white/75"
        : "bg-stone-100 text-stone-500"
    }`}
  >
    {pillar.spirit}
  </span>
)}
{pillar.nobles?.map((noble: string, index: number) => (
  <span
    key={index}
    className={`mt-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
      pillar.highlighted
        ? "bg-amber-300/20 text-amber-200"
        : "bg-amber-50 text-amber-700"
    }`}
  >
    {noble}
  </span>
))}
    </div>
  </div>
);
})}
</div>
    

  <p className="mt-6 text-center text-xs leading-6 text-stone-500">
    일주는 본인을 중심으로 보는 기둥이므로 화면에서 강조해 표시했습니다.
  </p>
</section>
{sajuData.daeunAnalysis && (
  <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
    <p className="text-sm tracking-[0.25em] text-stone-500">
      DAEUN ANALYSIS
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      대운 분석
    </h2>

    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="rounded-2xl bg-stone-50 p-5">
        <p className="text-sm text-stone-500">
          대운 방향
        </p>
        <p className="mt-2 text-lg font-bold">
          {sajuData.daeunAnalysis.direction}
        </p>
      </div>

      <div className="rounded-2xl bg-stone-50 p-5">
        <p className="text-sm text-stone-500">
          대운 시작
        </p>
        <p className="mt-2 text-lg font-bold">
          {sajuData.daeunAnalysis.startAge}세
        </p>
      </div>
    </div>

    <div className="mt-6">
  <div className="grid grid-cols-10 gap-2">
    {[...sajuData.daeunAnalysis.daeuns]
      .reverse()
      .map((daeun: { order: number; ganji: string }) => {
        const hanja = ganjiToHanja(daeun.ganji);

        return (
          <div
            key={daeun.order}
            className="flex min-w-0 flex-col items-center rounded-2xl bg-stone-50 px-2 py-4"
          >
            <span className="text-xs font-semibold text-stone-600">
              {daeun.order}대운
            </span>

            <div className="mt-3 flex flex-col items-center text-2xl font-bold leading-none">
              <span>{hanja[0]}</span>
              <span className="mt-1">{hanja[1]}</span>
            </div>

            <span className="mt-3 text-xs text-stone-500">
              {sajuData.daeunAnalysis.startAge +
                (daeun.order - 1) * 10}
              세
            </span>
          </div>
        );
      })}
  </div>
</div>
</div>
)}

<section className="mt-7 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-7 flex items-end justify-between gap-4">
    <div>
      <p className="mb-2 text-xs tracking-[0.3em] text-stone-500">
        FIVE ELEMENTS
      </p>

      <h2 className="text-2xl font-bold text-stone-900">
        오행 분석
      </h2>
    </div>

    <p className="text-xs text-stone-500">
  천간·지지·지장간 반영
</p>
  </div>

  <div className="space-y-5">
    {elementItems.map((item) => {
      const score = elementAnalysis.counts[item.key];
      const percentage =
        elementAnalysis.percentages[item.key];

      return (
        <div key={item.key}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-800">
                {item.label}
              </span>

              <span className="text-sm font-semibold text-stone-800">
                {score}점
              </span>
            </div>

            <span className="text-sm font-bold text-stone-700">
              {percentage}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-stone-800 transition-all duration-500"
              style={{
                width: `${Math.min(percentage, 100)}%`,
              }}
            />
          </div>
        </div>
      );
    })}
  </div>

  <div className="mt-8 grid gap-4 sm:grid-cols-2">
    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="mb-2 text-xs text-stone-500">
        가장 강한 오행
      </p>

      <p className="text-lg font-bold text-stone-900">
        {elementAnalysis.strongest.join(", ")}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="mb-2 text-xs text-stone-500">
        가장 약한 오행
      </p>

      <p className="text-lg font-bold text-stone-900">
        {elementAnalysis.weakest.join(", ")}
      </p>
    </div>
  </div>

  <p className="mt-6 text-center text-xs leading-6 text-stone-500">
    현재 결과는 천간·지지·지장간 가중치를 반영한
    오행 점수 v1입니다.
  </p>
</section>
<section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-7 flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-lg text-white">
      ⚖
    </div>

    <div>
      <p className="text-xs tracking-[0.25em] text-stone-500">
        STRENGTH ANALYSIS
      </p>

      <h2 className="mt-1 text-2xl font-bold">
        신강·신약 참고 지표
      </h2>
    </div>
  </div>

  <div className="rounded-2xl bg-stone-50 p-6">
    <p className="text-lg font-semibold">
      판정 :
      <span className="ml-2 text-indigo-600">
        {strengthAnalysis.level}
      </span>
    </p>

    <p className="mt-3 text-stone-700">
      {strengthAnalysis.summary}
    </p>
  </div>
</section>
<section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-6">
    <p className="text-xs tracking-[0.25em] text-stone-500">
      YONGSHIN ANALYSIS
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      용신 분석
    </h2>
  </div>

  <div className="space-y-4">
    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        주 용신
      </p>

      <p className="mt-2 text-lg font-bold">
        {sajuData.yongshinAnalysis.primary}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        보조 용신
      </p>

      <p className="mt-2 text-stone-700">
        {sajuData.yongshinAnalysis.secondary.length > 0
          ? sajuData.yongshinAnalysis.secondary.join(", ")
          : "없음"}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
  <p className="font-semibold">
    용신 점수
  </p>

  <div className="mt-3 space-y-2 text-sm text-stone-700">
    {Object.entries(sajuData.yongshinAnalysis.scores)
      .sort(([, a], [, b]) => b - a)
      .map(([element, score]) => {
  const detail =
    sajuData.yongshinAnalysis.scoreDetails[
      element as keyof typeof sajuData.yongshinAnalysis.scoreDetails
    ];

  return (
    <div
      key={element}
      className="rounded-xl border border-stone-200 bg-white p-3"
    >
      <div className="flex items-center justify-between font-semibold">
        <span>{element}</span>
        <div className="text-right">
  <div className="font-semibold">
    보완 우선도 {
  sajuData.yongshinAnalysis.normalizedScores[
    element as keyof typeof sajuData.yongshinAnalysis.normalizedScores
  ].toFixed(1)
}
  </div>
  <div className="text-xs text-stone-400">
    원점수 {score.toFixed(1)}
  </div>
</div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-stone-500">
  <span>신강·신약: {detail.strength.toFixed(1)}</span>
  <span>균형 보정: {detail.balance.toFixed(1)}</span>
  <span>계절 보정: {detail.season.toFixed(1)}</span>
  <span>조후 보정: {detail.climate.toFixed(1)}</span>
  <span>통관 보정: {detail.passage.toFixed(1)}</span>
  <span>과다 보정: {detail.excess.toFixed(1)}</span>
</div>
    </div>
  );
})}
  </div>
</div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        판단 근거
      </p>

      <p className="mt-2 leading-7 text-stone-700">
        {sajuData.yongshinAnalysis.reason}
      </p>
    </div>
  </div>
</section>
<section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-6">
    <p className="text-xs tracking-[0.25em] text-stone-500">
      GYEOKGUK ANALYSIS
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      격국 분석
    </h2>
  </div>

  <div className="space-y-4">
    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        주 격국
      </p>

      <p className="mt-2 text-lg font-bold">
        {sajuData.gyeokgukAnalysis.primary}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        후보 격국
      </p>

      <p className="mt-2 text-stone-700">
        {sajuData.gyeokgukAnalysis.candidates.length > 0
          ? sajuData.gyeokgukAnalysis.candidates.join(", ")
          : "없음"}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        판단 근거
      </p>

      <p className="mt-2 leading-7 text-stone-700">
        {sajuData.gyeokgukAnalysis.reason}
      </p>
    </div>
  </div>
</section>

<section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-6">
    <p className="text-xs tracking-[0.25em] text-stone-500">
      FIVE ELEMENT INTERPRETATION
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      오행 해석
    </h2>
  </div>

  <div className="space-y-5">
    {elementInterpretation.items.map(
  (
    item: {
      element: string;
      level: string;
      description: string;
    }
  ) => (
      <div
        key={item.element}
        className="rounded-2xl bg-stone-50 p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {item.element}
          </h3>

          <span className="rounded-full bg-stone-900 px-3 py-1 text-sm text-white">
            {item.level}
          </span>
        </div>

        <p className="mt-3 leading-7 text-stone-700">
          {item.description}
        </p>
      </div>
    ))}
  </div>
</section>
<section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mb-6">
    <p className="text-xs tracking-[0.25em] text-stone-500">
      ELEMENT RELATIONS
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      오행 상생·상극
    </h2>
  </div>

  <p className="mb-6 text-sm leading-7 text-stone-600">
    {elementRelations.summary}
  </p>

  <div className="grid gap-4 sm:grid-cols-2">
    {elementRelations.highlights.map(
      (
        relation: {
          source: string;
          target: string;
          type: string;
          strength: string;
          description: string;
        },
        index: number
      ) => (
        <div
          key={`${relation.source}-${relation.target}-${relation.type}-${index}`}
          className="rounded-2xl bg-stone-50 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-stone-900">
              {relation.source} → {relation.target}
            </p>

            <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white">
              {relation.type} · {relation.strength}
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-stone-600">
            {relation.description}
          </p>
        </div>
      )
    )}
  </div>
</section>
        <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-lg text-white">
              運
            </div>

            <div>
              <p className="text-xs tracking-[0.25em] text-stone-500">
                AI ANALYSIS
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                운보다 AI 분석
              </h2>
            </div>
          </div>

          <div className="text-[16px] leading-9 text-stone-700">
  {aiResult ? (
    <ReactMarkdown
      components={{
        h1: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <section className="mb-6 mt-12 border-t border-stone-200 pt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl"
        >
          {icon}
        </span>
        <span>{children}</span>
      </h2>
    </section>
  );
},

h2: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <section className="mb-6 mt-12 border-t border-stone-200 pt-8">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-xl"
        >
          {icon}
        </span>
        <span>{children}</span>
      </h2>
    </section>
  );
},

h3: ({ children }) => {
  const title = String(children);
  const icon = titleIcons[title] || "✦";

  return (
    <h3 className="mb-5 mt-10 flex items-center gap-3 text-xl font-bold text-stone-900">
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </h3>
  );
},
        p: ({ children }) => (
          <p className="mb-6 leading-9">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-6 space-y-3 pl-6">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="list-disc">{children}</li>
        ),
        blockquote: ({ children }) => (
  <blockquote className="my-8 rounded-3xl border border-stone-200 bg-stone-50 px-7 py-6 text-lg font-medium leading-8 text-stone-800 shadow-sm">
    {children}
  </blockquote>
),
        strong: ({ children }) => (
          <strong className="font-bold text-stone-900">{children}</strong>
        ),
      }}
    >
      {formatUnbodaMessage(aiResult)}
    </ReactMarkdown>
  ) : (
    "분석 결과를 불러오는 중입니다..."
  )}
</div>
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/saju")}
            className="rounded-2xl border border-stone-300 bg-white px-5 py-4 font-semibold transition hover:bg-stone-50"
          >
            다시 분석하기
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
          >
            리포트 인쇄하기
          </button>
        </div>

        <p className="mt-8 text-center text-xs leading-6 text-stone-500">
          본 리포트는 참고용 콘텐츠이며 중요한 건강·법률·투자 결정은
          관련 전문가와 상담해 주세요.
        </p>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f3ea] px-5 py-4">
      <p className="mb-2 text-xs text-stone-500">{label}</p>
      <p className="font-semibold text-stone-900">{value}</p>
    </div>
  );
}