-- TRUEVIX Phase 2 — foundation: private helper schema, identity, institutions, admin roles, files, settings.
--
-- Conventions
--   * Every user reference is auth.users(id) (Supabase Auth owns identity and passwords).
--   * Lifecycle/status columns are text + CHECK constraints so values can evolve with additive migrations.
--   * is_demo marks seeded beta data; app.purge_demo_data() removes it without touching real records.
--   * Security-definer helpers live in schema `app`, which is NOT exposed through the Data API.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- Keeps updated_at current on every UPDATE.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================================
-- FILES (metadata for every object in Supabase Storage; created early so others can reference it)
-- =====================================================================================
create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null check (bucket in ('avatars', 'resumes', 'venture-documents', 'research-evidence', 'validation-attachments', 'venture-media', 'opportunity-submissions', 'platform-assets')),
  object_path text not null,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) <= 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  purpose text not null check (purpose in ('avatar', 'resume', 'venture_document', 'research_evidence', 'validation_attachment', 'venture_media', 'opportunity_submission', 'opportunity_banner', 'opportunity_document', 'institution_logo', 'institution_document', 'certificate_template')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, object_path)
);
create index files_owner_idx on public.files (owner_id);
comment on table public.files is 'Metadata for Storage objects. Access to the object itself is enforced by storage.objects policies.';

-- =====================================================================================
-- IDENTITY
-- =====================================================================================

-- Public profile. Self-service persona only: privileged roles live in user_roles.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  headline text not null default '' check (char_length(headline) <= 160),
  organisation text not null default '' check (char_length(organisation) <= 120),
  location text not null default '' check (char_length(location) <= 100),
  bio text not null default '' check (char_length(bio) <= 1200),
  persona text not null default 'student_explorer' check (persona in ('student_idea', 'student_explorer', 'founder', 'professional', 'expert', 'mentor', 'participant', 'institution_rep')),
  profile_kind text check (profile_kind in ('student', 'founder', 'professional', 'expert_mentor', 'participant', 'institution')),
  experience_level text not null default 'learning' check (experience_level in ('learning', 'early', 'mid', 'senior', 'leader')),
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  collaboration text[] not null default '{}',
  avatar_file_id uuid references public.files (id) on delete set null,
  visibility text not null default 'members' check (visibility in ('public', 'members', 'connections')),
  show_organisation boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_interests_idx on public.profiles using gin (interests);
create index profiles_skills_idx on public.profiles using gin (skills);
create trigger profiles_touch before update on public.profiles for each row execute function app.touch_updated_at();

create table public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  organisation text not null default '' check (char_length(organisation) <= 120),
  period text not null default '' check (char_length(period) <= 60),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index profile_experiences_user_idx on public.profile_experiences (user_id);

-- Private account record: contact details and education. Never exposed with the public profile.
create table public.account_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  phone text check (phone ~ '^\+[0-9]{7,15}$'),
  phone_verified boolean not null default false,
  linkedin text check (char_length(linkedin) <= 300),
  education_level text check (char_length(education_level) <= 80),
  qualification text check (char_length(qualification) <= 120),
  education_status text check (char_length(education_status) <= 60),
  graduation_year text check (char_length(graduation_year) <= 10),
  designation text check (char_length(designation) <= 120),
  institution_id uuid,
  resume_file_id uuid references public.files (id) on delete set null,
  admin_note text check (char_length(admin_note) <= 2000),
  updated_at timestamptz not null default now()
);
create trigger account_private_touch before update on public.account_private for each row execute function app.touch_updated_at();

-- Account lifecycle. Only administrators (server side) change it.
create table public.account_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'restricted', 'suspended', 'deactivated')),
  reason text check (char_length(reason) <= 500),
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  last_active_at timestamptz
);

-- Privileged roles. Never writable by members; granted by bootstrap or by administrators on the server.
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('platform_admin', 'institution_admin')),
  institution_id uuid,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  grant_reason text check (char_length(grant_reason) <= 500),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  constraint user_roles_scope check ((role = 'institution_admin') = (institution_id is not null))
);
create unique index user_roles_active_unique on public.user_roles (user_id, role, coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid)) where revoked_at is null;
create index user_roles_user_idx on public.user_roles (user_id) where revoked_at is null;

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notify_comments boolean not null default true,
  notify_follows boolean not null default true,
  notify_collaboration boolean not null default true,
  notify_opportunities boolean not null default true,
  notify_research boolean not null default true,
  weekly_digest boolean not null default false,
  allow_messages text not null default 'everyone' check (allow_messages in ('everyone', 'connections')),
  show_activity boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger user_preferences_touch before update on public.user_preferences for each row execute function app.touch_updated_at();

-- Onboarding answers are free-form, role-specific form fields (see features/onboarding/config.ts),
-- so they are stored as a document; nothing permission-bearing lives in `answers`.
create table public.onboarding_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_kind text check (profile_kind in ('student', 'founder', 'professional', 'expert_mentor', 'participant', 'institution')),
  step smallint not null default 0 check (step >= 0),
  total_steps smallint not null default 0 check (total_steps >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 65536),
  review_status text not null default 'not_required' check (review_status in ('not_required', 'pending', 'approved', 'changes_requested')),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger onboarding_progress_touch before update on public.onboarding_progress for each row execute function app.touch_updated_at();

-- Account-level consents (terms, privacy, marketing). Append-only history.
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing', 'research_contact')),
  document_version text not null check (char_length(document_version) <= 40),
  granted boolean not null,
  recorded_at timestamptz not null default now()
);
create index user_consents_user_idx on public.user_consents (user_id, consent_type, recorded_at desc);

-- =====================================================================================
-- INSTITUTIONS
-- =====================================================================================
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  kind text not null check (kind in ('university', 'college', 'incubator', 'accelerator', 'company', 'industry_partner', 'research_org')),
  location text not null default '' check (char_length(location) <= 120),
  website text check (website ~* '^https?://' and char_length(website) <= 300),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'archived')),
  -- Only partner_confirmed (with an agreement reference) may be described as a partner.
  relationship text not null default 'listed' check (relationship in ('listed', 'registered', 'partner_confirmed')),
  agreement_ref text check (char_length(agreement_ref) <= 120),
  logo_file_id uuid references public.files (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_partner_ref check (relationship <> 'partner_confirmed' or agreement_ref is not null)
);
create trigger institutions_touch before update on public.institutions for each row execute function app.touch_updated_at();

alter table public.account_private add constraint account_private_institution_fk foreign key (institution_id) references public.institutions (id) on delete set null;
alter table public.user_roles add constraint user_roles_institution_fk foreign key (institution_id) references public.institutions (id) on delete cascade;

create table public.institution_members (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('representative', 'staff', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'removed')),
  approved_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);
create index institution_members_user_idx on public.institution_members (user_id);

create table public.institution_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('register_institution', 'representative_access', 'administrator_access')),
  institution_id uuid references public.institutions (id) on delete cascade,
  proposed_name text check (char_length(proposed_name) <= 160),
  proposed_kind text check (proposed_kind in ('university', 'college', 'incubator', 'accelerator', 'company', 'industry_partner', 'research_org')),
  requested_by uuid not null references auth.users (id) on delete cascade,
  position_title text check (char_length(position_title) <= 120),
  note text not null default '' check (char_length(note) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint institution_requests_target check (institution_id is not null or proposed_name is not null)
);
create index institution_requests_status_idx on public.institution_requests (status, created_at desc);
create unique index institution_requests_one_pending on public.institution_requests (requested_by, request_type, coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status = 'pending';

create table public.institution_programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'archived')),
  participant_count integer not null default 0 check (participant_count >= 0),
  starts_on date,
  ends_on date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index institution_programmes_inst_idx on public.institution_programmes (institution_id);
create trigger institution_programmes_touch before update on public.institution_programmes for each row execute function app.touch_updated_at();

-- =====================================================================================
-- ADMINISTRATION — operator roles and permission matrix
-- =====================================================================================
create table public.admin_roles (
  id text primary key check (id ~ '^[a-z_]{3,40}$'),
  label text not null,
  description text not null default '',
  position smallint not null default 0
);

create table public.admin_permissions (
  admin_role_id text not null references public.admin_roles (id) on delete cascade,
  module text not null check (module in ('overview', 'users', 'onboarding', 'ideas', 'content', 'moderation', 'research', 'validation', 'opportunities', 'institutions', 'talent', 'studies', 'collaboration', 'communications', 'cms', 'analytics', 'access', 'audit', 'settings')),
  permission text not null check (permission in ('view', 'create', 'edit', 'approve', 'publish', 'suspend', 'archive', 'delete', 'export', 'manage_permissions')),
  primary key (admin_role_id, module, permission)
);

-- Which operator role a platform administrator holds. Requires an active platform_admin grant.
create table public.admin_role_assignments (
  user_id uuid primary key references auth.users (id) on delete cascade,
  admin_role_id text not null references public.admin_roles (id),
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now()
);

-- =====================================================================================
-- PLATFORM SETTINGS (singleton)
-- =====================================================================================
create table public.platform_settings (
  id boolean primary key default true check (id),
  open_registration boolean not null default true,
  require_idea_review boolean not null default true,
  research_enabled boolean not null default true,
  community_posting boolean not null default true,
  opportunity_registration boolean not null default true,
  studies_recruiting boolean not null default true,
  -- Display/configuration values edited in the admin portal (identity, retention, maintenance…).
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true);
create trigger platform_settings_touch before update on public.platform_settings for each row execute function app.touch_updated_at();
