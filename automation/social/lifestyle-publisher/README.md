# UNBODA Lifestyle SNS Unattended Publishing — Staged Rollout

This runbook records the verified implementation and its safety boundaries. It does NOT authorize publishing.

## Contract
- Seven KST slots daily: 01,04,10,13,16,19,22.
- Channels per slot: facebook,instagram,threads,facebook,instagram,threads,facebook.
- The 07:00 zodiac (3 channels) and video (4x2) producers remain separately owned.
- Metricool PENDING is a reservation, not published success. Actual success requires PUBLISHED plus publicUrl.
- Existing ERROR, DRAFT, PENDING and PUBLISHED posts must NEVER be silently re-created, edited or deleted.

## Existing modules
1. Next-day lifestyle editorial: prepares two future days of 7 original stories with saleable product mapping.
2. Licensed Commons photo candidates: actual JPEG downloads, copyright metadata, camera/color checks and local visual QA. All candidate manifests explicitly forbid public posting.
3. scripts/social/lifestyle-publish-readiness.mjs: READ-ONLY verification of 7 complete stories, photo matching, license, size, author credit, 90-day history, full provider readback, monthly limits, public media and idempotent claim.
4. scripts/social/lifestyle-one-shot-scheduler.mjs: dependency-injected single-request posting, complete provider readback, persistent claim, durable posting marker, never retry after uncertain network response.
5. scripts/social/lifestyle-supabase-claim-store.mjs: protected server-only Supabase PostgREST adapter, staging-only by default; production connection explicitly locked.

## Isolated staging database
Project: unboda-staging, project ref xdiitqyysmhicjcytckm.
- public.unboda_social_lifestyle_claims: unique slot-date/hour/network, UUID owner token, terminal states and content/media hash.
- public.unboda_social_lifestyle_media_usage: unique photo sha256, phash, source and photo credit linked to a claim.
- RLS enabled, revoked anon/authenticated privileges, service-role-only access.
- A rollback-only test verified a second claim and the same photo fingerprint cannot be inserted twice. The tables were empty afterward.
- None of the payments, users, consults, zodiac or video tables are touched.

## Conditions for a production launch
- 7/7 topic-matching licensed real photographs, with stable public 1080x1350 JPEG media URLs under 4.9MB. Temporary GitHub artifact ZIP URLs are NOT acceptable public media.
- Verified authors/credits, ShareAlike obligations and safe visual details (receipts must have no visible personal information).
- Complete rolling 90-day published AND scheduled provider history and durable photo hash/pHash ledger.
- A Metricool adapter capable of listing ALL post statuses (including errors and drafts), exactly once POST, and correct post-media/autopublish readback.
- Separate production claim schema deployed with reviewed least-privilege credentials only after staging E2E succeeds.
- Zero-post dry run, then one explicitly verified future test slot, then fully automated 7-slot rollout.
- Seven consecutive days with 18/18 actual published URLs and zero duplicate uploads before certifying stable unattended operation.

## Fail-closed policy
No photo, wrong photo, no copyright proof, unexpected provider state, old hash, expired media URL, quota exhaustion, network timeout, or permission mismatch => DO NOT SEND a new post. Record an error and alert instead. Never reset the duplicate claim automatically following an unknown provider response.

Default posture: SNS PUBLISHING NOT ENABLED by this repository patch. No posting credentials are added to the public repo.
