-- Pre-sale purchase activation hardening: a new, known edition may have only
-- one commercially active order per user/profile/product at a time. Legacy
-- and NULL historical rows remain outside this constraint because their exact
-- historical edition cannot be proven and may legitimately be duplicated.
create unique index if not exists orders_active_known_edition_unique
  on public.orders (user_id, profile_id, product_id, analysis_edition_key)
  where status in ('pending', 'paid')
    and analysis_edition_key is not null
    and analysis_edition_key <> 'LEGACY';