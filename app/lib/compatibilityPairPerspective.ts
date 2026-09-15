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

function copyForLevel(
  direction: CompatibilityPairPerspective["direction"],
  level: CompatibilityDirectionalStructureInfluence["level"],
): Pick<CompatibilityPairPerspective, "headline" | "summary"> {
  const receiver = direction === "me_to_partner" ? "상대방" : "나";

  if (level === "supportive") {
    return {
      headline: `${receiver}에게 힘을 보태는 작용이 더 커요`,
      summary: `이 방향에서는 보완 작용이 부담보다 더 크게 나타납니다. ${receiver}의 선택과 움직임을 넓혀 주는 방식으로 연결되기 쉬운 편입니다.`,
    };
  }

  if (level === "burdensome") {
    return {
      headline: `${receiver}에게는 부담으로 느껴질 여지가 더 커요`,
      summary: `이 방향에서는 부담 작용이 상대적으로 더 크게 나타납니다. 좋은 의도라도 ${receiver}가 받아들이는 속도와 방식을 확인하며 조절하는 편이 좋습니다.`,
    };
  }

  if (level === "mixed") {
    return {
      headline: `${receiver}에게 도움과 부담이 함께 작동해요`,
      summary: `보완과 부담 신호가 함께 나타납니다. 같은 행동도 상황에 따라 도움이 되거나 압박으로 느껴질 수 있어, 관계의 속도와 방식을 맞추는 것이 중요합니다.`,
    };
  }

  return {
    headline: `${receiver}에게 한쪽으로 강하게 치우치지 않아요`,
    summary: `뚜렷한 보완이나 부담이 한 방향으로 강하게 나타나지는 않습니다. 이 영향만으로 결론을 내리기보다 두 사람의 소통·갈등·회복 근거와 함께 보는 편이 적절합니다.`,
  };
}

function buildSignals(item: CompatibilityDirectionalStructureInfluence): readonly string[] {
  const signals: string[] = [];

  if (item.leadingSupport.length > 0) {
    signals.push("서로를 보완하는 작용이 확인됩니다.");
  }
  if (item.leadingBurden.length > 0) {
    signals.push("상황에 따라 부담으로 번질 수 있는 작용도 함께 있습니다.");
  }
  if (signals.length === 0) {
    signals.push("한쪽 방향의 영향보다 전체 관계 패턴을 함께 보는 것이 중요합니다.");
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
    ...copyForLevel(direction, item.level),
    signals: buildSignals(item),
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
