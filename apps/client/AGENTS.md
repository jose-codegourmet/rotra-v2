# AGENTS.md — `@rotra/client`

> Nested entry for `apps/client`. Root: `/AGENTS.md`. Status: `.agents/context/implementation-status.md`.

**Port:** 3000 · **Auth:** universal email/password + middleware session. Facebook OAuth is dormant; no client OTP login.

## Do not confuse these routes

| Path | Truth |
|------|-------|
| `/find-sessions`, `/find-sessions/[sessionId]` | **REAL** live session |
| `/sessions/join|joined|queue|court|attendance|add-match|play/*` | **MOCK** — do not wire “for real” here without a deliberate migration |
| `/clubs/apply` | **REAL** |
| Other `/clubs/*` | **MOCK** / ProvisionBox |
| `/profile` | **PARTIAL** — identity real; cards mock |

## Patterns

- Hooks: `src/hooks/useFeature/{client,server,queryKey}.ts`
- Fixtures: `src/constants/`
- Redux: `authSlice` + `uiSlice` only
- Theme: dark default + light toggle — use tokens, not hex
- Mapbox: `dynamic({ ssr: false })`

## Quick Session

`POST /api/sessions/quick` is REAL. Product conflict with Owner/QM-only create — do not “fix” without OpenSpec.
