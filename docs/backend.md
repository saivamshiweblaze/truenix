# TRUEVIX backend (Phase 2)

Supabase (PostgreSQL, Auth, Storage) is the system of record. The Next.js app reads and writes under each member's own session, so **Row Level Security (RLS) is the security boundary**; privileged work runs in server actions that re-verify the caller first.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (all envs), `.env.local` | Project URL (`https://<ref>.supabase.co`). Public. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (all envs), `.env.local` | Publishable/anon key. Public; protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server, **not** `NEXT_PUBLIC_`), `.env.local` | Admin operations, account deletion, beta bootstrap. Never sent to browsers (`server-only` guard). |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical origin for email links. Defaults to the request host. |

`.env*` (except `.env.example`) and `/.secrets/` are git-ignored.

## Schema

Migrations live in `supabase/migrations/`. The hosted project (`gxfggzisdmmclchrpjos`) was first deployed with the CLI
(`npx supabase db push --remote` after `--dry-run`); the Supabase GitHub integration ("Deploy to production" on `main`)
reads the same `supabase_migrations.schema_migrations` history, so it skips versions that are already recorded and
applies only new files. Use one path per migration: either push it with the CLI before merging, or let the integration
apply it — never edit a migration that has already been applied; add a new one.

| Migration | Contents |
|---|---|
| `…0100_foundation_identity` | `app` helper schema, `files`, `profiles`, `profile_experiences`, `account_private`, `account_status`, `user_roles`, `user_preferences`, `onboarding_progress`, `user_consents`, `institutions`, `institution_members`, `institution_requests`, `institution_programmes`, `admin_roles`, `admin_permissions`, `admin_role_assignments`, `platform_settings` |
| `…0200_ventures` | `ventures`, `venture_members`, `venture_disclosures`, `venture_public_summaries`, `venture_versions`, `venture_updates`, `venture_documents`, `venture_activity` |
| `…0300_research_validation` | `research_projects`, `research_runs`, `research_findings`, `research_sources`, `research_notes`, `validation_workspaces`, `validation_sections`, `assumptions`, `evidence`, `experiments`, `experiment_results`, `customer_interviews` |
| `…0400_community_collaboration` | `posts`, `comments`, `reactions`, `follows`, `connections`, `collaboration_requests`, `teams`, `team_members`, `talent_profiles`, `mentorships`, `expert_reviews`, `studies`, `study_participants`, `message_threads`, `thread_participants`, `messages` |
| `…0500_opportunities` | `opportunities`, `opportunity_organisers`, `opportunity_rounds`, `opportunity_criteria`, `opportunity_files`, `opportunity_communications`, `applications`, `registrations`, `registration_notes`, `registration_events`, `submissions`, `submission_files`, `judging_scores`, `saved_items` |
| `…0600_platform_admin` | `notifications`, `consent_records`, `moderation_reports` (content **and** member reports), `audit_logs` (append-only), `announcements`, `announcement_deliveries`, `cms_content`, `cms_versions`, `user_tasks`, `user_activity` |
| `…0700_access_helpers` | `SECURITY DEFINER` helpers in schema `app` used by policies (no recursive RLS) |
| `…0800_rls_policies` | Default-deny privileges, column-level grants, every RLS policy |
| `…0900_triggers_rpcs` | Signup provisioning, public-summary sync, transition guards, notifications, RPCs (`my_session_context`, `start_thread`, admin index/reveal functions, `purge_demo_data`) |
| `…1000_storage` | Buckets and `storage.objects` policies |
| `…1100_reference_data` | Operator roles, permission matrix, initial site copy (not demo data) |
| `…1200_harden_function_grants` | Removes default `PUBLIC` EXECUTE on `app.*` functions and anon EXECUTE on signed-in-only RPCs |
| `…1300_audit_logs_allow_actor_detach` | Lets account deletion null `audit_logs.actor_id` (FK `SET NULL`); every other audit change stays blocked |

Generate TypeScript types from the hosted schema with `npm run db:types` (linked project; no Docker needed).
New functions in schema `app` must `revoke execute … from public` explicitly (PostgreSQL grants it by default).

## Permission model

- **Identity**: Supabase Auth user id everywhere. Roles are never read from user metadata.
- **Self-service personas** (`profiles.persona`): student, founder, professional, expert, mentor, research participant, institution representative.
- **Restricted roles** (`user_roles`): `platform_admin` (granted only by bootstrap or by an administrator with `access:manage_permissions`) and `institution_admin` (granted only by approving an institution request). Members have no write privilege on these tables.
- **Operator permissions**: `admin_role_assignments` → `admin_permissions` matrix (module × permission). Checked in RLS (`app.has_admin_permission`) and again in every admin server action (`src/lib/server/guards.ts`).
- **Ventures**: members (`venture_members`) always; explicit `venture_disclosures` to a person or institution (scope summary/full/documents), honoured only while the venture is not private; `visibility = 'institution'` grants verified members of that institution. Public listing is the separate `venture_public_summaries` row, maintained by trigger only while the founder chose a public summary, the idea is submitted, listed and approved. Anonymous visitors can read listing columns only.
- **Confidential content and administrators**: administrators see a metadata index (`admin_*_index`). Opening content calls `admin_reveal_*`, which writes the audit entry and returns the content in one transaction.
- **Revocation**: setting `revoked_at` (or making the venture private, or completing/declining a review) ends access on the next request. Signed file URLs live 60 seconds and are issued under the member's own session.
- **Suspension**: suspended/deactivated accounts are banned in Supabase Auth and blocked from writes by RLS.

## Storage

| Bucket | Public | Path (first folder decides access) |
|---|---|---|
| `avatars` | yes | `<user_id>/…` |
| `resumes` | no | `<user_id>/…` — owner and user administrators |
| `venture-documents` | no | `<venture_id>/…` — members; “shared” documents also for document-scope disclosures |
| `venture-media` | yes | `<venture_id>/…` — venture editors write |
| `research-evidence` | no | `<research_project_id>/…` |
| `validation-attachments` | no | `<validation_workspace_id>/…` |
| `opportunity-submissions` | no | `<registration_id>/…` — applicant team, organisers, opportunity administrators |
| `platform-assets` | yes | written by server only |

Browsers upload directly (Vercel request bodies are capped at 4.5 MB); `registerUpload` then verifies path ownership, size, MIME type and magic bytes on the server, deletes anything that fails, and records the file.

## Supabase dashboard settings (hosted project)

Auth settings are managed from `supabase/config.jsonc`; the `remotes.production` block overrides the local values
for the hosted project. Preview with `npx supabase config diff`, apply with `npx supabase config push`.
Currently applied (diff is empty):

1. **Site URL** `https://truenix.vercel.app`; **redirect URLs** `https://truenix.vercel.app/auth/callback**`,
   `https://truenix.vercel.app/auth/confirm**` (the `**` covers the `?next=` query), `http://localhost:3000/**`, `http://localhost:3100/**`.
2. **Email**: confirmation required; secure password change on; minimum password length 10 with lower, upper and digits.
3. **Anonymous sign-ins**: off. TOTP MFA stays enabled at the project level (the app does not offer it yet).

Not yet possible / pending:

- **Custom email templates** (`supabase/templates/*.html`): Supabase rejects template changes on free-tier projects
  that use the default email sender (`entitlement_required: auth.email_templates`). The block is commented out in
  `config.jsonc`. Until then the default emails are sent; their links pass through `/auth/v1/verify` and land on
  `/auth/callback?code=…` (PKCE), which works when the link is opened in the same browser that requested it.
- **SMTP**: the default mailer sends only to the organisation's team members' addresses and is heavily rate-limited, so
  public registration and password-reset emails do not reach external users until custom SMTP is configured
  (dashboard → Authentication → SMTP). After that, re-enable the templates block and run `config push`.
- **Google** (later): enable the provider with OAuth credentials; `/auth/callback` already handles provider redirects.
  Add the Google sign-in button only after the provider is configured.

## Beta accounts and demo data

```bash
node scripts/bootstrap-beta.mjs                    # creates 7 test accounts + small demo set
node scripts/bootstrap-beta.mjs --reset-passwords  # rotates their passwords
node scripts/bootstrap-beta.mjs --remove-demo      # removes demo rows and the 7 accounts
```

Credentials are written only to `.secrets/beta-credentials.local.md` (git-ignored). Demo rows have `is_demo = true`; **Admin → Settings → Remove demo data** (or `purge_demo_data()`) deletes them without touching real members.

## Tests

```bash
# RLS, auth, storage and admin isolation with real Auth users. Against the hosted project:
SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… SUPABASE_TEST_SERVICE_KEY=… SUPABASE_TEST_ALLOW_REMOTE=1 npm run test:rls
#   creates rls-<role>-<run>@truevix.test users (no email is sent) and deletes them and their uploads afterwards.
#   Without SUPABASE_TEST_URL it targets a local Docker stack (npm run db:start && npm run db:reset).

npm run test:live                                     # real-login browser suite against https://truenix.vercel.app
LIVE_BASE_URL=http://localhost:3100 npm run test:live  # same suite against a local production build
```

`test:live` signs in through the real login form with the beta accounts, reading passwords from
`.secrets/beta-credentials.local.md`; it creates no records. The Phase 1 specs in `tests/*.spec.ts` signed in by
seeding browser storage and are no longer run.
