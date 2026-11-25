# TRUEVIX — Powered by Weblaze Technologies

TRUEVIX is a startup discovery, research, validation and innovation ecosystem by Weblaze Technologies India Private Limited.

Phase 2: the front end runs on **Supabase** (PostgreSQL with Row Level Security, Supabase Auth, Storage). Accounts, ideas, research, validation, community, opportunities and the admin portal are stored in the database and shared between members according to their permissions. No AI model, search provider, custom email (SMTP) or SMS provider is connected yet, and the interface says so wherever it matters. See [docs/backend.md](docs/backend.md) for the schema, permission model, storage, dashboard settings and beta accounts.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and keys
npm run db:start             # optional: local Supabase stack (Docker) for development and tests
npm run dev                  # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
npx playwright install chromium   # first time only
npm run test:e2e       # builds must exist: runs `next start` on :3100
```

Sign in with a real account (register at `/register` and confirm your email), or with the internal beta test accounts created by `scripts/bootstrap-beta.mjs`.

## Stack

Next.js 16.4 (App Router, Cache Components, Turbopack) · React 19.3 · TypeScript · Tailwind CSS 4.3 · Supabase (Postgres, Auth, Storage, `@supabase/ssr`) · Motion 14 · lucide-react · zod 4 · Playwright.

## Architecture

```
src/
  config/        brand.ts (central identity + feature flags), taxonomy.ts, navigation.ts
  lib/
    types.ts     domain models (Idea, Person, Post, ResearchReport, ValidationWorkspace…)
    supabase/    browser, server and service-role clients; generated database types
    data/        load.ts (read model from Supabase), session.tsx (session sync), remote.ts (write-through), files.ts
    server/      guards.ts — server-side admin permission checks and audit writes
    demo-data/   legacy fictional seed data (no longer loaded by the app)
    services/    research.ts + validation.ts: provider interfaces with template implementations
    store/       client read model (useSyncExternalStore) + actions + selectors; never persisted to the browser
    validation.ts  zod schemas, safe redirect helper
  components/
    ui/          design-system primitives (button, fields, dialog, menu, tabs, toast, charts)
    shell/       app shell, global search, session gate, role gate, logo
    illustrations/ original line-art + the journey line (signature element)
  features/      feature modules (ideas, research, validation, community, admin, messages…)
  app/
    (auth)/      login, register, verify-email, forgot/reset password
    onboarding/  six-step onboarding
    (app)/       the product: home, discover, ideas, research, validate, community,
                 opportunities, workspace, notifications, messages, search, settings,
                 profile, people/[id], reviews, studies, institution
    admin/       separate platform admin console with its own layout
```

**Data flow.** `SessionSync` (mounted in the root providers) resolves the Supabase session and loads the member's read model with RLS-scoped queries. Member actions update the read model immediately and write through to Supabase under the member's session; administrative actions call `adminOp()` (a server action) which re-checks permissions, writes with the service role and appends the audit log. `proxy.ts` keeps the session cookie fresh.

**AI and search.** UI code depends only on the `ResearchProvider` and `AnalysisProvider` interfaces. Until a provider is configured, runs are stored with `provenance = 'framework'` (template plans, labelled as such); `live` runs can only be written by the server.

**Brand changes.** Edit `src/config/brand.ts`. The colour tokens live in `src/app/globals.css` (`@theme`).

## Platform administration portal (Phase 1.8)

> **Phase 2:** the portal now reads through Supabase (RLS plus metadata-only admin index functions) and writes through
> `adminOp()`, which verifies the session and the operator's permissions in the database before using the service role.
> The permission matrix below is enforced by `app.has_admin_permission` in RLS and by `requireAdmin()` on the server; it
> is no longer an interface-only rule. Notes below about browser-local storage describe Phase 1.8.

Sign in as `admin@truevix.example` (created by `scripts/bootstrap-beta.mjs`) and open `/admin`. All admin routes resolve through one catch-all page (`src/app/admin/[[...path]]/page.tsx`) and the route table in `src/features/admin/registry.tsx`, which also drives the sidebar departments, breadcrumbs and per-module permission checks.

- **Shared data.** `AppState.platform` (`src/lib/store/platform.ts`) holds every member's public profile (`people`) and private account record (`accounts`), other members' ideas, posts and comments, and everything operators manage (opportunities, registrations, institutions, reports, mentors, studies, collaborations, research runs, validation workspaces, announcements, CMS entries, admin accounts, role permissions, settings). It is seeded once from `src/lib/demo-data/` (`admin.ts` holds the admin-only seed). Public pages read it through `lib/store/selectors.ts`, so admin changes show up immediately on Ideas, Discover, Opportunities, People, Studies, Notifications, the homepage hero, About, Help (`/help`) and the footer.
- **Writes** go through `src/lib/store/admin-actions.ts`. Every action appends an audit entry (actor, admin role, entity, record, before/after, reason, sensitive flag). The audit log has no edit or delete, keeps the latest 500 entries in this browser, and survives *Reset to seed*.
- **Tables** use `features/admin/kit/data-table.tsx` → `lib/admin/query.ts` (`queryRecords`: search, filters, sort, page, pageSize). That function is the server-query boundary for Phase 2. Only one page of rows is ever rendered.
- **Uploads** (`features/admin/kit/upload.tsx`) validate the extension, MIME type, size and file signature (JPG/PNG/WebP up to 3 MB; PDF up to 10 MB; no SVG). Files then stay in memory for the open tab. Records store metadata only. `uploadAdminFile` is the storage integration point.
- **Permissions** (`lib/admin/permissions.ts`): 8 admin roles × 19 modules × 10 permissions, editable by a super administrator. **These are interface rules, not access control.** Data and checks live in the browser. Phase 2 must enforce them on the server.
- **Tests:** `tests/admin.spec.ts` (workflows) and `tests/responsive.spec.ts` (all admin screens at desktop, tablet and mobile). Admin views are wrapped in `[data-admin-page]`. Previously visited views stay mounted but hidden, so tests scope to `[data-admin-page]:visible`.

## Design system

- **Colour (≈97% monochrome).** Neutrals `paper` (white), `canvas`, `surface`, `sunken`, `line`, `line-strong`, `mute`, `sub`, `charcoal`, `ink` (#111). All tokens live in `src/app/globals.css` (`@theme`); `brand.theme` mirrors them for metadata only. Components never hard-code colours.
- **TRUEVIX Petrol `#0E7086` (`accent`)** is the brand accent and the finishing detail, never the content. Budget: about 1–3% of what is on screen, 5% at most. Use it for the one primary action per screen (`Button variant="accent"`), the active-navigation and tab marker, selected states (switches, the current step), an appreciated post, and one detail per illustration. White text on petrol is 5.7:1; petrol text on white is 5.7:1 (`accent-text`) and on grey 5.2:1. On ink surfaces use `accent-on-dark` `#7FC4D1` (10:1). Never use it for list icons, headings, ordinary badges, borders, secondary buttons or large backgrounds. Strong secondary actions are ink (`variant="primary"`).
- **Functional colours carry meaning only:** `positive` `#1F8A4C` (text `positive-ink` `#166534`) for verified states, customer-validated evidence and real validation progress; `caution` `#A15C07` for time-sensitive states such as deadlines closing soon; `danger` `#B42318` for errors. No lime, cobalt, orange or violet.
- **Focus:** a 2px petrol outline everywhere (5.2:1+ on white and grey), and the light petrol tint on dark (`.on-ink`) surfaces.
- **Hierarchy:** every authenticated page leads with its purpose and main action (`PageHeader` with `actions` and `meta`), then supporting content and filters (`Toolbar`, `SearchInput`, `SectionHeading`), then quiet metadata. Ideas render as project entities (`IdeaRow` for shared ideas, `ProjectCard` for your own, with research, validation and the next action). Opportunities show deadline, location, stage and eligibility in columns, and closed listings are visibly quieter.
- **Navigation** is grouped by intent: *Home / My workspace*, *Explore* (Discover, Ideas, Community, Opportunities) and *Work on an idea* (AI Researcher, Validate my idea). "Submit an idea" is always one click away, in the sidebar, the mobile top bar and the mobile drawer.
- **Type:** Manrope (display and headings), IBM Plex Sans (body, navigation, buttons, forms), IBM Plex Mono (step counters only). Sizes are tokens: `text-title` (page titles: 1.5rem on phones, 1.75rem from md), `text-post` (feed titles), `text-section`, `text-body`, `text-ui`, `text-meta`, `text-micro`.
- **Discover feed:** a composer prompt, one filter bar (search, post type, industries on request) and a single row of quick post-type chips, then posts. Each post shows who, what kind, what it is about, an optional data figure (`Post.figure`, only for numbers the post itself states) and a linked project, then Appreciate / Comment / Save / Share. Posts load eight at a time with an explicit *Load next posts*; below the xl breakpoint, people and deadline suggestions appear inside the feed instead of in a side column.
- **Motion:** route fade (200ms), shared-layout nav, tab and radio indicators, dialogs, menus, toasts, accordions, conditional onboarding fields, and one orchestrated hero entrance on the homepage. There are no floating or scroll-triggered animations. `MotionConfig reducedMotion="user"` and a CSS reduced-motion override are in place.
- Developer tools (sample-persona sign-in, role switcher, admin role preview) appear in `next dev`, or in builds made with `NEXT_PUBLIC_DEV_TOOLS=true`. The value is inlined at `next build`, so changing it needs a new build. Vercel **Production** builds (`VERCEL_ENV=production`) always disable them, even if the flag is set. See *Vercel deployments* below.
- Resume and photo files are held in memory for the open tab only (`lib/store/transient-files.ts`); only metadata is persisted.

## Onboarding and preferences

- **Education** (students and graduates) is conditional: level → qualification (options depend on the level; custom entry for "Other") → status (studying, graduated, on a break, other) → only the details that apply. Graduates are asked for a graduation year, never a year of study; doctoral candidates are asked for a research stage instead of a year. Field rules (`showIf`, `optionsFor`, `optionalIf`) live in `src/features/onboarding/config.ts`, and answers that stop applying are cleared (`pruneValues`) before they are validated or saved.
- **Preferences** (industries, technologies, skills, areas of interest or expertise, startup interests, professional goals and collaboration preferences) have one definition and one storage location: `src/features/preferences/preferences.ts`. Onboarding presents them as optional suggestions with custom entries; **Settings › Interests and preferences** (`/settings?tab=preferences`) edits the same values, and Home, Discover and suggestions update immediately. The profile page shows a summary that links there.

## What is not connected yet

| Area | Behaviour |
|---|---|
| Email | No custom SMTP. Supabase's default mailer only delivers to the Supabase organisation's team addresses and is heavily rate-limited, so public registration and password-reset emails do not reach external users yet. Custom TRUEVIX email templates also need SMTP (free tier). The 7 beta accounts are pre-confirmed and need no email. Announcement "email" channels are recorded as *not sent*. |
| Google sign-in | Pending OAuth credentials. `/auth/callback` already supports it; no button is shown until it is configured. |
| AI Researcher | Template-generated plan, stored and labelled as a template. No live model or search. |
| Validate My Idea | "Draft AI analysis" adds a template item labelled *AI analysis*. Customer responses, expert opinions and experiment results are entered by people, with a source. There is no success score. |
| Phone verification | Numbers are stored as unverified. No SMS provider. |
| Admin MFA | Not enabled yet; required before public launch. |

## Testing

```bash
npm run typecheck && npm run lint && npm run build
npm run test:rls    # database security suite (real Auth users); hosted target needs SUPABASE_TEST_* and SUPABASE_TEST_ALLOW_REMOTE=1
npm run test:live   # real-login browser suite against https://truenix.vercel.app (set LIVE_BASE_URL to override)
```

`tests/db/security.test.mjs` covers authentication, privilege escalation, private-venture isolation, controlled disclosure and revocation, public summaries, expert-review access, community isolation, suspension and storage. `tests/live` signs in through the real login form as each beta account and checks portals, refresh, sign-out, admin-route denial, private-venture privacy and that no server secret reaches the browser. See [docs/backend.md](docs/backend.md#tests).

## Vercel deployments

Pushes to `main` build Production. Required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and (server-only) `SUPABASE_SERVICE_ROLE_KEY`. Database migrations are tracked in Supabase's migration history and applied with `supabase db push` or the Supabase GitHub integration (which skips versions already applied), never by Vercel.

Developer tools (`NEXT_PUBLIC_DEV_TOOLS=true`, Preview only) now only add an interface role-preview switcher; they cannot sign anyone in or grant access, because every read and write is checked by the database.

## Known limitations

- Other members' changes appear when you return to the tab or within two minutes (no realtime push yet).
- Next 16 keeps recently visited routes mounted but hidden (React Activity). This is expected framework behaviour; tests scope selectors to visible elements.
- Feed and opportunity lists are not paginated. Seed volumes are small.
- Dark mode is not implemented.
