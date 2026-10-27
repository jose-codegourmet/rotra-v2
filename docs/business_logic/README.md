# ROTRA v1 — Business logic

**Decision baseline:** October 25, 2026.
**Status:** Agreed product direction; not an implementation or deployment claim.

**Last updated:** October 26, 2026, to match the [ROTRA Queue prototype](../frames/queue-app/rotra-queue.html). The prototype is the agreed design reference for the Queue app; where it says a detail is not decided, the docs keep it open.

These documents capture the new ecosystem v1. The latest explicit correction in the business discussion takes precedence over earlier answers. In particular, reassessment is allowed **while preparing a roster**, not in an unrestricted post-session editor.

## Start here

- [Ecosystem scope](product/README.md)
- [Queue app](product/queue/README.md) — primary product
- [Player Information app](product/player-information/README.md) — lean identity and rankings
- [Admin app](product/admin/README.md) — internal controls and manual licensing
- [Vocabulary](../product-terms.md)
- [Open decisions](product/open-decisions.md) — unresolved details, not implementation defaults

## Reading order

Product READMEs define audience and scope. Module READMEs own business rules. Their `flow/` documents explain journeys and exception paths. Open decisions can be resolved during focused design; they do not require another broad discovery interview.

Product language uses **Queue**, **Queue Session**, and **Queue Master**. The legacy `Que` spelling is not used anywhere, including code. Every term is defined in [product terms](../product-terms.md).

## Older material

The old apps, their docs, and their OpenSpecs were removed during the October 2026 reset; they live only in git history. No old feature (MMR, EXP, peer reviews, Umpire, tournaments, Facebook login) becomes a v1 requirement because it once had a document, model, or screen. For **what currently runs**, only the code proves it.
