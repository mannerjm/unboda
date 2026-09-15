from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    value = read(path)
    count = value.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one marker, found {count}: {old[:120]!r}")
    write(path, value.replace(old, new, 1))


def replace_at_least_once(path: str, old: str, new: str) -> None:
    value = read(path)
    count = value.count(old)
    if count < 1:
        raise RuntimeError(f"{path}: marker not found: {old[:120]!r}")
    write(path, value.replace(old, new))


# 1) Activate three already-registered social taxonomy products with full paid contracts.
path = "app/lib/paidAnalysisTopicConfig.ts"
marker = '''  {
    productId: "health-energy-recovery", engine: "HEALTH",
'''
configs = '''  {
    productId: "social-helper", engine: "RELATIONSHIP",
    userQuestion: "주변 관계에서 실제로 도움을 주고받을 수 있는 관계를 어떤 신뢰 신호로 구분하고, 지원을 요청하거나 받아들일 기준을 어떻게 세워야 하는가?",
    analysisFocus: [
      "비연애 대인관계에서 도움·조언·소개·협력이 오가는 지원 패턴",
      "말뿐인 호의와 실제 후속 이행을 구분하는 신뢰·상호성 신호",
      "도움을 요청·수용·되돌려줄 때 과도한 의존을 피하는 지원 경계",
    ],
    requiredInsights: [
      { id: "social-support-exchange-pattern", prompt: "도움·조언·소개·협력이 말이 아니라 실제 행동으로 이어지는 지원 교류 패턴을 구분한다." },
      { id: "social-support-reliability-signal", prompt: "약속, 후속 행동, 반복 이행으로 신뢰할 수 있는 도움 관계를 확인할 관찰 신호를 제시한다." },
      { id: "social-support-boundary-condition", prompt: "도움을 받거나 주는 과정이 의존·책임 과잉으로 바뀌는 경계와 부담 조건을 설명한다." },
      { id: "social-support-maintenance-action", prompt: "작은 요청·제안·후속 확인으로 지원 관계를 시험하고 유지·재조정할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "romantic-new-connection", prompt: "새로운 연애 상대와의 접점·호감·연애 가능성을 탐색하는 분석" },
      { id: "friendship-only-recalibration", prompt: "기존 친구 관계의 감정 노동·상호성·교류 빈도를 재조정하는 분석" },
      { id: "network-expansion-reach", prompt: "새 모임·활동·접점을 늘려 인맥의 폭과 지속 연결을 확장하는 분석" },
    ],
    evidenceFocus: ["element_relations", "fortune_flow", "strength", "fortune_brain"],
    decisionCriteria: {
      확대: "실제 후속 이행과 상호성이 확인된 지원 교류를 넓히는 방향",
      유지: "현재 도움 교류의 범위를 유지하며 신뢰 신호를 더 관찰하는 방향",
      조정: "요청·수용·보답의 범위와 책임 경계를 다시 정리하는 방향",
      보류: "신뢰와 후속 이행이 확인되기 전 추가 의존이나 부담을 늘리지 않는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "도움을 요청하거나 받은 장면과 실제 후속 이행을 같은 기준으로 기록하는 행동",
      "작은 범위의 요청·제안으로 신뢰와 상호성을 시험하는 행동",
      "지원이 의존이나 책임 과잉으로 바뀌지 않도록 요청·수용·보답의 한계를 문장화하는 행동",
    ],
    prohibitedClaims: [
      "특정 인물을 귀인이나 운명적 조력자로 지목",
      "상대방의 숨은 의도나 호의를 단정",
      "도움·소개·협력의 결과나 이익을 보장",
      "특정 사람·장소·날짜에 도움을 받는다고 예측",
    ],
  },
  {
    productId: "social-conflict", engine: "RELATIONSHIP",
    userQuestion: "연애가 아닌 일반 대인관계에서 어떤 상호작용이 갈등을 반복시키고, 어느 거리·대화·역할 기준을 조정해야 하는가?",
    analysisFocus: [
      "비연애 대인관계에서 갈등을 시작시키는 상황·말·요청과 반복 반응 순서",
      "충돌을 키우는 회피·과잉 대응·역할 혼선과 완화되는 관찰 신호",
      "관계를 끊는 결론이 아니라 거리·대화·요청·역할 경계를 재조정하는 기준",
    ],
    requiredInsights: [
      { id: "social-conflict-trigger-pattern", prompt: "일반 대인관계에서 갈등을 시작시키는 상황·말·요청의 반복 촉발 패턴을 구분한다." },
      { id: "social-conflict-escalation-signal", prompt: "회피·과잉 대응·대화 단절처럼 갈등을 키우거나 완화하는 반응 순서를 관찰할 신호를 제시한다." },
      { id: "social-conflict-distance-condition", prompt: "거리·요청·역할 경계가 흐려져 갈등이 반복되는 조건과 조정 기준을 설명한다." },
      { id: "social-conflict-reset-action", prompt: "갈등 장면을 기록하고 거리·대화·역할 기준을 다시 시험할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "romantic-conflict-recovery", prompt: "현재 연애 관계의 갈등 후 회복 가능성·대화 재개·관계 지속을 판단하는 분석" },
      { id: "friendship-reciprocity", prompt: "친구 관계의 연락·도움·감정 노동과 상호성을 중심으로 재조정하는 분석" },
      { id: "workplace-performance-collaboration", prompt: "상사·동료·업무 이해관계자와의 협업을 성과·책임·에스컬레이션 관점에서 분석하는 범위" },
    ],
    evidenceFocus: ["element_relations", "fortune_flow", "strength", "gyeokguk"],
    decisionCriteria: {
      확대: "갈등 완화 신호가 반복 확인된 관계에서 교류 범위를 조심스럽게 넓히는 방향",
      유지: "현재 거리와 대화 기준을 유지하며 반복 촉발 신호를 관찰하는 방향",
      조정: "갈등을 키우는 거리·요청·대화·역할 경계를 다시 정리하는 방향",
      보류: "갈등 촉발과 안전 조건이 불명확한 상황에서 추가 접촉이나 책임을 늘리지 않는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "갈등 직전 상황·말·요청과 직후 반응을 같은 형식으로 기록하는 행동",
      "갈등을 확대하는 반응 순서와 완화되는 신호를 분리해 검토하는 행동",
      "거리·연락·요청·역할 중 한 가지 경계를 정해 다음 상호작용에서 시험하고 재검토하는 행동",
    ],
    prohibitedClaims: [
      "상대방의 감정·의도·성격을 단정",
      "특정 관계를 끊거나 반드시 유지해야 한다는 결론",
      "갈등 해결이나 관계 회복 결과를 보장",
      "폭력·학대·위협 상황에서 전문 안전·법률 판단을 대체",
    ],
  },
  {
    productId: "social-network-expansion", engine: "RELATIONSHIP",
    userQuestion: "새로운 인맥을 넓힐 때 어떤 접점과 교류 방식이 실제 연결로 이어지며, 관계의 넓이와 깊이를 어떻게 조절해야 하는가?",
    analysisFocus: [
      "비연애 새로운 인맥이 생기는 활동·환경·공동 관심사와 반복 접점",
      "첫 만남 이후 후속 연락·공동 활동·상호 반응이 지속 연결로 이어지는 신호",
      "관계 수를 늘리는 것과 신뢰 가능한 연결을 깊게 만드는 것 사이의 균형 기준",
    ],
    requiredInsights: [
      { id: "social-network-entry-environment", prompt: "새로운 인맥의 접점이 생기기 쉬운 활동·환경·공동 관심사의 반복 조건을 구분한다." },
      { id: "social-network-followup-signal", prompt: "첫 접점 뒤 후속 연락·공동 활동·상호 제안으로 실제 연결을 확인할 관찰 신호를 제시한다." },
      { id: "social-network-breadth-depth", prompt: "넓은 접점과 깊은 연결 중 어느 쪽에 시간과 에너지가 과도하게 쏠리는지 조절할 기준을 설명한다." },
      { id: "social-network-expansion-action", prompt: "접점·후속 반응·신뢰를 기록하며 지속 가능한 인맥 확장을 시험할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "romantic-new-connection", prompt: "새로운 연애 상대의 호감·접근·초기 신뢰를 중심으로 하는 분석" },
      { id: "existing-friend-family-recalibration", prompt: "이미 형성된 친구·가족 관계의 역할·상호성·거리 문제를 재조정하는 분석" },
      { id: "career-business-network-outcome", prompt: "취업·승진·영업·고객 확보 같은 직업·사업 성과를 위한 네트워킹 결과를 판단하는 분석" },
    ],
    evidenceFocus: ["fortune_flow", "element_relations", "fortune_brain", "strength"],
    decisionCriteria: {
      확대: "후속 반응과 상호 참여가 확인된 접점·활동의 범위를 넓히는 방향",
      유지: "현재 참여 범위를 유지하며 지속 연결 신호를 관찰하는 방향",
      조정: "접점의 수·참여 빈도·후속 연락과 신뢰 확인 기준을 다시 정리하는 방향",
      보류: "후속 반응이나 신뢰 신호가 약한 접점에 시간과 책임을 더하지 않는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "새 사람을 만난 접점·활동·후속 연락 여부를 같은 기준으로 기록하는 행동",
      "반복 참여할 활동을 제한해 후속 반응과 상호 제안을 관찰하는 행동",
      "연결을 이어갈 최소 신뢰·상호성 기준을 정하고 일정 주기 뒤 유지·조정 여부를 검토하는 행동",
    ],
    prohibitedClaims: [
      "특정 사람·장소·날짜에서 인연을 만난다고 예측",
      "인맥 수·인기·사회적 영향력 증가를 보장",
      "새 접점을 연애 가능성으로 해석",
      "취업·승진·계약·고객 확보 같은 직업·사업 결과를 보장",
    ],
  },
'''
replace_once(path, marker, configs + marker)

# 2) Runtime engine, edition and telemetry contracts.
replace_once(
    "app/lib/paidAnalysisEngine.ts",
    '  "relationship-family-role": "RELATIONSHIP",\n',
    '  "relationship-family-role": "RELATIONSHIP",\n  "social-helper": "RELATIONSHIP",\n  "social-conflict": "RELATIONSHIP",\n  "social-network-expansion": "RELATIONSHIP",\n',
)
replace_once(
    "app/lib/analysisEditionPolicy.ts",
    '  "relationship-family-role": "YEARLY",\n',
    '  "relationship-family-role": "YEARLY",\n  "social-helper": "YEARLY",\n  "social-conflict": "MONTHLY",\n  "social-network-expansion": "MONTHLY",\n',
)
replace_once(
    "app/lib/paidGenerationTelemetry.ts",
    '  "relationship-family-role",\n  "health-body-signal-review",\n',
    '  "relationship-family-role",\n  "social-helper",\n  "social-network-expansion",\n  "health-body-signal-review",\n',
)
replace_once(
    "app/lib/paidGenerationTelemetry.ts",
    '  "relationship-reunion",\n  "health-burnout-risk",\n',
    '  "relationship-reunion",\n  "social-conflict",\n  "health-burnout-risk",\n',
)

# 3) Customer-facing naming avoids implying an exact foretold benefactor.
replace_once(
    "app/lib/premiumPresentation.ts",
    '  "relationship-intimacy": "연애 관계의 친밀감 형성 속도",\n',
    '  "relationship-intimacy": "연애 관계의 친밀감 형성 속도",\n  "social-helper": "도움 관계와 신뢰 분석",\n',
)

# 4) Launch count and pricing-family audits: 47+7 -> 50+7, three new CORE products.
launch_audit = "app/lib/paidAnalysisV4LaunchAudit.ts"
for old, new in [
    ("launchIds.length !== 54", "launchIds.length !== 57"),
    ("Launch 상품은 정확히 54개", "Launch 상품은 정확히 57개"),
    ("topicProductCount !== 47", "topicProductCount !== 50"),
    ("주제별 Launch 상품은 정확히 47개", "주제별 Launch 상품은 정확히 50개"),
    ("products.length !== 54", "products.length !== 57"),
    ("V4 감사 대상이 정확히 54개", "V4 감사 대상이 정확히 57개"),
    ("V4 Launch 54 상품 정적 감사 실패", "V4 Launch 57 상품 정적 감사 실패"),
]:
    replace_once(launch_audit, old, new)

price_audit = "app/lib/paidAnalysisV4PriceTierAudit.ts"
replace_once(price_audit, "  CORE: 41,", "  CORE: 44,")
replace_once(price_audit, "products.length !== 54", "products.length !== 57")
replace_once(price_audit, "가격 단계 감사 대상은 정확히 54개", "가격 단계 감사 대상은 정확히 57개")

# 5) Count-sensitive regressions.
count_files = {
    "scripts/premium-presentation-regression.ts": [("launchIds.length === 54", "launchIds.length === 57"), ("launch product count must stay 54", "launch product count must be 57"), ("catalogProducts.length === 47", "catalogProducts.length === 50"), ("topic catalog count must stay 47", "topic catalog count must be 50")],
    "scripts/topic-purchase-decision-regression.ts": [("topicProducts.length !== 47 || launchTopicIds.length !== 47", "topicProducts.length !== 50 || launchTopicIds.length !== 50"), ("Expected 47 Launch Topic products", "Expected 50 Launch Topic products")],
    "scripts/launch-v1-pricing-mapping-regression.ts": [("launchIds.length === 54", "launchIds.length === 57"), ("Launch V1 must contain 54 products", "Launch V1 must contain 57 products")],
    "scripts/paid-generation-telemetry-regression.ts": [("bands.length === 54", "bands.length === 57"), ("all launch products must be classified", "all 57 launch products must be classified"), ("new Set(bands.map((item) => item.productId)).size === 54", "new Set(bands.map((item) => item.productId)).size === 57"), ("bands.filter((item) => item.family === \"TOPIC\").length === 47", "bands.filter((item) => item.family === \"TOPIC\").length === 50"), ("47 topics must be classified", "50 topics must be classified")],
    "scripts/analysis-edition-policy-key-regression.ts": [("exhaustive 54-product policy mapping", "exhaustive 57-product policy mapping"), ("exactly 54 launch products mapped", "exactly 57 launch products mapped"), ("launchIds.length === 54", "launchIds.length === 57"), ("expected exactly 54 launch products", "expected exactly 57 launch products"), ("all 54 launch products mapped exactly once", "all 57 launch products mapped exactly once")],
}
for file_path, pairs in count_files.items():
    for old, new in pairs:
        replace_once(file_path, old, new)

# launch audit regression
path = "scripts/paid-analysis-v4-launch-audit-regression.ts"
for old, new in [
    ("report.launchProductCount !== 54", "report.launchProductCount !== 57"),
    ("expected 54 launch products", "expected 57 launch products"),
    ("report.topicProductCount !== 47", "report.topicProductCount !== 50"),
    ("expected 47 topic products", "expected 50 topic products"),
]:
    replace_once(path, old, new)

# Topic config regression: update counts and exhaustive product/engine lists.
path = "scripts/paid-analysis-v4-topic-config-regression.ts"
replace_once(path, 'LAUNCH_PRODUCT_IDS.length === 54', 'LAUNCH_PRODUCT_IDS.length === 57')
replace_once(path, 'Final launch set must contain 47 topics and 7 period products', 'Final launch set must contain 50 topics and 7 period products')
replace_once(
    path,
    '  "relationship-family-role",\n  "health-energy-recovery",',
    '  "relationship-family-role",\n  "social-helper",\n  "social-conflict",\n  "social-network-expansion",\n  "health-energy-recovery",',
)
replace_once(
    path,
    '  "relationship-family-role": "RELATIONSHIP",\n  "health-energy-recovery": "HEALTH",',
    '  "relationship-family-role": "RELATIONSHIP",\n  "social-helper": "RELATIONSHIP",\n  "social-conflict": "RELATIONSHIP",\n  "social-network-expansion": "RELATIONSHIP",\n  "health-energy-recovery": "HEALTH",',
)

# Other current exhaustive/scope regressions use only the numeric launch contract.
for path in [
    "scripts/ai-consulting-scope-regression.ts",
    "scripts/paid-analysis-v4-period-family-regression.ts",
    "scripts/paid-analysis-v4-premium-depth-regression.ts",
]:
    value = read(path)
    if "54" in value:
        value = value.replace("54", "57")
    if "47" in value:
        value = value.replace("47", "50")
    write(path, value)

# 6) Run the new social regression on every production build before broader audits.
replace_once(
    "package.json",
    '"prebuild": "tsx scripts/premium-presentation-regression.ts &&',
    '"prebuild": "tsx scripts/social-launch-expansion-regression.ts && tsx scripts/premium-presentation-regression.ts &&',
)

# 7) Current documentation only (historical STEP reports intentionally stay historical).
doc_replacements = {
    "docs/01_MASTER_PLAN.md": [("총 54개", "총 57개"), ("TOPIC 47 + PERIOD 7", "TOPIC 50 + PERIOD 7")],
    "docs/06_AI_ARCHITECTURE.md": [("Launch 54종", "Launch 57종"), ("47 TOPIC + 7 PERIOD", "50 TOPIC + 7 PERIOD")],
    "docs/07_UI_UX_GUIDE.md": [("Launch 54종", "Launch 57종"), ("TOPIC 47 + PERIOD 7 = 총 54개", "TOPIC 50 + PERIOD 7 = 총 57개"), ("대인관계운 2 / 관계운 11", "대인관계운 5 / 연애운 11")],
    "docs/08_RELEASE_NOTE.md": [("54종(Launch 상품)", "57종(Launch 상품)"), ("TOPIC 47 / PERIOD 7", "TOPIC 50 / PERIOD 7")],
    "docs/09_PRODUCT_ROADMAP.md": [("총 **54개(TOPIC 47 + PERIOD 7)**", "총 **57개(TOPIC 50 + PERIOD 7)**")],
    "docs/12_PRICING_REVENUE_ARCHITECTURE.md": [("54개 Launch 상품(TOPIC 47 + PERIOD 7)", "57개 Launch 상품(TOPIC 50 + PERIOD 7)")],
}
for file_path, pairs in doc_replacements.items():
    value = read(file_path)
    changed = False
    for old, new in pairs:
        if old in value:
            value = value.replace(old, new)
            changed = True
    if changed:
        write(file_path, value)

print("social launch expansion patch applied")
