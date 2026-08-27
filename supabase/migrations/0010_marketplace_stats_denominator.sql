-- The landing page hides a figure that has no data rather than rendering an
-- empty box. "Answered in time" needs its denominator to know that: a 0% built
-- from zero decidable applications is not a fact, it is an absence.
--
-- DROP first: adding an OUT parameter changes the row type, which CREATE OR
-- REPLACE cannot do.

drop function if exists marketplace_stats();

create function marketplace_stats()
returns table (
  open_campaigns   integer,
  creators         integer,
  brands           integer,
  escrowed_cents   bigint,
  released_cents   bigint,
  answered_pct     integer,
  decidable_total  integer
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
     end from applications),
    (select count(*) filter (where status in ('accepted','declined','expired'))::integer
       from applications);
$$;

grant execute on function marketplace_stats() to anon, authenticated;
