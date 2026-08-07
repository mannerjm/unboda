import fs from "node:fs";
import path from "node:path";

const clientPath = path.join(
  process.cwd(),
  "app",
  "paid-analysis",
  "[productId]",
  "PaidAnalysisDetailV2Client.tsx",
);

const source = fs.readFileSync(clientPath, "utf8");

const requiredMappings = [
  {
    productId: "health",
    analysisType: "건강운 심층 분석",
  },
  {
    productId: "love",
    analysisType: "연애운 심층 분석",
  },
  {
    productId: "relationship",
    analysisType: "연애·관계 심층 분석",
  },
  {
    productId: "career",
    analysisType: "직업운 심층 분석",
  },
  {
    productId: "money",
    analysisType: "재물운 심층 분석",
  },
  {
    productId: "wealth",
    analysisType: "재물운 심층 분석",
  },
];

for (const mapping of requiredMappings) {
  const caseExpression = `case "${mapping.productId}":`;
  const returnExpression = `return "${mapping.analysisType}";`;

  const caseIndex = source.indexOf(caseExpression);

  if (caseIndex === -1) {
    throw new Error(
      `상품 ID 매핑 case를 찾지 못했습니다: ${mapping.productId}`,
    );
  }

  const returnIndex = source.indexOf(returnExpression, caseIndex);

  if (returnIndex === -1) {
    throw new Error(
      `상품 ID ${mapping.productId}가 ${mapping.analysisType}으로 연결되지 않았습니다.`,
    );
  }

  const defaultIndex = source.indexOf("default:", caseIndex);

  if (defaultIndex !== -1 && returnIndex > defaultIndex) {
    throw new Error(
      `상품 ID ${mapping.productId}의 잘못된 분석 타입 매핑을 탐지했습니다.`,
    );
  }
}

const relationshipCaseIndex = source.indexOf('case "relationship":');
const relationshipReturnIndex = source.indexOf(
  'return "연애·관계 심층 분석";',
  relationshipCaseIndex,
);

console.log(
  "relationship 상품 ID 매핑 포함:",
  relationshipCaseIndex !== -1,
);

console.log(
  "relationship 연애·관계 분석 연결:",
  relationshipReturnIndex !== -1,
);

console.log("paid analysis product id mapping regression passed");