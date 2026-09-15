from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    value = p.read_text(encoding="utf-8")
    count = value.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(value.replace(old, new, 1), encoding="utf-8")


config = "app/lib/paidAnalysisTopicConfig.ts"

replace_once(
    config,
    '      "비연애 대인관계에서 도움·조언·소개·협력이 오가는 지원 패턴",',
    '      "대인관계에서 도움·조언·소개·협력이 오가는 지원 패턴",',
)
replace_once(
    config,
    '''    excludedFocus: [
      { id: "romantic-new-connection", prompt: "새로운 연애 상대와의 접점·호감·연애 가능성을 탐색하는 분석" },
      { id: "friendship-only-recalibration", prompt: "기존 친구 관계의 감정 노동·상호성·교류 빈도를 재조정하는 분석" },
      { id: "network-expansion-reach", prompt: "새 모임·활동·접점을 늘려 인맥의 폭과 지속 연결을 확장하는 분석" },
    ],''',
    '''    excludedFocus: [
      { id: "friendship-only-recalibration", prompt: "기존 친구 관계의 감정 노동·상호성·교류 빈도를 재조정하는 분석" },
      { id: "network-expansion-reach", prompt: "새 모임·활동·접점을 늘려 인맥의 폭과 지속 연결을 확장하는 분석" },
      { id: "romantic-new-connection", prompt: "새로운 연애 상대와의 접점·호감·연애 가능성을 탐색하는 분석" },
    ],''',
)
replace_once(
    config,
    '    userQuestion: "연애가 아닌 일반 대인관계에서 어떤 상호작용이 갈등을 반복시키고, 어느 거리·대화·역할 기준을 조정해야 하는가?",',
    '    userQuestion: "대인관계에서 어떤 상호작용이 갈등을 반복시키고, 어느 거리·대화·역할 기준을 조정해야 하는가?",',
)
replace_once(
    config,
    '      "비연애 대인관계에서 갈등을 시작시키는 상황·말·요청과 반복 반응 순서",',
    '      "대인관계에서 갈등을 시작시키는 상황·말·요청과 반복 반응 순서",',
)
replace_once(
    config,
    '''    excludedFocus: [
      { id: "romantic-conflict-recovery", prompt: "현재 연애 관계의 갈등 후 회복 가능성·대화 재개·관계 지속을 판단하는 분석" },
      { id: "friendship-reciprocity", prompt: "친구 관계의 연락·도움·감정 노동과 상호성을 중심으로 재조정하는 분석" },
      { id: "workplace-performance-collaboration", prompt: "상사·동료·업무 이해관계자와의 협업을 성과·책임·에스컬레이션 관점에서 분석하는 범위" },
    ],''',
    '''    excludedFocus: [
      { id: "friendship-reciprocity", prompt: "친구 관계의 연락·도움·감정 노동과 상호성을 중심으로 재조정하는 분석" },
      { id: "workplace-performance-collaboration", prompt: "상사·동료·업무 이해관계자와의 협업을 성과·책임·에스컬레이션 관점에서 분석하는 범위" },
      { id: "romantic-conflict-recovery", prompt: "현재 연애 관계의 갈등 후 회복 가능성·대화 재개·관계 지속을 판단하는 분석" },
    ],''',
)
replace_once(
    config,
    '      "비연애 새로운 인맥이 생기는 활동·환경·공동 관심사와 반복 접점",',
    '      "새로운 인맥이 생기는 활동·환경·공동 관심사와 반복 접점",',
)
replace_once(
    config,
    '''    excludedFocus: [
      { id: "romantic-new-connection", prompt: "새로운 연애 상대의 호감·접근·초기 신뢰를 중심으로 하는 분석" },
      { id: "existing-friend-family-recalibration", prompt: "이미 형성된 친구·가족 관계의 역할·상호성·거리 문제를 재조정하는 분석" },
      { id: "career-business-network-outcome", prompt: "취업·승진·영업·고객 확보 같은 직업·사업 성과를 위한 네트워킹 결과를 판단하는 분석" },
    ],''',
    '''    excludedFocus: [
      { id: "existing-friend-family-recalibration", prompt: "이미 형성된 친구·가족 관계의 역할·상호성·거리 문제를 재조정하는 분석" },
      { id: "career-business-network-outcome", prompt: "취업·승진·영업·고객 확보 같은 직업·사업 성과를 위한 네트워킹 결과를 판단하는 분석" },
      { id: "romantic-new-connection", prompt: "새로운 연애 상대의 호감·접근·초기 신뢰를 중심으로 하는 분석" },
    ],''',
)

analysis = "app/lib/analysisTopics.ts"
replace_once(
    analysis,
    '    shortDescription: "연애가 아닌 일반 대인관계에서 반복되는 갈등과 거리·대화·역할 조정 기준을 분석합니다.",',
    '    shortDescription: "대인관계에서 반복되는 갈등과 거리·대화·역할 조정 기준을 분석합니다.",',
)
replace_once(
    analysis,
    '    shortDescription: "새로운 비연애 인맥이 실제 연결로 이어지는 접점과 후속 교류 기준을 분석합니다.",',
    '    shortDescription: "새로운 인맥이 실제 연결로 이어지는 접점과 후속 교류 기준을 분석합니다.",',
)

regression = "scripts/social-launch-expansion-regression.ts"
replace_once(
    regression,
    'assert(socialConflictQuestion.includes("연애가 아닌"), "social conflict scope must explicitly exclude romantic conflict");',
    '''assert(!socialConflictQuestion.includes("연애") && !socialConflictQuestion.includes("비연애"), "social conflict customer question must focus on interpersonal conflict without romantic contrast wording");''',
)
replace_once(
    regression,
    'assert(conflictMetadata.includes("일반 대인관계"), "social-conflict metadata must own general non-romantic scope");',
    '''assert(conflictMetadata.includes("대인관계"), "social-conflict metadata must clearly own interpersonal scope");
assert(!conflictMetadata.includes("연애") && !conflictMetadata.includes("비연애"), "social-conflict customer metadata must not use romantic contrast wording");''',
)
replace_once(
    regression,
    '''for (const forbidden of ["인연", "시기와 환경"]) {
  assert(!networkMetadata.includes(forbidden), `social-network-expansion metadata must not promise ${forbidden}`);
}''',
    '''for (const forbidden of ["인연", "시기와 환경", "연애", "비연애"]) {
  assert(!networkMetadata.includes(forbidden), `social-network-expansion metadata must not promise or contrast with ${forbidden}`);
}

for (const productId of activatedSocialIds) {
  const config = getPaidAnalysisTopicConfig(productId)!;
  const customerFacingContractText = [config.userQuestion, ...config.analysisFocus].join("\\n");
  assert(!customerFacingContractText.includes("연애") && !customerFacingContractText.includes("비연애"), `${productId} customer-facing contract text must stay focused on 대인관계 itself`);
  const firstExcluded = config.excludedFocus?.[0]?.prompt ?? "";
  assert(!firstExcluded.includes("연애"), `${productId} first comparison shown to customers must not contrast against romance`);
  assert((config.excludedFocus ?? []).some((item) => item.id.startsWith("romantic-")), `${productId} must retain an internal romantic-scope exclusion`);
}''',
)

print("social user-facing copy patch applied")
