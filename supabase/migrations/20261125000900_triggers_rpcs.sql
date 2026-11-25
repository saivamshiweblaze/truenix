-- TRUEVIX Phase 2 — triggers (provisioning, guards, public-summary sync, notifications) and RPC functions.

-- =====================================================================================
-- Account provisioning. Roles are NEVER read from user metadata: every new account starts as a member.
-- =====================================================================================
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), ''), 120);
  v_demo boolean := coalesce((new.raw_app_meta_data ->> 'truevix_demo')::boolean, false);
begin
  insert into public.profiles (id, display_name, is_demo) values (new.id, v_name, v_demo);
  insert into public.account_private (user_id, email) values (new.id, coalesce(new.email, ''));
  insert into public.account_status (user_id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.onboarding_progress (user_id) values (new.id);
  -- The member accepted the Terms and Privacy Policy at registration; record which version.
  if coalesce(new.raw_user_meta_data ->> 'accepted_terms_version', '') ~ '^[0-9A-Za-z.-]{1,40}$' then
    insert into public.user_consents (user_id, consent_type, document_version, granted)
    values (new.id, 'terms', new.raw_user_meta_data ->> 'accepted_terms_version', true),
           (new.id, 'privacy', new.raw_user_meta_data ->> 'accepted_terms_version', true);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function app.handle_new_user();

create or replace function app.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_private set email = coalesce(new.email, '') where user_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users for each row
  when (old.email is distinct from new.email) execute function app.handle_user_email_change();

-- =====================================================================================
-- Ventures
-- =====================================================================================
create or replace function app.ventures_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_require_review boolean;
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role' or auth.uid() is null;
begin
  if tg_op = 'UPDATE' and not v_is_service then
    -- Only the owner decides who can see the venture.
    if new.visibility is distinct from old.visibility and auth.uid() <> old.owner_id then
      raise exception 'Only the venture owner can change its visibility' using errcode = '42501';
    end if;
    if new.institution_id is distinct from old.institution_id and auth.uid() <> old.owner_id then
      raise exception 'Only the venture owner can change its institution' using errcode = '42501';
    end if;
  end if;

  if new.visibility = 'institution' and new.institution_id is not null and not v_is_service then
    if not exists (select 1 from public.institution_members m where m.institution_id = new.institution_id and m.user_id = new.owner_id and m.status = 'active')
       and not exists (select 1 from public.user_roles r where r.user_id = new.owner_id and r.institution_id = new.institution_id and r.revoked_at is null) then
      raise exception 'You can only share with an institution you belong to' using errcode = '42501';
    end if;
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    new.submitted_at := now();
  end if;

  -- A newly public, submitted venture waits for platform review when the platform requires it.
  if not v_is_service and new.status = 'submitted' and new.visibility = 'public_summary'
     and (tg_op = 'INSERT' or old.status <> 'submitted' or old.visibility <> 'public_summary') then
    select require_idea_review into v_require_review from public.platform_settings where id;
    if coalesce(v_require_review, true) and (new.review_status is null or new.review_status in ('rejected', 'changes_requested')) then
      new.review_status := 'pending';
      new.review_note := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger ventures_before_write before insert or update on public.ventures for each row execute function app.ventures_before_write();

create or replace function app.ventures_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listed boolean;
  v_version integer;
begin
  if tg_op = 'INSERT' then
    insert into public.venture_members (venture_id, user_id, member_role, title, added_by)
    values (new.id, new.owner_id, 'owner', 'Founder', new.owner_id)
    on conflict (venture_id, user_id) do nothing;
    insert into public.venture_activity (venture_id, actor_id, action, detail) values (new.id, auth.uid(), 'created', new.title);
  end if;

  -- Version history when substantive content changes or the venture is submitted.
  if tg_op = 'INSERT' or (row(new.title, new.summary, new.problem, new.solution, new.industry, new.target_users, new.geography, new.stage, new.existing_research, new.required_skills, new.collaboration_needs, new.status)
                          is distinct from row(old.title, old.summary, old.problem, old.solution, old.industry, old.target_users, old.geography, old.stage, old.existing_research, old.required_skills, old.collaboration_needs, old.status)) then
    select coalesce(max(version), 0) + 1 into v_version from public.venture_versions where venture_id = new.id;
    insert into public.venture_versions (venture_id, version, snapshot, created_by, change_note)
    values (new.id, v_version,
            jsonb_build_object('title', new.title, 'summary', new.summary, 'problem', new.problem, 'solution', new.solution,
                               'industry', new.industry, 'target_users', new.target_users, 'geography', new.geography, 'stage', new.stage,
                               'existing_research', new.existing_research, 'required_skills', to_jsonb(new.required_skills),
                               'collaboration_needs', new.collaboration_needs, 'status', new.status, 'visibility', new.visibility),
            auth.uid(), case when tg_op = 'INSERT' then 'Created' when new.status <> old.status then 'Status: ' || new.status else 'Edited' end);
  end if;

  if tg_op = 'UPDATE' and new.visibility is distinct from old.visibility then
    insert into public.venture_activity (venture_id, actor_id, action, detail)
    values (new.id, auth.uid(), 'visibility_changed', old.visibility || ' → ' || new.visibility);
  end if;

  -- Maintain the public summary. Anything short of an intentional, approved, listed publication removes it.
  v_listed := new.visibility = 'public_summary' and new.status = 'submitted' and new.publication = 'published'
              and (new.review_status = 'approved' or new.review_status is null);
  if v_listed then
    insert into public.venture_public_summaries (venture_id, owner_id, title, summary, problem, solution, industry, stage, geography, target_users, required_skills, collaboration_needs, featured, is_demo, published_at, updated_at)
    values (new.id, new.owner_id, new.title, new.summary, new.problem, new.solution, new.industry, new.stage, new.geography, new.target_users, new.required_skills, new.collaboration_needs, new.featured, new.is_demo, now(), now())
    on conflict (venture_id) do update set
      title = excluded.title, summary = excluded.summary, problem = excluded.problem, solution = excluded.solution,
      industry = excluded.industry, stage = excluded.stage, geography = excluded.geography, target_users = excluded.target_users,
      required_skills = excluded.required_skills, collaboration_needs = excluded.collaboration_needs, featured = excluded.featured,
      updated_at = now();
  else
    delete from public.venture_public_summaries where venture_id = new.id;
  end if;
  return null;
end;
$$;

create trigger ventures_after_write after insert or update on public.ventures for each row execute function app.ventures_after_write();

-- Revoking a disclosure is logged; the access helpers stop honouring it immediately.
create or replace function app.venture_disclosures_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.venture_activity (venture_id, actor_id, action, detail)
    values (new.venture_id, auth.uid(), 'access_granted', new.access_level || ' (' || new.scope || ')');
    insert into public.audit_logs (actor_id, action, entity, target_id, target_label, after_value, sensitive)
    values (auth.uid(), 'Granted venture access', 'venture', new.venture_id::text, coalesce(new.grantee_user_id, new.grantee_institution_id)::text, new.access_level || '/' || new.scope, true);
  elsif new.revoked_at is not null and old.revoked_at is null then
    new.revoked_by := coalesce(new.revoked_by, auth.uid());
    insert into public.venture_activity (venture_id, actor_id, action, detail)
    values (new.venture_id, auth.uid(), 'access_revoked', new.access_level);
    insert into public.audit_logs (actor_id, action, entity, target_id, target_label, before_value, sensitive)
    values (auth.uid(), 'Revoked venture access', 'venture', new.venture_id::text, coalesce(new.grantee_user_id, new.grantee_institution_id)::text, new.access_level || '/' || new.scope, true);
  elsif old.revoked_at is not null and new.revoked_at is null then
    raise exception 'A revoked disclosure cannot be restored; grant access again instead' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger venture_disclosures_audit_ins after insert on public.venture_disclosures for each row execute function app.venture_disclosures_audit();
create trigger venture_disclosures_audit_upd before update on public.venture_disclosures for each row execute function app.venture_disclosures_audit();

-- =====================================================================================
-- Posts: community posting switch
-- =====================================================================================
create or replace function app.posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is not null
     and not coalesce((select community_posting from public.platform_settings where id), true) then
    raise exception 'Community posting is paused by the platform team' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger posts_before_insert before insert on public.posts for each row execute function app.posts_before_insert();

-- =====================================================================================
-- Expert reviews: allowed transitions and reviewer access
-- =====================================================================================
create or replace function app.expert_reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status then
    if v_uid = old.reviewer_id and not (
         (old.status = 'requested' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status in ('completed', 'declined'))) then
      raise exception 'Reviewers can accept, decline or complete a request' using errcode = '42501';
    end if;
    if v_uid = old.requested_by and v_uid <> old.reviewer_id and not (old.status in ('requested', 'accepted') and new.status = 'cancelled') then
      raise exception 'Requesters can only cancel a review request' using errcode = '42501';
    end if;
  end if;
  if (new.feedback is distinct from old.feedback or new.recommendation is distinct from old.recommendation) and v_uid <> old.reviewer_id then
    raise exception 'Only the reviewer can record feedback' using errcode = '42501';
  end if;
  if new.status in ('accepted', 'declined') and old.status = 'requested' then new.responded_at := now(); end if;
  if new.status = 'completed' and old.status <> 'completed' then new.completed_at := now(); end if;
  return new;
end;
$$;
create or replace function app.expert_reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.venture_title := coalesce((select title from public.ventures where id = new.venture_id), '');
  new.status := 'requested';
  return new;
end;
$$;
create trigger expert_reviews_before_insert before insert on public.expert_reviews for each row execute function app.expert_reviews_before_insert();

create trigger expert_reviews_guard before update on public.expert_reviews for each row execute function app.expert_reviews_guard();

create or replace function app.expert_reviews_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.reviewer_id, 'review', 'New review request', left(coalesce((select title from public.ventures where id = new.venture_id), ''), 200), '/reviews');
    return null;
  end if;
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.venture_disclosures (venture_id, grantee_user_id, access_level, scope, note, granted_by)
    values (new.venture_id, new.reviewer_id, 'reviewer', 'full', 'Expert review', new.requested_by)
    on conflict do nothing;
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.requested_by, 'review', 'Review request accepted', '', '/ideas/' || new.venture_id);
  elsif new.status in ('declined', 'completed', 'cancelled') and old.status <> new.status then
    update public.venture_disclosures set revoked_at = now(), revoked_by = auth.uid()
    where venture_id = new.venture_id and grantee_user_id = new.reviewer_id and access_level = 'reviewer' and revoked_at is null;
    if new.status = 'completed' then
      insert into public.notifications (user_id, kind, title, body, href)
      values (new.requested_by, 'review', 'Expert feedback received', left(coalesce(new.feedback, ''), 200), '/ideas/' || new.venture_id);
    end if;
  end if;
  return null;
end;
$$;
create trigger expert_reviews_access after insert or update on public.expert_reviews for each row execute function app.expert_reviews_access();

-- =====================================================================================
-- Studies: who may change what, and an append-only consent log
-- =====================================================================================
create or replace function app.study_participants_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if v_uid = old.user_id then
    if new.status is distinct from old.status and new.status <> 'withdrawn' then
      raise exception 'Participants can only withdraw' using errcode = '42501';
    end if;
  elsif app.is_study_owner(old.study_id) then
    if new.consent is distinct from old.consent or new.consent_at is distinct from old.consent_at then
      raise exception 'Only the participant can record consent' using errcode = '42501';
    end if;
    if new.status not in ('applied', 'selected', 'not_selected', 'completed') then
      raise exception 'Study owners cannot withdraw a participant' using errcode = '42501';
    end if;
  end if;
  if new.consent = 'withdrawn' and old.consent <> 'withdrawn' then new.status := 'withdrawn'; end if;
  return new;
end;
$$;
create trigger study_participants_guard before update on public.study_participants for each row execute function app.study_participants_guard();

create or replace function app.study_participants_consent_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.consent in ('given', 'withdrawn') and (tg_op = 'INSERT' or new.consent is distinct from old.consent) then
    insert into public.consent_records (user_id, study_id, consent, consent_version)
    values (new.user_id, new.study_id, new.consent, coalesce((select consent_version from public.studies where id = new.study_id), 'v1'));
  end if;
  return null;
end;
$$;
create trigger study_participants_consent_log after insert or update on public.study_participants for each row execute function app.study_participants_consent_log();

-- =====================================================================================
-- Registrations: applicants may only withdraw or edit their statement
-- =====================================================================================
create or replace function app.registrations_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if new.status is distinct from old.status and new.status <> 'withdrawn' then
    raise exception 'Applicants can only withdraw a registration' using errcode = '42501';
  end if;
  if new.statement is distinct from old.statement and old.status not in ('submitted', 'info_requested') then
    raise exception 'This registration can no longer be edited' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger registrations_guard before update on public.registrations for each row execute function app.registrations_guard();

create or replace function app.registrations_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.registration_events (registration_id, actor_id, text) values (new.id, auth.uid(), 'Registration submitted');
  elsif new.status is distinct from old.status then
    insert into public.registration_events (registration_id, actor_id, text) values (new.id, auth.uid(), 'Status: ' || replace(new.status, '_', ' '));
    if new.applicant_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      insert into public.notifications (user_id, kind, title, body, href)
      values (new.applicant_id, 'opportunity', 'Registration update', 'Your registration is now ' || replace(new.status, '_', ' ') || '.', '/opportunities/' || new.opportunity_id);
    end if;
  end if;
  return null;
end;
$$;
create trigger registrations_events after insert or update on public.registrations for each row execute function app.registrations_events();

-- =====================================================================================
-- Collaboration requests: transitions; accepting a venture request adds the requester as collaborator
-- =====================================================================================
create or replace function app.collaboration_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if new.status is distinct from old.status then
    if v_uid = old.from_id and new.status <> 'closed' then
      raise exception 'You can only withdraw your own request' using errcode = '42501';
    end if;
    if v_uid <> old.from_id and new.status not in ('accepted', 'declined', 'closed') then
      raise exception 'Invalid response' using errcode = '42501';
    end if;
    new.responded_at := now();
  end if;
  return new;
end;
$$;
create trigger collaboration_requests_guard before update on public.collaboration_requests for each row execute function app.collaboration_requests_guard();

create or replace function app.collaboration_requests_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_recipient := coalesce(new.to_id, (select owner_id from public.ventures where id = new.venture_id));
    if v_recipient is not null and v_recipient <> new.from_id then
      insert into public.notifications (user_id, kind, title, body, href)
      values (v_recipient, 'collaboration', 'New collaboration request', left(new.message, 200), '/messages');
    end if;
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    if new.venture_id is not null then
      insert into public.venture_members (venture_id, user_id, member_role, title, added_by)
      values (new.venture_id, new.from_id, 'collaborator', left(new.role, 80), auth.uid())
      on conflict (venture_id, user_id) do nothing;
    end if;
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.from_id, 'collaboration', 'Collaboration request accepted', left(new.role, 200), coalesce('/ideas/' || new.venture_id, '/messages'));
  end if;
  return null;
end;
$$;
create trigger collaboration_requests_after after insert or update on public.collaboration_requests for each row execute function app.collaboration_requests_after();

-- =====================================================================================
-- Notifications for comments, follows, connections and messages
-- =====================================================================================
create or replace function app.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_href text;
begin
  if new.post_id is not null then
    select author_id into v_owner from public.posts where id = new.post_id;
    v_href := '/discover';
  else
    select owner_id into v_owner from public.ventures where id = new.venture_id;
    v_href := '/ideas/' || new.venture_id;
  end if;
  if v_owner is not null and v_owner <> new.author_id
     and coalesce((select notify_comments from public.user_preferences where user_id = v_owner), true) then
    insert into public.notifications (user_id, kind, title, body, href) values (v_owner, 'comment', 'New comment', left(new.body, 200), v_href);
  end if;
  return null;
end;
$$;
create trigger comments_notify after insert on public.comments for each row execute function app.notify_comment();

create or replace function app.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.followed_user_id is not null and coalesce((select notify_follows from public.user_preferences where user_id = new.followed_user_id), true) then
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.followed_user_id, 'follow', 'New follower', coalesce((select display_name from public.profiles where id = new.follower_id), ''), '/people/' || new.follower_id);
  end if;
  return null;
end;
$$;
create trigger follows_notify after insert on public.follows for each row execute function app.notify_follow();

create or replace function app.notify_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.addressee_id, 'follow', 'Connection request', coalesce((select display_name from public.profiles where id = new.requester_id), ''), '/people/' || new.requester_id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.notifications (user_id, kind, title, body, href)
    values (new.requester_id, 'follow', 'Connection accepted', coalesce((select display_name from public.profiles where id = new.addressee_id), ''), '/people/' || new.addressee_id);
  end if;
  return null;
end;
$$;
create trigger connections_notify after insert or update on public.connections for each row execute function app.notify_connection();

create or replace function app.notify_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  select tp.user_id, 'message', 'New message', left(new.body, 200), '/messages?thread=' || new.thread_id
  from public.thread_participants tp
  where tp.thread_id = new.thread_id and tp.user_id <> new.author_id;
  return null;
end;
$$;
create trigger messages_notify after insert on public.messages for each row execute function app.notify_message();

-- =====================================================================================
-- RPC: session context (what the signed-in member is, and what they may administer)
-- =====================================================================================
create or replace function public.my_session_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'persona', (select persona from public.profiles where id = auth.uid()),
    'account_status', (select status from public.account_status where user_id = auth.uid()),
    'account_status_reason', (select reason from public.account_status where user_id = auth.uid()),
    'onboarding_completed', coalesce((select completed from public.onboarding_progress where user_id = auth.uid()), false),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.role, 'institution_id', r.institution_id))
                       from public.user_roles r where r.user_id = auth.uid() and r.revoked_at is null), '[]'::jsonb),
    'admin_role', case when app.is_platform_admin() then (select admin_role_id from public.admin_role_assignments where user_id = auth.uid()) end,
    'admin_permissions', case when app.is_platform_admin() then coalesce((
        select jsonb_agg(jsonb_build_object('module', p.module, 'permission', p.permission))
        from public.admin_role_assignments a join public.admin_permissions p on p.admin_role_id = a.admin_role_id
        where a.user_id = auth.uid()), '[]'::jsonb) else '[]'::jsonb end,
    'institutions', coalesce((select jsonb_agg(jsonb_build_object('institution_id', m.institution_id, 'member_role', m.member_role, 'status', m.status))
                              from public.institution_members m where m.user_id = auth.uid()), '[]'::jsonb)
  ) end;
$$;

-- Marks the member as recently active (at most once per 10 minutes).
create or replace function public.touch_last_active()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.account_status set last_active_at = now()
  where user_id = auth.uid() and (last_active_at is null or last_active_at < now() - interval '10 minutes');
$$;

-- Safe subset of platform settings for any visitor (registration page, feature switches).
create or replace function public.public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'open_registration', open_registration,
    'require_idea_review', require_idea_review,
    'research_enabled', research_enabled,
    'community_posting', community_posting,
    'opportunity_registration', opportunity_registration,
    'studies_recruiting', studies_recruiting,
    'identity', coalesce(config -> 'identity', '{}'::jsonb),
    'maintenance', coalesce(config -> 'maintenance', '{}'::jsonb)
  ) from public.platform_settings where id;
$$;

create or replace function public.published_cms()
returns table (id text, kind text, label text, fields jsonb, "position" smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.label, c.published, c.position
  from public.cms_content c
  where c.status = 'published' and c.published is not null
  order by c.position;
$$;

-- Follower counts, only for ventures the caller is allowed to know about.
create or replace function public.venture_follower_counts(p_ids uuid[])
returns table (venture_id uuid, followers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select f.followed_venture_id, count(*)
  from public.follows f
  where f.followed_venture_id = any (p_ids)
    and (app.is_venture_public(f.followed_venture_id) or app.can_view_venture(f.followed_venture_id))
  group by f.followed_venture_id;
$$;

-- Start a direct conversation. Respects the recipient's message preference and listing status.
create or replace function public.start_thread(p_recipient uuid, p_subject text, p_body text, p_kind text default 'direct', p_venture uuid default null, p_thread_id uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_thread uuid;
  v_allow text;
begin
  if auth.uid() is null or not app.is_active_account() then
    raise exception 'Sign in with an active account to send messages' using errcode = '42501';
  end if;
  if p_recipient = auth.uid() then raise exception 'You cannot message yourself' using errcode = '22023'; end if;
  if not app.is_listed_member(p_recipient) then raise exception 'This member cannot receive messages' using errcode = '42501'; end if;
  select allow_messages into v_allow from public.user_preferences where user_id = p_recipient;
  if v_allow = 'connections' and not app.is_connected(p_recipient) then
    raise exception 'This member only accepts messages from connections' using errcode = '42501';
  end if;
  if p_kind not in ('direct', 'collaboration_request', 'review_request') then raise exception 'Invalid thread kind' using errcode = '22023'; end if;
  if p_venture is not null and not (app.is_venture_public(p_venture) or app.can_view_venture(p_venture)) then
    raise exception 'Venture not found' using errcode = '42501';
  end if;

  insert into public.message_threads (id, subject, kind, venture_id, created_by)
  values (coalesce(p_thread_id, gen_random_uuid()), left(coalesce(nullif(trim(p_subject), ''), 'Conversation'), 160), p_kind, p_venture, auth.uid())
  returning id into v_thread;
  insert into public.thread_participants (thread_id, user_id, last_read_at) values (v_thread, auth.uid(), now()), (v_thread, p_recipient, null);
  if nullif(trim(p_body), '') is not null then
    insert into public.messages (thread_id, author_id, body) values (v_thread, auth.uid(), left(trim(p_body), 2000));
  end if;
  return v_thread;
end;
$$;

-- =====================================================================================
-- Admin index functions: metadata only. Confidential content needs an audited reveal.
-- =====================================================================================
create or replace function public.admin_venture_index()
returns table (
  id uuid, owner_id uuid, title text, summary text, industry text, stage text, geography text, visibility text, status text,
  review_status text, review_note text, reviewed_at timestamptz, publication text, featured boolean, research_status text,
  validation_status text, is_demo boolean, created_at timestamptz, updated_at timestamptz, member_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_admin_permission('ideas', 'view') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select v.id, v.owner_id, v.title,
           -- Private ventures expose only their title in the index.
           case when v.visibility = 'private' then '' else v.summary end,
           v.industry, v.stage, v.geography, v.visibility, v.status, v.review_status, v.review_note, v.reviewed_at,
           v.publication, v.featured, v.research_status, v.validation_status, v.is_demo, v.created_at, v.updated_at,
           (select count(*) from public.venture_members m where m.venture_id = v.id)
    from public.ventures v
    order by v.updated_at desc;
end;
$$;

create or replace function public.admin_research_index()
returns table (id uuid, owner_id uuid, venture_id uuid, question text, depth text, archived boolean, created_at timestamptz,
               run_status text, provenance text, failure_reason text, finding_count bigint, source_count bigint, is_demo boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_admin_permission('research', 'view') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select p.id, p.owner_id, p.venture_id, p.question, p.depth, p.archived, p.created_at,
           r.status, r.provenance, r.failure_reason,
           (select count(*) from public.research_findings f where f.run_id = r.id),
           (select count(*) from public.research_sources s where s.run_id = r.id),
           p.is_demo
    from public.research_projects p
    left join lateral (select * from public.research_runs rr where rr.project_id = p.id order by rr.started_at desc limit 1) r on true
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_validation_index()
returns table (workspace_id uuid, venture_id uuid, venture_title text, owner_id uuid, updated_at timestamptz,
               sections_done bigint, evidence_count bigint, people_evidence bigint, framework_evidence bigint, downgraded bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_admin_permission('validation', 'view') then
    raise exception 'Not permitted' using errcode = '42501';
  end if;
  return query
    select w.id, w.venture_id, v.title, v.owner_id, w.updated_at,
           (select count(*) from public.validation_sections s where s.workspace_id = w.id and s.status = 'done'),
           (select count(*) from public.evidence e where e.workspace_id = w.id),
           (select count(*) from public.evidence e where e.workspace_id = w.id and e.evidence_type in ('customer_response', 'experiment_result', 'expert_opinion')),
           (select count(*) from public.evidence e where e.workspace_id = w.id and e.framework_generated),
           (select count(*) from public.evidence e where e.workspace_id = w.id and e.downgraded_reason is not null)
    from public.validation_workspaces w join public.ventures v on v.id = w.venture_id
    order by w.updated_at desc;
end;
$$;

-- Audited reveal of confidential records. The audit row and the read happen in one transaction.
create or replace function public.admin_reveal_venture(p_venture uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not app.has_admin_permission('ideas', 'view') then raise exception 'Not permitted' using errcode = '42501'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'A reason is required' using errcode = '22023'; end if;
  select to_jsonb(x) into v from public.ventures x where x.id = p_venture;
  if v is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (actor_id, actor_role, action, entity, target_id, target_label, reason, sensitive)
  values (auth.uid(), (select admin_role_id from public.admin_role_assignments where user_id = auth.uid()), 'Viewed confidential venture', 'venture', p_venture::text, v ->> 'title', left(p_reason, 1000), true);
  return v || jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'member_role', m.member_role, 'title', m.title)) from public.venture_members m where m.venture_id = p_venture), '[]'::jsonb),
    'updates', coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc) from public.venture_updates u where u.venture_id = p_venture), '[]'::jsonb));
end;
$$;

create or replace function public.admin_reveal_research(p_project uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not app.has_admin_permission('research', 'view') then raise exception 'Not permitted' using errcode = '42501'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'A reason is required' using errcode = '22023'; end if;
  select to_jsonb(p) into v from public.research_projects p where p.id = p_project;
  if v is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (actor_id, actor_role, action, entity, target_id, target_label, reason, sensitive)
  values (auth.uid(), (select admin_role_id from public.admin_role_assignments where user_id = auth.uid()), 'Viewed research report', 'research', p_project::text, left(v ->> 'question', 300), left(p_reason, 1000), true);
  return v || jsonb_build_object('runs', coalesce((
    select jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'findings', coalesce((select jsonb_agg(to_jsonb(f) order by f.position) from public.research_findings f where f.run_id = r.id), '[]'::jsonb),
      'sources', coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from public.research_sources s where s.run_id = r.id), '[]'::jsonb)) order by r.started_at desc)
    from public.research_runs r where r.project_id = p_project), '[]'::jsonb));
end;
$$;

create or replace function public.admin_reveal_validation(p_workspace uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not app.has_admin_permission('validation', 'view') then raise exception 'Not permitted' using errcode = '42501'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'A reason is required' using errcode = '22023'; end if;
  select to_jsonb(w) into v from public.validation_workspaces w where w.id = p_workspace;
  if v is null then raise exception 'Not found' using errcode = 'P0002'; end if;
  insert into public.audit_logs (actor_id, actor_role, action, entity, target_id, target_label, reason, sensitive)
  values (auth.uid(), (select admin_role_id from public.admin_role_assignments where user_id = auth.uid()), 'Viewed validation workspace', 'validation', p_workspace::text, (select title from public.ventures where id = (v ->> 'venture_id')::uuid), left(p_reason, 1000), true);
  return v || jsonb_build_object(
    'sections', coalesce((select jsonb_agg(to_jsonb(s)) from public.validation_sections s where s.workspace_id = p_workspace), '[]'::jsonb),
    'evidence', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.evidence e where e.workspace_id = p_workspace), '[]'::jsonb),
    'assumptions', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.assumptions a where a.workspace_id = p_workspace), '[]'::jsonb));
end;
$$;

-- =====================================================================================
-- Demo data removal (trusted server use only). Real accounts and records are untouched.
-- =====================================================================================
create or replace function app.purge_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ventures where is_demo;
  delete from public.posts where is_demo;
  delete from public.comments where is_demo;
  delete from public.opportunities where is_demo;
  delete from public.studies where is_demo;
  delete from public.research_projects where is_demo;
  delete from public.collaboration_requests where is_demo;
  delete from public.mentorships where is_demo;
  delete from public.talent_profiles where is_demo;
  delete from public.moderation_reports where is_demo;
  delete from public.institution_requests where is_demo;
  delete from public.institution_programmes where is_demo;
  delete from public.institutions where is_demo;
  delete from public.notifications where is_demo;
  delete from public.message_threads where is_demo;
  delete from public.teams where is_demo;
  delete from public.files where is_demo;
end;
$$;
revoke all on function app.purge_demo_data() from anon, authenticated;

revoke all on function public.my_session_context(), public.touch_last_active(), public.public_settings(), public.published_cms(),
  public.venture_follower_counts(uuid[]), public.start_thread(uuid, text, text, text, uuid, uuid), public.admin_venture_index(),
  public.admin_research_index(), public.admin_validation_index(), public.admin_reveal_venture(uuid, text),
  public.admin_reveal_research(uuid, text), public.admin_reveal_validation(uuid, text) from public;
grant execute on function public.public_settings(), public.published_cms(), public.venture_follower_counts(uuid[]) to anon, authenticated;
grant execute on function public.my_session_context(), public.touch_last_active(), public.start_thread(uuid, text, text, text, uuid, uuid),
  public.admin_venture_index(), public.admin_research_index(), public.admin_validation_index(),
  public.admin_reveal_venture(uuid, text), public.admin_reveal_research(uuid, text), public.admin_reveal_validation(uuid, text) to authenticated;

-- Triggers in schema app run as their owner; keep them out of reach of API roles.
revoke execute on function app.handle_new_user(), app.handle_user_email_change(), app.ventures_before_write(), app.ventures_after_write(),
  app.venture_disclosures_audit(), app.posts_before_insert(), app.expert_reviews_before_insert(), app.expert_reviews_guard(), app.expert_reviews_access(),
  app.study_participants_guard(), app.study_participants_consent_log(), app.registrations_guard(), app.registrations_events(),
  app.collaboration_requests_guard(), app.collaboration_requests_after(), app.notify_comment(), app.notify_follow(),
  app.notify_connection(), app.notify_message(), app.audit_logs_immutable(), app.touch_updated_at() from anon, authenticated;

-- Service-role entry point for demo-data removal (called only from the audited admin operation).
create or replace function public.purge_demo_data()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select app.purge_demo_data();
$$;
revoke all on function public.purge_demo_data() from public, anon, authenticated;
grant execute on function public.purge_demo_data() to service_role;
