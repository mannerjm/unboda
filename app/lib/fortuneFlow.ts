import {
  findBranchCombination,
  findBranchClash,
  findBranchPunishment,
  findBranchBreak,
  findBranchHarm,
  type FortuneRelationType,
} from "./fortuneRelations";

export interface FortuneFlowInput {
  originalPillars: string[];
  daeunGanji: string;
  seunGanji: string;
}

export interface FortuneFlowRelation {
  source: "원국" | "대운";
  sourceGanji: string;
  target: "대운" | "세운";
  targetGanji: string;
  type: FortuneRelationType;
}

export interface FortuneFlowAnalysis {
  originalPillars: string[];
  daeunGanji: string;
  seunGanji: string;
  relations: FortuneFlowRelation[];
}

function analyzeBranchRelations(
  source: "원국" | "대운",
  sourceGanji: string,
  target: "대운" | "세운",
  targetGanji: string
): FortuneFlowRelation[] {
  const sourceBranch = sourceGanji[1];
  const targetBranch = targetGanji[1];

  const relations: FortuneFlowRelation[] = [];

  if (findBranchCombination(sourceBranch, targetBranch)) {
    relations.push({ source, sourceGanji, target, targetGanji, type: "합" });
  }

  if (findBranchClash(sourceBranch, targetBranch)) {
    relations.push({ source, sourceGanji, target, targetGanji, type: "충" });
  }

  if (findBranchPunishment(sourceBranch, targetBranch)) {
    relations.push({ source, sourceGanji, target, targetGanji, type: "형" });
  }

  if (findBranchBreak(sourceBranch, targetBranch)) {
    relations.push({ source, sourceGanji, target, targetGanji, type: "파" });
  }

  if (findBranchHarm(sourceBranch, targetBranch)) {
    relations.push({ source, sourceGanji, target, targetGanji, type: "해" });
  }

  return relations;
}

export function analyzeFortuneFlow(
  input: FortuneFlowInput
): FortuneFlowAnalysis {
  const relations: FortuneFlowRelation[] = [];

  for (const pillar of input.originalPillars) {
    relations.push(
      ...analyzeBranchRelations(
        "원국",
        pillar,
        "대운",
        input.daeunGanji
      )
    );

    relations.push(
      ...analyzeBranchRelations(
        "원국",
        pillar,
        "세운",
        input.seunGanji
      )
    );
  }

  relations.push(
    ...analyzeBranchRelations(
      "대운",
      input.daeunGanji,
      "세운",
      input.seunGanji
    )
  );

  return {
    originalPillars: input.originalPillars,
    daeunGanji: input.daeunGanji,
    seunGanji: input.seunGanji,
    relations,
  };
}