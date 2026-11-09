# UNBODA private licensed real-photo bank — staging-only 3-day buffer

## Authority and limits
- Nov 10 Commons/Openverse attempts failed the 7/7 dual-model gate; Openverse returned HTTP 401/429.
- This workflow is for BRAND_OWNED, COMMISSIONED or CONTRACT_LICENSED real photographs with explicit commercial SNS and automated QA rights; do not treat generic stock licenses as authority for systematic API collection, AI datasets or third-party bulk downloads.
- Existing first-party renderer produces illustrations, never genuine photographs.
- The Supabase project is **unboda-staging** ONLY (xdiitqyysmhicjcytckm). The bucket 'unboda-social-private-review' remains PRIVATE.
- Photos and contract/license proof must NEVER be committed to this public GitHub repository.

## Data and preparation
- Tables: public.unboda_social_licensed_photo_assets and public.unboda_social_photo_bank_assignments, RLS enabled, server-role-only.
- Upload genuine photo JPEGs under photo-bank/images/<asset-id>.jpg and proof under photo-bank/rights/<asset-id>.pdf or .json to the PRIVATE bucket.
- Record independent human review of commercial advertising rights, automated image-QA rights, expiry, attribution, likeness/privacy/brand restrictions and source owner.
- Photo metadata must contain the SHA-256 of exact final 1080x1350 JPEG bytes, matching 8x8 grayscale pHash and exact size; proof SHA-256 must match its private stored bytes.
- Assign 7 unique daily slots for tomorrow, +2 and +3. Unique DB constraints prohibit reuse of any bank asset, even across different dates.
- Run scripts/social/verify-private-licensed-photo-buffer.py --self-test for offline integrity tests; --start-date YYYY-MM-DD --days 3 performs read-only staging verification.
- GitHub workflow unboda-private-photo-bank-buffer.yml runs at 21:05 KST daily and requires secret UNBODA_STAGING_SERVICE_ROLE_KEY for the STAGING project (hardcoded hostname). If missing, fail closed and alert. Do not put the key into public variables or client code.

## Publishing is still gated
- The private bank audit is only pre-intake integrity/rights-proof availability. It NEVER claims human legal review completed or independent CLIP + BLIP QA, full Metricool 90-day history, public media release, or SNS posting success.
- The existing real-photo immutable pack is Commons-only. The new bank cannot be sent through that live route until the dedicated, reviewed provenance adapter, 90-day cross-source checks and atomic production claim are implemented and tested.
- Before posting: rights and privacy approval, independent actual-pixel QA 7/7, unique images, 90-day full scheduled + published provider history, immutable media, safe single Metricool reservation and exact PUBLISHED/publicUrl verification.
- Keep existing posts, members, payments and refunds unchanged. Never re-submit a POST after uncertain response. Do not weaken the photo-only rule to reuse procedural illustration cards.

## Daily operational goal
Replace used images with seven fresh rights-proven real photos each day, keep 21 verified-photo candidates reserved for three future days, and alert on any shortage. Do not claim unlimited unattended publishing until the 7-consecutive-day 18/18 public URL checks pass.

## Safe onboarding tool (staging-only, never SNS)
- Script: scripts/social/intake-private-licensed-photo.py. Its default mode validates a LOCAL genuine 1080x1350 JPEG, exact SHA-256/pHash, and a private PDF/JSON licensing proof; **no network writes**. Synthetic CI fixtures do not qualify as photography.
- Input is a private local JSON manifest, **never committed to GitHub**. Required keys: photoFile, proofFile, sceneId, rightsBasis (BRAND_OWNED / COMMISSIONED / CONTRACT_LICENSED), rightsHolder, creditLine, rightsValidFrom. Optional rightsValidUntil. All paths refer to private local files.
- Example private local manifest (replace all example data on a protected operator computer):
  
      {"photoFile":"/private/owned-photo.jpg","proofFile":"/private/signed-permission.pdf","sceneId":"notebook","rightsBasis":"BRAND_OWNED","rightsHolder":"Verified owner","creditLine":"Photo credit","rightsValidFrom":"2026-11-09"}

- Local verification: python scripts/social/intake-private-licensed-photo.py --manifest /private/photo-intake.json
- After explicit authorization, put the **staging** service-role secret in the machine's protected environment as UNBODA_STAGING_SERVICE_ROLE_KEY; run python scripts/social/intake-private-licensed-photo.py --manifest /private/photo-intake.json --stage
- The --stage operation performs one no-upsert private photo upload, one private rights-proof upload, byte-for-byte readback, a single staging metadata insert and a final readback. Network ambiguity, duplicate SHA, missing proof, bad dates/format, wrong source, or mismatched bytes **halt**; no blind retry or cleanup that could delete previously written data.
- Every new row is forced to **qa_status=PENDING, commercial_social_rights=false, ai_quality_inspection_rights=false**. A trusted reviewer must separately verify the actual commercial rights, AI image inspection permissions, people/property privacy, scene semantics, and expiration before approving metadata; still no provider scheduling until the independent CLIP/BLIP + 90-day provider history + production claim gates pass.
- The staging PRIVATE bucket permits JPG, JSON, PDF rights evidence; do not make it publicly readable. The uploader never touches the live Supabase project.
- Future supplier/stock-feed integration requires explicit contractual consent and credentials; do not put third-party photos into this intake path based on a URL alone.

## Automatic staging-only 21-slot allocation (never SNS publishing)
- The private bank has **two security-invoker server-only views**: unboda_social_photo_bank_unassigned (dual-QA-approved, rights-flag-approved and not previously allocated), and unboda_social_photo_bank_recent_history (last 90 KST days of assignment hashes). Both are restricted to service_role; they never expose original photos or proofs.
- scripts/social/allocate-private-photo-buffer.py --date YYYY-MM-DD builds a **read-only** 21-slot plan for the next 3 days, using approved and still-valid scene-compatible photos. It checks recent bank assignment SHA/pHash and published staging image usage, and refuses near-duplicate use. It preserves every existing slot.
- The **explicit** --apply-staging option may insert only when all 21 slots can be fulfilled; it uses one all-or-nothing staging PostgREST bulk write and final readback. Uncertain writes are never automatically retried; no Metricool requests occur.
- Nightly workflow unboda-private-photo-bank-allocate.yml runs at 20:45 KST, before the 21:05 private-photo-readiness audit, and requires a protected staging-only GitHub Actions secret UNBODA_STAGING_SERVICE_ROLE_KEY. Without that secret or enough independently approved genuine photographs it fails closed and writes nothing.
- Offline CI tests use *synthetic fixtures only* to exercise 21-slot planning, never to claim real-photo approval.
- This allocator is NOT a substitute for the full 90-day Metricool scheduled/published history, legal review, independent model evidence, immutable public media hosting, live Supabase claims, or exact published URL. The user-visible 18-per-day SNS autopublishing remains disabled until the separate end-to-end launch gates pass.

## Additional fail-closed audit checks
- A photo bank asset is eligible for the 3-day *private buffer audit* **only** after its metadata QA state equals DUAL_QA_PASS; PENDING or REJECTED never counts toward 21 ready photographs even if rights flags are set.
- A time assignment with AWAITING_DUAL_QA or REJECTED must not be counted as a ready slot. Existing assignments are immutable and remain untouched; a previously incomplete slot blocks completion rather than being silently overwritten.
- The allocation planner rejects pre-existing assignments outside the exact three-day KST window, invalid slot hours, and a photo assigned more than once. This prevents accidentally accepting a full plan based on unrelated/stale rows.
- The private buffer audit checks date-matched staging media reuse including the current and future planned dates, not only dates earlier than tomorrow. It still does not claim whole-provider 90-day SNS coverage.
- CI fixture approval is simulated solely for deterministic tests; no real photograph, image rights, CLIP/BLIP record, or public post has been approved by this change.
