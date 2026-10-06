-- Trust + verified purchase reviews.
-- Reviews are server-mediated only. Public customers never receive direct table access.

create table if not exists public.paid_product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id text not null,
  analysis_edition_key text not null,
  rating smallint not null check (rating between 1 and 5),
  easy_to_understand smallint not null check (easy_to_understand between 1 and 3),
  helpfulness smallint not null check (helpfulness between 1 and 3),
  ai_consulting_helpfulness smallint null check (ai_consulting_helpfulness between 1 and 3),
  ai_consulting_used boolean not null default false,
  body text not null check (char_length(body) between 10 and 500),
  status text not null default 'PENDING' check (status in ('PENDING','PUBLISHED','HIDDEN')),
  moderation_reason text null check (moderation_reason is null or char_length(moderation_reason) between 1 and 240),
  moderated_at timestamptz null,
  moderated_by_operator_id uuid null references public.operator_roles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_product_reviews_purchase_unique unique (purchase_id)
);

create index if not exists paid_product_reviews_product_public_idx
  on public.paid_product_reviews(product_id, status, created_at desc);
create index if not exists paid_product_reviews_user_idx
  on public.paid_product_reviews(user_id, created_at desc);
create index if not exists paid_product_reviews_profile_idx
  on public.paid_product_reviews(profile_id, created_at desc);

alter table public.paid_product_reviews enable row level security;
revoke all on table public.paid_product_reviews from anon, authenticated;
grant select, insert, update, delete on table public.paid_product_reviews to service_role;

alter table public.operator_audit_events
  drop constraint if exists operator_audit_events_action_valid;
alter table public.operator_audit_events
  add constraint operator_audit_events_action_valid
  check (action in (
    'CUSTOMER_LOOKUP','ORDER_LOOKUP','FAILURE_QUEUE_VIEW',
    'SUPPORT_REQUEST_VIEW','SUPPORT_REQUEST_UPDATE','REVIEW_MODERATE'
  ));

alter table public.operator_audit_events
  drop constraint if exists operator_audit_events_target_valid;
alter table public.operator_audit_events
  add constraint operator_audit_events_target_valid
  check (target_type in ('ACCOUNT','ORDER','FAILURE_QUEUE','SUPPORT_REQUEST','REVIEW'));

create or replace function public.operator_moderate_paid_product_review(
  p_operator_id uuid,
  p_operator_auth_user_id uuid,
  p_review_id uuid,
  p_status text,
  p_reason text,
  p_target_reference_hash text,
  p_correlation_id uuid
)
returns setof public.paid_product_reviews
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_review public.paid_product_reviews%rowtype;
begin
  if p_status not in ('PUBLISHED','HIDDEN') then
    raise exception 'REVIEW_STATUS_INVALID';
  end if;
  if p_reason is not null and (char_length(btrim(p_reason)) < 1 or char_length(btrim(p_reason)) > 240) then
    raise exception 'REVIEW_REASON_INVALID';
  end if;

  update public.paid_product_reviews
  set status = p_status,
      moderation_reason = nullif(btrim(p_reason), ''),
      moderated_at = now(),
      moderated_by_operator_id = p_operator_id,
      updated_at = now()
  where id = p_review_id
  returning * into v_review;

  if not found then
    raise exception 'REVIEW_NOT_FOUND';
  end if;

  insert into public.operator_audit_events (
    operator_id, operator_auth_user_id, action, target_type,
    target_reference_hash, outcome, correlation_id, reason
  ) values (
    p_operator_id, p_operator_auth_user_id, 'REVIEW_MODERATE', 'REVIEW',
    p_target_reference_hash, 'SUCCESS', p_correlation_id, nullif(btrim(p_reason), '')
  );

  return next v_review;
end;
$$;

revoke all on function public.operator_moderate_paid_product_review(uuid,uuid,uuid,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.operator_moderate_paid_product_review(uuid,uuid,uuid,text,text,text,uuid)
  to service_role;
