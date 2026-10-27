# Queue data model

**Status:** Proposed logical schema for [Queue business rules](../../../business_logic/product/queue/README.md).

| Module | Records and responsibilities |
|---|---|
| [Sessions and roster](modules/sessions-roster.md) | Club-local players, guest identity, presence, locked levels, session/court setup |
| [Matches and shared queue](modules/matches-queue.md) | Waiting order, protection, participants/substitutions, court occupancy, permanent outcomes |
| [Offline sync](modules/offline-sync.md) | Device logs, acknowledgements, missing-record detection, conflict quarantine |
| [Results and publication](modules/results-publication.md) | Finalized facts, local standings/awards, sharing and deletion separation |
| [Financials and inventory](modules/financials-inventory.md) | Optional session cost estimate, shuttle plan, club inventory |

Local device tables mirror only downloaded operational rows and retain a durable outbox. Global ranks, account credentials, and private contacts are not blindly replicated to devices. Server canonical records and pending device operations have separate validity states.
