# UNBODA isolated Metricool read-only cron worker

This server has NO publishing endpoints. It has no access to unboda payment, customer, or refund data.
The `CRON_SECRET` (64-character high-entropy sensitive env) is required on both endpoints.
Metricool token is sensitive Production-only. Never print request headers or the token.

Schedules in UTC for KST 3-hour photo/text slots: `30 1,4,7,10,13,16,19,22 * * *`.
KST fixed daily video windows **00:00, 08:00, 12:00, 20:00** (24:00 is next-day midnight): `0 3,11,15,23 * * *` in UTC. BOTH are READ-ONLY audits; video generation and posting are OFF.
Vercel Pro is required for sub-daily cron schedules. Each cron GET requires Vercel's `Authorization: Bearer CRON_SECRET`.
Backend gets Metricool reservations with authenticated GET, emits only aggregate counts. No post, put, patch, delete, generation or ledger writes.

## Gates before actual publishing
Durable atomic Supabase ledger and access credentials; consented commercial media and natural-Korean speech; completed per-network real publisher E2E; quotas and spend verified; explicit handoff from currently active ChatGPT 3-hour publisher. Do not enable publishing by changing only a boolean.
