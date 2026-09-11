# 개인정보 국외 처리·이전 인프라 사실확인 — 2026-09-11

> 상태: 내부 사실확인용.
> 목적: 공개 개인정보처리방침의 국외 처리·이전 문구를 실제 운영 인프라와 공식 문서에 맞춰 작성하고, 아직 확인되지 않은 항목을 분리한다.

## 1. 적용 기준

개인정보 보호법 제28조의8은 개인정보의 국외 `제공(조회 포함)`, `처리위탁`, `보관`을 국외 이전 범주로 규정한다. 정보주체와의 계약 체결·이행을 위해 처리위탁 또는 보관이 필요한 경우에는 법이 정한 항목을 개인정보처리방침에 공개하거나 정해진 방법으로 알리는 방식이 규정되어 있다.

공개 시 확인해야 할 핵심 항목은 다음과 같다.

- 이전되는 개인정보 항목
- 이전 국가, 시기 및 방법
- 이전받는 자의 명칭과 연락처
- 이전받는 자의 이용 목적과 보유·이용 기간
- 이전을 거부하는 방법·절차 및 거부 효과

국가법령정보센터:
- 개인정보 보호법 제28조의8: https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1033215841
- 개인정보 보호법 시행령 제29조의10: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=10&joNo=0029&lsiSeq=283503&urlMode=lsScJoRltInfoR

이 메모는 법률 자문을 대체하지 않으며, 현재 운영 사실과 공식 제공자 문서를 기준으로 공개 가능한 범위를 정리한다.

## 2. Vercel — 현재 국외 처리 사실 확인

현재 확인된 사실:

- 운보다 Vercel 팀은 Pro 플랜이다.
- Vercel의 2026-03-31 시행 DPA는 Pro 및 Enterprise 고객에 대해 Vercel이 Customer Data를 고객 지시에 따라 Processor로 처리한다고 규정한다.
- Vercel DPA는 주요 처리 시설이 미국에 있고, 서비스 제공을 위해 미국 및 Vercel 또는 하위처리자가 운영하는 다른 위치에서 Customer Data를 처리할 수 있다고 설명한다.
- Vercel DPA는 계약 종료가 Customer Data 삭제 지시가 되며, 상업적으로 합리적인 기간 내 삭제한다고 설명한다. 법률상 보존 필요가 있는 경우 예외가 있을 수 있다.
- 현재 운보다 Production deployment의 Function region은 `iad1`이다.
- Vercel 공식 문서에서 `iad1`은 Washington, D.C., USA로 정의된다.
- 현재 운보다 서비스의 서버 요청은 Vercel Functions를 통과하므로, 해당 요청에 포함된 계정 식별자·이메일·프로필 입력·분석 요청/결과·주문·고객지원 정보 및 접속/운영 메타데이터는 미국 Function region에서 처리될 수 있다.
- NICE gateway는 본인확인 원문 성명·생년월일·휴대폰번호·CI/DI를 Vercel 애플리케이션에 반환하지 않고, 성인 여부와 정책/증거 버전 등 정규화 결과만 반환하도록 구현되어 있다.

공식 출처:
- Vercel DPA: https://vercel.com/legal/dpa
- Vercel Function region 문서: https://vercel.com/docs/functions/configuring-functions/region

현재 공개 가능한 1차 항목:

- 이전받는 자: Vercel Inc. (`privacy@vercel.com`)
- 현재 확인 국가: 미국 — Production Functions `iad1` / Washington, D.C.
- 시기·방법: 서비스 요청 시 암호화된 네트워크 전송 및 서버 처리
- 목적: 웹 애플리케이션 호스팅, 서버 요청 처리, 보안·운영 지원
- 보유·이용: 서비스 계약 기간 동안 처리, 계약 종료 또는 삭제 지시에 따른 삭제. 법령상 보존 필요 시 예외 가능
- 거부 영향: Vercel 기반 서버 처리를 거부하면 로그인·프로필·분석·주문·고객지원 등 주요 서버 기능 제공이 어려움

남은 확인:

- Vercel 하위처리자별 실제 적용 범위와 국가 목록을 운보다 사용 기능 기준으로 좁혀 정리할 것
- Vercel 서비스 생성 로그/백업의 구체적인 항목별 보존기간을 추가 확인할 것
- Function region을 국내(`icn1`)로 이전할 경우에도 Vercel의 글로벌 운영·하위처리·백업 구조가 남는지 별도로 평가할 것

## 3. Supabase — Production 주 데이터 저장 위치는 국내

현재 Production Supabase 프로젝트는 `ap-northeast-2` 리전이다.

Supabase 공식 문서는 특정 region 선택이 primary project data 저장 위치를 결정한다고 설명하고, `ap-northeast-2`를 `Northeast Asia (Seoul)`로 명시한다.

따라서 현재 확인 가능한 범위에서는 운보다 Production의 주 데이터베이스 저장 위치는 대한민국 서울이다.

공식 출처:
- Supabase region / data residency: https://supabase.com/docs/guides/platform/regions

주의:

- 이 사실은 `주 데이터 저장 위치`에 관한 것이다.
- Supabase 사업자의 모든 지원·운영·하위처리·관제 활동이 대한민국 안에서만 이뤄진다는 뜻으로 확대 해석하지 않는다.
- 별도의 국외 처리 사실이 확인되기 전에는 Supabase를 공개 국외 이전 표의 해외 수령자로 임의 기재하지 않는다.

## 4. Vultr NICE gateway — Production 인스턴스 서울 리전 확인

현재 NICE gateway는 Vultr 인스턴스에서 동작하며, NICE 인증 결과 복호화와 만 19세 판정이 이 gateway에서 수행된다. 따라서 gateway 위치는 본인확인 원문 개인정보의 일시적 처리 위치와 직접 관련된다.

2026-09-11 운영자 Vultr Dashboard 확인 화면에서 Production NICE gateway 인스턴스의 `Location`이 `Seoul, KR (APAC)`로 표시되는 것을 확인했다. 이 확인은 IP 지리정보 추정이 아니라 실제 계정의 인스턴스 관리 화면 증거다.

현재 결론:

- Production NICE gateway의 현재 인스턴스 위치는 대한민국 서울이다.
- NICE 결과 중 gateway에서 복호화되는 원문 개인정보는 이 국내 gateway에서 일시 처리되고, gateway는 생년월일을 이용해 만 19세 이상 여부를 판정한다.
- gateway에서 Vercel 애플리케이션으로는 `adult`, 정책 버전, 증거 버전 등 정규화 결과만 반환한다.
- 원문 성명·생년월일·휴대폰번호·CI/DI는 Vercel 애플리케이션으로 반환하지 않는다.
- 이 사실만으로 Vultr 사업자의 모든 지원·운영·백업·하위처리 활동이 대한민국 안에서만 이뤄진다고 확대 해석하지 않는다.

## 5. NICE와 Vercel 데이터 경계

NICE 원문 본인확인 데이터 흐름에서 확인된 경계는 다음과 같다.

1. NICE 인증 결과는 대한민국 서울의 Vultr NICE gateway에서 무결성 검증 및 복호화된다.
2. gateway는 생년월일을 이용해 한국 시간 기준 만 19세 이상 여부를 판정한다.
3. Vercel 애플리케이션에는 `adult`, 정책 버전, 증거 버전 등 정규화 결과만 반환한다.
4. 원문 성명·생년월일·휴대폰번호·CI/DI는 Vercel 애플리케이션 DB에 저장하지 않는다.

따라서 Vercel의 국외 처리 공개 항목에 NICE 원문 성명·생년월일·휴대폰번호·CI/DI가 Vercel로 이전된다고 쓰면 현재 구현과 맞지 않는다.

## 6. 공개 개인정보처리방침 반영 원칙

현재 증거로 다음을 공개할 수 있다.

- Vercel Inc.를 이용한다는 사실
- 현재 Production Functions가 미국 Washington, D.C. (`iad1`)에서 실행된다는 사실
- 서버 요청에 포함된 서비스 정보가 해당 Function에서 처리될 수 있다는 사실
- 이전받는 자·국가·시기/방법·목적·보유 기준·거부 영향
- Production Supabase의 주 데이터 저장 위치가 서울이라는 사실
- Production Vultr NICE gateway가 서울에 배치되어 있고, NICE 원문 본인확인 정보는 이 gateway에서 일시 처리된 뒤 Vercel로 반환되지 않는다는 사실

현재 단계에서 하지 않는 것:

- `국외이전 없음`이라고 단정하지 않는다.
- Vercel의 모든 하위처리자 국가를 운보다에 실제 적용되는지 검증 없이 복사하지 않는다.
- Supabase 또는 Vultr의 모든 지원·운영·백업이 국내라고 확대 해석하지 않는다.
- NICE 원문 본인확인 정보가 Vercel로 넘어간다고 잘못 기재하지 않는다.

## 7. 다음 확인 순서

1. Vercel 하위처리자 및 서비스 생성 로그/백업 범위를 운보다 사용 기능에 맞춰 확인한다.
2. Supabase와 Vultr의 지원·운영·백업·하위처리 범위를 실제 사용 기능 기준으로 추가 확인한다.
3. OpenAI 등 분석 생성 제공자와 결제 제공자의 국외 처리/이전 사실을 별도 감사한다.
4. 사업자 정보·연락처·시행일이 확정되면 개인정보처리방침의 정식 버전/시행일을 활성화한다.