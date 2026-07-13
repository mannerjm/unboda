# UNBODA MASTER PLAN v1.0

## 1. 프로젝트 비전

운보다는 사주만 제공하는 서비스가 아니라,
사주·타로·꿈해몽 등 다양한 운세 콘텐츠를 하나로 연결하는
AI 기반 통합 운세 플랫폼을 목표로 한다.

핵심 목표:

- 사용자가 이해하기 쉬운 해석
- 계산과 해석의 분리
- 불안을 조장하지 않는 상담
- 실제 생활에 도움이 되는 조언
- 신뢰할 수 있는 명리 계산
- 모바일 중심의 편리한 사용자 경험

---

## 2. 제품 개발 원칙

### Engine First

모든 계산은 `app/lib` 내부의 엔진에서 처리한다.

UI에서는 계산하지 않는다.

AI는 계산하지 않고,
엔진에서 계산된 결과를 받아 설명만 한다.

### 기능별 파일 분리

```text
app/lib
├─ manse.ts
├─ nobles.ts
├─ elements.ts
├─ weights.ts
├─ strength.ts
├─ yongsin.ts
├─ daewoon.ts
├─ sewoon.ts
├─ tarot.ts
├─ dream.ts
└─ compatibility.ts