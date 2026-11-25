-- TRUEVIX Phase 2 — privileges and Row Level Security.
--
-- Model
--   1. Default deny: every table has RLS enabled and all privileges are revoked, then granted back narrowly.
--   2. Column-level GRANTs stop members from writing moderation, review, privilege and demo columns even on rows
--      they own. Those columns are written only by trusted server code (service role) after a permission check,
--      or by triggers.
--   3. Platform administrators READ through policies that call app.has_admin_permission(module, 'view').
--      Confidential venture/research/validation content is NOT readable by administrators through RLS; the admin
--      portal reads an index via security-definer functions and reveals content only through an audited server action.
--   4. Administrative WRITES happen only in server actions that verify the session and permission first.

-- -------------------------------------------------------------------------------------
-- Enable RLS everywhere
-- -------------------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- =====================================================================================
-- IDENTITY
-- =====================================================================================
grant select on public.profiles to anon, authenticated;
grant update (display_name, headline, organisation, location, bio, persona, profile_kind, experience_level, interests, skills, collaboration, avatar_file_id, visibility, show_organisation) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to anon, authenticated using (app.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and app.is_usable_account())
  with check (id = (select auth.uid()));

grant select, insert, update, delete on public.profile_experiences to authenticated;
grant select on public.profile_experiences to anon;
create policy profile_experiences_select on public.profile_experiences for select to anon, authenticated using (app.can_view_profile(user_id));
create policy profile_experiences_write on public.profile_experiences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and app.is_usable_account());

grant select on public.account_private to authenticated;
grant update (phone, linkedin, education_level, qualification, education_status, graduation_year, designation, resume_file_id) on public.account_private to authenticated;
create policy account_private_select on public.account_private for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('users', 'view'));
create policy account_private_update_own on public.account_private for update to authenticated
  using (user_id = (select auth.uid()) and app.is_usable_account())
  with check (user_id = (select auth.uid()));

grant select on public.account_status to authenticated;
create policy account_status_select on public.account_status for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('users', 'view'));

grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('users', 'view') or app.has_admin_permission('access', 'view'));

grant select, update on public.user_preferences to authenticated;
create policy user_preferences_own on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy user_preferences_update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.onboarding_progress to authenticated;
grant update (profile_kind, step, total_steps, completed, completed_at, answers) on public.onboarding_progress to authenticated;
create policy onboarding_select on public.onboarding_progress for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('onboarding', 'view'));
create policy onboarding_update_own on public.onboarding_progress for update to authenticated
  using (user_id = (select auth.uid()) and app.is_usable_account()) with check (user_id = (select auth.uid()));

grant select, insert on public.user_consents to authenticated;
create policy user_consents_select on public.user_consents for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('users', 'view'));
create policy user_consents_insert on public.user_consents for insert to authenticated with check (user_id = (select auth.uid()));

-- =====================================================================================
-- INSTITUTIONS
-- =====================================================================================
grant select on public.institutions to anon, authenticated;
grant update (description, website, location, logo_file_id) on public.institutions to authenticated;
create policy institutions_select on public.institutions for select to anon, authenticated
  using (status = 'verified' or app.is_institution_member(id) or created_by = (select auth.uid()) or app.has_admin_permission('institutions', 'view'));
create policy institutions_update_admin on public.institutions for update to authenticated
  using (app.is_institution_admin(id)) with check (app.is_institution_admin(id));

grant select, insert, delete on public.institution_members to authenticated;
grant update (status, member_role) on public.institution_members to authenticated;
create policy institution_members_select on public.institution_members for select to authenticated
  using (user_id = (select auth.uid()) or app.is_institution_member(institution_id) or app.has_admin_permission('institutions', 'view'));
create policy institution_members_request on public.institution_members for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and member_role = 'member' and app.is_active_account());
create policy institution_members_manage on public.institution_members for update to authenticated
  using (app.is_institution_admin(institution_id)) with check (app.is_institution_admin(institution_id));
create policy institution_members_leave on public.institution_members for delete to authenticated
  using (user_id = (select auth.uid()) or app.is_institution_admin(institution_id));

grant select, insert on public.institution_requests to authenticated;
grant update (status) on public.institution_requests to authenticated;
create policy institution_requests_select on public.institution_requests for select to authenticated
  using (requested_by = (select auth.uid())
         or (institution_id is not null and request_type = 'representative_access' and app.is_institution_admin(institution_id))
         or app.has_admin_permission('institutions', 'view'));
create policy institution_requests_insert on public.institution_requests for insert to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null and app.is_active_account());
create policy institution_requests_withdraw on public.institution_requests for update to authenticated
  using (requested_by = (select auth.uid()) and status = 'pending')
  with check (requested_by = (select auth.uid()) and status = 'withdrawn');

grant select on public.institution_programmes to anon, authenticated;
grant insert, update, delete on public.institution_programmes to authenticated;
create policy institution_programmes_select on public.institution_programmes for select to anon, authenticated
  using (exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'verified')
         or app.is_institution_member(institution_id) or app.has_admin_permission('institutions', 'view'));
create policy institution_programmes_write on public.institution_programmes for all to authenticated
  using (app.is_institution_admin(institution_id)) with check (app.is_institution_admin(institution_id) and not is_demo);

-- =====================================================================================
-- ADMINISTRATION METADATA
-- =====================================================================================
grant select on public.admin_roles, public.admin_permissions to authenticated;
create policy admin_roles_select on public.admin_roles for select to authenticated using (app.is_platform_admin());
create policy admin_permissions_select on public.admin_permissions for select to authenticated using (app.is_platform_admin());

grant select on public.admin_role_assignments to authenticated;
create policy admin_role_assignments_select on public.admin_role_assignments for select to authenticated
  using (user_id = (select auth.uid()) or app.has_admin_permission('access', 'view'));

grant select on public.platform_settings to authenticated;
create policy platform_settings_select on public.platform_settings for select to authenticated using (app.has_admin_permission('settings', 'view'));

-- =====================================================================================
-- FILES
-- =====================================================================================
grant select, insert on public.files to authenticated;
grant select on public.files to anon;
grant update (deleted_at, original_name) on public.files to authenticated;
create policy files_select on public.files for select to anon, authenticated
  using (
    (deleted_at is null and purpose in ('avatar', 'venture_media', 'opportunity_banner', 'opportunity_document', 'institution_logo'))
    or owner_id = (select auth.uid())
    or exists (select 1 from public.venture_documents d where d.file_id = files.id and d.deleted_at is null)
    or exists (select 1 from public.submission_files sf where sf.file_id = files.id)
  );
create policy files_insert on public.files for insert to authenticated
  with check (owner_id = (select auth.uid()) and not is_demo and app.is_active_account());
create policy files_update_own on public.files for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- =====================================================================================
-- VENTURES
-- =====================================================================================
grant select, delete on public.ventures to authenticated;
grant insert (id, owner_id, title, summary, problem, solution, industry, target_users, geography, stage, existing_research, required_skills, collaboration_needs, visibility, institution_id, status) on public.ventures to authenticated;
grant update (title, summary, problem, solution, industry, target_users, geography, stage, existing_research, required_skills, collaboration_needs, visibility, institution_id, status, research_status, validation_status) on public.ventures to authenticated;
create policy ventures_select on public.ventures for select to authenticated
  using (owner_id = (select auth.uid()) or app.can_view_venture(id));
create policy ventures_insert on public.ventures for insert to authenticated
  with check (owner_id = (select auth.uid()) and app.is_active_account());
create policy ventures_update on public.ventures for update to authenticated
  using (app.can_edit_venture(id)) with check (app.can_edit_venture(id));
create policy ventures_delete on public.ventures for delete to authenticated
  using (owner_id = (select auth.uid()) and app.is_active_account());

grant select, insert, delete on public.venture_members to authenticated;
grant update (member_role, title) on public.venture_members to authenticated;
create policy venture_members_select on public.venture_members for select to authenticated using (app.can_view_venture(venture_id));
create policy venture_members_insert on public.venture_members for insert to authenticated
  with check (app.is_venture_owner(venture_id) and member_role <> 'owner' and app.is_active_account());
create policy venture_members_update on public.venture_members for update to authenticated
  using (app.is_venture_owner(venture_id) and member_role <> 'owner')
  with check (app.is_venture_owner(venture_id) and member_role <> 'owner');
create policy venture_members_delete on public.venture_members for delete to authenticated
  using (member_role <> 'owner' and (app.is_venture_owner(venture_id) or user_id = (select auth.uid())));

grant select, insert on public.venture_disclosures to authenticated;
grant update (scope, note, expires_at, revoked_at, revoked_by) on public.venture_disclosures to authenticated;
create policy venture_disclosures_select on public.venture_disclosures for select to authenticated
  using (grantee_user_id = (select auth.uid()) or app.venture_member_role(venture_id) in ('owner', 'editor'));
create policy venture_disclosures_insert on public.venture_disclosures for insert to authenticated
  with check (app.is_venture_owner(venture_id) and granted_by = (select auth.uid()) and revoked_at is null and app.is_active_account());
create policy venture_disclosures_update on public.venture_disclosures for update to authenticated
  using (app.is_venture_owner(venture_id)) with check (app.is_venture_owner(venture_id));

-- Visitors who are not signed in see the listing fields only; problem and solution are for signed-in members.
grant select on public.venture_public_summaries to authenticated;
grant select (venture_id, owner_id, title, summary, industry, stage, geography, required_skills, collaboration_needs, featured, is_demo, published_at, updated_at) on public.venture_public_summaries to anon;
create policy venture_public_summaries_select on public.venture_public_summaries for select to anon, authenticated
  using (app.is_listed_member(owner_id));

grant select on public.venture_versions to authenticated;
create policy venture_versions_select on public.venture_versions for select to authenticated
  using (app.venture_member_role(venture_id) is not null);

grant select, insert, delete on public.venture_updates to authenticated;
grant select on public.venture_updates to anon;
create policy venture_updates_select on public.venture_updates for select to anon, authenticated
  using ((is_public and app.is_venture_public(venture_id)) or app.can_view_venture(venture_id));
create policy venture_updates_insert on public.venture_updates for insert to authenticated
  with check (author_id = (select auth.uid()) and app.can_edit_venture(venture_id) and not is_demo);
create policy venture_updates_delete on public.venture_updates for delete to authenticated
  using (author_id = (select auth.uid()) or app.is_venture_owner(venture_id));

grant select, insert on public.venture_documents to authenticated;
grant update (title, confidentiality, deleted_at) on public.venture_documents to authenticated;
create policy venture_documents_select on public.venture_documents for select to authenticated
  using (deleted_at is null and app.can_view_venture_document(venture_id, confidentiality));
create policy venture_documents_insert on public.venture_documents for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and app.can_contribute_venture(venture_id));
create policy venture_documents_update on public.venture_documents for update to authenticated
  using (app.can_edit_venture(venture_id) or uploaded_by = (select auth.uid()))
  with check (app.can_contribute_venture(venture_id));

grant select on public.venture_activity to authenticated;
create policy venture_activity_select on public.venture_activity for select to authenticated
  using (app.venture_member_role(venture_id) is not null);

-- =====================================================================================
-- RESEARCH
-- =====================================================================================
grant select, delete on public.research_projects to authenticated;
grant insert (id, owner_id, venture_id, question, categories, depth, saved) on public.research_projects to authenticated;
grant update (question, categories, depth, saved) on public.research_projects to authenticated;
create policy research_projects_select on public.research_projects for select to authenticated
  using (owner_id = (select auth.uid()) or app.can_view_research(id));
create policy research_projects_insert on public.research_projects for insert to authenticated
  with check (owner_id = (select auth.uid()) and app.is_active_account() and (venture_id is null or app.can_contribute_venture(venture_id)));
create policy research_projects_update on public.research_projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy research_projects_delete on public.research_projects for delete to authenticated
  using (owner_id = (select auth.uid()));

grant select on public.research_runs to authenticated;
grant insert (id, project_id, status, provenance, provider, failure_reason, started_at, completed_at) on public.research_runs to authenticated;
grant update (status, failure_reason, completed_at) on public.research_runs to authenticated;
-- Members may only record 'framework' runs (the built-in template). Live provider runs are written by the server.
create policy research_runs_select on public.research_runs for select to authenticated using (app.can_view_research(project_id));
create policy research_runs_insert on public.research_runs for insert to authenticated
  with check (app.can_edit_research(project_id) and provenance = 'framework' and provider is null);
create policy research_runs_update on public.research_runs for update to authenticated
  using (app.can_edit_research(project_id) and provenance = 'framework')
  with check (app.can_edit_research(project_id) and provenance = 'framework');

grant select, insert on public.research_findings, public.research_sources to authenticated;
create policy research_findings_select on public.research_findings for select to authenticated
  using (app.can_view_research(app.research_run_project(run_id)));
create policy research_findings_insert on public.research_findings for insert to authenticated
  with check (app.can_edit_research(app.research_run_project(run_id))
              and exists (select 1 from public.research_runs r where r.id = run_id and r.provenance = 'framework'));
create policy research_sources_select on public.research_sources for select to authenticated
  using (app.can_view_research(app.research_run_project(run_id)));
create policy research_sources_insert on public.research_sources for insert to authenticated
  with check (app.can_edit_research(app.research_run_project(run_id)));

grant select, insert, delete on public.research_notes to authenticated;
create policy research_notes_select on public.research_notes for select to authenticated using (app.can_view_research(project_id));
create policy research_notes_insert on public.research_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and app.is_active_account() and app.can_view_research(project_id));
create policy research_notes_delete on public.research_notes for delete to authenticated using (author_id = (select auth.uid()));

-- =====================================================================================
-- VALIDATION
-- =====================================================================================
grant select on public.validation_workspaces to authenticated;
grant insert (id, venture_id, created_by) on public.validation_workspaces to authenticated;
grant update (updated_at) on public.validation_workspaces to authenticated;
create policy validation_workspaces_select on public.validation_workspaces for select to authenticated using (app.can_view_venture_work(venture_id));
create policy validation_workspaces_insert on public.validation_workspaces for insert to authenticated
  with check (created_by = (select auth.uid()) and app.can_contribute_venture(venture_id));
create policy validation_workspaces_update on public.validation_workspaces for update to authenticated
  using (app.can_contribute_venture(venture_id)) with check (app.can_contribute_venture(venture_id));

grant select, insert on public.validation_sections to authenticated;
grant update (status, notes) on public.validation_sections to authenticated;
create policy validation_sections_select on public.validation_sections for select to authenticated
  using (app.can_view_venture_work(app.workspace_venture(workspace_id)));
create policy validation_sections_write on public.validation_sections for insert to authenticated
  with check (app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy validation_sections_update on public.validation_sections for update to authenticated
  using (app.can_contribute_venture(app.workspace_venture(workspace_id)))
  with check (app.can_contribute_venture(app.workspace_venture(workspace_id)));

grant select, delete on public.assumptions, public.experiments, public.customer_interviews to authenticated;
grant insert (id, workspace_id, section_id, statement, risk, status, created_by) on public.assumptions to authenticated;
grant update (statement, risk, status, section_id) on public.assumptions to authenticated;
grant insert (id, workspace_id, assumption_id, title, hypothesis, method, success_criteria, status, starts_on, ends_on, created_by) on public.experiments to authenticated;
grant update (assumption_id, title, hypothesis, method, success_criteria, status, starts_on, ends_on) on public.experiments to authenticated;
grant insert (id, workspace_id, interviewee_label, segment, conducted_on, summary, key_quotes, consent_recorded, created_by) on public.customer_interviews to authenticated;
grant update (interviewee_label, segment, conducted_on, summary, key_quotes, consent_recorded) on public.customer_interviews to authenticated;

create policy assumptions_select on public.assumptions for select to authenticated using (app.can_view_venture_work(app.workspace_venture(workspace_id)));
create policy assumptions_insert on public.assumptions for insert to authenticated
  with check (created_by = (select auth.uid()) and app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy assumptions_update on public.assumptions for update to authenticated
  using (app.can_contribute_venture(app.workspace_venture(workspace_id))) with check (app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy assumptions_delete on public.assumptions for delete to authenticated using (app.can_contribute_venture(app.workspace_venture(workspace_id)));

create policy experiments_select on public.experiments for select to authenticated using (app.can_view_venture_work(app.workspace_venture(workspace_id)));
create policy experiments_insert on public.experiments for insert to authenticated
  with check (created_by = (select auth.uid()) and app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy experiments_update on public.experiments for update to authenticated
  using (app.can_contribute_venture(app.workspace_venture(workspace_id))) with check (app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy experiments_delete on public.experiments for delete to authenticated using (app.can_contribute_venture(app.workspace_venture(workspace_id)));

create policy customer_interviews_select on public.customer_interviews for select to authenticated using (app.can_view_venture_work(app.workspace_venture(workspace_id)));
create policy customer_interviews_insert on public.customer_interviews for insert to authenticated
  with check (created_by = (select auth.uid()) and app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy customer_interviews_update on public.customer_interviews for update to authenticated
  using (app.can_contribute_venture(app.workspace_venture(workspace_id))) with check (app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy customer_interviews_delete on public.customer_interviews for delete to authenticated using (app.can_contribute_venture(app.workspace_venture(workspace_id)));

grant select, delete on public.evidence to authenticated;
grant insert (id, workspace_id, section_id, evidence_type, body, source, assumption_id, file_id, framework_generated, created_by) on public.evidence to authenticated;
create policy evidence_select on public.evidence for select to authenticated using (app.can_view_venture_work(app.workspace_venture(workspace_id)));
create policy evidence_insert on public.evidence for insert to authenticated
  with check (created_by = (select auth.uid()) and app.can_contribute_venture(app.workspace_venture(workspace_id)));
create policy evidence_delete on public.evidence for delete to authenticated using (app.can_contribute_venture(app.workspace_venture(workspace_id)));

grant select, insert on public.experiment_results to authenticated;
create policy experiment_results_select on public.experiment_results for select to authenticated
  using (app.can_view_venture_work(app.workspace_venture(app.experiment_workspace(experiment_id))));
create policy experiment_results_insert on public.experiment_results for insert to authenticated
  with check (recorded_by = (select auth.uid()) and app.can_contribute_venture(app.workspace_venture(app.experiment_workspace(experiment_id))));

-- =====================================================================================
-- COMMUNITY
-- =====================================================================================
grant select, delete on public.posts to authenticated;
grant insert (id, author_id, kind, title, body, industries, venture_id, figure) on public.posts to authenticated;
grant update (kind, title, body, industries) on public.posts to authenticated;
create policy posts_select on public.posts for select to authenticated
  using (author_id = (select auth.uid())
         or (moderation_status = 'visible' and app.is_usable_account() and app.is_listed_member(author_id))
         or app.has_admin_permission('content', 'view'));
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and app.is_active_account()
              and (venture_id is null or app.is_venture_public(venture_id) or app.can_view_venture(venture_id)));
create policy posts_update_own on public.posts for update to authenticated
  using (author_id = (select auth.uid()) and app.is_active_account()) with check (author_id = (select auth.uid()));
create policy posts_delete_own on public.posts for delete to authenticated using (author_id = (select auth.uid()));

grant select, delete on public.comments to authenticated;
grant insert (id, author_id, post_id, venture_id, body) on public.comments to authenticated;
create policy comments_select on public.comments for select to authenticated
  using (author_id = (select auth.uid())
         or app.has_admin_permission('content', 'view')
         or (moderation_status = 'visible' and app.is_usable_account() and (
              (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
              or (venture_id is not null and (app.is_venture_public(venture_id) or app.can_view_venture(venture_id))))));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and app.is_active_account() and (
              (post_id is not null and exists (select 1 from public.posts p where p.id = post_id and p.moderation_status = 'visible'))
              or (venture_id is not null and (app.is_venture_public(venture_id) or app.can_view_venture(venture_id)))));
create policy comments_delete_own on public.comments for delete to authenticated using (author_id = (select auth.uid()));

grant select, insert, delete on public.reactions to authenticated;
create policy reactions_select on public.reactions for select to authenticated using (app.is_usable_account());
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_active_account() and exists (select 1 from public.posts p where p.id = post_id));
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.follows to authenticated;
create policy follows_select on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or followed_user_id = (select auth.uid()));
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and app.is_active_account() and (
              (followed_user_id is not null and app.can_view_profile(followed_user_id))
              or (followed_venture_id is not null and (app.is_venture_public(followed_venture_id) or app.can_view_venture(followed_venture_id)))));
create policy follows_delete on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

grant select, insert, delete on public.connections to authenticated;
grant update (status, responded_at) on public.connections to authenticated;
create policy connections_select on public.connections for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
create policy connections_insert on public.connections for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending' and app.is_active_account() and app.can_view_profile(addressee_id));
create policy connections_respond on public.connections for update to authenticated
  using (addressee_id = (select auth.uid())) with check (addressee_id = (select auth.uid()) and status in ('accepted', 'declined'));
create policy connections_delete on public.connections for delete to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

grant select, insert, delete on public.saved_items to authenticated;
create policy saved_items_own on public.saved_items for select to authenticated using (user_id = (select auth.uid()));
create policy saved_items_insert on public.saved_items for insert to authenticated
  with check (user_id = (select auth.uid()) and (
              (venture_id is not null and (app.is_venture_public(venture_id) or app.can_view_venture(venture_id)))
              or (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
              or (opportunity_id is not null and app.is_opportunity_public(opportunity_id))));
create policy saved_items_delete on public.saved_items for delete to authenticated using (user_id = (select auth.uid()));

-- =====================================================================================
-- COLLABORATION
-- =====================================================================================
grant select on public.collaboration_requests to authenticated;
grant insert (id, kind, from_id, to_id, venture_id, role, message) on public.collaboration_requests to authenticated;
grant update (status, responded_at) on public.collaboration_requests to authenticated;
create policy collaboration_requests_select on public.collaboration_requests for select to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid())
         or (venture_id is not null and app.venture_member_role(venture_id) in ('owner', 'editor'))
         or app.has_admin_permission('collaboration', 'view'));
create policy collaboration_requests_insert on public.collaboration_requests for insert to authenticated
  with check (from_id = (select auth.uid()) and app.is_active_account()
              and (venture_id is null or app.is_venture_public(venture_id) or app.can_view_venture(venture_id))
              and (to_id is null or app.can_view_profile(to_id)));
create policy collaboration_requests_update on public.collaboration_requests for update to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()) or (venture_id is not null and app.is_venture_owner(venture_id)))
  with check (from_id = (select auth.uid()) or to_id = (select auth.uid()) or (venture_id is not null and app.is_venture_owner(venture_id)));

grant select, insert, update, delete on public.teams to authenticated;
create policy teams_select on public.teams for select to authenticated
  using (app.is_team_member(id) or app.has_admin_permission('opportunities', 'view'));
create policy teams_insert on public.teams for insert to authenticated with check (owner_id = (select auth.uid()) and app.is_active_account() and not is_demo);
create policy teams_update on public.teams for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy teams_delete on public.teams for delete to authenticated using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.team_members to authenticated;
create policy team_members_select on public.team_members for select to authenticated
  using (app.is_team_member(team_id) or app.has_admin_permission('opportunities', 'view'));
create policy team_members_write on public.team_members for all to authenticated
  using (app.is_team_owner(team_id)) with check (app.is_team_owner(team_id));

grant select on public.talent_profiles to authenticated;
grant insert (user_id, kind, years_experience, availability, hours_per_month, capacity, areas, application_statement) on public.talent_profiles to authenticated;
grant update (availability, hours_per_month, capacity, areas, application_statement) on public.talent_profiles to authenticated;
create policy talent_profiles_select on public.talent_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (status = 'approved' and app.is_listed_member(user_id) and app.is_usable_account()) or app.has_admin_permission('talent', 'view'));
create policy talent_profiles_insert on public.talent_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_active_account());
create policy talent_profiles_update on public.talent_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.mentorships to authenticated;
grant insert (id, mentor_id, mentee_id, venture_id, focus) on public.mentorships to authenticated;
grant update (status, focus, ended_at) on public.mentorships to authenticated;
create policy mentorships_select on public.mentorships for select to authenticated
  using (mentor_id = (select auth.uid()) or mentee_id = (select auth.uid()) or app.has_admin_permission('talent', 'view'));
create policy mentorships_insert on public.mentorships for insert to authenticated
  with check ((mentor_id = (select auth.uid()) or mentee_id = (select auth.uid())) and app.is_active_account()
              and (venture_id is null or app.is_venture_owner(venture_id)));
create policy mentorships_update on public.mentorships for update to authenticated
  using (mentor_id = (select auth.uid()) or mentee_id = (select auth.uid()))
  with check (mentor_id = (select auth.uid()) or mentee_id = (select auth.uid()));

grant select on public.expert_reviews to authenticated;
grant insert (id, venture_id, reviewer_id, requested_by, request_note, due_on) on public.expert_reviews to authenticated;
grant update (status, feedback, recommendation) on public.expert_reviews to authenticated;
create policy expert_reviews_select on public.expert_reviews for select to authenticated
  using (reviewer_id = (select auth.uid()) or requested_by = (select auth.uid())
         or app.venture_member_role(venture_id) in ('owner', 'editor') or app.has_admin_permission('talent', 'view'));
create policy expert_reviews_insert on public.expert_reviews for insert to authenticated
  with check (requested_by = (select auth.uid()) and app.can_edit_venture(venture_id) and app.can_view_profile(reviewer_id));
-- Allowed transitions are enforced by trigger (app.expert_reviews_guard).
create policy expert_reviews_update on public.expert_reviews for update to authenticated
  using (reviewer_id = (select auth.uid()) or requested_by = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()) or requested_by = (select auth.uid()));

-- =====================================================================================
-- STUDIES AND CONSENT
-- =====================================================================================
grant select, delete on public.studies to authenticated;
grant insert (id, owner_id, venture_id, title, description, format, eligibility, note, status, starts_on, ends_on, target_participants, consent_text, consent_version) on public.studies to authenticated;
grant update (title, description, format, eligibility, note, status, starts_on, ends_on, target_participants, consent_text, consent_version) on public.studies to authenticated;
create policy studies_select on public.studies for select to authenticated
  using (owner_id = (select auth.uid()) or (status in ('recruiting', 'in_progress', 'completed') and app.is_usable_account()) or app.has_admin_permission('studies', 'view'));
create policy studies_insert on public.studies for insert to authenticated
  with check (owner_id = (select auth.uid()) and app.is_active_account() and (venture_id is null or app.can_edit_venture(venture_id)));
create policy studies_update on public.studies for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy studies_delete on public.studies for delete to authenticated using (owner_id = (select auth.uid()) and status = 'draft');

grant select on public.study_participants to authenticated;
grant insert (id, study_id, user_id, consent, consent_at) on public.study_participants to authenticated;
grant update (status, consent, consent_at) on public.study_participants to authenticated;
create policy study_participants_select on public.study_participants for select to authenticated
  using (user_id = (select auth.uid()) or app.is_study_owner(study_id) or app.has_admin_permission('studies', 'view'));
create policy study_participants_insert on public.study_participants for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_active_account() and app.is_study_open(study_id));
-- Who may change which column is enforced by trigger (app.study_participants_guard).
create policy study_participants_update on public.study_participants for update to authenticated
  using (user_id = (select auth.uid()) or app.is_study_owner(study_id))
  with check (user_id = (select auth.uid()) or app.is_study_owner(study_id));

grant select on public.consent_records to authenticated;
create policy consent_records_select on public.consent_records for select to authenticated
  using (user_id = (select auth.uid()) or app.is_study_owner(study_id) or app.has_admin_permission('studies', 'view'));

-- =====================================================================================
-- MESSAGING (threads are created through public.start_thread)
-- =====================================================================================
grant select on public.message_threads, public.thread_participants to authenticated;
grant update (last_read_at) on public.thread_participants to authenticated;
grant select, insert on public.messages to authenticated;
create policy message_threads_select on public.message_threads for select to authenticated using (app.is_thread_participant(id));
create policy thread_participants_select on public.thread_participants for select to authenticated using (app.is_thread_participant(thread_id));
create policy thread_participants_read on public.thread_participants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy messages_select on public.messages for select to authenticated using (app.is_thread_participant(thread_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (author_id = (select auth.uid()) and app.is_active_account() and app.is_thread_participant(thread_id));

-- =====================================================================================
-- OPPORTUNITIES (managed on the server; members read published listings)
-- =====================================================================================
grant select on public.opportunities, public.opportunity_rounds, public.opportunity_criteria, public.opportunity_files to anon, authenticated;
create policy opportunities_select on public.opportunities for select to anon, authenticated
  using (publication = 'published' or app.is_opportunity_staff(id) or app.has_admin_permission('opportunities', 'view'));
create policy opportunity_rounds_select on public.opportunity_rounds for select to anon, authenticated
  using (app.is_opportunity_public(opportunity_id) or app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view'));
create policy opportunity_criteria_select on public.opportunity_criteria for select to anon, authenticated
  using (app.is_opportunity_public(opportunity_id) or app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view'));
create policy opportunity_files_select on public.opportunity_files for select to anon, authenticated
  using ((purpose = 'document' and app.is_opportunity_public(opportunity_id)) or app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view'));

grant select on public.opportunity_organisers to authenticated;
create policy opportunity_organisers_select on public.opportunity_organisers for select to authenticated
  using (user_id = (select auth.uid()) or app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view'));

grant select on public.opportunity_communications to authenticated;
create policy opportunity_communications_select on public.opportunity_communications for select to authenticated
  using (app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view')
         or exists (select 1 from public.registrations r
                    where r.opportunity_id = opportunity_communications.opportunity_id and r.applicant_id = (select auth.uid())
                      and r.status <> 'withdrawn'
                      and (audience = 'all' or (audience = 'shortlisted' and r.status in ('shortlisted', 'selected')) or (audience = 'selected' and r.status = 'selected'))));

grant select, insert, update, delete on public.applications to authenticated;
create policy applications_own on public.applications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and app.is_opportunity_public(opportunity_id));

grant select on public.registrations to authenticated;
grant insert (id, opportunity_id, applicant_id, mode, team_id, team_name, statement) on public.registrations to authenticated;
grant update (status, statement) on public.registrations to authenticated;
create policy registrations_select on public.registrations for select to authenticated
  using (app.is_registration_applicant(id) or app.is_opportunity_staff(opportunity_id) or app.has_admin_permission('opportunities', 'view'));
create policy registrations_insert on public.registrations for insert to authenticated
  with check (applicant_id = (select auth.uid()) and app.is_active_account()
              and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.publication = 'published' and o.registration_mode = 'on_platform')
              and (team_id is null or app.is_team_owner(team_id)));
-- Applicants may only withdraw or edit their statement (trigger app.registrations_guard).
create policy registrations_update on public.registrations for update to authenticated
  using (applicant_id = (select auth.uid())) with check (applicant_id = (select auth.uid()));

grant select on public.registration_notes to authenticated;
create policy registration_notes_select on public.registration_notes for select to authenticated
  using (app.is_opportunity_staff(app.registration_opportunity(registration_id)) or app.has_admin_permission('opportunities', 'view'));

grant select on public.registration_events to authenticated;
create policy registration_events_select on public.registration_events for select to authenticated
  using (app.is_registration_applicant(registration_id) or app.is_opportunity_staff(app.registration_opportunity(registration_id)) or app.has_admin_permission('opportunities', 'view'));

grant select, insert on public.submissions, public.submission_files to authenticated;
create policy submissions_select on public.submissions for select to authenticated
  using (app.is_registration_applicant(registration_id) or app.is_opportunity_staff(app.registration_opportunity(registration_id)) or app.has_admin_permission('opportunities', 'view'));
create policy submissions_insert on public.submissions for insert to authenticated
  with check (submitted_by = (select auth.uid()) and app.is_active_account() and app.is_registration_applicant(registration_id)
              and exists (select 1 from public.registrations r where r.id = registration_id and r.status not in ('withdrawn', 'rejected')));
create policy submission_files_select on public.submission_files for select to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id));
create policy submission_files_insert on public.submission_files for insert to authenticated
  with check (exists (select 1 from public.submissions s where s.id = submission_id and s.submitted_by = (select auth.uid()))
              and exists (select 1 from public.files f where f.id = file_id and f.owner_id = (select auth.uid())));

grant select, insert, update on public.judging_scores to authenticated;
create policy judging_scores_select on public.judging_scores for select to authenticated
  using (judge_id = (select auth.uid()) or app.is_opportunity_staff(app.registration_opportunity(registration_id), 'organiser') or app.has_admin_permission('opportunities', 'view'));
create policy judging_scores_write on public.judging_scores for insert to authenticated
  with check (judge_id = (select auth.uid()) and app.is_opportunity_staff(app.registration_opportunity(registration_id), 'judge'));
create policy judging_scores_update on public.judging_scores for update to authenticated
  using (judge_id = (select auth.uid()) and app.is_opportunity_staff(app.registration_opportunity(registration_id), 'judge'))
  with check (judge_id = (select auth.uid()));

-- =====================================================================================
-- PLATFORM
-- =====================================================================================
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_read on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.moderation_reports to authenticated;
grant insert (id, target_type, target_id, target_label, reported_user_id, reporter_id, reason, details) on public.moderation_reports to authenticated;
create policy moderation_reports_select on public.moderation_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or app.has_admin_permission('moderation', 'view'));
create policy moderation_reports_insert on public.moderation_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and app.is_active_account() and reported_user_id is distinct from (select auth.uid()));

grant select on public.audit_logs to authenticated;
create policy audit_logs_select on public.audit_logs for select to authenticated using (app.has_admin_permission('audit', 'view'));

grant select on public.announcements to anon, authenticated;
create policy announcements_select on public.announcements for select to anon, authenticated
  using ((status = 'published' or (status = 'scheduled' and scheduled_for <= now()))
         or app.has_admin_permission('communications', 'view'));

grant select on public.announcement_deliveries to authenticated;
create policy announcement_deliveries_select on public.announcement_deliveries for select to authenticated
  using (app.has_admin_permission('communications', 'view'));

-- Public pages read CMS through public.published_cms(); drafts are visible to CMS administrators only.
grant select on public.cms_content, public.cms_versions to authenticated;
create policy cms_content_admin on public.cms_content for select to authenticated using (app.has_admin_permission('cms', 'view'));
create policy cms_versions_admin on public.cms_versions for select to authenticated using (app.has_admin_permission('cms', 'view'));

grant select, insert, update, delete on public.user_tasks to authenticated;
create policy user_tasks_own on public.user_tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, delete on public.user_activity to authenticated;
create policy user_activity_own on public.user_activity for select to authenticated using (user_id = (select auth.uid()));
create policy user_activity_insert on public.user_activity for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_activity_delete on public.user_activity for delete to authenticated using (user_id = (select auth.uid()));

-- The service role (trusted server code only) keeps full access.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
