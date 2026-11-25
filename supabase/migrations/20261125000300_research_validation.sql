-- TRUEVIX Phase 2 — AI Researcher and Validation.
--
-- Research belongs to its owner and, when linked, inherits the venture's access (members and full-scope disclosures).
-- A research run records provenance honestly: 'framework' runs are the built-in guided template produced without any
-- AI or search provider; 'live' runs require a configured provider. Nothing here is ever presented as live evidence
-- unless provenance = 'live'.

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete set null,
  question text not null check (char_length(question) between 3 and 500),
  categories text[] not null default '{}',
  depth text not null default 'standard' check (depth in ('scan', 'standard', 'deep')),
  saved boolean not null default false,
  archived boolean not null default false,
  archived_reason text check (char_length(archived_reason) <= 500),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index research_projects_owner_idx on public.research_projects (owner_id, created_at desc);
create index research_projects_venture_idx on public.research_projects (venture_id);
create trigger research_projects_touch before update on public.research_projects for each row execute function app.touch_updated_at();

create table public.research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'provider_not_configured')),
  provenance text not null check (provenance in ('framework', 'live')),
  provider text check (char_length(provider) <= 80),
  failure_reason text check (char_length(failure_reason) <= 500),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index research_runs_project_idx on public.research_runs (project_id, started_at desc);

create table public.research_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs (id) on delete cascade,
  section_key text not null check (char_length(section_key) <= 60),
  heading text not null check (char_length(heading) <= 200),
  body text not null default '' check (char_length(body) <= 8000),
  bullets text[] not null default '{}',
  position smallint not null default 0
);
create index research_findings_run_idx on public.research_findings (run_id, position);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_runs (id) on delete cascade,
  title text not null check (char_length(title) <= 300),
  kind text not null default '' check (char_length(kind) <= 80),
  note text not null default '' check (char_length(note) <= 1000),
  url text check (url ~* '^https?://' and char_length(url) <= 1000),
  file_id uuid references public.files (id) on delete set null,
  position smallint not null default 0
);
create index research_sources_run_idx on public.research_sources (run_id, position);

create table public.research_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index research_notes_project_idx on public.research_notes (project_id, created_at);

-- -------------------------------------------------------------------------------------
-- Validation
-- -------------------------------------------------------------------------------------
create table public.validation_workspaces (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null unique references public.ventures (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger validation_workspaces_touch before update on public.validation_workspaces for each row execute function app.touch_updated_at();

create table public.validation_sections (
  workspace_id uuid not null references public.validation_workspaces (id) on delete cascade,
  section_id text not null check (section_id in ('problem', 'solution', 'market', 'competitors', 'segments', 'business_model', 'feasibility', 'risks', 'differentiation', 'customer_validation', 'expert_feedback', 'experiments')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'done')),
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, section_id)
);
create trigger validation_sections_touch before update on public.validation_sections for each row execute function app.touch_updated_at();

-- Assumptions double as the workspace's open questions ("resolved" = no longer open).
create table public.assumptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.validation_workspaces (id) on delete cascade,
  section_id text check (section_id in ('problem', 'solution', 'market', 'competitors', 'segments', 'business_model', 'feasibility', 'risks', 'differentiation', 'customer_validation', 'expert_feedback', 'experiments')),
  statement text not null check (char_length(statement) between 1 and 300),
  risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'testing', 'supported', 'refuted', 'resolved')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assumptions_ws_idx on public.assumptions (workspace_id, created_at);
create trigger assumptions_touch before update on public.assumptions for each row execute function app.touch_updated_at();

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.validation_workspaces (id) on delete cascade,
  section_id text not null check (section_id in ('problem', 'solution', 'market', 'competitors', 'segments', 'business_model', 'feasibility', 'risks', 'differentiation', 'customer_validation', 'expert_feedback', 'experiments')),
  evidence_type text not null check (evidence_type in ('ai_analysis', 'public_research', 'expert_opinion', 'customer_response', 'experiment_result', 'assumption')),
  body text not null check (char_length(body) between 1 and 2000),
  source text not null default '' check (char_length(source) <= 200),
  assumption_id uuid references public.assumptions (id) on delete set null,
  file_id uuid references public.files (id) on delete set null,
  -- True when produced by the built-in template rather than a person or a live provider.
  framework_generated boolean not null default false,
  -- Set by administrators when evidence was overstated (e.g. a guess recorded as a customer response).
  downgraded_reason text check (char_length(downgraded_reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint evidence_people_only check (not framework_generated or evidence_type = 'ai_analysis')
);
create index evidence_ws_idx on public.evidence (workspace_id, created_at);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.validation_workspaces (id) on delete cascade,
  assumption_id uuid references public.assumptions (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  hypothesis text not null default '' check (char_length(hypothesis) <= 1000),
  method text not null default '' check (char_length(method) <= 1000),
  success_criteria text not null default '' check (char_length(success_criteria) <= 500),
  status text not null default 'planned' check (status in ('planned', 'running', 'completed', 'abandoned')),
  starts_on date,
  ends_on date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiments_ws_idx on public.experiments (workspace_id);
create trigger experiments_touch before update on public.experiments for each row execute function app.touch_updated_at();

create table public.experiment_results (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  outcome text not null check (outcome in ('supported', 'refuted', 'inconclusive')),
  summary text not null check (char_length(summary) between 1 and 2000),
  metric text check (char_length(metric) <= 200),
  file_id uuid references public.files (id) on delete set null,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index experiment_results_exp_idx on public.experiment_results (experiment_id);

create table public.customer_interviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.validation_workspaces (id) on delete cascade,
  -- A label, never the interviewee's identity unless they consented.
  interviewee_label text not null check (char_length(interviewee_label) between 1 and 120),
  segment text not null default '' check (char_length(segment) <= 120),
  conducted_on date,
  summary text not null default '' check (char_length(summary) <= 4000),
  key_quotes text[] not null default '{}',
  consent_recorded boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index customer_interviews_ws_idx on public.customer_interviews (workspace_id);
