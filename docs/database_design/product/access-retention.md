# Access, privacy, and retention

**Status:** Proposed enforcement design for confirmed v1 boundaries.

## Principals and readable data

| Principal | Allowed data/operations | Explicit exclusions |
|---|---|---|
| Public visitor | Safe player profile/rank projection; eligible global leaderboard; session Details/Participants; explicitly published result slides | Phones, emails, claim links, raw sync logs, private Off Day, operator controls, cost estimates, inventory |
| Registered player | Own account and permitted personal fields | Editing phone/email directly, games, results, local assessments, calculated rank |
| Club account | Own club's permitted operational data, inventory, and cost estimates under a valid entitlement; active-session completion exception | Other clubs' private rosters, inventory, or estimates; hidden phones; arbitrary edits to claimed personal data; terminal result edits |
| Platform owner | License/configuration operations and approved identity changes | Editing confirmed winners/scores or reconstructing lost results |
| Internal worker | Narrow projection, retention, or allocation task | General public exposure or bypass of finalization eligibility |

Public visibility never means exposing raw `players` joins or downloading private contacts with the roster. Use explicit response allowlists. Email remains private; social visibility awaits a product decision.

## Server and Supabase boundary

All business writes use authenticated server route handlers/services, following the repository's canonical write path. Do not create new Server Actions or realtime channels for this design.

Proposal: place private operational/contact tables outside publicly exposed schemas where practical. If exposed through Supabase's Data API, enable RLS with policies matching the actual club/player/admin scope. A server DB connection with elevated privileges still requires service-layer authorization; RLS must not be claimed to protect a connection that bypasses it.

Supabase documents the need to configure row access and the difference in default view behavior in its [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security). Choose narrow views/DTOs deliberately; do not assume a view automatically inherits all source restrictions. Never authorize from player-editable identity metadata.

## Hidden phone numbers and offline copies

Registered players can hide phones from operators. Public roster/download packages exclude private contacts. Pending operator-entered contact data is private intake, not a second public copy of a profile's phone.

Resolve phone/ID/QR on the server and return only the information permitted to that operator. Cache a stable player ID and permitted display fields, not hidden contact values.

When privacy changes, future downloads and refreshed caches must redact the value. A disconnected device cannot be remotely forced to forget data already seen; offline-cache retention/purge must be specified without claiming impossible immediate revocation.

## License expiry

`club_entitlements` determines current access; an active session's start authorization identifies the narrow finish/sync exception. An expired login must not receive general historical reports just because a particular session is allowed to finish.

Server access can be blocked immediately at expiry. A disconnected device cannot be remotely locked with certainty. Use scoped cached entitlement/start authorization and define clock/reconnection rules before implementing offline starts.

## Public-page deletion

`club_expiry_cycles` records an expiry start, deletion deadline, and cancellation. Publications point at the applicable cycle. On renewal, cancel that cycle and restore retained pages. A later expiry creates a new cycle.

A deletion worker locks/rechecks the current entitlement and exact expiry-cycle ID before deletion; a job queued before renewal cannot delete renewed pages. Delete the public page projection and related publicly served assets, not `player_match_facts`, player IDs, rank evidence, or internal session identity. Cache/CDN invalidation and generated exports need explicit cleanup steps.

Off Day exports stay private until explicitly authorized for sharing. Do not store all slides at guessable public asset URLs and rely only on hiding the link.

The policy for internal club data, historical exports held by users, and public-page restoration after actual deletion remains open. No automated club-wide purge is authorized by the six-month rule.
