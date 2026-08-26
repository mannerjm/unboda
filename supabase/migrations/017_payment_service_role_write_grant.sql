-- Payment persistence server flows use the service_role client.
-- Browser roles remain unable to write these tables through RLS/privileges.
grant select, insert, update, delete
  on table public.orders, public.purchases, public.entitlements,
    public.toss_payment_records
  to service_role;
