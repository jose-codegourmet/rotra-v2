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
- [Vocabulary](product/glossary.md)
- [Open decisions](product/open-decisions.md) — unresolved details, not implementation defaults

## Reading order

Product READMEs define audience and scope. Module READMEs own business rules. Their `flow/` documents explain journeys and exception paths. Open decisions can be resolved during focused design; they do not require another broad discovery interview.

New product language uses **Queue**, **Queue Session**, and **Queue Master**. Older `Que` spellings are legacy; this documentation change does not rename code.

## Existing docs and OpenSpec

For the **new target product**, this tree supersedes conflicting earlier business intent. For **what currently runs**, inspect code and applicable OpenSpec requirements/status. Neither these documents nor the existence of a spec prove a feature is shipped.

Historical reference, not the new v1 scope:

- [Old combined Client app](client_app/README.md)
- [Old Admin app](admin_app/README.md)
- [Old Umpire app](umpire_app/README.md)
- [Old combined business overview](../business_logic.md)

No old feature becomes a v1 requirement just because it has a document, model, mock screen, or spec. Code changes and replacement implementation specifications are separate work.
