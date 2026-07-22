import type { Element } from "./elements";
import { analyzeFortuneFlow } from "./fortuneFlow";
import { analyzeFortuneElementFlow } from "./fortuneElementFlow";
import { analyzeFortuneYongshinFlow } from "./fortuneYongshinFlow";

export interface FortuneFlowAnalysisInput {
  originalPillars: string[];
  daeunGanji: string;
  seunGanji: string;

  originalElements: Record<Element, number>;
  addedElements: Element[];

  primaryYongshin: Element;
  secondaryYongshin: Element[];
}

export function analyzeFullFortuneFlow(
  input: FortuneFlowAnalysisInput
) {
  const relationAnalysis = analyzeFortuneFlow({
    originalPillars: input.originalPillars,
    daeunGanji: input.daeunGanji,
    seunGanji: input.seunGanji,
  });

  const elementFlow = analyzeFortuneElementFlow(
    input.originalElements,
    input.addedElements
  );

  const yongshinFlow = analyzeFortuneYongshinFlow(
    input.primaryYongshin,
    input.secondaryYongshin,
    input.addedElements
  );

  return {
    relations: relationAnalysis.relations,
    elementFlow,
    yongshinFlow,
  };
}