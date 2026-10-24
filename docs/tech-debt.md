# Tech debt register — agent context cleanup follow-ups

> Tracked cleanup from the 2026-08-26 agent-context verification.
> **Rules for new code stay in force** (`AGENTS.md` §0). This file lists existing violations
> so agents do not treat them as precedent — and so humans can schedule cleanup.

## 1. Hardcoded hex (light-mode bugs)

Both themes ship. Hex in components freezes dark values and breaks the light toggle.

**Approx:** ~30 files / ~296 matches under `apps/*/src` (excluding legitimate `globals.css` vars).

### Priority component files (replace with tokens)

- `apps/client/src/components/modules/session/SessionStatisticsView/SessionStatisticsView.tsx`
- `apps/client/src/components/modules/session/SessionFinancialsView/SessionFinancialsView.tsx`
- `apps/client/src/components/modules/session/AssignCourtModal/AssignCourtModal.tsx`
- `apps/client/src/components/modules/dashboard/dashboard-map/DashboardMap.tsx`
- `apps/client/src/components/modules/profile/SkillRadarChart/SkillRadarChart.tsx`
- `apps/client/src/components/modules/onboarding/ChipRow/ChipRow.tsx`
- `apps/client/src/components/modules/onboarding/OnboardingStepPanel/OnboardingStepPanel.tsx`
- Auth cards: `LoginCard*`, `LoginTesterCard*`, `LoginAdminCard*`, `SetPasswordCard*`
- `apps/client/src/components/ui/sidebar/Sidebar.tsx`
- `apps/client/src/app/not-found.tsx`

`globals.css` hex in `:root` / `.dark` is **expected**. Mapbox paint props may need hex — comment why.
DarkVeil WebGL is the same: the GLSL shader stays raw (commented in the three copies);
wrappers use tokens (`bg-bg-base`, `bg-accent/5`).

## 2. App-level barrel files

Sanctioned: `packages/db/src/index.ts`, `packages/legal-content/src/index.ts`.

**Debt (do not copy):**

- `apps/client/src/components/modules/session/index.ts`
- `apps/client/src/components/ui/slider/index.ts`
- `apps/client/src/hooks/useSessionLive/index.ts`
- `apps/client/src/hooks/useCloseSessionMutation/index.ts`
- `apps/client/src/hooks/useAvailableSessions/index.ts`
- `apps/client/src/hooks/useUserSessions/index.ts`
- `apps/client/src/hooks/useLeaveSessionMutation/index.ts`
- `apps/umpire/src/components/ui/{button,logo,theme-toggle}/index.ts`

Not pure re-export barrels (OK): `apps/*/src/store/index.ts` (store config),
`packages/config/tailwind-config/index.ts` (config object).

## 3. Forms using `register()`

Prefer `Controller` + `Field` for new work. Cleanup targets:

- `ClubApplicationForm`
- Onboarding `NameStep`, `PhoneStep`, `ExperienceStep`
- Login/OTP/Waitlist patterns that skip colocated schema/default/toast — see `.agents/context/forms.md`

## 4. Story fixtures inlined

Prefer `@/constants/...`. Many of ~181 stories inline mocks; data-heavy module stories should migrate
when touched. Do not block PRs solely for primitive `args`-only stories.

## 5. CI does not run `type-check` — **done**

Resolved: `.github/workflows/biome.yml` now has a `type-check` job (`pnpm db:generate` then
`pnpm type-check`) alongside Biome. Snippet remains in `docs/ways-of-working.md` §6.1.

## 6. Missing verification recipes

`.agents/context/verification-recipes.md` is a stub. Fill with human-owned seed/login steps before
agents can rely on it.

## 7. Routes that bypass `@rotra/db` services

Sessions / places / onboarding / waitlist often call `db.*` in route handlers. Prefer services for
new non-trivial domain logic; migrate when touching those routes.

---

**Cadence:** pick items when touching the file anyway; do not open a mega-cleanup PR without asking.
