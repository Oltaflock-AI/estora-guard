-- Direct evidence: the escrow_agents policy I added with `e.escrow_agent_id =
-- public.people.id` (fully qualified) works — Jennifer Walsh shows up in the
-- agreements UI. The parties policy with `c.seller_id = id` (unqualified)
-- does NOT — Patricia Thornton and Daniel Rivera fail to load even though
-- service-role-verified data is correct (contract.org_id matches the user's
-- org, contract.seller_id and purchaser_id point at populated people rows).
--
-- The only structural difference between the two policies is qualification.
-- Inside `select 1 from public.contracts c`, an unqualified `id` is
-- ambiguous — both `c.id` and `public.people.id` are in scope. PostgreSQL's
-- name resolution can bind `id` to the inner `c.id`, making `c.seller_id =
-- c.id` always false and the EXISTS clause empty.
--
-- Fix: replace every unqualified `id` in the parties policy with the fully
-- qualified `public.people.id`, mirroring the escrow agent policy that works.

drop policy if exists "people_read_contract_parties" on public.people;

create policy "people_read_contract_parties"
  on public.people for select
  using (
    exists (
      select 1 from public.contracts c
      where (
        c.seller_id              = public.people.id
        or c.purchaser_id        = public.people.id
        or c.seller_attorney_id  = public.people.id
        or c.purchaser_attorney_id = public.people.id
      )
      and (
        c.seller_id              = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_id        = (auth.jwt() ->> 'person_id')::uuid
        or c.seller_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
        or (
          c.org_id is not null
          and c.org_id in (select public.user_org_ids())
        )
      )
    )
  );
