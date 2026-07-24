"use client";
import { calculateWeightedElements } from "../lib/elements";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { getSaju } from "../lib/manse";
import { calculateSeun } from "../lib/seun";
import { restoreStoredResult } from "@/app/lib/restoreStoredResult";
import type { AnalyzeFreeResponse } from "@/app/lib/analyzeApiTypes";
import type { AnalysisProductRecommendationResult } from "@/app/lib/analysisProductRecommendations";
import { paidAnalysisProducts as paidAnalysisProductCatalog } from "@/app/lib/paidAnalysisProducts";

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

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState("");
const [sajuData, setSajuData] = useState<SajuResult | null>(null);
const [freeAnalysis, setFreeAnalysis] =
  useState<AnalyzeFreeResponse | null>(null);

 const [
  productRecommendations,
  setProductRecommendations,
] = useState<AnalysisProductRecommendationResult | null>(null);

const [isStorageChecked, setIsStorageChecked] = useState(false);
const [selectedPaidAnalysisId, setSelectedPaidAnalysisId] =
  useState<string | null>(null);

const birthDate = searchParams.get("birthDate") || "입력 없음";
  const birthTime = searchParams.get("birthTime") || "입력 없음";
  const gender = searchParams.get("gender") || "입력 없음";

const [selectedDaeunOrder, setSelectedDaeunOrder] = useState<number | null>(null);
const selectedDaeunStartYear =
  (freeAnalysis?.daeunAnalysis ?? sajuData?.daeunAnalysis) &&
  selectedDaeunOrder
    ? Number(birthDate.slice(0, 4)) +
      (freeAnalysis?.daeunAnalysis.startAge ??
        sajuData!.daeunAnalysis.startAge) +
      (selectedDaeunOrder - 1) * 10 -
      1
    : null;

const displayedSeun =
  selectedDaeunStartYear !== null
    ? calculateSeun(
        Number(birthDate.slice(0, 4)),
        selectedDaeunStartYear,
         freeAnalysis?.dayStem ?? sajuData!.dayStem,
        10
      )
    : freeAnalysis?.seunAnalysis ?? sajuData?.seunAnalysis ?? null;

 useEffect(() => {
  const savedResult = sessionStorage.getItem("sajuResult");
  const savedSaju = sessionStorage.getItem("sajuData");
  const savedFreeAnalysis = sessionStorage.getItem("freeAnalysis");

  const savedProductRecommendations =
  sessionStorage.getItem("productRecommendations");

  const restored = restoreStoredResult(
    savedResult,
    savedSaju
  );

  if (!restored.ok) {
  setAiResult(restored.message);
  setIsStorageChecked(true);
  return;
}

setAiResult(restored.result);
setSajuData(restored.saju);
setIsStorageChecked(true);

if (savedFreeAnalysis) {
  const parsedFreeAnalysis =
    JSON.parse(savedFreeAnalysis) as AnalyzeFreeResponse;

  setFreeAnalysis(parsedFreeAnalysis);

  console.log(
    "저장된 무료 분석 데이터:",
    parsedFreeAnalysis
  );
}

if (savedProductRecommendations) {
  const parsedProductRecommendations =
    JSON.parse(
      savedProductRecommendations
    ) as AnalysisProductRecommendationResult;

  setProductRecommendations(parsedProductRecommendations);
}

}, []);


useEffect(() => {
  if (!sajuData?.daeunAnalysis || selectedDaeunOrder !== null) {
    return;
  }

  const birthYear = Number(birthDate.slice(0, 4));
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear + 1;

  const startAge = sajuData.daeunAnalysis.startAge;

  const currentDaeunOrder = Math.min(
    10,
    Math.max(1, Math.floor((currentAge - startAge) / 10) + 1)
  );

  setSelectedDaeunOrder(currentDaeunOrder);
}, [sajuData, birthDate, selectedDaeunOrder]);

if (!isStorageChecked) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
      <p className="text-sm text-stone-500">
        사주 데이터를 불러오는 중입니다...
      </p>
    </main>
  );
}
if (!sajuData) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-stone-900">
          {aiResult || "AI 분석 결과를 찾을 수 없습니다."}
        </p>
      </div>
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

const elementAnalysis =
  freeAnalysis?.elementAnalysis ??
  calculateWeightedElements(
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
const strengthAnalysis =
  freeAnalysis?.strengthAnalysis ?? sajuData.strengthAnalysis;

const elementInterpretation =
  freeAnalysis?.elementInterpretation ?? sajuData.elementInterpretation;

 const yongshinAnalysis =
  freeAnalysis?.yongshinAnalysis ?? sajuData.yongshinAnalysis;

const gyeokgukAnalysis =
  freeAnalysis?.gyeokgukAnalysis ?? sajuData.gyeokgukAnalysis;  

const daeunAnalysis =
  freeAnalysis?.daeunAnalysis ?? sajuData.daeunAnalysis;  

const elementRelations = sajuData.elementRelations;

const elementItems = [
  { key: "목", label: "목" },
  { key: "화", label: "화" },
  { key: "토", label: "토" },
  { key: "금", label: "금" },
  { key: "수", label: "수" },
] as const;

const paidAnalysisProducts = [
  {
    id: "career-business",
    title: "직업·사업운 심층 분석",
    description:
      "직업 변화, 이직, 사업 흐름과 중요한 선택 시기를 깊게 살펴봅니다.",
    details: [
      "직업 변화와 역할 전환이 나타나는 명리학적 이유",
      "이직·승진·사업 변화가 강해지는 중요한 시기",
      "기회로 활용할 수 있는 직업과 사업 흐름",
      "무리한 이동이나 결정에 주의할 시기",
      "현재 상황에서 고려할 현실적인 선택 방향",
    ],
  },
  {
    id: "wealth",
    title: "재물운 심층 분석",
    description:
      "돈의 흐름, 기회가 커지는 시기와 지출·손실에 주의할 흐름을 분석합니다.",
    details: [
      "현재 재물 흐름이 형성되는 명리학적 이유",
      "수입과 재정 변화가 강해지는 중요한 시기",
      "재물 기회를 활용하기 좋은 흐름",
      "지출·손실·과도한 판단에 주의할 시기",
      "현재 재정 상황에서 살펴볼 현실적인 대응 방향",
    ],
  },
  {
    id: "relationship",
    title: "연애·관계 심층 분석",
    description:
      "관계의 변화, 인연의 흐름과 현재 관계에서 살펴볼 핵심 포인트를 분석합니다.",
    details: [
      "현재 관계 흐름이 나타나는 명리학적 이유",
      "새로운 인연과 관계 변화가 강해지는 시기",
      "관계를 발전시키기 좋은 흐름",
      "갈등과 거리감에 주의할 시기와 요인",
      "현재 관계에서 살펴볼 현실적인 대응 방향",
    ],
  },
] as const;

const recommendedPaidAnalysisProducts =
  productRecommendations?.recommendations.map(
    (recommendation) =>
      paidAnalysisProductCatalog[recommendation.productId]
  ) ?? [];

const displayedPaidAnalysisProducts =
  recommendedPaidAnalysisProducts.length > 0
    ? recommendedPaidAnalysisProducts
    : paidAnalysisProducts;

const selectedPaidAnalysis = displayedPaidAnalysisProducts.find(
  (product) => product.id === selectedPaidAnalysisId
);

function handlePaidAnalysisEntry(productId: string) {
  router.push(`/paid-analysis/${productId}`);
}

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
       stem: freeAnalysis?.hourStem ?? sajuData.hourStem,
branch: freeAnalysis?.hourBranch ?? sajuData.hourBranch,
tenGod: freeAnalysis?.hourTenGod ?? sajuData.hourTenGod,
branchTenGod:
  freeAnalysis?.hourBranchTenGod ?? sajuData.hourBranchTenGod,
  highlighted: false,
stage: freeAnalysis?.hourStage ?? sajuData.hourStage,
hiddenStems:
  freeAnalysis?.hourHiddenStems ?? sajuData.hourHiddenStems,
spirit: freeAnalysis?.hourSpirit ?? sajuData.hourSpirit,
noble: freeAnalysis?.hourNoble ?? sajuData.hourNoble,
nobles: freeAnalysis?.hourNobles ?? sajuData.hourNobles,
      },
      {
        label: "일주",
        stem: freeAnalysis?.dayStem ?? sajuData.dayStem,
branch: freeAnalysis?.dayBranch ?? sajuData.dayBranch,
tenGod: freeAnalysis?.dayTenGod ?? sajuData.dayTenGod,
branchTenGod:
  freeAnalysis?.dayBranchTenGod ?? sajuData.dayBranchTenGod,
  highlighted: true,
stage: freeAnalysis?.dayStage ?? sajuData.dayStage,
hiddenStems:
  freeAnalysis?.dayHiddenStems ?? sajuData.dayHiddenStems,
spirit: freeAnalysis?.daySpirit ?? sajuData.daySpirit,
noble: freeAnalysis?.dayNoble ?? sajuData.dayNoble,
nobles: freeAnalysis?.dayNobles ?? sajuData.dayNobles,
      },
      {
        label: "월주",
       stem: freeAnalysis?.monthStem ?? sajuData.monthStem,
  branch: freeAnalysis?.monthBranch ?? sajuData.monthBranch,
  tenGod: freeAnalysis?.monthTenGod ?? sajuData.monthTenGod,
  branchTenGod:
    freeAnalysis?.monthBranchTenGod ?? sajuData.monthBranchTenGod,
    highlighted: false,
  stage: freeAnalysis?.monthStage ?? sajuData.monthStage,
  hiddenStems:
    freeAnalysis?.monthHiddenStems ?? sajuData.monthHiddenStems,
  spirit: freeAnalysis?.monthSpirit ?? sajuData.monthSpirit,
  noble: freeAnalysis?.monthNoble ?? sajuData.monthNoble,
  nobles: freeAnalysis?.monthNobles ?? sajuData.monthNobles,
      },
      {
         label: "년주",
    stem: freeAnalysis?.yearStem ?? sajuData.yearStem,
  branch: freeAnalysis?.yearBranch ?? sajuData.yearBranch,
  tenGod: freeAnalysis?.yearTenGod ?? sajuData.yearTenGod,
  branchTenGod:
    freeAnalysis?.yearBranchTenGod ?? sajuData.yearBranchTenGod,
    highlighted: false,
  stage: freeAnalysis?.yearStage ?? sajuData.yearStage,
  hiddenStems:
    freeAnalysis?.yearHiddenStems ?? sajuData.yearHiddenStems,
  spirit: freeAnalysis?.yearSpirit ?? sajuData.yearSpirit,
  noble: freeAnalysis?.yearNoble ?? sajuData.yearNoble,
  nobles: freeAnalysis?.yearNobles ?? sajuData.yearNobles,
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
{daeunAnalysis && (
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
          {daeunAnalysis.direction}
        </p>
      </div>

      <div className="rounded-2xl bg-stone-50 p-5">
        <p className="text-sm text-stone-500">
          대운 시작
        </p>
        <p className="mt-2 text-lg font-bold">
          {daeunAnalysis.startAge}세
        </p>
      </div>
    </div>

    <div className="mt-6">
  <div className="grid grid-cols-10 gap-2">
    {[...daeunAnalysis.daeuns]
      .reverse()
      .map((daeun: { order: number; ganji: string }) => {
        const hanja = ganjiToHanja(daeun.ganji);

        return (
          <div
  key={daeun.order}
  onClick={() => setSelectedDaeunOrder(daeun.order)}
  className={`flex min-w-0 cursor-pointer flex-col items-center rounded-2xl px-2 py-4 transition ${
    selectedDaeunOrder === daeun.order
      ? "bg-stone-900 text-white"
      : "bg-stone-50"
  }`}
>
            <span className="text-xs font-semibold text-stone-600">
              {daeun.order}대운
            </span>

            <div className="mt-3 flex flex-col items-center text-2xl font-bold leading-none">
              <span>{hanja[0]}</span>
              <span className="mt-1">{hanja[1]}</span>
            </div>

            <span className="mt-3 text-xs text-stone-500">
              {daeunAnalysis.startAge +
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
{displayedSeun && (
  <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
    <p className="text-sm tracking-[0.25em] text-stone-500">
      SEUN ANALYSIS
    </p>

    <h2 className="mt-1 text-2xl font-bold">
      세운 분석
    </h2>

    <div className="mt-6 grid grid-cols-10 gap-2">
      {[...displayedSeun.items]
  .reverse()
  .map(
        (item: { year: number; age: number; ganji: string }) => {
          const hanja = ganjiToHanja(item.ganji);

          return (
            <div
              key={item.year}
              className="flex min-w-0 flex-col items-center rounded-2xl bg-stone-50 px-2 py-4"
            >
              <span className="text-xs font-semibold text-stone-600">
                {item.year}
              </span>

              <div className="mt-3 flex flex-col items-center text-2xl font-bold leading-none">
                <span>{hanja[0]}</span>
                <span className="mt-1">{hanja[1]}</span>
              </div>

              <span className="mt-3 text-xs text-stone-500">
                {item.age}세
              </span>
            </div>
          );
        }
      )}
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
        {yongshinAnalysis.primary}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        보조 용신
      </p>

      <p className="mt-2 text-stone-700">
        {yongshinAnalysis.secondary.length > 0
  ? yongshinAnalysis.secondary.join(", ")
  : "없음"}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
  <p className="font-semibold">
    용신 점수
  </p>

  <div className="mt-3 space-y-2 text-sm text-stone-700">
    {Object.entries(yongshinAnalysis.scores)
      .sort(([, a], [, b]) => b - a)
      .map(([element, score]) => {
  const detail =
  yongshinAnalysis.scoreDetails[
    element as keyof typeof yongshinAnalysis.scoreDetails
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
    보완 우선도{" "}
{yongshinAnalysis.normalizedScores[
  element as keyof typeof yongshinAnalysis.normalizedScores
].toFixed(1)}

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
        {yongshinAnalysis.reason}
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
        {gyeokgukAnalysis.primary}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        후보 격국
      </p>

      <p className="mt-2 text-stone-700">
        {gyeokgukAnalysis.candidates.length > 0
  ? gyeokgukAnalysis.candidates.join(", ")
  : "없음"}
      </p>
    </div>

    <div className="rounded-2xl bg-stone-50 p-5">
      <p className="font-semibold">
        판단 근거
      </p>

      <p className="mt-2 leading-7 text-stone-700">
        {gyeokgukAnalysis.reason}
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
<section className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
  <div className="mx-auto max-w-2xl text-center">
    <p className="text-xs font-semibold tracking-[0.25em] text-stone-500">
      NEXT ANALYSIS
    </p>

    <h2 className="mt-3 text-2xl font-bold text-stone-900">
      무료 분석에서 확인한 흐름을 더 깊게 살펴보세요
    </h2>

    <p className="mt-4 text-sm leading-7 text-stone-600">
      지금까지의 무료 분석은 당신의 사주 구조와 현재 운의 흐름을
      이해하기 위한 핵심 분석입니다. 더 깊은 분석에서는 같은 명리
      데이터를 바탕으로 변화의 이유와 중요한 시기, 기회와 주의 요인,
      현실적인 대응 방향까지 살펴볼 수 있습니다.
    </p>
  </div>

  <div className="mt-7 grid gap-4 md:grid-cols-3">
  {displayedPaidAnalysisProducts.map((product) => (
    <button
  key={product.id}
  type="button"
  onClick={() => setSelectedPaidAnalysisId(product.id)}
      className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white hover:shadow-sm"
    >
      <p className="text-sm font-bold text-stone-900">
        {product.title}
      </p>

      <p className="mt-3 text-sm leading-6 text-stone-600">
        {product.description}
      </p>

      <p className="mt-5 text-sm font-semibold text-stone-900">
        자세히 보기 →
      </p>
    </button>
  ))}
</div>
{selectedPaidAnalysis && (
  <div className="mt-6 rounded-2xl border border-stone-300 bg-stone-50 p-6">
    <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
      SELECTED ANALYSIS
    </p>

    <h3 className="mt-3 text-xl font-bold text-stone-900">
      {selectedPaidAnalysis.title}
    </h3>

    <p className="mt-3 text-sm leading-7 text-stone-600">
      {selectedPaidAnalysis.description}
    </p>

    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-semibold text-stone-900">
        심층 분석에서 확인할 수 있는 내용
      </p>

      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
  {selectedPaidAnalysis.details.map((detail) => (
  <li key={detail}>• {detail}</li>
))}
</ul>
    </div>

    <button
  type="button"
  onClick={() => handlePaidAnalysisEntry(selectedPaidAnalysis.id)}
  className="mt-5 w-full rounded-2xl bg-stone-900 px-5 py-4 font-semibold text-white transition hover:bg-stone-800"
>
  이 분석 자세히 보기
</button>
  </div>
)}
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
export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
          <p className="text-sm text-stone-500">
            사주 결과를 불러오는 중입니다...
          </p>
        </main>
      }
    >
      <ResultPageContent />
    </Suspense>
  );
}