# ROTRA documentation

Start with the [v1 business logic](business_logic/README.md), based on the product reset agreed October 25, 2026.

These documents describe **target business behavior, not shipped functionality**. Queue is the priority; Player Information stays lean; Admin supports both. World is deferred to v2.

| Need | Read |
|---|---|
| Product boundaries | [Ecosystem overview](business_logic/product/README.md) |
| Feature rules | The relevant product's `modules/<module>/README.md` |
| Step-by-step journeys | That module's `flow/` directory |
| Unresolved details | [Open decisions](business_logic/product/open-decisions.md) |
| Proposed database records and relationships | [V1 database design](database_design/product/README.md) |
| Screen layouts, controls, states, and flows | [V1 screen specifications](screens/product/README.md) |
| Clickable Queue app prototype (agreed design reference, October 26, 2026) | [ROTRA Queue prototype](frames/queue-app/rotra-queue.html) — open in a browser |
| Clickable Player Information app prototype (design reference, October 26, 2026) | [ROTRA Players prototype](frames/player-app/rotra-player.html) — open in a browser; notes in its [README](frames/player-app/README.md) |
| Clickable Admin app prototype (design reference, October 27, 2026) | [ROTRA Admin prototype](frames/admin-app/rotra-admin.html) — open in a browser; notes in its [README](frames/admin-app/README.md) |
| Current implementation | Code and the requirements/status in [OpenSpec](../openspec/specs/) |
| Historical context | [Repository summary](REPO_SUMMARY.md), subject to its verification date and known drift |

## Structure

```text
docs/
  business_logic/
    README.md
    product/
      README.md
      glossary.md
      open-decisions.md
      queue/
        README.md
        modules/
          <module>/
            README.md
            flow/
              <journey>.md
      player-information/
        README.md
        modules/...
      admin/
        README.md
        modules/...
  database_design/
    product/
      README.md
      queue/modules/...
      player-information/modules/...
      admin/modules/...
  screens/
    README.md
    product/
      README.md
      navigation.md
      state-matrix.md
      dialogs.md
      coverage.md
      open-decisions.md
      experience-contract.md
      modules/
        README.md
        queue/...
        player-information/...
        admin/...
```

`product/` contains product boundaries, not a promise about repository app names or deployment architecture. Modules own their rules; flow documents explain journeys through those rules.

Older docs remain as reference. Their Facebook login, separate owner/Queue Master roles, umpire product, cost tracking, and previous ranking systems are not automatically v1 requirements. Existing OpenSpecs have not been rewritten to imply this reset is implemented.
