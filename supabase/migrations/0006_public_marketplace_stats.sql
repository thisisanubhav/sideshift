-- Real numbers for the landing page.
--
-- The marketing page was quoting nothing, because every table is behind RLS
-- scoped to `authenticated` and a signed-out visitor can read none of it. The
-- alternative was hardcoding figures into the hero, which is exactly the kind
-- of fabrication PRODUCT.md forbids.
--
-- This exposes counts and one sum, nothing else: no titles, no handles, no
-- rows. SECURITY DEFINER so it can see past RLS, granted to anon so the
-- signed-out page can call it.

create or replace function marketplace_stats()
returns table (
  open_campaigns  integer,
  creators        integer,
  brands          integer,
  escrowed_cents  bigint,
  released_cents  bigint,
  answered_pct    integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from campaigns where status = 'open'),
    (select count(*)::integer from creators),
    (select count(*)::integer from brands),
    (select coalesce(sum(amount_cents), 0)::bigint from payments where status <> 'released'),
    (select coalesce(sum(amount_cents), 0)::bigint from payments where status = 'released'),
    (select case
       when count(*) filter (where status in ('accepted','declined','expired')) = 0 then 0
       else round(
         100.0 * count(*) filter (
           where status in ('accepted','declined') and responded_at <= expires_at
         ) / count(*) filter (where status in ('accepted','declined','expired'))
       )::integer
     end
     from applications);
$$;

grant execute on function marketplace_stats() to anon, authenticated;
