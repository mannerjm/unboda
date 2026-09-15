from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    value = p.read_text(encoding="utf-8")
    if value.count(old) != 1:
        raise RuntimeError(f"expected one match in {path}: {old[:80]!r}")
    p.write_text(value.replace(old, new, 1), encoding="utf-8")


analysis_path = "app/lib/analysisTopics.ts"

replace_once(
    analysis_path,
    '''  {
    id: "social-helper",
    category: "social",
    title: "귀인과 도움을 주는 사람",
    shortDescription: "도움을 얻기 쉬운 관계 유형과 신뢰 기준을 분석합니다.",
    riskLevel: "standard",
    details: [
      "도움이 실제로 연결되는 관계의 명리적 근거",
      "어떤 사람에게 도움을 받기 쉬운지에 대한 유형별 특징",
      "현재 운에서 귀인을 만나기 유리한 시기와 상황",
      "실제 도움과 입에 그치는 관심을 구분하는 판단 기준",
      "도움을 주고받는 관계를 유지하기 위해 확인할 행동",
    ],
  },''',
    '''  {
    id: "social-helper",
    category: "social",
    title: "도움 관계와 신뢰 분석",
    shortDescription: "도움·조언·협력이 실제 행동으로 이어지는 관계와 신뢰 기준을 분석합니다.",
    riskLevel: "standard",
    details: [
      "도움·조언·소개·협력이 실제 행동으로 이어지는 지원 교류 패턴",
      "약속과 후속 행동으로 신뢰할 수 있는 도움 관계를 구분하는 관찰 신호",
      "도움을 요청·수용·되돌려줄 때 의존과 책임 과잉을 피하는 경계",
      "말뿐인 호의와 반복되는 실제 이행을 구분하는 판단 기준",
      "지원 관계를 유지하거나 재조정하기 위해 확인할 행동",
    ],
  },''',
)

replace_once(
    analysis_path,
    '''  {
    id: "social-conflict",
    category: "social",
    title: "대인 갈등과 거리 조절",
    shortDescription: "반복되는 갈등 유형과 관계를 조절하는 기준을 분석합니다.",
    riskLevel: "standard",
    details: [
      "대인관계에서 갈등이 반복되는 명리적 구조",
      "갈등을 촉발하는 상황과 반복되는 감정 반응",
      "현재 운에서 갈등이 커지거나 완화되는 조건",
      "대화 단절·거리 변화처럼 확인할 수 있는 현실 신호",
      "갈등을 줄이고 관계를 조절하기 위해 취할 행동",
    ],
  },''',
    '''  {
    id: "social-conflict",
    category: "social",
    title: "대인 갈등과 거리 조절",
    shortDescription: "연애가 아닌 일반 대인관계에서 반복되는 갈등과 거리·대화·역할 조정 기준을 분석합니다.",
    riskLevel: "standard",
    details: [
      "일반 대인관계에서 갈등을 시작시키는 상황·말·요청의 반복 패턴",
      "회피·과잉 대응·대화 단절처럼 갈등을 키우거나 완화하는 반응 순서",
      "거리·요청·역할 경계가 흐려져 갈등이 반복되는 조건",
      "대화 재개·거리 변화처럼 갈등 완화 여부를 확인할 관찰 신호",
      "거리·대화·요청·역할 기준을 재조정하기 위해 확인할 행동",
    ],
  },''',
)

replace_once(
    analysis_path,
    '''  {
    id: "social-network-expansion",
    category: "social",
    title: "새로운 인맥과 관계 확장",
    shortDescription: "새 사람과 연결될 때 강점이 살아나는 환경과 조건을 분석합니다.",
    riskLevel: "standard",
    details: [
      "새로운 인연이 늘어나기 쉬운 명리적 조건",
      "넓은 관계와 깊은 관계 중 현재 더 맞는 확장 방식",
      "현재 운에서 새로운 접점이 늘어나는 시기와 환경",
      "모임·협업 자리처럼 관계 확장이 실제로 이듬되는 상황",
      "새 관계를 맺을 때 확인할 신뢰 판단 기준",
    ],
  },''',
    '''  {
    id: "social-network-expansion",
    category: "social",
    title: "새로운 인맥과 관계 확장",
    shortDescription: "새로운 비연애 인맥이 실제 연결로 이어지는 접점과 후속 교류 기준을 분석합니다.",
    riskLevel: "standard",
    details: [
      "새로운 인맥이 생기는 활동·환경·공동 관심사와 반복 접점",
      "첫 만남 뒤 후속 연락·공동 활동·상호 제안이 이어지는 관찰 신호",
      "넓은 접점과 깊은 연결 사이에서 시간과 에너지를 배분하는 기준",
      "반복 참여와 후속 반응으로 지속 연결 가능성을 확인하는 방법",
      "새 인맥을 이어갈 때 확인할 최소 신뢰·상호성 기준",
    ],
  },''',
)

regression_path = "scripts/social-launch-expansion-regression.ts"
marker = 'console.log("social-launch-expansion-regression passed ✓");\n'
addition = '''const helperMetadata = [
  getPremiumProduct("social-helper")?.title,
  getPremiumProduct("social-helper")?.description,
  ...(getPremiumProduct("social-helper")?.details ?? []),
].join("\\n");
for (const forbidden of ["귀인", "어떤 사람에게", "유리한 시기"]) {
  assert(!helperMetadata.includes(forbidden), `social-helper metadata must not promise ${forbidden}`);
}

const conflictMetadata = [
  getPremiumProduct("social-conflict")?.description,
  ...(getPremiumProduct("social-conflict")?.details ?? []),
].join("\\n");
assert(conflictMetadata.includes("일반 대인관계"), "social-conflict metadata must own general non-romantic scope");

const networkMetadata = [
  getPremiumProduct("social-network-expansion")?.description,
  ...(getPremiumProduct("social-network-expansion")?.details ?? []),
].join("\\n");
for (const forbidden of ["인연", "시기와 환경"]) {
  assert(!networkMetadata.includes(forbidden), `social-network-expansion metadata must not promise ${forbidden}`);
}

console.log("social-launch-expansion-regression passed ✓");
'''
replace_once(regression_path, marker, addition)

print("social metadata scope patch applied")
