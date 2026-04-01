-- Security Advisor: policies existed but RLS was off on production for these tables.
-- Idempotent: safe if RLS already enabled (matches contract_core_schema intent).

alter table public.contracts enable row level security;
alter table public.people enable row level security;
alter table public.properties enable row level security;
