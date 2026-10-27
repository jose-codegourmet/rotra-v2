# Admin app

**Status:** Supporting v1 target product, operated by the platform owner.

Admin manages club access, user information, feature flags, and agreed business settings. The club's operator is not a platform administrator.

| Module | Owns |
|---|---|
| [Clubs and licenses](modules/clubs-licenses/README.md) | Dedicated accounts, manual activation/renewal, expiry and public-page retention |
| [Player management](modules/player-management/README.md) | Identity/contact requests and user-information oversight |
| [Configuration](modules/configuration/README.md) | Feature flags and agreed adjustable ranking settings |

## Boundaries

- Collect payments outside ROTRA; no checkout/payment gateway in v1.
- No multi-manager club-role system in v1.
- No Admin override for a confirmed winner, score, or invalid-match decision.
- No manual reconstruction of permanently lost offline results.
- Existing mock Admin pages do not prove these new controls are implemented.

**Reference prototype:** [`docs/frames/admin-app/rotra-admin.html`](../../../frames/admin-app/rotra-admin.html), also published as the ROTRA Admin artifact. It is a clickable, single-file prototype with fictional data; notes in its [README](../../../frames/admin-app/README.md).

Settled October 27, 2026: the platform owner adds clubs directly, each club has its own price (or is free as a tester), and the platform owner creates feature flags. Renewal dates, refunds, flag targeting and offline flag behavior remain open.
