-- Read-only parity preflight for unboda-staging and unboda-prod.
-- NEVER changes schema, roles, authentication or user data.
-- A READY result means only required DB catalog objects exist; it is not HTTP E2E.
WITH gates AS (
  SELECT 'table'::text AS category, v.name, to_regclass('public.'||v.name) IS NOT NULL AS ready
  FROM (VALUES
    ('profiles'),('orders'),('purchases'),('entitlements'),('paid_reports'),
    ('account_lifecycles'),('ai_consulting_grants'),('ai_consulting_threads'),
    ('ai_consulting_messages'),('ai_consulting_memories'),
    ('ai_consulting_credit_ledger'),('ai_consulting_attempts'),
    ('ai_credit_lots'),('ai_credit_refund_requests'),
    ('paid_report_recovery_attempts'),('operator_roles')
  ) AS v(name)
  UNION ALL
  SELECT 'column', v.table_name||'.'||v.column_name,
    EXISTS(SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=v.table_name
        AND c.column_name=v.column_name)
  FROM (VALUES
    ('entitlements','analysis_edition_key'),
    ('paid_reports','analysis_edition_key'),
    ('profiles','birth_time_known'),
    ('ai_consulting_messages','user_id')
  ) AS v(table_name,column_name)
  UNION ALL
  SELECT 'rpc', v.name,
    EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=v.name)
  FROM (VALUES
    ('get_ai_consulting_context_memories'),
    ('record_ai_consulting_credit_purchase'),
    ('get_ai_solo_operations_metrics_24h'),
    ('begin_ai_credit_refund')
  ) AS v(name)
  UNION ALL
  SELECT 'ownership_policy', v.name,
    EXISTS(SELECT 1 FROM pg_policies p
      WHERE p.schemaname='public' AND p.tablename=v.name
        AND p.cmd='SELECT' AND p.qual='(auth.uid() = user_id)'
        AND 'authenticated'=ANY(p.roles))
  FROM (VALUES
    ('profiles'),('orders'),('purchases'),('paid_reports'),
    ('ai_consulting_threads'),('ai_consulting_messages'),('ai_consulting_memories')
  ) AS v(name)
)
SELECT category,name,ready FROM gates ORDER BY category,name;
