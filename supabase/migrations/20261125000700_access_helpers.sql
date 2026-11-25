-- TRUEVIX Phase 2 — access helpers used by RLS policies.
--
-- Every helper is SECURITY DEFINER with an empty search_path and lives in schema `app` (not exposed through the
-- Data API). Running as the table owner means a policy can consult membership/disclosure tables without
-- triggering their own policies, which is what prevents recursive RLS. Helpers only ever answer about the
-- calling user (auth.uid()); none accepts a user id from the caller except where noted.

-- Account may act (create/modify content). Restricted, suspended and deactivated accounts may not.
create or replace function app.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_status s
    where s.user_id = auth.uid() and s.status = 'active'
  );
$$;

-- Account is not blocked from signing in to the product (restricted accounts may still read).
create or replace function app.is_usable_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_status s
    where s.user_id = auth.uid() and s.status in ('active', 'restricted')
  );
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    join public.account_status s on s.user_id = r.user_id and s.status = 'active'
    where r.user_id = auth.uid() and r.role = 'platform_admin' and r.revoked_at is null
  );
$$;

create or replace function app.has_admin_permission(p_module text, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_platform_admin() and exists (
    select 1
    from public.admin_role_assignments a
    join public.admin_permissions p on p.admin_role_id = a.admin_role_id
    where a.user_id = auth.uid() and p.module = p_module and p.permission = p_permission
  );
$$;

create or replace function app.is_institution_admin(p_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    join public.account_status s on s.user_id = r.user_id and s.status = 'active'
    where r.user_id = auth.uid() and r.role = 'institution_admin' and r.institution_id = p_institution and r.revoked_at is null
  );
$$;

create or replace function app.is_institution_member(p_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_institution_admin(p_institution) or exists (
    select 1 from public.institution_members m
    where m.institution_id = p_institution and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- Listed members: active/restricted account with onboarding completed. Others are hidden from other members.
create or replace function app.is_listed_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_status s
    join public.onboarding_progress o on o.user_id = s.user_id
    where s.user_id = p_user and s.status in ('active', 'restricted') and o.completed
  );
$$;

create or replace function app.is_connected(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = auth.uid() and c.addressee_id = p_user) or (c.addressee_id = auth.uid() and c.requester_id = p_user))
  );
$$;

-- -------------------------------------------------------------------------------------
-- Ventures
-- -------------------------------------------------------------------------------------
create or replace function app.venture_member_role(p_venture uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.member_role from public.venture_members m
  where m.venture_id = p_venture and m.user_id = auth.uid();
$$;

-- Broadest active disclosure scope for the caller ('summary' < 'full' < 'documents'), or null.
-- Grants are ignored while the venture is private, so switching to private is an immediate revocation.
create or replace function app.venture_disclosure_scope(p_venture uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select id, visibility, institution_id from public.ventures where id = p_venture
  ),
  scopes as (
    select d.scope
    from public.venture_disclosures d, v
    where d.venture_id = v.id
      and v.visibility <> 'private'
      and d.revoked_at is null
      and (d.expires_at is null or d.expires_at > now())
      and (
        d.grantee_user_id = auth.uid()
        or (d.grantee_institution_id is not null and app.is_institution_member(d.grantee_institution_id))
      )
    union all
    select 'full' from v
    where v.visibility = 'institution' and v.institution_id is not null and app.is_institution_member(v.institution_id)
  )
  select case
    when bool_or(scope = 'documents') then 'documents'
    when bool_or(scope = 'full') then 'full'
    when bool_or(scope = 'summary') then 'summary'
  end
  from scopes;
$$;

create or replace function app.can_view_venture(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_usable_account() and (app.venture_member_role(p_venture) is not null or app.venture_disclosure_scope(p_venture) is not null);
$$;

-- Research and validation records linked to the venture.
create or replace function app.can_view_venture_work(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_usable_account() and (app.venture_member_role(p_venture) is not null or app.venture_disclosure_scope(p_venture) in ('full', 'documents'));
$$;

-- Edit the venture record itself: owner and editors.
create or replace function app.can_edit_venture(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_active_account() and app.venture_member_role(p_venture) in ('owner', 'editor');
$$;

-- Contribute to the venture's work (validation, research, documents): any member.
create or replace function app.can_contribute_venture(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_active_account() and app.venture_member_role(p_venture) is not null;
$$;

create or replace function app.is_venture_owner(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.ventures v where v.id = p_venture and v.owner_id = auth.uid());
$$;

create or replace function app.can_view_venture_document(p_venture uuid, p_confidentiality text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_usable_account() and (
    app.venture_member_role(p_venture) is not null
    or (p_confidentiality = 'shared' and app.venture_disclosure_scope(p_venture) = 'documents')
  );
$$;

-- The venture has a live public summary (used for public comments, follows and saves).
create or replace function app.is_venture_public(p_venture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.venture_public_summaries s where s.venture_id = p_venture);
$$;

-- -------------------------------------------------------------------------------------
-- Research and validation
-- -------------------------------------------------------------------------------------
create or replace function app.can_view_research(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_projects p
    where p.id = p_project
      and (p.owner_id = auth.uid() or (p.venture_id is not null and app.can_view_venture_work(p.venture_id)))
  );
$$;

create or replace function app.can_edit_research(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_active_account() and exists (
    select 1 from public.research_projects p where p.id = p_project and p.owner_id = auth.uid()
  );
$$;

create or replace function app.research_run_project(p_run uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select project_id from public.research_runs where id = p_run;
$$;

create or replace function app.workspace_venture(p_workspace uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select venture_id from public.validation_workspaces where id = p_workspace;
$$;

create or replace function app.experiment_workspace(p_experiment uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id from public.experiments where id = p_experiment;
$$;

-- -------------------------------------------------------------------------------------
-- Messaging, opportunities, studies
-- -------------------------------------------------------------------------------------
create or replace function app.is_thread_participant(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.thread_participants t where t.thread_id = p_thread and t.user_id = auth.uid());
$$;

create or replace function app.is_opportunity_staff(p_opportunity uuid, p_role text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.opportunity_organisers o
    where o.opportunity_id = p_opportunity and o.user_id = auth.uid() and (p_role is null or o.role = p_role)
  );
$$;

create or replace function app.is_opportunity_public(p_opportunity uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.opportunities o where o.id = p_opportunity and o.publication = 'published');
$$;

create or replace function app.registration_opportunity(p_registration uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select opportunity_id from public.registrations where id = p_registration;
$$;

create or replace function app.is_registration_applicant(p_registration uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.registrations r where r.id = p_registration and r.applicant_id = auth.uid())
    or exists (
      select 1 from public.registrations r
      join public.team_members tm on tm.team_id = r.team_id
      where r.id = p_registration and tm.user_id = auth.uid()
    );
$$;

create or replace function app.is_study_owner(p_study uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studies s where s.id = p_study and s.owner_id = auth.uid());
$$;

create or replace function app.is_study_open(p_study uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studies s where s.id = p_study and s.status in ('recruiting', 'in_progress', 'completed'));
$$;

create or replace function app.is_team_owner(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.teams t where t.id = p_team and t.owner_id = auth.uid());
$$;

create or replace function app.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_team_owner(p_team) or exists (select 1 from public.team_members m where m.team_id = p_team and m.user_id = auth.uid());
$$;

create or replace function app.can_view_profile(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user = auth.uid()
    or app.has_admin_permission('users', 'view')
    or (
      app.is_listed_member(p_user)
      and exists (
        select 1 from public.profiles p
        where p.id = p_user
          and (
            p.visibility = 'public'
            or (p.visibility = 'members' and auth.uid() is not null and app.is_usable_account())
            or (p.visibility = 'connections' and app.is_connected(p_user))
          )
      )
    );
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to anon, authenticated, service_role;
