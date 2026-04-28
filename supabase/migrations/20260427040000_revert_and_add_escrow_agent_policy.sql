-- The previous migration (20260427030000_people_read_escrow_agents.sql)
-- dropped and recreated public.people's "people_read_contract_parties"
-- policy to add an escrow-agent path. While the new SQL appeared logically
-- equivalent on the existing path, in practice party reads (seller_id /
-- purchaser_id) stopped working — newly created contracts had blank Seller /
-- Purchaser fields in the agreements view even though the underlying rows
-- were correct (verified via service-role query).
--
-- Safer approach: leave "people_read_contract_parties" alone and ADD a
-- second SELECT policy for escrow agents. PostgreSQL OR's permissive
-- policies, so this is purely additive — it cannot block any read that the
-- original party policy already allows.

-- 1. Restore the original party policy verbatim from
--    20260401120000_contracts_org_id_and_rls.sql (in case the previous
--    migration's recreated version is subtly different at runtime).
drop policy if exists "people_read_contract_parties" on public.people;

create policy "people_read_contract_parties"
  on public.people for select
  using (
    exists (
      select 1 from public.contracts c
      where (
        c.seller_id = id
        or c.purchaser_id = id
        or c.seller_attorney_id = id
        or c.purchaser_attorney_id = id
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

-- 2. Add a separate, additive policy for escrow agents. Permissive policies
--    are OR'd in Postgres RLS, so this cannot deny any access the party
--    policy already grants.
drop policy if exists "people_read_contract_escrow_agents" on public.people;

create policy "people_read_contract_escrow_agents"
  on public.people for select
  using (
    exists (
      select 1
      from public.contract_escrow e
      join public.contracts c on c.id = e.contract_id
      where e.escrow_agent_id = public.people.id
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
