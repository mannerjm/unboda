import { readFileSync } from "node:fs";
import { buildCompatibilityTiming } from "../app/lib/compatibilityTiming";
import {
  FAMILY_PARENT_CHILD_DOMAINS,
  buildFamilyParentChildCompatibility,
} from "../app/lib/familyCompatibilityParentChild";
import {
  buildFamilyParentChildReportContext,
  buildFamilyParentChildReportPrompt,
  validateFamilyParentChildReportOutput,
} from "../app/lib/familyCompatibilityParentChildReportContract";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const parent = {
  pillars: {
    year: "甲子",
    month: "丙寅",
    day: "甲子",
    hour: "乙卯",
  },
};

const child = {
  pillars: {
    year: "己丑",
    month: "癸亥",
    day: "己午",
    hour: "丁未",
  },
};

const timing = buildCompatibilityTiming(parent, child, {
  evaluationYear: 2026,
  A: { daeunGanji: "甲子", seunGanji: "丙子" },
  B: { daeunGanji: "己丑", seunGanji: "丁午" },
});

const parentUser = buildFamilyParentChildCompatibility(timing, "parent");
const childUser = buildFamilyParentChildCompatibility(timing, "child");
const parentUserAgain = buildFamilyParentChildCompatibility(timing, "parent");

assert(JSON.stringify(parentUser) === JSON.stringify(parentUserAgain), "parent-child interpretation must be deterministic");
assert(parentUser.relationshipType === "parent_child", "family result must preserve parent-child scope");
assert(parentUser.roleSemantics.A === "parent" && parentUser.roleSemantics.B === "child", "user role must map explicitly when user is parent");
assert(childUser.roleSemantics.A === "child" && childUser.roleSemantics.B === "parent", "user role must map explicitly when user is child");
assert(!("overallScore" in parentUser) && !("score" in parentUser), "family compatibility must not expose one overall score");

for (const domain of FAMILY_PARENT_CHILD_DOMAINS) {
  const natal = parentUser.domains[domain];
  const current = parentUser.currentTiming.domains[domain];
  assert(natal.domain === domain, `natal family domain ${domain} must be present`);
  assert(current.domain === domain, `timing family domain ${domain} must be present`);
  assert(natal.confidence >= 0 && natal.confidence <= 1, `${domain} natal confidence must stay normalized`);
  assert(current.confidence >= 0 && current.confidence <= 1, `${domain} timing confidence must stay normalized`);
  assert(natal.pressure.support >= 0 && natal.pressure.tension >= 0, `${domain} natal pressures must stay non-negative`);
  assert(current.pressure.support >= 0 && current.pressure.tension >= 0, `${domain} timing pressures must stay non-negative`);
}

assert(parentUser.directions.parentToChild.fromRole === "parent", "parent-to-child direction must stay semantic");
assert(parentUser.directions.parentToChild.toRole === "child", "parent-to-child target must stay semantic");
assert(parentUser.directions.childToParent.fromRole === "child", "child-to-parent direction must stay semantic");
assert(parentUser.directions.childToParent.toRole === "parent", "child-to-parent target must stay semantic");
assert(
  parentUser.directions.parentToChild.supportPressure === childUser.directions.childToParent.supportPressure
    && parentUser.directions.parentToChild.burdenPressure === childUser.directions.childToParent.burdenPressure
    && JSON.stringify(parentUser.directions.parentToChild.leadingSupportElements) === JSON.stringify(childUser.directions.childToParent.leadingSupportElements)
    && JSON.stringify(parentUser.directions.parentToChild.leadingBurdenElements) === JSON.stringify(childUser.directions.childToParent.leadingBurdenElements),
  "changing which person is labeled as parent must remap the same underlying A-to-B influence to the opposite family direction",
);
assert(
  parentUser.directions.childToParent.supportPressure === childUser.directions.parentToChild.supportPressure
    && parentUser.directions.childToParent.burdenPressure === childUser.directions.parentToChild.burdenPressure,
  "changing which person is labeled as parent must also remap the reverse influence",
);
assert(parentUser.currentTiming.parentLoad.person === "A", "parent timing load must follow semantic role mapping");
assert(childUser.currentTiming.parentLoad.person === "B", "parent timing load must remap when user is child");

const context = buildFamilyParentChildReportContext(parentUser);
assert(context.relationshipType === "parent_child", "report context must remain parent-child only");
assert(context.allowedEvidenceRefs.length === context.evidenceFacts.length, "all report facts must be explicitly allow-listed");
assert(context.allowedEvidenceRefs.some((id) => id === "family:direction:parent-to-child"), "report context must keep parent-to-child evidence");
assert(context.allowedEvidenceRefs.some((id) => id === "family:direction:child-to-parent"), "report context must keep child-to-parent evidence");
assert(context.allowedEvidenceRefs.some((id) => id === "family:natal-domain:expectations_autonomy"), "report context must include expectation/autonomy evidence");
assert(context.allowedEvidenceRefs.some((id) => id === "family:natal-domain:boundaries_pressure"), "report context must include boundary/pressure evidence");

const prompt = buildFamilyParentChildReportPrompt(context);
assert(prompt.system.includes("부모·자녀"), "family prompt must declare parent-child scope");
assert(prompt.system.includes("총점") && prompt.system.includes("방향성"), "family prompt must guard against score flattening and lost directionality");
assert(!prompt.system.includes("연애 조언"), "family prompt must not inherit romantic customer framing");

const ref = (id: string) => {
  assert(context.allowedEvidenceRefs.includes(id), `fixture evidence ref must exist: ${id}`);
  return id;
};

const validReport = validateFamilyParentChildReportOutput({
  relationshipCore: {
    headline: "가까움은 있지만 기대와 반응 속도를 맞추는 과정이 중요한 관계",
    summary: "서로를 챙기고 연결되려는 힘은 확인되지만, 기대를 표현하는 방식과 받아들이는 속도에는 차이가 생길 수 있습니다. 한쪽의 보호나 관심이 다른 쪽에는 압박으로 느껴지지 않도록 기준을 나누어 확인하는 것이 중요합니다.",
    evidenceRefs: [ref("family:natal-domain:emotional_connection"), ref("family:direction:parent-to-child")],
  },
  emotionalConnection: {
    summary: "정서적으로 다시 가까워질 여지는 남아 있으며, 감정을 한꺼번에 정리하기보다 서로의 반응 시간을 존중할 때 연결이 더 자연스럽습니다.",
    keyPoints: ["관심을 확인하는 방식이 다르더라도 관계를 이어가려는 힘은 남아 있습니다."],
    evidenceRefs: [ref("family:natal-domain:emotional_connection")],
  },
  communication: {
    summary: "대화에서는 말의 내용뿐 아니라 속도와 반응 시점이 중요합니다. 바로 답을 원하는 쪽과 생각할 시간이 필요한 쪽이 엇갈리면 같은 의도도 다르게 받아들일 수 있습니다.",
    keyPoints: ["중요한 이야기는 결론을 재촉하기보다 서로가 이해한 내용을 한 번씩 확인하는 편이 좋습니다."],
    evidenceRefs: [ref("family:natal-domain:communication")],
  },
  expectationAndAutonomy: {
    summary: "가족이라는 이유로 기대가 암묵적으로 커지기 쉬운 부분을 살펴볼 필요가 있습니다. 도움을 주는 범위와 스스로 결정할 범위를 나눌수록 관계의 긴장이 줄어듭니다.",
    keyPoints: ["도움이 필요한 영역과 각자 결정할 영역을 미리 구분해 두는 방식이 관계에 도움이 됩니다."],
    evidenceRefs: [ref("family:natal-domain:expectations_autonomy")],
  },
  boundariesAndPressure: {
    summary: "보호와 관심은 관계의 힘이 될 수 있지만, 타이밍이 맞지 않으면 간섭이나 압박처럼 느껴질 여지도 있습니다. 상대의 선택을 확인하기 전에 해결책부터 제시하는 습관은 줄이는 편이 좋습니다.",
    keyPoints: ["도움을 주기 전에 지금 필요한 것이 조언인지 공감인지 먼저 확인하면 부담을 낮출 수 있습니다."],
    evidenceRefs: [ref("family:natal-domain:boundaries_pressure"), ref("family:direction:parent-to-child")],
  },
  recovery: {
    summary: "갈등 뒤에는 누가 옳았는지 정리하는 것보다 다시 이야기할 수 있는 시점을 만드는 것이 중요합니다. 감정이 가라앉은 뒤 구체적인 한 가지 주제부터 다시 꺼내는 방식이 도움이 됩니다.",
    keyPoints: ["한 번의 대화에서 오래된 문제를 모두 꺼내기보다 지금 다룰 한 가지 주제를 정하는 편이 좋습니다."],
    evidenceRefs: [ref("family:natal-domain:recovery")],
  },
  currentTiming: {
    headline: "2026년에는 가까움보다 대화의 속도와 경계를 더 세심하게 맞출 시기",
    summary: "현재 흐름에서는 두 사람 모두 자신의 부담을 먼저 느끼기 쉬운 구간이 겹칠 수 있습니다. 중요한 주제를 다룰 때는 즉각적인 반응보다 시간을 두고 다시 확인하는 방식이 관계의 균형을 지키는 데 도움이 됩니다.",
    keyPoints: ["민감한 주제는 바로 결론을 내리기보다 서로 준비된 시간을 정해 다시 이야기하는 편이 좋습니다."],
    evidenceRefs: [ref("family:timing-domain:communication"), ref("family:timing-load:parent")],
  },
  actionGuide: {
    doNext: [
      {
        action: "이번 주에 서로 도움받고 싶은 부분과 스스로 결정하고 싶은 부분을 하나씩 말해봅니다.",
        reason: "기대와 독립의 경계를 말로 확인하면 보호가 압박으로 바뀌는 상황을 줄이는 데 도움이 됩니다.",
        evidenceRefs: [ref("family:natal-domain:expectations_autonomy")],
      },
      {
        action: "민감한 대화를 시작하기 전에 지금 이야기해도 괜찮은지 먼저 묻는 습관을 만들어봅니다.",
        reason: "대화 속도와 반응 시점을 맞추는 과정이 서로의 부담을 줄이고 회복할 여지를 넓혀줍니다.",
        evidenceRefs: [ref("family:natal-domain:communication"), ref("family:natal-domain:recovery")],
      },
    ],
    avoid: [
      {
        action: "상대의 선택을 듣기 전에 해결책이나 결론부터 정해 전달하는 행동은 줄입니다.",
        reason: "좋은 의도의 조언도 상대가 준비되지 않은 순간에는 통제나 압박처럼 느껴질 수 있습니다.",
        evidenceRefs: [ref("family:natal-domain:boundaries_pressure")],
      },
    ],
  },
}, context);
assert(validReport.relationshipCore.headline.length > 0, "valid parent-child report must pass the contract");

let romanticCopyRejected = false;
try {
  validateFamilyParentChildReportOutput({
    ...validReport,
    relationshipCore: {
      ...validReport.relationshipCore,
      headline: "연인처럼 가까워지는 것이 중요한 관계입니다",
    },
  }, context);
} catch {
  romanticCopyRejected = true;
}
assert(romanticCopyRejected, "parent-child report must reject romantic framing");

const engineSource = readFileSync("app/lib/familyCompatibilityParentChild.ts", "utf8");
const contractSource = readFileSync("app/lib/familyCompatibilityParentChildReportContract.ts", "utf8");
assert(!engineSource.includes("Math.random"), "family engine must remain deterministic");
assert(!engineSource.includes("openai"), "family engine must not depend on AI");
assert(engineSource.includes("parentToChild") && engineSource.includes("childToParent"), "family engine must preserve both directions");
assert(contractSource.includes("expectationAndAutonomy") && contractSource.includes("boundariesAndPressure"), "report contract must be family-specific rather than romantic copy reuse");
assert(contractSource.includes("연인·배우자용 표현을 사용하지 않습니다"), "family report prompt must explicitly block romantic wording");

console.log("family-compatibility-parent-child-regression: OK");
