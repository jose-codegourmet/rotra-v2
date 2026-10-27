# Admin data model

**Status:** Proposed design for [Admin business rules](../../../business_logic/product/admin/README.md).

| Module | Responsibility |
|---|---|
| [Club accounts and licensing](modules/clubs-licenses.md) | One club credential, terms, access projection, expiry cycles |
| [Configuration and player requests](modules/configuration-requests.md) | Versioned weights/threshold, feature flags, contact approvals, audit |

Admin application privileges do not include changing confirmed scores/winners, reverting invalid matches, or reconstructing lost session data. Do not inherit every old moderation/analytics table into the new v1 design.
