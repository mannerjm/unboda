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
