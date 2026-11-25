-- TRUEVIX Phase 2 — Storage buckets and object policies.
--
-- Path conventions (first folder decides access):
--   avatars/<user_id>/…                   public bucket; only the user writes
--   resumes/<user_id>/…                   private; the user and user administrators
--   venture-documents/<venture_id>/…      private; venture members, and 'shared' documents for document-scope disclosures
--   venture-media/<venture_id>/…          public bucket for public venture imagery; venture editors write
--   research-evidence/<project_id>/…      private; whoever can view the research project
--   validation-attachments/<workspace_id>/…  private; whoever can view the venture's validation work
--   opportunity-submissions/<registration_id>/…  private; the applicant team, organisers, opportunity administrators
--   platform-assets/…                     public; written only by trusted server code (banners, logos)
-- Private objects are served with short-lived signed URLs created under the caller's own session, so these
-- policies are re-checked every time a URL is issued.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('resumes', 'resumes', false, 5242880, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('venture-documents', 'venture-documents', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('venture-media', 'venture-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('research-evidence', 'research-evidence', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('validation-attachments', 'validation-attachments', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('opportunity-submissions', 'opportunity-submissions', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/zip',
     'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('platform-assets', 'platform-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Returns the first path segment as a uuid, or null when it is not one (so policies deny instead of erroring).
create or replace function app.path_uuid(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := split_part(p_name, '/', 1);
begin
  if v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v::uuid;
  end if;
  return null;
end;
$$;
grant execute on function app.path_uuid(text) to anon, authenticated;

-- ---------- avatars (public read through the public URL) ----------
create policy "avatars: owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and app.path_uuid(name) = (select auth.uid()) and app.is_usable_account());
create policy "avatars: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and app.path_uuid(name) = (select auth.uid()));
create policy "avatars: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and app.path_uuid(name) = (select auth.uid()));

-- ---------- resumes ----------
create policy "resumes: owner or user admins read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (app.path_uuid(name) = (select auth.uid()) or app.has_admin_permission('users', 'view')));
create policy "resumes: owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and app.path_uuid(name) = (select auth.uid()) and app.is_usable_account());
create policy "resumes: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and app.path_uuid(name) = (select auth.uid()));

-- ---------- venture documents ----------
create policy "venture-documents: authorised read" on storage.objects for select to authenticated
  using (bucket_id = 'venture-documents' and (
    exists (
      select 1 from public.files f join public.venture_documents d on d.file_id = f.id
      where f.bucket = 'venture-documents' and f.object_path = storage.objects.name and d.deleted_at is null
        and app.can_view_venture_document(d.venture_id, d.confidentiality))
    -- The uploader can read back a file before its document record is attached.
    or (app.can_contribute_venture(app.path_uuid(name)) and exists (
      select 1 from public.files f where f.bucket = 'venture-documents' and f.object_path = storage.objects.name and f.owner_id = (select auth.uid())))
  ));
create policy "venture-documents: members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'venture-documents' and app.can_contribute_venture(app.path_uuid(name)));
create policy "venture-documents: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'venture-documents' and app.can_edit_venture(app.path_uuid(name)));

-- ---------- venture media (public imagery) ----------
create policy "venture-media: editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'venture-media' and app.can_edit_venture(app.path_uuid(name)));
create policy "venture-media: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'venture-media' and app.can_edit_venture(app.path_uuid(name)));

-- ---------- research evidence ----------
create policy "research-evidence: viewers read" on storage.objects for select to authenticated
  using (bucket_id = 'research-evidence' and app.can_view_research(app.path_uuid(name)));
create policy "research-evidence: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'research-evidence' and app.can_edit_research(app.path_uuid(name)));
create policy "research-evidence: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'research-evidence' and app.can_edit_research(app.path_uuid(name)));

-- ---------- validation attachments ----------
create policy "validation-attachments: viewers read" on storage.objects for select to authenticated
  using (bucket_id = 'validation-attachments' and app.can_view_venture_work(app.workspace_venture(app.path_uuid(name))));
create policy "validation-attachments: contributors upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'validation-attachments' and app.can_contribute_venture(app.workspace_venture(app.path_uuid(name))));
create policy "validation-attachments: contributors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'validation-attachments' and app.can_contribute_venture(app.workspace_venture(app.path_uuid(name))));

-- ---------- opportunity submissions ----------
create policy "opportunity-submissions: authorised read" on storage.objects for select to authenticated
  using (bucket_id = 'opportunity-submissions' and (
    app.is_registration_applicant(app.path_uuid(name))
    or app.is_opportunity_staff(app.registration_opportunity(app.path_uuid(name)))
    or app.has_admin_permission('opportunities', 'view')));
create policy "opportunity-submissions: applicants upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'opportunity-submissions' and app.is_registration_applicant(app.path_uuid(name)) and app.is_active_account());
