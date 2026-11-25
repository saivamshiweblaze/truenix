-- TRUEVIX Phase 2 — ventures (ideas), membership, controlled disclosure, versions, documents, activity.
--
-- Privacy model
--   ventures                   confidential working record. Readable by members and explicit, unrevoked disclosures only.
--   venture_public_summaries   the ONLY thing the public, Discover, search and recommendations read. Maintained by
--                              trigger from the venture: it exists only while the founder chose public_summary, the
--                              venture is submitted, listed by the platform and (when required) review-approved.
--                              Leaving any of those states deletes the summary immediately.
--   venture_disclosures        explicit grants to a person or an institution. Revocation sets revoked_at, which ends
--                              access on the next request. Grants are ignored while the venture is 'private'.

create table public.ventures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 140),
  summary text not null default '' check (char_length(summary) <= 400),
  problem text not null default '' check (char_length(problem) <= 2000),
  solution text not null default '' check (char_length(solution) <= 2000),
  industry text not null default 'ai' check (char_length(industry) <= 40),
  target_users text not null default '' check (char_length(target_users) <= 300),
  geography text not null default '' check (char_length(geography) <= 120),
  stage text not null default 'concept' check (stage in ('concept', 'research', 'validation', 'prototype', 'pilot', 'launched')),
  existing_research text not null default '' check (char_length(existing_research) <= 2000),
  required_skills text[] not null default '{}',
  collaboration_needs text not null default '' check (char_length(collaboration_needs) <= 1000),
  visibility text not null default 'private' check (visibility in ('private', 'collaborators', 'reviewers', 'institution', 'public_summary')),
  institution_id uuid references public.institutions (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  research_status text not null default 'none' check (research_status in ('none', 'in_progress', 'report_available')),
  validation_status text not null default 'not_started' check (validation_status in ('not_started', 'in_progress', 'evidence_collected')),
  -- Platform review/listing: written only by administrators on the server.
  review_status text check (review_status in ('pending', 'approved', 'changes_requested', 'rejected')),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  publication text not null default 'published' check (publication in ('published', 'unpublished', 'archived')),
  featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint ventures_institution_scope check (visibility <> 'institution' or institution_id is not null)
);
create index ventures_owner_idx on public.ventures (owner_id);
create index ventures_listing_idx on public.ventures (visibility, status, publication);
create trigger ventures_touch before update on public.ventures for each row execute function app.touch_updated_at();

create table public.venture_members (
  venture_id uuid not null references public.ventures (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role text not null default 'collaborator' check (member_role in ('owner', 'editor', 'collaborator')),
  title text not null default '' check (char_length(title) <= 80),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (venture_id, user_id)
);
create index venture_members_user_idx on public.venture_members (user_id);

create table public.venture_disclosures (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  grantee_user_id uuid references auth.users (id) on delete cascade,
  grantee_institution_id uuid references public.institutions (id) on delete cascade,
  access_level text not null check (access_level in ('viewer', 'collaborator', 'reviewer')),
  -- summary: core venture record only. full: plus research and validation. documents: plus shared documents.
  scope text not null default 'full' check (scope in ('summary', 'full', 'documents')),
  note text check (char_length(note) <= 500),
  granted_by uuid not null references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  constraint venture_disclosures_one_grantee check ((grantee_user_id is null) <> (grantee_institution_id is null))
);
create index venture_disclosures_venture_idx on public.venture_disclosures (venture_id) where revoked_at is null;
create index venture_disclosures_user_idx on public.venture_disclosures (grantee_user_id) where revoked_at is null;
create index venture_disclosures_inst_idx on public.venture_disclosures (grantee_institution_id) where revoked_at is null;
create unique index venture_disclosures_active_user on public.venture_disclosures (venture_id, grantee_user_id) where revoked_at is null and grantee_user_id is not null;
create unique index venture_disclosures_active_inst on public.venture_disclosures (venture_id, grantee_institution_id) where revoked_at is null and grantee_institution_id is not null;

-- Public listing snapshot. Contains nothing the founder did not put into the public-facing fields.
create table public.venture_public_summaries (
  venture_id uuid primary key references public.ventures (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  summary text not null,
  problem text not null,
  solution text not null,
  industry text not null,
  stage text not null,
  geography text not null,
  target_users text not null,
  required_skills text[] not null default '{}',
  collaboration_needs text not null default '',
  featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venture_public_summaries_industry_idx on public.venture_public_summaries (industry);

create table public.venture_versions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  version integer not null check (version > 0),
  -- A point-in-time copy of the venture record; history is immutable, so a document is appropriate.
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_note text check (char_length(change_note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (venture_id, version)
);

create table public.venture_updates (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1200),
  -- Shown with the public summary only when the founder marks it public.
  is_public boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index venture_updates_venture_idx on public.venture_updates (venture_id, created_at desc);

create table public.venture_documents (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  -- team: venture members only. shared: also disclosures with scope 'documents'.
  confidentiality text not null default 'team' check (confidentiality in ('team', 'shared')),
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index venture_documents_venture_idx on public.venture_documents (venture_id) where deleted_at is null;

create table public.venture_activity (
  id bigint generated always as identity primary key,
  venture_id uuid not null references public.ventures (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);
create index venture_activity_venture_idx on public.venture_activity (venture_id, created_at desc);
