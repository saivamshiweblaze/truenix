-- TRUEVIX Phase 2 — notifications, consents, moderation, audit, announcements, CMS, personal tasks and activity.
--
-- One reporting table: moderation_reports covers member reports about content AND about other members
-- (target_type = 'user'), so separate "reports"/"user_reports" tables would only duplicate it.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('comment', 'follow', 'collaboration', 'opportunity', 'research', 'review', 'system', 'message')),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 500),
  href text not null default '/notifications' check (href ~ '^/' and char_length(href) <= 300),
  read_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Study / research-participation consent events. Append-only: withdrawal is a new row.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  study_id uuid not null references public.studies (id) on delete cascade,
  consent text not null check (consent in ('given', 'withdrawn')),
  consent_version text not null check (char_length(consent_version) <= 40),
  recorded_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id, study_id, recorded_at desc);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'venture', 'user', 'collaboration', 'message')),
  target_id uuid not null,
  target_label text not null default '' check (char_length(target_label) <= 200),
  reported_user_id uuid references auth.users (id) on delete set null,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'inappropriate', 'ip_concern', 'impersonation', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_review', 'actioned', 'dismissed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  resolution text check (char_length(resolution) <= 1000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index moderation_reports_status_idx on public.moderation_reports (status, created_at desc);
create unique index moderation_reports_one_open on public.moderation_reports (reporter_id, target_type, target_id) where status in ('open', 'in_review');

-- Append-only audit trail. UPDATE and DELETE are rejected by trigger (retention purge uses a dedicated function).
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_label text not null default '' check (char_length(actor_label) <= 200),
  actor_role text check (char_length(actor_role) <= 60),
  action text not null check (char_length(action) between 1 and 120),
  entity text not null check (char_length(entity) <= 60),
  target_id text check (char_length(target_id) <= 120),
  target_label text not null default '' check (char_length(target_label) <= 300),
  before_value text check (char_length(before_value) <= 2000),
  after_value text check (char_length(after_value) <= 2000),
  reason text check (char_length(reason) <= 1000),
  -- Marks access to private or confidential information.
  sensitive boolean not null default false,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, target_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function app.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.audit_purge', true) = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'audit_logs is append-only';
end;
$$;
create trigger audit_logs_no_update before update or delete on public.audit_logs for each row execute function app.audit_logs_immutable();

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 4000),
  -- Empty = everyone. Values are front-end role ids.
  audience text[] not null default '{}',
  channels text[] not null default '{in_app}' check (channels <@ array['in_app', 'banner', 'email']::text[]),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger announcements_touch before update on public.announcements for each row execute function app.touch_updated_at();

-- What actually happened per channel. Email is recorded as not_sent until an email provider is configured.
create table public.announcement_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'banner', 'email')),
  status text not null check (status in ('delivered_in_app', 'shown_as_banner', 'not_sent')),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now()
);

-- Public site content. Fields are free-form copy (headline, body, links), so they are stored as documents.
create table public.cms_content (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  kind text not null check (kind in ('hero', 'banner', 'faq', 'help', 'footer_links', 'about_intro')),
  label text not null check (char_length(label) <= 120),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object' and pg_column_size(draft) < 32768),
  published jsonb check (published is null or (jsonb_typeof(published) = 'object' and pg_column_size(published) < 32768)),
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  position smallint not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger cms_content_touch before update on public.cms_content for each row execute function app.touch_updated_at();

create table public.cms_versions (
  cms_id text not null references public.cms_content (id) on delete cascade,
  version integer not null check (version > 0),
  fields jsonb not null,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  primary key (cms_id, version)
);

-- Personal workspace tasks and the member's own activity timeline.
create table public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index user_tasks_user_idx on public.user_tasks (user_id, created_at desc);

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  href text check (href ~ '^/' and char_length(href) <= 300),
  created_at timestamptz not null default now()
);
create index user_activity_user_idx on public.user_activity (user_id, created_at desc);
