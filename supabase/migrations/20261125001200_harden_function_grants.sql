-- TRUEVIX Phase 2 — close default PUBLIC EXECUTE on functions.
--
-- PostgreSQL grants EXECUTE to PUBLIC on every new function. Migration 0700 revoked it only for the functions that
-- existed at that point; functions created later in schema `app` (trigger functions in 0900, app.purge_demo_data,
-- app.path_uuid) kept it, because the later revokes named anon/authenticated rather than PUBLIC. In schema `public`,
-- Supabase's default privileges also grant EXECUTE directly to anon, so admin/member RPCs were callable by anon
-- (each still checks auth.uid()/permissions internally, so this is defence in depth, not an open hole).
--
-- Privilege-only migration: no tables, rows or function bodies change. Trigger functions keep firing — EXECUTE is
-- checked when a trigger is created, not when it fires. Policies keep working: the helpers they call were granted
-- directly to anon/authenticated/service_role in 0700 (app.path_uuid in 1000), and direct grants are not affected
-- by revoking from PUBLIC.

-- 1. Schema app: nothing is executable through PUBLIC.
revoke execute on all functions in schema app from public;

-- Demo purge stays reachable only through public.purge_demo_data() (service_role, SECURITY DEFINER owner).
revoke execute on function app.purge_demo_data() from anon, authenticated, service_role;

-- 2. Schema public: member/admin RPCs are for signed-in sessions only.
revoke execute on function
  public.my_session_context(),
  public.touch_last_active(),
  public.start_thread(uuid, text, text, text, uuid, uuid),
  public.admin_venture_index(),
  public.admin_research_index(),
  public.admin_validation_index(),
  public.admin_reveal_venture(uuid, text),
  public.admin_reveal_research(uuid, text),
  public.admin_reveal_validation(uuid, text),
  public.purge_demo_data()
from public, anon;

-- Re-assert the intended grants (idempotent).
grant execute on function public.public_settings(), public.published_cms(), public.venture_follower_counts(uuid[]) to anon, authenticated;
grant execute on function
  public.my_session_context(),
  public.touch_last_active(),
  public.start_thread(uuid, text, text, text, uuid, uuid),
  public.admin_venture_index(),
  public.admin_research_index(),
  public.admin_validation_index(),
  public.admin_reveal_venture(uuid, text),
  public.admin_reveal_research(uuid, text),
  public.admin_reveal_validation(uuid, text)
to authenticated;
revoke execute on function public.purge_demo_data() from authenticated;
grant execute on function public.purge_demo_data() to service_role;

-- Future functions in schema `app` must revoke PUBLIC explicitly (per-schema default privileges cannot remove the
-- global PUBLIC default, and changing the global default would affect every schema).
