-- Observability log for every Claude agent run made through runAgent()
-- (lib/agents/run.ts): one row per run, recording the model, token usage,
-- wall-clock latency, and how the run terminated. outcome 'recovered' means
-- the first turn produced no structured output and the forced recovery turn
-- did. response_id / survey_id are nullable because not every agent runs in
-- the context of a response or a survey.

create table if not exists public.agent_runs (
  id             uuid primary key default gen_random_uuid(),
  agent_name     text not null,
  response_id    uuid references public.responses (id) on delete set null,
  survey_id      uuid references public.surveys (id) on delete set null,
  model          text not null,
  input_tokens   integer,
  output_tokens  integer,
  latency_ms     integer not null,
  outcome        text not null check (outcome in ('success', 'recovered', 'failed')),
  error          text,
  created_at     timestamptz not null default now()
);

create index if not exists agent_runs_agent_name_idx
  on public.agent_runs (agent_name, created_at desc);

alter table public.agent_runs enable row level security;

-- No policies on purpose. Rows are written only by the service-role admin
-- client (which bypasses RLS) and are read only by future admin tooling, so
-- neither anon nor authenticated needs access yet.
