-- TRUEVIX Phase 2 — opportunities, hackathons, applications, registrations, submissions, judging.

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('incubator', 'accelerator', 'hackathon', 'competition', 'grant', 'challenge', 'mentorship', 'university', 'event', 'industry', 'internship', 'scholarship', 'workshop', 'startup_programme')),
  title text not null check (char_length(title) between 3 and 200),
  organisation text not null check (char_length(organisation) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  eligibility text not null default '' check (char_length(eligibility) <= 2000),
  industries text[] not null default '{}',
  stages text[] not null default '{}',
  location text not null default '' check (char_length(location) <= 120),
  deadline date,
  official_url text check (official_url ~* '^https?://' and char_length(official_url) <= 500),
  publication text not null default 'draft' check (publication in ('draft', 'published', 'unpublished', 'archived')),
  featured boolean not null default false,
  -- weblaze: run on TRUEVIX. external: listed from another organiser's own channel.
  source text not null default 'external' check (source in ('weblaze', 'external')),
  source_url text check (source_url ~* '^https?://' and char_length(source_url) <= 500),
  source_verification text not null default 'unverified' check (source_verification in ('unverified', 'verified', 'needs_recheck')),
  last_checked_at timestamptz,
  institution_id uuid references public.institutions (id) on delete set null,
  education text check (char_length(education) <= 200),
  format text check (format in ('online', 'offline', 'hybrid')),
  registration_opens date,
  event_start date,
  event_end date,
  team_min smallint check (team_min between 1 and 50),
  team_max smallint check (team_max between 1 and 50),
  prizes text check (char_length(prizes) <= 2000),
  instructions text check (char_length(instructions) <= 5000),
  contact text check (char_length(contact) <= 300),
  registration_mode text not null default 'external' check (registration_mode in ('on_platform', 'external', 'none')),
  banner_file_id uuid references public.files (id) on delete set null,
  results_published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_team_range check (team_min is null or team_max is null or team_min <= team_max)
);
create index opportunities_listing_idx on public.opportunities (publication, deadline);
create trigger opportunities_touch before update on public.opportunities for each row execute function app.touch_updated_at();

-- People who run an opportunity on TRUEVIX (organisers manage it; judges score it).
create table public.opportunity_organisers (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('organiser', 'judge')),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, user_id, role)
);
create index opportunity_organisers_user_idx on public.opportunity_organisers (user_id);

create table public.opportunity_rounds (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  deadline timestamptz,
  position smallint not null default 0
);
create index opportunity_rounds_opp_idx on public.opportunity_rounds (opportunity_id, position);

create table public.opportunity_criteria (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  weight smallint not null default 1 check (weight between 1 and 100),
  position smallint not null default 0
);
create index opportunity_criteria_opp_idx on public.opportunity_criteria (opportunity_id, position);

create table public.opportunity_files (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  purpose text not null check (purpose in ('document', 'certificate_template')),
  primary key (opportunity_id, file_id)
);

-- Messages organisers sent to registrants (no email provider: recorded as in-app only).
create table public.opportunity_communications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  audience text not null check (audience in ('all', 'shortlisted', 'selected')),
  sent_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz not null default now()
);

-- A member's personal tracker for opportunities they apply to elsewhere.
create table public.applications (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status text not null check (status in ('interested', 'preparing', 'submitted')),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create trigger applications_touch before update on public.applications for each row execute function app.touch_updated_at();

-- On-platform registration for opportunities run on TRUEVIX.
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('individual', 'team')),
  team_id uuid references public.teams (id) on delete set null,
  team_name text check (char_length(team_name) <= 120),
  statement text not null default '' check (char_length(statement) <= 3000),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'info_requested', 'shortlisted', 'rejected', 'selected', 'withdrawn')),
  award_place text check (char_length(award_place) <= 60),
  certificate_issued_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index registrations_one_active on public.registrations (opportunity_id, applicant_id) where status <> 'withdrawn';
create index registrations_opp_idx on public.registrations (opportunity_id, status);
create trigger registrations_touch before update on public.registrations for each row execute function app.touch_updated_at();

-- Internal reviewer notes. Never readable by the applicant.
create table public.registration_notes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.registration_events (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  text text not null check (char_length(text) <= 300),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  round_id uuid references public.opportunity_rounds (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  link text check (link ~* '^https?://' and char_length(link) <= 500),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index submissions_reg_idx on public.submissions (registration_id);

create table public.submission_files (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  primary key (submission_id, file_id)
);

create table public.judging_scores (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  round_id uuid references public.opportunity_rounds (id) on delete cascade,
  criterion_id uuid not null references public.opportunity_criteria (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null check (score between 0 and 10),
  updated_at timestamptz not null default now()
);
create unique index judging_scores_unique on public.judging_scores (registration_id, coalesce(round_id, '00000000-0000-0000-0000-000000000000'::uuid), criterion_id, judge_id);

-- Saved items (ventures via their public summary, posts, opportunities).
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_items_one_target check (num_nonnulls(venture_id, post_id, opportunity_id) = 1)
);
create unique index saved_items_venture_unique on public.saved_items (user_id, venture_id) where venture_id is not null;
create unique index saved_items_post_unique on public.saved_items (user_id, post_id) where post_id is not null;
create unique index saved_items_opp_unique on public.saved_items (user_id, opportunity_id) where opportunity_id is not null;
