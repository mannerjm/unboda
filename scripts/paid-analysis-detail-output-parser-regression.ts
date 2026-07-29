import { parsePaidAnalysisDetailOutput } from "../app/lib/paidAnalysisDetailOutputParser";

const result = parsePaidAnalysisDetailOutput({
  headline: "관계 흐름이 바뀌는 시점, 선택 기준을 먼저 확인하세요.",
  whyThisAnalysis:
    "현재 관계운의 변화가 커지고 있어 감정만으로 판단하기보다 관계의 방향과 우선순위를 점검할 필요가 있습니다.",
  currentFlow:
    "주변 관계의 재편과 역할 변화가 겹치면서 가까워질 인연과 거리를 조절할 관계가 함께 드러나는 흐름입니다.",
  questionsAnswered: [
    "현재 관계에서 가장 먼저 점검해야 할 문제는 무엇인가요?",
    "관계를 이어갈 때 유리한 시기와 조심해야 할 시기는 언제인가요?",
    "상대와의 거리와 역할을 어떻게 조절해야 하나요?",
  ],
  expectedBenefits: [
    "관계에서 반복되는 갈등의 원인을 구체적으로 이해할 수 있습니다.",
    "중요한 대화와 선택을 진행할 적절한 시기를 확인할 수 있습니다.",
    "감정에 휘둘리지 않고 현실적인 대응 방향을 정리할 수 있습니다.",
  ],
  whyNow:
    "관계의 방향이 굳어지기 전에 기준을 세우면 불필요한 오해와 소모를 줄일 수 있는 시점입니다.",
  ctaMessage:
    "현재 관계 흐름에 맞는 시기와 대응 방향을 심층 분석에서 구체적으로 확인해보세요.",
});

console.log("headline 검증:", result.headline.length > 0);