# Player Information app

**Status:** Lean v1 target product.

**Reference prototype:** [`docs/frames/player-app/rotra-player.html`](../../../frames/player-app/rotra-player.html), also published as the ROTRA Players artifact. It shows these rules on screen; it adds no rules of its own.

This product stores player identity and shared rank across clubs. Profiles and the overall ROTRA leaderboard are public. Registered players sign in to edit their personal information, but cannot edit games, results, or calculated ranks.

| Module | Owns |
|---|---|
| [Identity](modules/identity/README.md) | Profile creation/claim, login, contact privacy, player ID |
| [Ranking](modules/ranking/README.md) | Club assessments, performance, rank labels, rolling eligibility |

## Scope

- A club can run sessions with guests who have no Player Information account.
- Phone-linked profiles can be created automatically through valid session sync; claiming a profile is a separate step.
- One shared rank supports both singles and doubles.
- One overall ROTRA leaderboard, with no city or club filtering in v1.
- A player can have a label such as **Intermediate High** and a position such as **#128**.
- City/National/World competition categories are deferred; the public leaderboard is global.
- Social links describe the player; they are not authentication providers.
- No old review, skill-dimension, EXP, or separate MMR system is implicitly included.

World discovery is v2 and has no further requirements here.
