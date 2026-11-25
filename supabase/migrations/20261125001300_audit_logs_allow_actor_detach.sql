-- TRUEVIX Phase 2 — let account deletion detach the actor from audit entries.
--
-- audit_logs.actor_id references auth.users ON DELETE SET NULL. PostgreSQL performs that foreign-key action as an
-- UPDATE, which the append-only trigger rejected, so deleting any member who had ever been recorded as an audit
-- actor (every administrator, any founder who granted or revoked venture access) failed with
-- "audit_logs is append-only" and rolled back the whole deletion.
--
-- The trigger now allows exactly one kind of UPDATE: actor_id changing from a user to NULL with every other column
-- unchanged (what the foreign-key action does). The entry itself — action, target, values, reason, time and the
-- actor_label recorded at the time — is preserved. Any other UPDATE, and any DELETE outside the retention purge,
-- is still rejected. Members have no UPDATE/DELETE privilege on audit_logs in any case.

create or replace function app.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.audit_purge', true) = 'on' then
    return old;
  end if;
  if tg_op = 'UPDATE'
     and old.actor_id is not null and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception 'audit_logs is append-only';
end;
$$;

revoke execute on function app.audit_logs_immutable() from public, anon, authenticated;
