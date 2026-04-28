-- Allow members of an org-accessible contract to read the escrow agent
-- associated with that contract. The previous people_read_contract_parties
-- policy only covered seller_id, purchaser_id, and the two attorney FKs on
-- public.contracts. Escrow agents are linked via public.contract_escrow.
-- escrow_agent_id, so the prior policy silently hid escrow agents from the
-- agreements UI even though the row was inserted correctly.

drop policy if exists "people_read_contract_parties" on public.people;

create policy "people_read_contract_parties"
  on public.people for select
  using (
    -- existing paths: party / attorney on a directly-accessible contract
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
    -- new path: escrow agent on an org-accessible contract
    or exists (
      select 1
      from public.contract_escrow e
      join public.contracts c on c.id = e.contract_id
      where e.escrow_agent_id = people.id
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
    or (auth.jwt() ->> 'app_role') = 'admin'
  );
