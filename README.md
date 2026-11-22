# TRUEVIX — Powered by Weblaze Technologies

Phase 1 of TRUEVIX: a startup discovery, research, validation and innovation ecosystem by Weblaze Technologies India Private Limited.

This build is a complete interactive front end running on **local demonstration state**. No backend, AI model, search provider or email service is connected, and the interface says so wherever it matters.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build
npx playwright install chromium   # first time only
npm run test:e2e       # builds must exist: runs `next start` on :3100
```

To try it quickly, open `/login` and choose **Continue as a demo persona**. Personas are available for all eight roles.

## Stack

Next.js 16.4 (App Router, Cache Components, Turbopack) · React 19.3 · TypeScript · Tailwind CSS 4.3 · Motion 14 · lucide-react · zod 4 · Playwright.

## Architecture

```
src/
  config/        brand.ts (central identity + feature flags), taxonomy.ts, navigation.ts
  lib/
    types.ts     domain models (Idea, Person, Post, ResearchReport, ValidationWorkspace…)
    demo-data/   fictional seed data — every record is flagged demo: true
    services/    research.ts + validation.ts: provider interfaces with demo implementations
    store/       external store (useSyncExternalStore) + actions + selectors, persisted to localStorage
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

**Replacing demo services.** UI code depends only on the `ResearchProvider` and `AnalysisProvider` interfaces and on the store actions. To go live, implement those interfaces against server routes, and swap the persistence in `lib/store/store.ts` for API calls. Components do not need to change.

**Brand changes.** Edit `src/config/brand.ts`. The colour tokens live in `src/app/globals.css` (`@theme`).

## Platform administration portal (Phase 1.8)

Sign in as the **Platform administrator** persona and open `/admin`. All admin routes resolve through one catch-all page (`src/app/admin/[[...path]]/page.tsx`) and the route table in `src/features/admin/registry.tsx`, which also drives the sidebar departments, breadcrumbs and per-module permission checks.

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

## What is demo-only

| Area | Behaviour in Phase 1 |
|---|---|
| Authentication | Local only. Passwords are validated, then discarded — never stored or checked. Sign-in matches the email stored in this browser. |
| Email verification and password reset | Simulated with clear labels. No email is sent. |
| Role switcher | Changes the interface only. It is **not** access control. Shown only when developer tools are on (see above). |
| Role gates and admin console | Client-side UI rules, not a security boundary. |
| AI Researcher | Template-generated plan labelled "Demonstration report". No live data. Sources are suggestions with no URLs. |
| Validate My Idea | "Draft AI analysis" adds a demo item labelled *AI analysis*. Customer responses, expert opinions and experiment results can only be entered by the user, and must have a source. There is no success score. |
| People, ideas, opportunities, institutions | Fictional, marked as demo, with no official links and no implied partnerships. |
| Messages | Saved locally. Fictional contacts do not reply. |
| Privacy and notification settings | Stored, not enforced. |

## Testing

There are 28 Playwright test runs in `tests/`: everything on desktop Chrome at 1440×900, and the responsive suite also at tablet (820×1180) and on a Pixel 7 profile. They cover:

- registration and validation errors, verification, onboarding, sign-out and sign-in
- the conditional education model (currently studying, graduated, undergraduate, postgraduate, doctoral and professional qualifications)
- editing preferences in Settings and seeing Home, profile and storage update
- protected-route redirect and simulated password reset
- every main route rendering with no console errors
- submitting an idea (including the ownership requirement), saving a draft, and editing
- save and follow, feed search and filters, appreciation, saving and comments
- global search suggestions
- the research run and saving a report
- validation evidence separation and the final report
- notifications and messages
- the role switcher, role gate and admin moderation with its audit log
- the institution dashboard
- no horizontal overflow on every screen at both sizes
- mobile drawer and tab navigation

Screenshots are written to `test-results/screens/`.

`tests/dev-tools.spec.ts` runs against whichever build is being served. Run it in both modes, with the same flag for the build and for Playwright:

```bash
# Production-equivalent: developer tools disabled
npm run build && npx playwright test
# Preview-equivalent: developer tools enabled (every persona, refresh, sign-out/in)
NEXT_PUBLIC_DEV_TOOLS=true npm run build && NEXT_PUBLIC_DEV_TOOLS=true npx playwright test
```

## Vercel deployments

| Vercel environment | `NEXT_PUBLIC_DEV_TOOLS` | Developer tools |
|---|---|---|
| Preview | `true` (scope the variable to **Preview** only) | On |
| Production | unset | Off. Also forced off by `VERCEL_ENV=production` |

- The variable is read at build time. After adding or changing it, **redeploy** (build again). An existing deployment will not change.
- The sample-persona picker, including **Platform administrator**, is a demo convenience. It is **not** authentication, and the admin console's role checks run in the browser. Anyone who can open a preview URL can open the admin UI. Keep previews behind **Vercel Deployment Protection** (Project → Settings → Deployment Protection → Vercel Authentication, *Standard Protection*).

## Known limitations

- All data lives in one browser's localStorage. Clearing site data resets it, and nothing syncs across devices.
- Next 16 keeps recently visited routes mounted but hidden (React Activity). This is expected framework behaviour; tests scope selectors to visible elements.
- Feed and opportunity lists are not paginated. Seed volumes are small.
- Dark mode is not implemented.
