-- Cover the moderation operator foreign key used by review operations.
create index if not exists paid_product_reviews_moderated_operator_idx
  on public.paid_product_reviews(moderated_by_operator_id)
  where moderated_by_operator_id is not null;
