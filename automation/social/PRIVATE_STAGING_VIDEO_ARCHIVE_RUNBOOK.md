# 운보다 — 4편 비공개 검토 영상 실제 보관 절차 (게시 아님)

> 대상: **스테이징 Supabase xdiitqyysmhicjcytckm** 전용. 운영 unboda.kr, 고객 결제 DB, SNS 게시 기능과 무관합니다.

## 현재 확인한 상태 (2026-10-28)

- 기존 비공개 GitHub Actions 제작 성공 run **40521381382**. 해당 run의 4개 검토 아티팩트는 GitHub에 **2026-11-01 UTC까지** 임시 보관됩니다. 만료 후에는 원본 소스 영상/검증 이력을 다시 생성하고 새로운 run ID/QA DB 등록을 검증해야 합니다. 절대로 이전 run ID만 바꿔서 진행하지 마세요.
- 4개 파일 실제 MP4 총 크기 **4,549,628 bytes**; 00:00 1,137,488 / 08:00 1,143,254 / 12:00 1,120,291 / 20:00 1,148,595 bytes.
- 스테이징의 버킷 **unboda-social-private-review**, `public=false`, object max 45 MB. 4개 파일의 SHA256/기술 QA는 `social_automation.video_technical_evidence`에 이미 검증 기록이 있습니다.
- 현재 비공개 `storage.objects` 0건 및 `social_automation.private_video_archive_receipts` 0건. 실제 업로드한 것으로 표시하지 마세요.

## 비공개 보관 단계의 보안 요건

1. **저장 용량/비용 승인을 별도로 확인**합니다. 영상 4개 합계 4,549,628 bytes; GitHub Action에서 한 번에 전송할 상한은 6,000,000 bytes입니다. 용량 상한은 원화 과금 상한이 아닙니다.
2. GitHub **Actions secrets**에 다음 **스테이징 전용** 값을 주입합니다. 채팅/커밋/워크플로 로그에는 값 자체를 출력하지 마세요:
   - `UNBODA_STAGING_SUPABASE_URL`: `https://xdiitqyysmhicjcytckm.supabase.co/`
   - `UNBODA_STAGING_SERVICE_ROLE_KEY`: 스테이징의 서비스 역할 자격증명. 운영/메인 서비스 키를 넣지 마세요.
   - `UNBODA_STAGING_DATABASE_URL`: 스테이징 연결 URL. DB 프로젝트 식별자를 코드에서 검증합니다.
3. **검토된 코드에만 적용**: `.github/workflows/unboda-private-staging-archive-four.yml`이 워크플로 목록에서 사용 가능한 상태인지 확인해야 합니다. GitHub workflow_dispatch는 기본 브랜치에 해당 워크플로 정의가 있어야 작동할 수 있습니다. Draft PR #320 전체를 승인 없이 병합하지 마세요. 별도 심사된 안전한 반영 경로를 마련해야 합니다.
4. 수동 실행 시 `approve_private_storage`에 `PRIVATE_STAGING_REVIEW_ONLY_MAX_6000000_BYTES`, `max_bytes`에 6000000 입력. 자동 반복/예약 트리거는 없습니다. `run-id: 40521381382`에서만 아티팩트를 가져옵니다.
5. 원본 QA, 파일 SHA256, 30초/30fps, 4개 서로 다른 내용, 스테이징 URL·DB 핀을 확인합니다. 비공개 스토리지에 업로드(`upsert=false`)한 뒤 같은 비공개 파일을 GET으로 다시 읽고 **전체 바이트 SHA256**을 비교합니다. 마지막에 스테이징 SQL 함수 `record_private_video_readback`이 실제 Storage 객체/크기를 확인하고 영수증을 작성합니다.
6. **4개 보관 영수증과 Storage 객체 4개를 별도로 조회**하여 확인합니다. GitHub 실행 초록 표시만으로 완료 처리하지 마세요.

## 실패/재시도 금지

- 업로드 도중 timeout/409 또는 DB 기록 실패: 동일 파일을 무조건 재업로드하지 마세요. 먼저 `storage.objects`의 해당 키가 존재하는지, 실제 MP4의 바이트 수와 SHA256을 재조회해야 합니다. 원본이 존재하고 SHA가 같으면 스테이징 DB 영수증만 화해하는 별도 절차가 필요합니다.
- 서비스 역할/DB secret 미설정, owner 승인 미입력, 버킷이 공개로 바뀜, 과금 용량 초과, QA 불일치 시 **전체 작업 중단**.
- 하나라도 실패한 배치는 `FOUR_PRIVATE_MP4S_HASH_VERIFIED_AND_JOURNALED`로 보고하지 않습니다.

## 이 작업으로 해결되지 않는 것

저장 작업이 성공해도 **실제 AI 신규 대본의 장기 무인 생성**, **90일 SNS 전 채널 게시 이력의 완전성**, **MeloTTS 음성/모델 가중치의 상업적 사용권**, **썸네일·발음 인간 검수**, **SNS 영상 URL 실제 발행 및 공개 확인**은 별도입니다. 하루 4회 영상 공개, 유료 AI 모델 실행은 여전히 OFF입니다.

## 참조

- `automation/social/private-review-artifact-loader.mjs`
- `automation/social/private-review-staging-upload-cli.mjs`
- `automation/social/archive-private-media-and-receipt.mjs`
- `automation/social/staging-private-media-archive-ledger.sql`
- `automation/social/staging-video-launch-readiness.sql`
- `automation/social/private-review-staging-upload-cli.test.mjs`
