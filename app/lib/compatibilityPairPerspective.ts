import type {
  CompatibilityDirectionalStructureInfluence,
} from "./compatibilityPersonalStructure";
import type { CompatibilityTimingResult } from "./compatibilityTiming";

export type CompatibilityPairPerspective = {
  direction: "me_to_partner" | "partner_to_me";
  level: CompatibilityDirectionalStructureInfluence["level"];
  headline: string;
  summary: string;
  signals: readonly string[];
};

export type CompatibilityPairPerspectives = Readonly<{
  meToPartner: CompatibilityPairPerspective;
  partnerToMe: CompatibilityPairPerspective;
}>;

const ELEMENT_CUSTOMER_LABELS = {
  목: "성장과 확장 방식",
  화: "표현과 반응의 온도",
  토: "안정감과 생활 기준",
  금: "기준과 결정 방식",
  수: "관계의 흐름과 유연성",
} as const;

function receiverLabel(direction: CompatibilityPairPerspective["direction"]): "상대방" | "나" {
  return direction === "me_to_partner" ? "상대방" : "나";
}

function leadingElementLabel(
  item: CompatibilityDirectionalStructureInfluence,
  kind: "support" | "burden",
): string | null {
  const element = kind === "support"
    ? item.leadingSupport[0]?.element
    : item.leadingBurden[0]?.element;
  return element ? ELEMENT_CUSTOMER_LABELS[element] : null;
}

function copyForLevel(
  direction: CompatibilityPairPerspective["direction"],
  item: CompatibilityDirectionalStructureInfluence,
): Pick<CompatibilityPairPerspective, "headline" | "summary"> {
  const receiver = receiverLabel(direction);
  const supportElement = leadingElementLabel(item, "support");
  const burdenElement = leadingElementLabel(item, "burden");

  if (item.level === "supportive") {
    return {
      headline: `${receiver}에게 힘을 보태는 작용이 더 커요`,
      summary: supportElement
        ? `${supportElement}에서 보완 작용이 더 크게 나타납니다. ${receiver}의 선택과 움직임을 넓혀 주는 방향으로 연결되기 쉬운 편입니다.`
        : `이 방향에서는 보완 작용이 부담보다 더 크게 나타납니다. ${receiver}의 선택과 움직임을 넓혀 주는 방향으로 연결되기 쉬운 편입니다.`,
    };
  }

  if (item.level === "burdensome") {
    return {
      headline: `${receiver}에게는 부담으로 느껴질 여지가 더 커요`,
      summary: burdenElement
        ? `${burdenElement}에서 부담 작용이 상대적으로 더 두드러집니다. 좋은 의도라도 ${receiver}가 받아들이는 속도와 방식을 확인하며 조절하는 편이 좋습니다.`
        : `이 방향에서는 부담 작용이 상대적으로 더 크게 나타납니다. 좋은 의도라도 ${receiver}가 받아들이는 속도와 방식을 확인하며 조절하는 편이 좋습니다.`,
    };
  }

  if (item.level === "mixed") {
    if (supportElement && burdenElement) {
      return {
        headline: `${receiver}에게 도움과 부담이 함께 작동해요`,
        summary: `도움 쪽에서는 ${supportElement}, 부담 쪽에서는 ${burdenElement}가 상대적으로 두드러집니다. 같은 행동도 상황에 따라 도움이 되거나 압박으로 느껴질 수 있어 속도와 방식을 맞추는 것이 중요합니다.`,
      };
    }
    return {
      headline: `${receiver}에게 도움과 부담이 함께 작동해요`,
      summary: `보완과 부담 신호가 함께 나타납니다. 같은 행동도 상황에 따라 도움이 되거나 압박으로 느껴질 수 있어, 관계의 속도와 방식을 맞추는 것이 중요합니다.`,
    };
  }

  return {
    headline: `${receiver}에게 한쪽으로 강하게 치우치지 않아요`,
    summary: `뚜렷한 보완이나 부담이 한 방향으로 강하게 나타나지는 않습니다. 이 영향만으로 결론을 내리기보다 두 사람의 소통·갈등·회복 흐름과 함께 보는 편이 적절합니다.`,
  };
}

function buildSignals(
  direction: CompatibilityPairPerspective["direction"],
  item: CompatibilityDirectionalStructureInfluence,
): readonly string[] {
  const signals: string[] = [];
  const receiver = receiverLabel(direction);
  const supportElement = leadingElementLabel(item, "support");
  const burdenElement = leadingElementLabel(item, "burden");

  if (supportElement) {
    signals.push(`${supportElement}은 ${receiver}에게 힘을 보태는 쪽으로 작용하기 쉽습니다.`);
  }
  if (burdenElement) {
    signals.push(`${burdenElement}은 ${receiver}에게 상황에 따라 부담으로 커질 수 있습니다.`);
  }
  if (signals.length === 0) {
    signals.push(`${receiver}에게 미치는 영향은 한 방향으로 단정하기보다 전체 관계 흐름과 함께 보는 편이 좋습니다.`);
  }

  return signals;
}

function buildPerspective(
  direction: CompatibilityPairPerspective["direction"],
  item: CompatibilityDirectionalStructureInfluence,
): CompatibilityPairPerspective {
  return {
    direction,
    level: item.level,
    ...copyForLevel(direction, item),
    signals: buildSignals(direction, item),
  };
}

export function buildCompatibilityPairPerspectives(
  timingResult: CompatibilityTimingResult,
): CompatibilityPairPerspectives {
  return {
    meToPartner: buildPerspective(
      "me_to_partner",
      timingResult.base.directionalInfluence.BReceivesFromA,
    ),
    partnerToMe: buildPerspective(
      "partner_to_me",
      timingResult.base.directionalInfluence.AReceivesFromB,
    ),
  };
}
