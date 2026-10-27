# Player Information data model

**Status:** Proposed design for [lean Player Information](../../../business_logic/product/player-information/README.md).

| Module | Owns |
|---|---|
| [Identity and RTR allocation](modules/identity.md) | Profiles independent of auth, private contacts, claiming, fixed IDs |
| [Assessments and rank](modules/ranking.md) | The nine skill levels, source evidence, rolling rank/eligibility |

Public profiles are projections, not direct reads of contact/account tables. A phone-linked unclaimed player is a real identity without a login. Name-only guests remain in the Queue product's club-player records.
