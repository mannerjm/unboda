import type { Element } from "./elements";

export interface FortuneYongshinFlow {
  primary: Element;
  secondary: Element[];
  primaryActive: boolean;
  secondaryActive: Element[];
  activationScore: number;
  level: "강함" | "보통" | "약함";
}

export function analyzeFortuneYongshinFlow(
  primary: Element,
  secondary: Element[],
  activeElements: Element[]
): FortuneYongshinFlow {
  const primaryCount = activeElements.filter(
    (element) => element === primary
  ).length;

  const secondaryActive = secondary.filter((element) =>
    activeElements.includes(element)
  );

  const activationScore =
    primaryCount * 2 + secondaryActive.length;

  const level: FortuneYongshinFlow["level"] =
    activationScore >= 3
      ? "강함"
      : activationScore >= 1
        ? "보통"
        : "약함";

  return {
    primary,
    secondary,
    primaryActive: primaryCount > 0,
    secondaryActive,
    activationScore,
    level,
  };
}