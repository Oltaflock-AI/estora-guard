-- =========================================
-- Migration 010: Intelligence Layer Seed
-- Seeds demo org, user, and intelligence
-- data for 3 highlighted contracts.
-- Applied to Supabase 2026-03-21
-- =========================================

-- ── Demo Auth User ────────────────────────────
-- Insert a demo user into auth.users.
-- The on_auth_user_created trigger auto-creates the profiles row.
-- Demo credentials: demo@estora.app / EstoraDemo2026!
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) values (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000000',
  'demo@estora.app',
  crypt('EstoraDemo2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Alex Chen"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
)
on conflict (id) do nothing;

-- Update profile full_name (trigger may set it from metadata)
update public.profiles
set full_name = 'Alex Chen',
    email = 'demo@estora.app'
where id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';


-- ── Demo Organization ─────────────────────────
insert into public.organizations (id, name, slug)
values ('11111111-2222-3333-4444-555555555555', 'Estora Demo Org', 'estora-demo')
on conflict (slug) do nothing;


-- ── Membership ────────────────────────────────
insert into public.memberships (org_id, user_id, role)
values (
  '11111111-2222-3333-4444-555555555555',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'admin'
)
on conflict on constraint memberships_unique_user_org do nothing;


-- ── Seed intelligence data for 3 demo contracts ──
-- Contract NYRCS-0037: near closing (Mar 23), amber health
-- Contract NYRCS-0041: mid-timeline (Mar 27), green health
-- Contract NYRCS-0048: early stage (Apr 3), green health

do $$
declare
  v_demo_user_id   uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_demo_org_id    uuid := '11111111-2222-3333-4444-555555555555';
  v_contract_1_id  uuid;
  v_contract_2_id  uuid;
  v_contract_3_id  uuid;
  v_doc_1_id       uuid := gen_random_uuid();
  v_prop_1         record;
begin
  -- Look up contract IDs by contract_number
  select id into v_contract_1_id from public.contracts where contract_number = 'NYRCS-0037';
  select id into v_contract_2_id from public.contracts where contract_number = 'NYRCS-0041';
  select id into v_contract_3_id from public.contracts where contract_number = 'NYRCS-0048';

  if v_contract_1_id is null or v_contract_2_id is null or v_contract_3_id is null then
    raise notice 'Skipping intelligence seed: demo contracts not found';
    return;
  end if;

  -- Get property info for contract 1 (for document summary)
  select p.* into v_prop_1
  from public.properties p
  join public.contracts c on c.property_id = p.id
  where c.id = v_contract_1_id;

  -- ╔══════════════════════════════════════════╗
  -- ║  CONTRACT 1: NYRCS-0037 — Near closing   ║
  -- ║  Health ~55, amber, overdue tasks         ║
  -- ╚══════════════════════════════════════════╝

  -- Pre-seeded document with extraction results
  insert into public.documents (
    id, org_id, uploaded_by, contract_id, filename,
    storage_path, doc_type, status, summary, raw_text
  ) values (
    v_doc_1_id,
    v_demo_org_id,
    v_demo_user_id,
    v_contract_1_id,
    'NYRCS-0037_Agreement_of_Sale.pdf',
    'documents/demo/NYRCS-0037.pdf',
    'agreement_of_sale',
    'done',
    'NY Residential Contract of Sale for ' || coalesce(v_prop_1.street_1, 'property') ||
    ', ' || coalesce(v_prop_1.city, 'NY') ||
    '. Standard Form 8068 with mortgage contingency. Closing date approaching.',
    'RESIDENTIAL CONTRACT OF SALE — This is a simulated document for demo purposes.'
  )
  on conflict do nothing;

  -- Link source document to contract
  update public.contracts
  set source_document_id = v_doc_1_id,
      health_score = 55,
      health_status = 'yellow'
  where id = v_contract_1_id;

  -- Extractions for contract 1
  insert into public.extractions (document_id, field_name, field_value, confidence) values
    (v_doc_1_id, 'seller_name',       (select first_name || ' ' || last_name from public.people where id = (select seller_id from public.contracts where id = v_contract_1_id)), 0.95),
    (v_doc_1_id, 'purchaser_name',    (select first_name || ' ' || last_name from public.people where id = (select purchaser_id from public.contracts where id = v_contract_1_id)), 0.93),
    (v_doc_1_id, 'property_address',  coalesce(v_prop_1.street_1, '') || ', ' || coalesce(v_prop_1.city, '') || ', NY ' || coalesce(v_prop_1.postal_code, ''), 0.97),
    (v_doc_1_id, 'purchase_price',    (select purchase_price::text from public.contracts where id = v_contract_1_id), 0.98),
    (v_doc_1_id, 'downpayment',       (select downpayment_amount::text from public.contracts where id = v_contract_1_id), 0.96),
    (v_doc_1_id, 'closing_date',      (select closing_date::text from public.contracts where id = v_contract_1_id), 0.92),
    (v_doc_1_id, 'commitment_date',   (select commitment_date::text from public.contracts where id = v_contract_1_id), 0.88),
    (v_doc_1_id, 'contract_date',     (select contract_date::text from public.contracts where id = v_contract_1_id), 0.97),
    (v_doc_1_id, 'mortgage_contingency', 'true', 0.94),
    (v_doc_1_id, 'property_type',     coalesce(v_prop_1.property_type::text, 'single_family'), 0.91),
    (v_doc_1_id, 'county',            coalesce(v_prop_1.county, ''), 0.85),
    (v_doc_1_id, 'acceptable_funds',  'certified_check', 0.72),
    (v_doc_1_id, 'firpta_required',   'false', 0.60);

  -- Risk flags for contract 1 (1 HIGH, 1 MEDIUM)
  insert into public.risk_flags (document_id, flag_type, severity, title, explanation) values
    (v_doc_1_id, 'tight_deadline', 'high',
     'Closing date is imminent',
     'The closing date is within 7 days. Verify all conditions are satisfied and title is clear. Coordinate with all parties for final walkthrough and closing logistics.'),
    (v_doc_1_id, 'missing_clause', 'medium',
     'FIRPTA certification language absent',
     'The contract does not contain explicit FIRPTA certification language per 26 U.S.C. § 1445. If the seller is a foreign person, withholding obligations apply. Recommend obtaining a non-foreign affidavit.');

  -- Tasks for contract 1: 2 overdue, 2 due soon, 3 done
  insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key) values
    (v_contract_1_id, 'Obtain mortgage commitment letter', 'Lender has not yet issued commitment letter. Follow up immediately.', 'overdue', 'critical', 'Mortgage',
     now() - interval '3 days', 'seed:' || v_contract_1_id || ':commitment'),
    (v_contract_1_id, 'Clear title exception: utility easement', 'Title search revealed an unrecorded utility easement. Obtain subordination agreement.', 'overdue', 'high', 'Title',
     now() - interval '1 day', 'seed:' || v_contract_1_id || ':title-easement'),
    (v_contract_1_id, 'Schedule final walkthrough', 'Coordinate with buyer and seller for pre-closing inspection.', 'todo', 'critical', 'Walkthrough',
     now() + interval '1 day', 'seed:' || v_contract_1_id || ':walkthrough'),
    (v_contract_1_id, 'Confirm wire transfer instructions', 'Verify closing funds wire instructions with escrow agent. Apply wire fraud verification protocol.', 'in_progress', 'high', 'Escrow',
     now() + interval '2 days', 'seed:' || v_contract_1_id || ':wire'),
    (v_contract_1_id, 'Execute contract', 'All parties sign the Agreement of Sale.', 'done', 'critical', 'Contract',
     now() - interval '30 days', 'seed:' || v_contract_1_id || ':execute'),
    (v_contract_1_id, 'Deposit earnest money', 'Deliver down payment to escrow agent.', 'done', 'high', 'Escrow',
     now() - interval '27 days', 'seed:' || v_contract_1_id || ':earnest'),
    (v_contract_1_id, 'Order title search', 'Engage title company for full title search.', 'done', 'high', 'Title',
     now() - interval '20 days', 'seed:' || v_contract_1_id || ':title-search');

  -- Timeline items for contract 1
  insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order) values
    (v_contract_1_id, 'Execute contract', 'All parties sign the Agreement of Sale', 'contract_signed',
     now() - interval '30 days', now() - interval '30 days', 0),
    (v_contract_1_id, 'Deposit earnest money', 'Down payment delivered to escrow', null,
     now() - interval '27 days', now() - interval '27 days', 1),
    (v_contract_1_id, 'Order title search', 'Full title search initiated', null,
     now() - interval '20 days', now() - interval '20 days', 2),
    (v_contract_1_id, 'Submit mortgage application', 'Full application submitted to lender', null,
     now() - interval '18 days', now() - interval '17 days', 3),
    (v_contract_1_id, 'Property inspection', 'General inspection completed', null,
     now() - interval '15 days', now() - interval '14 days', 4),
    (v_contract_1_id, 'Receive mortgage commitment', 'Awaiting lender commitment letter', 'commitment_received',
     now() - interval '3 days', null, 5),
    (v_contract_1_id, 'Title cleared', 'Pending — utility easement unresolved', 'title_cleared',
     now() - interval '1 day', null, 6),
    (v_contract_1_id, 'Final walkthrough', 'Pre-closing property inspection', 'final_walkthrough',
     now() + interval '1 day', null, 7),
    (v_contract_1_id, 'Settlement / Closing', 'Closing day', 'closing',
     (select closing_date from public.contracts where id = v_contract_1_id), null, 8);


  -- ╔══════════════════════════════════════════╗
  -- ║  CONTRACT 2: NYRCS-0041 — Mid-timeline   ║
  -- ║  Health ~78, green, on track             ║
  -- ╚══════════════════════════════════════════╝

  update public.contracts
  set health_score = 78, health_status = 'green'
  where id = v_contract_2_id;

  -- Tasks for contract 2: 1 due soon, 3 done, 2 todo
  insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key) values
    (v_contract_2_id, 'Execute contract', 'All parties have signed.', 'done', 'critical', 'Contract',
     now() - interval '25 days', 'seed:' || v_contract_2_id || ':execute'),
    (v_contract_2_id, 'Deposit earnest money', 'Down payment delivered.', 'done', 'high', 'Escrow',
     now() - interval '22 days', 'seed:' || v_contract_2_id || ':earnest'),
    (v_contract_2_id, 'Order title search', 'Title search in progress.', 'done', 'high', 'Title',
     now() - interval '18 days', 'seed:' || v_contract_2_id || ':title-search'),
    (v_contract_2_id, 'Submit mortgage application', 'Application submitted, awaiting processing.', 'in_progress', 'high', 'Mortgage',
     now() + interval '1 day', 'seed:' || v_contract_2_id || ':mortgage-app'),
    (v_contract_2_id, 'Receive mortgage commitment', 'Pending lender review.', 'todo', 'critical', 'Mortgage',
     now() + interval '10 days', 'seed:' || v_contract_2_id || ':commitment'),
    (v_contract_2_id, 'Schedule final walkthrough', 'To be scheduled closer to closing.', 'todo', 'critical', 'Walkthrough',
     now() + interval '5 days', 'seed:' || v_contract_2_id || ':walkthrough');

  -- Timeline items for contract 2
  insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order) values
    (v_contract_2_id, 'Execute contract', 'Agreement signed by all parties', 'contract_signed',
     now() - interval '25 days', now() - interval '25 days', 0),
    (v_contract_2_id, 'Deposit earnest money', 'Down payment delivered', null,
     now() - interval '22 days', now() - interval '22 days', 1),
    (v_contract_2_id, 'Order title search', 'Title search completed', null,
     now() - interval '18 days', now() - interval '18 days', 2),
    (v_contract_2_id, 'Submit mortgage application', 'Application in progress', null,
     now() + interval '1 day', null, 3),
    (v_contract_2_id, 'Receive mortgage commitment', 'Pending lender decision', 'commitment_received',
     now() + interval '10 days', null, 4),
    (v_contract_2_id, 'Title cleared', 'Awaiting final title report', 'title_cleared',
     now() + interval '3 days', null, 5),
    (v_contract_2_id, 'Final walkthrough', 'To be scheduled', 'final_walkthrough',
     now() + interval '5 days', null, 6),
    (v_contract_2_id, 'Settlement / Closing', 'Closing day', 'closing',
     (select closing_date from public.contracts where id = v_contract_2_id), null, 7);


  -- ╔══════════════════════════════════════════╗
  -- ║  CONTRACT 3: NYRCS-0048 — Early stage    ║
  -- ║  Health ~90, green, minimal tasks        ║
  -- ╚══════════════════════════════════════════╝

  update public.contracts
  set health_score = 90, health_status = 'green'
  where id = v_contract_3_id;

  -- Tasks for contract 3: all on track
  insert into public.tasks (contract_id, title, description, status, severity, category, due_at, dedupe_key) values
    (v_contract_3_id, 'Execute contract', 'All parties have signed.', 'done', 'critical', 'Contract',
     now() - interval '14 days', 'seed:' || v_contract_3_id || ':execute'),
    (v_contract_3_id, 'Deposit earnest money', 'Down payment delivered.', 'done', 'high', 'Escrow',
     now() - interval '11 days', 'seed:' || v_contract_3_id || ':earnest'),
    (v_contract_3_id, 'Review contract', 'Attorney review completed.', 'done', 'medium', 'Contract',
     now() - interval '10 days', 'seed:' || v_contract_3_id || ':review'),
    (v_contract_3_id, 'Order title search', 'Title company engaged.', 'in_progress', 'high', 'Title',
     now() + interval '3 days', 'seed:' || v_contract_3_id || ':title-search'),
    (v_contract_3_id, 'Schedule property inspection', 'Inspection scheduled for next week.', 'todo', 'medium', 'Inspection',
     now() + interval '5 days', 'seed:' || v_contract_3_id || ':inspection'),
    (v_contract_3_id, 'Submit mortgage application', 'Gathering documentation.', 'todo', 'high', 'Mortgage',
     now() + interval '7 days', 'seed:' || v_contract_3_id || ':mortgage-app');

  -- Timeline items for contract 3
  insert into public.timeline_items (contract_id, label, description, milestone_type, due_at, completed_at, sort_order) values
    (v_contract_3_id, 'Execute contract', 'Agreement signed', 'contract_signed',
     now() - interval '14 days', now() - interval '14 days', 0),
    (v_contract_3_id, 'Deposit earnest money', 'Down payment delivered', null,
     now() - interval '11 days', now() - interval '11 days', 1),
    (v_contract_3_id, 'Attorney review', 'Contract reviewed', null,
     now() - interval '10 days', now() - interval '10 days', 2),
    (v_contract_3_id, 'Order title search', 'In progress', null,
     now() + interval '3 days', null, 3),
    (v_contract_3_id, 'Property inspection', 'Scheduled', null,
     now() + interval '5 days', null, 4),
    (v_contract_3_id, 'Submit mortgage application', 'Pending', null,
     now() + interval '7 days', null, 5),
    (v_contract_3_id, 'Receive mortgage commitment', 'Future milestone', 'commitment_received',
     now() + interval '20 days', null, 6),
    (v_contract_3_id, 'Title cleared', 'Future milestone', 'title_cleared',
     now() + interval '10 days', null, 7),
    (v_contract_3_id, 'Final walkthrough', 'Future milestone', 'final_walkthrough',
     (select closing_date from public.contracts where id = v_contract_3_id) - interval '1 day', null, 8),
    (v_contract_3_id, 'Settlement / Closing', 'Closing day', 'closing',
     (select closing_date from public.contracts where id = v_contract_3_id), null, 9);

  raise notice 'Intelligence seed complete: 3 contracts, 1 document, % tasks, % timeline items',
    (select count(*) from public.tasks where contract_id in (v_contract_1_id, v_contract_2_id, v_contract_3_id)),
    (select count(*) from public.timeline_items where contract_id in (v_contract_1_id, v_contract_2_id, v_contract_3_id));

end
$$;
