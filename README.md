# TRUEVIX — Powered by Weblaze

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

## Design system

- Monochrome palette (`paper`, `surface`, `line`, `mute`, `sub`, `charcoal`, `ink`) plus one accent, `#D96B43`, used only for the primary action, the active-navigation marker, unread and status dots, and the current journey node.
- Typeface: Geist, chosen over Inter and Manrope for its tighter, more technical character. Type tokens: `display`, `title`, `section`, `body`, `ui`, `meta`, `micro`.
- Hierarchy comes from type, rules and spacing rather than cards. Lists are hairline-separated rows.
- Motion: route fade, shared-layout tab and nav indicators, dialog, menu, toast and accordion transitions. All are short; `MotionConfig reducedMotion="user"` and a CSS reduced-motion override are in place.

## What is demo-only

| Area | Behaviour in Phase 1 |
|---|---|
| Authentication | Local only. Passwords are validated, then discarded — never stored or checked. Sign-in matches the email stored in this browser. |
| Email verification and password reset | Simulated with clear labels. No email is sent. |
| Role switcher | Changes the interface only. It is **not** access control. Hide it with `NEXT_PUBLIC_DEMO_TOOLS=false`. |
| Role gates and admin console | Client-side UI rules, not a security boundary. |
| AI Researcher | Template-generated plan labelled "Demonstration report". No live data. Sources are suggestions with no URLs. |
| Validate My Idea | "Draft AI analysis" adds a demo item labelled *AI analysis*. Customer responses, expert opinions and experiment results can only be entered by the user, and must have a source. There is no success score. |
| People, ideas, opportunities, institutions | Fictional, marked as demo, with no official links and no implied partnerships. |
| Messages | Saved locally. Fictional contacts do not reply. |
| Privacy and notification settings | Stored, not enforced. |

## Testing

There are 16 Playwright tests in `tests/`, running on desktop Chrome at 1440×900 and on a Pixel 7 profile. They cover:

- registration and validation errors, verification, onboarding, sign-out and sign-in
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

## Known limitations

- All data lives in one browser's localStorage. Clearing site data resets it, and nothing syncs across devices.
- Next 16 keeps recently visited routes mounted but hidden (React Activity). This is expected framework behaviour; tests scope selectors to visible elements.
- Feed and opportunity lists are not paginated. Seed volumes are small.
- Dark mode is not implemented.
