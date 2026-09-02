# STEP 57D-48F-G: Purchased Analyses Multi-Edition History

## Purpose

Upgrade the purchased-analyses library so an owned product can display more than one historical analysis edition for the current active profile. This is a content-library and access-routing change only. It does not activate additional-edition sales.

## Previous Limitation

`listUserPaidAnalysisSummaries()` previously keyed report state by profile and product only. Multiple active editions of the same product could collide, causing one report state to replace another in the purchased library.

## Implemented Behavior

- Active purchased content is grouped as current active profile -> canonical product -> `editions[]`.
- Entitlement-to-report state joins use user, profile, canonical product, and `analysis_edition_key`.
- Revoked or refunded editions are excluded because the library starts from active entitlements. A retained paid-report row does not restore access.
- Historical canonical products remain visible when an active entitlement exists; the library does not apply the launch-sale filter to past ownership.
- Each edition has an independently rendered report state. A newer generating or failed edition does not hide an older completed report.

## Routing and Authorization

- An explicit `edition` query parameter selects an exact owned edition.
- Exact edition access requires an active entitlement for the authenticated user, the active profile, canonical product, and edition key.
- The report page and report-generation API both enforce the active-profile boundary.
- No-edition routes select an active entitlement deterministically using the same semantic edition ordering used by the library, followed by stable creation-time and identifier tie-breakers. The exact selected edition is then used for report claim and lookup.

## Display and Ordering

Customer-facing Korean labels are provided for MONTH, YEAR, TARGET_MONTH, TARGET_YEAR, RANGE, DAEUN, LIFETIME, and LEGACY editions. Unknown or malformed keys use a generic safe label rather than exposing an internal key.

Known modern editions sort semantically newest-first within a product. Ranges sort by their latest covered period, DAEUN by its order, and LEGACY appears below modern editions. LIFETIME remains a single stable edition and is never presented as renewable history.

## Commercial Safety

The P0 guard remains intentionally product-global: any active entitlement for the same user, profile, and product blocks a new pending order. New-edition purchase and repurchase activation remain disabled.

## Verification

- Human visual review passed, including product grouping, latest-status presentation, historical exact-edition click-through, safe labels, and absence of purchase-again UI.
- Temporary local R2 review fixtures were removed after approval.
- No migration was required.

## Remaining Activation Work

STEP 57D-48F-H may add interested-analysis current-edition visibility and state. Any future exact-edition purchase activation requires separate commercial hardening; it is explicitly out of scope for this step.
