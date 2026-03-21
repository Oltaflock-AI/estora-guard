-- =========================================
-- Migration 011: Seed Tasks & Timeline for ALL Contracts
-- Generates tasks and timeline items for every contract
-- that doesn't already have them (the 3 demo contracts
-- from migration 010 are skipped).
-- Also sets health_score / health_status on every contract.
-- Applied to Supabase 2026-03-21
-- =========================================

do $$
declare
  rec           record;
  v_contract_id uuid;
  v_close_date  date;
  v_contract_dt date;
  v_status      text;
  v_n           int;
  v_health_profile text;  -- 'red', 'yellow', 'green_high', 'green_mid'
  v_sort        int;
  v_days_since  int;      -- days since contract_date
begin

  -- Loop through ALL contracts that have NO tasks yet
  for rec in
    select c.id, c.contract_number, c.contract_date, c.closing_date, c.status
    from public.contracts c
    where not exists (
      select 1 from public.tasks t where t.contract_id = c.id
    )
    order by c.contract_number
  loop
    v_contract_id := rec.id;
    v_close_date  := rec.closing_date;
    v_contract_dt := rec.contract_date;
    v_status      := rec.status;

    -- Extract numeric part of contract number for variety
    v_n := substring(rec.contract_number from 'NYRCS-0*(\d+)')::int;

    -- Days since contract was executed
    v_days_since := (current_date - v_contract_dt)::int;

    -- Assign health profile based on contract number for variety
    -- This gives us a good distribution across deals
    if v_status in ('cancelled', 'defaulted_buyer', 'defaulted_seller') then
      v_health_profile := 'terminal';
    elsif v_status = 'closed' then
      v_health_profile := 'closed';
    elsif v_n % 5 = 0 then
      v_health_profile := 'red';       -- ~10 contracts: critical issues
    elsif v_n % 3 = 0 then
      v_health_profile := 'yellow';    -- ~8 contracts: some urgency
    elsif v_n % 4 = 0 then
      v_health_profile := 'green_mid'; -- ~5 contracts: good but tasks pending
    else
      v_health_profile := 'green_high'; -- rest: healthy
    end if;

    v_sort := 0;

    -- ════════════════════════════════════════
    -- TIMELINE ITEMS (always 9 milestones)
    -- ════════════════════════════════════════

    -- 1. Execute contract (always done — it's in the past)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Execute contract', 'All parties sign the Agreement of Sale', 'contract_signed',
            v_contract_dt, v_contract_dt, 0);

    -- 2. Deposit earnest money (done if >3 days since contract)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Deposit earnest money', 'Down payment delivered to escrow', null,
            v_contract_dt + 3,
            case when v_days_since >= 3 then v_contract_dt + 3 else null end,
            1);

    -- 3. Attorney review (done if >5 days)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Attorney review', 'Contract reviewed by both attorneys', null,
            v_contract_dt + 5,
            case when v_days_since >= 5 then v_contract_dt + 5 else null end,
            2);

    -- 4. Order title search (done if >7 days)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Order title search', 'Full title search initiated', null,
            v_contract_dt + 7,
            case when v_days_since >= 10 then v_contract_dt + 9 else null end,
            3);

    -- 5. Property inspection (done if >10 days)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Property inspection', 'General property inspection', null,
            v_contract_dt + 10,
            case when v_days_since >= 12 then v_contract_dt + 11 else null end,
            4);

    -- 6. Mortgage commitment (done if >30 days, else pending)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Receive mortgage commitment', 'Lender commitment letter', 'commitment_received',
            v_contract_dt + 30,
            case when v_days_since >= 30 then v_contract_dt + 28 else null end,
            5);

    -- 7. Title cleared (done if >35 days)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Title cleared', 'All exceptions resolved, title insurable', 'title_cleared',
            v_contract_dt + 35,
            case when v_days_since >= 35 then v_contract_dt + 34 else null end,
            6);

    -- 8. Final walkthrough (1 day before closing)
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Final walkthrough', 'Pre-closing property inspection', 'final_walkthrough',
            case when v_close_date is not null then v_close_date - 1 else v_contract_dt + 44 end,
            case when v_status = 'closed' then coalesce(v_close_date - 1, v_contract_dt + 44) else null end,
            7);

    -- 9. Settlement / Closing
    insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order)
    values (v_contract_id, 'Settlement / Closing', 'Closing day — execute deed, disburse funds', 'closing',
            coalesce(v_close_date, v_contract_dt + 45),
            case when v_status = 'closed' then v_close_date else null end,
            8);


    -- ════════════════════════════════════════
    -- TASKS — vary based on health profile
    -- ════════════════════════════════════════

    -- All contracts get baseline completed tasks for early milestones

    -- Execute contract (always done)
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Execute contract', 'All parties sign the Agreement of Sale.',
            'done', 'critical', 'Contract', v_contract_dt,
            'seed:' || v_contract_id || ':execute');

    -- Deposit earnest money
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Deposit earnest money', 'Deliver down payment to escrow agent.',
            case when v_days_since >= 3 then 'done' else 'todo' end,
            'high', 'Escrow', v_contract_dt + 3,
            'seed:' || v_contract_id || ':earnest');

    -- Attorney review
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Review contract', 'Attorney review of executed contract and all riders.',
            case when v_days_since >= 5 then 'done' else 'todo' end,
            'medium', 'Contract', v_contract_dt + 5,
            'seed:' || v_contract_id || ':review');

    -- Order title search
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Order title search', 'Engage title company for full title search.',
            case when v_days_since >= 10 then 'done'
                 when v_days_since >= 7 then 'in_progress'
                 else 'todo' end,
            'high', 'Title', v_contract_dt + 7,
            'seed:' || v_contract_id || ':title-search');

    -- Property inspection
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Schedule property inspection', 'Schedule and complete general property inspection.',
            case when v_days_since >= 12 then 'done'
                 when v_days_since >= 7 then 'in_progress'
                 else 'todo' end,
            'medium', 'Inspection', v_contract_dt + 10,
            'seed:' || v_contract_id || ':inspection');

    -- Submit mortgage application
    insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
    values (v_contract_id, 'Submit mortgage application', 'Complete and submit full mortgage application.',
            case when v_days_since >= 15 then 'done'
                 when v_days_since >= 10 then 'in_progress'
                 else 'todo' end,
            'high', 'Mortgage', v_contract_dt + 14,
            'seed:' || v_contract_id || ':mortgage-app');

    -- ── Health-profile-specific tasks ──

    if v_health_profile = 'red' then
      -- RED: overdue critical + overdue high tasks
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Obtain mortgage commitment letter',
              'Lender has not issued commitment letter. OVERDUE — follow up immediately.',
              'overdue', 'critical', 'Mortgage',
              current_date - interval '5 days',
              'seed:' || v_contract_id || ':commitment');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Resolve title exception',
              'Title search revealed unresolved lien. Must be cleared before closing.',
              'overdue', 'high', 'Title',
              current_date - interval '2 days',
              'seed:' || v_contract_id || ':title-exception');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Schedule final walkthrough',
              'Coordinate final walkthrough with all parties.',
              'todo', 'critical', 'Walkthrough',
              current_date + interval '3 days',
              'seed:' || v_contract_id || ':walkthrough');

    elsif v_health_profile = 'yellow' then
      -- YELLOW: some overdue medium/high, some due soon
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Receive mortgage commitment',
              'Commitment letter pending — lender review in progress.',
              'overdue', 'high', 'Mortgage',
              current_date - interval '1 day',
              'seed:' || v_contract_id || ':commitment');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Title cleared',
              'Final title report expected shortly.',
              'todo', 'high', 'Title',
              current_date + interval '1 day',
              'seed:' || v_contract_id || ':title-clear');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Schedule final walkthrough',
              'Coordinate with buyer and seller for pre-closing inspection.',
              'todo', 'critical', 'Walkthrough',
              current_date + interval '4 days',
              'seed:' || v_contract_id || ':walkthrough');

    elsif v_health_profile = 'green_mid' then
      -- GREEN MID: all on track but tasks pending
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Receive mortgage commitment',
              'Lender processing — expected on schedule.',
              'todo', 'critical', 'Mortgage',
              current_date + interval '8 days',
              'seed:' || v_contract_id || ':commitment');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Title cleared',
              'Title company completing final checks.',
              'in_progress', 'high', 'Title',
              current_date + interval '5 days',
              'seed:' || v_contract_id || ':title-clear');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Schedule final walkthrough',
              'To be scheduled closer to closing.',
              'todo', 'critical', 'Walkthrough',
              current_date + interval '14 days',
              'seed:' || v_contract_id || ':walkthrough');

    elsif v_health_profile = 'green_high' then
      -- GREEN HIGH: most tasks done or far in future
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Receive mortgage commitment',
              case when v_days_since >= 30
                   then 'Commitment letter received.'
                   else 'Application in processing — on track.' end,
              case when v_days_since >= 30 then 'done' else 'todo' end,
              'critical', 'Mortgage',
              v_contract_dt + 30,
              'seed:' || v_contract_id || ':commitment');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Title cleared',
              case when v_days_since >= 35
                   then 'Title cleared and insurable.'
                   else 'Title search in progress.' end,
              case when v_days_since >= 35 then 'done' else 'todo' end,
              'high', 'Title',
              v_contract_dt + 35,
              'seed:' || v_contract_id || ':title-clear');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Schedule final walkthrough',
              'To be scheduled closer to closing.',
              case when v_status = 'closed' then 'done' else 'todo' end,
              'critical', 'Walkthrough',
              coalesce(v_close_date - 1, v_contract_dt + 44),
              'seed:' || v_contract_id || ':walkthrough');

    elsif v_health_profile = 'terminal' then
      -- Terminal contracts: mark everything done or leave minimal
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Receive mortgage commitment',
              'Contract terminated — no longer applicable.',
              'done', 'critical', 'Mortgage',
              v_contract_dt + 30,
              'seed:' || v_contract_id || ':commitment');

    elsif v_health_profile = 'closed' then
      -- Closed: all tasks done
      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Receive mortgage commitment',
              'Commitment letter received.',
              'done', 'critical', 'Mortgage',
              v_contract_dt + 30,
              'seed:' || v_contract_id || ':commitment');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Title cleared',
              'Title cleared and insurable.',
              'done', 'high', 'Title',
              v_contract_dt + 35,
              'seed:' || v_contract_id || ':title-clear');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Final walkthrough',
              'Walkthrough completed.',
              'done', 'critical', 'Walkthrough',
              v_close_date - 1,
              'seed:' || v_contract_id || ':walkthrough');

      insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key)
      values (v_contract_id, 'Settlement / Closing',
              'Closing completed successfully.',
              'done', 'critical', 'Closing',
              v_close_date,
              'seed:' || v_contract_id || ':closing');
    end if;

  end loop;

  raise notice 'Seeded tasks and timeline items for all contracts.';
end
$$;

-- ════════════════════════════════════════
-- RECOMPUTE HEALTH SCORES for all contracts
-- Inline version of compute_health() to avoid STABLE function restriction
-- ════════════════════════════════════════
do $$
declare
  crec          record;
  trec          record;
  v_now              timestamptz := now();
  v_due_soon_cutoff  timestamptz := now() + interval '48 hours';
  v_overdue_count    int;
  v_due_soon_count   int;
  v_overdue_weighted numeric;
  v_has_critical_overdue boolean;
  v_score            text;
  v_numeric          int;
begin
  for crec in select id from public.contracts loop
    v_overdue_count := 0;
    v_due_soon_count := 0;
    v_overdue_weighted := 0;
    v_has_critical_overdue := false;

    for trec in
      select t.status, t.severity, t.due_at
      from public.tasks t
      where t.contract_id = crec.id
        and t.due_at is not null
        and t.status in ('todo', 'in_progress', 'overdue')
    loop
      if trec.status = 'overdue' or (trec.due_at <= v_now and trec.status in ('todo', 'in_progress')) then
        v_overdue_count := v_overdue_count + 1;
        v_overdue_weighted := v_overdue_weighted + case coalesce(trec.severity, 'medium')
          when 'critical' then 3.0
          when 'high'     then 2.0
          when 'medium'   then 1.0
          when 'low'      then 0.5
          else 1.0
        end;
        if coalesce(trec.severity, 'medium') = 'critical' then
          v_has_critical_overdue := true;
        end if;
      elsif trec.due_at > v_now and trec.due_at <= v_due_soon_cutoff then
        v_due_soon_count := v_due_soon_count + 1;
      end if;
    end loop;

    if v_has_critical_overdue or v_overdue_weighted >= 3.0 then
      v_score := 'red';
      v_numeric := greatest(0, 100 - (v_overdue_weighted * 15)::int);
    elsif v_overdue_weighted >= 1.0 or v_due_soon_count > 0 then
      v_score := 'yellow';
      v_numeric := greatest(30, 100 - (v_overdue_weighted * 10)::int - (v_due_soon_count * 5));
    else
      v_score := 'green';
      v_numeric := 100;
    end if;

    update public.contracts
    set health_score = v_numeric,
        health_status = v_score
    where id = crec.id;
  end loop;

  raise notice 'Health scores recomputed for all contracts.';
end
$$;
