import { getPeriodAnalysisStrategy } from "@/app/lib/analysisPeriodStrategy";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import type { PremiumProductDefinition } from "@/app/lib/premiumProductRegistry";

type PreviewCard = {
  step: string;
  title: string;
  description: string;
};

type PreviewModel = {
  eyebrow: string;
  question: string;
  cards: readonly PreviewCard[];
  topicLabel: string;
  topics: readonly string[];
  footer: string;
};

function normalizeSentence(value: string): string {
  return value
    .trim()
    .replace(/노력কে/g, "노력을")
    .replace(/[?？.。]+$/, "");
}

function buildTopicPreview(product: PremiumProductDefinition): PreviewModel | null {
  const config = getPaidAnalysisTopicConfig(product.id);
  if (!config) return null;

  const analysisFocus = config.analysisFocus.filter(Boolean);
  const actionFocus = config.actionFocus.filter(Boolean);
  const firstFocus = analysisFocus[0] ?? product.description;
  const secondFocus = analysisFocus[1] ?? analysisFocus[0] ?? product.description;
  const firstAction = actionFocus[0] ?? "현재 상황에서 먼저 실행할 행동과 다시 점검할 기준";

  return {
    eyebrow: "선택한 주제에 맞춘 리포트 구성",
    question: normalizeSentence(config.userQuestion),
    cards: [
      {
        step: "01",
        title: "핵심 결론과 우선 초점",
        description: `“${normalizeSentence(config.userQuestion)}”라는 질문을 기준으로 현재 방향과 먼저 볼 초점을 정리합니다.`,
      },
      {
        step: "02",
        title: "원인과 반복 구조",
        description: firstFocus,
      },
      {
        step: "03",
        title: "현실에서 확인할 신호",
        description: secondFocus,
      },
      {
        step: "04",
        title: config.decisionType === "decision" ? "결정 체크와 행동 기준" : "행동과 재검토 기준",
        description: firstAction,
      },
    ],
    topicLabel: "이 상품의 실제 생성 주제",
    topics: analysisFocus.slice(0, 4),
    footer: config.decisionType === "decision"
      ? "결정형 분석은 결론만 제시하지 않고, 실제 조건을 다시 확인할 결정 체크와 실행 기준까지 함께 구성합니다."
      : "탐색형 분석은 한 가지 결론으로 몰아가지 않고, 반복 구조와 현재 신호를 바탕으로 유지·조정할 기준을 정리합니다.",
  };
}

function buildPeriodPreview(product: PremiumProductDefinition): PreviewModel | null {
  const strategy = getPeriodAnalysisStrategy(product.id);
  if (!strategy) return null;

  const responsibilities = strategy.requiredInsights.map((insight) => insight.title);
  const timelineLabels = strategy.timelineSpec.labels;

  return {
    eyebrow: "선택한 기간에 맞춘 리포트 구성",
    question: normalizeSentence(strategy.coreQuestion),
    cards: [
      {
        step: "01",
        title: "기간 전체 핵심 흐름",
        description: `${normalizeSentence(strategy.coreQuestion)}를 기준으로 이 기간 전체를 관통하는 흐름을 먼저 정리합니다.`,
      },
      {
        step: "02",
        title: responsibilities[0] ?? "기간 고유 분석",
        description: strategy.focus[0] ?? product.description,
      },
      {
        step: "03",
        title: "기간별 변화 구간",
        description: timelineLabels.slice(0, 3).join(" · "),
      },
      {
        step: "04",
        title: "실행·재검토 기준",
        description: strategy.reviewArtifact,
      },
    ],
    topicLabel: "이 기간 상품의 실제 생성 주제",
    topics: responsibilities.slice(0, 4),
    footer: `시간 흐름은 ${timelineLabels.join(" · ")} 기준으로 나누어 보며, 실제 연·월·기간 표시는 결제 시점에 고정된 기준 기간에 맞춰 생성됩니다.`,
  };
}

export default function PremiumReportValuePreview({ product }: { product: PremiumProductDefinition }) {
  const preview = product.kind === "PERIOD"
    ? buildPeriodPreview(product)
    : buildTopicPreview(product);

  if (!preview) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#dfd2bc] bg-white shadow-[0_10px_30px_rgba(87,72,48,0.06)]">
      <div className="border-b border-[#eee4d5] bg-[linear-gradient(135deg,#f7f0e4_0%,#fffdf8_100%)] px-5 py-5 sm:px-6">
        <p className="text-[10px] font-bold tracking-[0.16em] text-stone-400">리포트 구성 미리보기</p>
        <p className="mt-2 text-base font-bold text-stone-900">{preview.eyebrow}</p>
        <p className="mt-2 text-xs leading-6 text-stone-500">
          실제 분석 결과를 미리 보여주는 화면이 아니라, 선택한 상품의 실제 생성 주제와 결과 구성 방식을 안내합니다.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="rounded-2xl bg-stone-950 px-4 py-4 text-white">
          <p className="text-[10px] font-bold tracking-[0.14em] text-stone-400">이 리포트가 답하는 핵심 질문</p>
          <p className="mt-2 text-sm font-semibold leading-6">{preview.question}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {preview.cards.map((card) => (
            <div key={card.step} className="rounded-2xl border border-stone-200 bg-[#fffdf9] p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">{card.step}</span>
                <p className="text-sm font-bold text-stone-900">{card.title}</p>
              </div>
              <p className="mt-3 text-xs leading-6 text-stone-600">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-xs font-bold text-stone-800">{preview.topicLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.topics.map((topic) => (
              <span key={topic} className="rounded-full border border-[#e6dbc8] bg-[#faf6ee] px-3 py-1.5 text-[11px] font-semibold leading-5 text-stone-700">
                {topic}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-stone-500">{preview.footer}</p>
          <p className="mt-2 text-[11px] leading-5 text-stone-400">실제 문장과 판단 기준은 선택한 프로필의 계산 결과와 분석 시점에 따라 달라집니다.</p>
        </div>
      </div>
    </div>
  );
}
