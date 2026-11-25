-- TRUEVIX Phase 2 — community, collaboration, mentoring, expert reviews, studies, messaging.

-- -------------------------------------------------------------------------------------
-- Community
-- -------------------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('idea', 'technology', 'problem', 'project', 'founder_update', 'research', 'trend', 'collaboration', 'challenge', 'question', 'discussion')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 3000),
  industries text[] not null default '{}',
  -- Only a venture's public summary may be referenced (enforced by trigger).
  venture_id uuid references public.ventures (id) on delete set null,
  -- Small display figure built from numbers stated in the post itself.
  figure jsonb check (figure is null or (jsonb_typeof(figure) = 'object' and pg_column_size(figure) < 4096)),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'pending_review', 'hidden', 'removed')),
  moderation_reason text check (char_length(moderation_reason) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  pinned boolean not null default false,
  featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (moderation_status, created_at desc);
create index posts_author_idx on public.posts (author_id);
create trigger posts_touch before update on public.posts for each row execute function app.touch_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  moderation_status text not null default 'visible' check (moderation_status in ('visible', 'pending_review', 'hidden', 'removed')),
  moderation_reason text check (char_length(moderation_reason) <= 500),
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint comments_one_target check ((post_id is null) <> (venture_id is null))
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_venture_idx on public.comments (venture_id, created_at);

create table public.reactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, reaction)
);
create index reactions_post_idx on public.reactions (post_id);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_user_id uuid references auth.users (id) on delete cascade,
  followed_venture_id uuid references public.ventures (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_one_target check ((followed_user_id is null) <> (followed_venture_id is null)),
  constraint follows_not_self check (followed_user_id is distinct from follower_id)
);
create unique index follows_user_unique on public.follows (follower_id, followed_user_id) where followed_user_id is not null;
create unique index follows_venture_unique on public.follows (follower_id, followed_venture_id) where followed_venture_id is not null;
create index follows_venture_idx on public.follows (followed_venture_id);

create table public.connections (
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  constraint connections_not_self check (requester_id <> addressee_id)
);
create index connections_addressee_idx on public.connections (addressee_id);

-- -------------------------------------------------------------------------------------
-- Opportunities are referenced by saved_items, so the table is created in the next migration;
-- saved_items is created there too.
-- -------------------------------------------------------------------------------------

-- -------------------------------------------------------------------------------------
-- Collaboration and mentoring
-- -------------------------------------------------------------------------------------
create table public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'request' check (kind in ('request', 'invitation', 'cofounder_match', 'open_role')),
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete cascade,
  role text not null default 'Contributor' check (char_length(role) <= 80),
  message text not null default '' check (char_length(message) <= 1000),
  status text not null default 'pending' check (status in ('open', 'pending', 'accepted', 'declined', 'closed')),
  flagged_reason text check (char_length(flagged_reason) <= 500),
  flagged_at timestamptz,
  responded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index collaboration_requests_to_idx on public.collaboration_requests (to_id, status);
create index collaboration_requests_from_idx on public.collaboration_requests (from_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  -- Null when the member has no TRUEVIX account yet (named teammate on a registration).
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  role text not null default '' check (char_length(role) <= 80),
  created_at timestamptz not null default now()
);
create index team_members_team_idx on public.team_members (team_id);
create unique index team_members_user_unique on public.team_members (team_id, user_id) where user_id is not null;

-- Expert and mentor programme profile (application, verification, capacity).
create table public.talent_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expert', 'mentor')),
  status text not null default 'applied' check (status in ('applied', 'approved', 'rejected', 'paused')),
  -- What an administrator actually checked. Credentials stay self-declared until reviewed.
  verification text not null default 'self_declared' check (verification in ('self_declared', 'references_requested', 'admin_reviewed')),
  years_experience smallint check (years_experience between 0 and 80),
  availability text not null default 'available' check (availability in ('available', 'limited', 'unavailable')),
  hours_per_month smallint not null default 0 check (hours_per_month between 0 and 200),
  capacity smallint not null default 0 check (capacity between 0 and 50),
  areas text[] not null default '{}',
  application_statement text not null default '' check (char_length(application_statement) <= 2000),
  submitted_at timestamptz not null default now(),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  is_demo boolean not null default false
);

create table public.mentorships (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references auth.users (id) on delete cascade,
  mentee_id uuid not null references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete set null,
  focus text not null default '' check (char_length(focus) <= 300),
  status text not null default 'proposed' check (status in ('proposed', 'active', 'completed', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_demo boolean not null default false,
  constraint mentorships_distinct check (mentor_id <> mentee_id)
);
create index mentorships_mentor_idx on public.mentorships (mentor_id);
create index mentorships_mentee_idx on public.mentorships (mentee_id);

-- An invited reviewer. Accepting creates a reviewer disclosure on the venture; declining/completing revokes it.
create table public.expert_reviews (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references public.ventures (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  request_note text not null default '' check (char_length(request_note) <= 1000),
  -- Snapshot so an invited reviewer can see what they are asked to review before access is granted.
  venture_title text not null default '' check (char_length(venture_title) <= 140),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'completed', 'cancelled')),
  feedback text check (char_length(feedback) <= 4000),
  recommendation text check (recommendation in ('proceed', 'revise', 'reconsider')),
  due_on date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  constraint expert_reviews_distinct check (reviewer_id <> requested_by)
);
create index expert_reviews_reviewer_idx on public.expert_reviews (reviewer_id, status);
create index expert_reviews_venture_idx on public.expert_reviews (venture_id);
create unique index expert_reviews_open_unique on public.expert_reviews (venture_id, reviewer_id) where status in ('requested', 'accepted');

-- -------------------------------------------------------------------------------------
-- Research studies (founders recruiting research participants)
-- -------------------------------------------------------------------------------------
create table public.studies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  venture_id uuid references public.ventures (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  format text not null default '' check (char_length(format) <= 120),
  eligibility text not null default '' check (char_length(eligibility) <= 500),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'draft' check (status in ('draft', 'recruiting', 'in_progress', 'completed', 'closed')),
  starts_on date,
  ends_on date,
  target_participants integer not null default 0 check (target_participants between 0 and 10000),
  consent_text text not null default '' check (char_length(consent_text) <= 4000),
  consent_version text not null default 'v1' check (char_length(consent_version) <= 40),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger studies_touch before update on public.studies for each row execute function app.touch_updated_at();

create table public.study_participants (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'selected', 'not_selected', 'completed', 'withdrawn')),
  consent text not null default 'not_recorded' check (consent in ('not_recorded', 'given', 'withdrawn')),
  consent_at timestamptz,
  applied_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (study_id, user_id)
);
create index study_participants_user_idx on public.study_participants (user_id);

-- -------------------------------------------------------------------------------------
-- Messaging
-- -------------------------------------------------------------------------------------
create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 160),
  kind text not null default 'direct' check (kind in ('direct', 'collaboration_request', 'review_request')),
  venture_id uuid references public.ventures (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete cascade,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.thread_participants (
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);
create index thread_participants_user_idx on public.thread_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at);
