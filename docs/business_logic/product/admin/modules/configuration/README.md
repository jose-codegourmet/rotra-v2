# Feature flags and business configuration

**Status:** Confirmed v1 target scope.

The platform owner manages feature flags in Admin. Updated October 27, 2026 from the [ROTRA Admin prototype](../../../../../frames/admin-app/rotra-admin.html):

- The catalog starts empty. The platform owner creates each flag with **Add flag**.
- A flag has a **name** (unique, up to 50 characters), a **key** the apps' code checks (suggested from the name; lowercase letters, numbers and underscores, starting with a letter, 3–40 characters, unique, fixed once saved), a **description** of what it does, and an on/off value.
- New flags start off unless the platform owner chooses to turn it on right away. Turning a flag on or off is confirmed first.
- Flags are on/off switches for the whole platform. Targeting particular clubs or players, rollout schedules, and when offline Queue devices pick up a change have not been selected.

## Agreed adjustable settings

| Setting | Initial value | Scope |
|---|---|---|
| Club-assessment contribution | 70% | Shared player rank |
| Match-performance contribution | 30% | Shared player rank |
| Recent standard matches required | 10 | Overall leaderboard eligibility |

Assessment and performance weights represent complementary shares of the same rank. Their exact normalized numerical model still needs specification.

The agreed observation window is three months. The agreed Most Improved/Off Day requirement is five prior sessions at the same club within that window. Neither was explicitly requested as an Admin-adjustable setting; do not silently add controls for them.

Whether configuration edits recompute existing ranks immediately or apply from a future point is unresolved. Feature flags must not become a back door for changing confirmed winners or bypassing lost-data invalidation.
