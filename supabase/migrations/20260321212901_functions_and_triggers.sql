-- =========================================
-- Migration 004: Functions and Triggers
-- - updated_at triggers for new tables
-- - Auto-create profile on auth.users insert
-- - Health score computation function
-- - Deadline check function for pg_cron
-- Applied to Supabase 2026-03-21
-- =========================================

-- updated_at triggers for intelligence tables
-- Reuses set_updated_at() from migration 001.

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_memberships_updated_at on public.memberships;
create trigger trg_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_timeline_items_updated_at on public.timeline_items;
create trigger trg_timeline_items_updated_at
  before update on public.timeline_items
  for each row execute function public.set_updated_at();

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Health score computation
-- Ported from transaction-control health_service.py
create or replace function public.compute_health(p_contract_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_now              timestamptz := now();
  v_due_soon_cutoff  timestamptz := now() + interval '48 hours';
  v_overdue_count    int := 0;
  v_due_soon_count   int := 0;
  v_overdue_weighted numeric := 0;
  v_has_critical_overdue boolean := false;
  v_score            text;
  v_numeric          int;
  v_reasons          text[] := '{}';
  rec                record;
begin
  for rec in
    select t.status, t.severity, t.due_at
    from public.tasks t
    where t.contract_id = p_contract_id
      and t.due_at is not null
      and t.status in ('todo', 'in_progress', 'overdue')
  loop
    if rec.status = 'overdue' or (rec.due_at <= v_now and rec.status in ('todo', 'in_progress')) then
      v_overdue_count := v_overdue_count + 1;
      v_overdue_weighted := v_overdue_weighted + case coalesce(rec.severity, 'medium')
        when 'critical' then 3.0
        when 'high'     then 2.0
        when 'medium'   then 1.0
        when 'low'      then 0.5
        else 1.0
      end;
      if coalesce(rec.severity, 'medium') = 'critical' then
        v_has_critical_overdue := true;
      end if;
    elsif rec.due_at > v_now and rec.due_at <= v_due_soon_cutoff then
      v_due_soon_count := v_due_soon_count + 1;
    end if;
  end loop;

  if v_overdue_count > 0 then
    v_reasons := v_reasons || (v_overdue_count || ' task(s) overdue (weight ' || round(v_overdue_weighted, 1) || ')');
  end if;
  if v_due_soon_count > 0 then
    v_reasons := v_reasons || (v_due_soon_count || ' task(s) due in 48h');
  end if;

  if v_has_critical_overdue or v_overdue_weighted >= 3.0 then
    v_score := 'red';
    v_numeric := greatest(0, 100 - (v_overdue_weighted * 15)::int);
  elsif v_overdue_weighted >= 1.0 or v_due_soon_count > 0 then
    v_score := 'yellow';
    v_numeric := greatest(30, 100 - (v_overdue_weighted * 10)::int - (v_due_soon_count * 5));
  else
    v_score := 'green';
    v_numeric := 100;
    if array_length(v_reasons, 1) is null then
      v_reasons := array['All tasks on track'];
    end if;
  end if;

  update public.contracts
  set health_score = v_numeric,
      health_status = v_score
  where id = p_contract_id;

  return jsonb_build_object(
    'score', v_score,
    'numeric', v_numeric,
    'reasons', to_jsonb(v_reasons)
  );
end;
$$;

-- Deadline check function for pg_cron
-- Ported from transaction-control deadline_service.py
create or replace function public.check_deadlines()
returns jsonb
language plpgsql
as $$
declare
  v_now              timestamptz := now();
  v_due_soon_cutoff  timestamptz := now() + interval '48 hours';
  v_overdue_count    int := 0;
  v_due_soon_count   int := 0;
  v_affected_contracts uuid[];
  rec                record;
begin
  -- Mark overdue tasks
  for rec in
    select t.id, t.contract_id, t.title, t.severity, t.due_at
    from public.tasks t
    where t.due_at is not null
      and t.due_at < v_now
      and t.status in ('todo', 'in_progress')
  loop
    update public.tasks set status = 'overdue' where id = rec.id;

    insert into public.event_logs (contract_id, event_type, entity_type, entity_id, detail)
    values (
      rec.contract_id,
      'task.overdue',
      'task',
      rec.id,
      jsonb_build_object(
        'task_title', rec.title,
        'severity', rec.severity,
        'due_at', rec.due_at,
        'marked_overdue_at', v_now
      )
    );

    v_overdue_count := v_overdue_count + 1;

    if not (rec.contract_id = any(v_affected_contracts)) then
      v_affected_contracts := v_affected_contracts || rec.contract_id;
    end if;
  end loop;

  -- Log due-soon tasks
  for rec in
    select t.id, t.contract_id, t.title, t.severity, t.due_at
    from public.tasks t
    where t.due_at is not null
      and t.due_at > v_now
      and t.due_at <= v_due_soon_cutoff
      and t.status in ('todo', 'in_progress')
      and not exists (
        select 1 from public.event_logs el
        where el.entity_id = t.id
          and el.event_type = 'task.due_soon'
      )
  loop
    insert into public.event_logs (contract_id, event_type, entity_type, entity_id, detail)
    values (
      rec.contract_id,
      'task.due_soon',
      'task',
      rec.id,
      jsonb_build_object(
        'task_title', rec.title,
        'severity', rec.severity,
        'due_at', rec.due_at,
        'hours_remaining', round(extract(epoch from rec.due_at - v_now) / 3600, 1)
      )
    );

    v_due_soon_count := v_due_soon_count + 1;

    if not (rec.contract_id = any(v_affected_contracts)) then
      v_affected_contracts := v_affected_contracts || rec.contract_id;
    end if;
  end loop;

  -- Recompute health for affected contracts
  if v_affected_contracts is not null then
    for rec in
      select unnest(v_affected_contracts) as cid
    loop
      perform public.compute_health(rec.cid);
    end loop;
  end if;

  return jsonb_build_object(
    'checked_at', v_now,
    'overdue_marked', v_overdue_count,
    'due_soon_logged', v_due_soon_count,
    'contracts_rescored', coalesce(array_length(v_affected_contracts, 1), 0)
  );
end;
$$;
