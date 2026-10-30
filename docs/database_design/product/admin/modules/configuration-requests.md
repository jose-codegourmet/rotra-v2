# Configuration, contact requests, and audit

**Status:** Proposed data design for agreed Admin controls.

## `ranking_policy_versions`

Fields: UUID/version PK; effective time; assessment/performance weights in basis points; recent-standard-match threshold; algorithm-version reference; creator admin; creation time; change note.

Checks: weights each between 0 and 10000, sum 10000; match threshold a whole number from 1 to 40 (product owner, October 30, 2026). Initial values 7000, 3000, and 10.

Versions are append-only so results explain which configuration produced them. Whether changes recompute past/current ranks immediately or apply prospectively remains open. Three months and the five-prior-club-session award requirement are not automatically additional editable controls.

## `feature_flags`

Proposed minimal record: stable key PK (`^[a-z][a-z0-9_]{2,39}$`, immutable once created); unique name (up to 50 characters); description; boolean value (default false); revision; created-by/updated-by admin and times. Flags are created by the platform owner in Admin (October 27, 2026); the table starts empty. No "affects" column: the description says what a flag does. Do not add audience targeting, billing tiers, or arbitrary JSON execution rules without a feature-flag specification.

Downloaded sessions need the relevant approved settings version. How flag changes affect an already-offline session is unresolved; a DB update cannot guarantee immediate remote application.

## `player_contact_change_requests`

Fields: UUID PK; player FK; requested field phone/email; protected proposed normalized value; original contact revision; requested time; status pending/approved/applying/applied/rejected/failed; reviewer admin/time; provider-operation idempotency reference; resolution note.

The exact request UI/verification requirements are open. Separate **approval** from successful application, because updating the auth provider and PostgreSQL is not one atomic transaction.

Application design:

1. Verify approval and unchanged original contact revision.
2. Check/reserve uniqueness for the proposed identifier, including provider constraints.
3. Apply provider change idempotently; coordinate a recoverable staged update of the private contact row.
4. Mark applied only when provider login and application identity agree. On failure, retain a retryable state, not a success message.
5. Keep the player's UUID/RTR ID and history unchanged.

Players cannot write contact rows directly or bypass this process through generic profile editing. Password-reset flows remain separate from contact changes.

## `admin_audit_events`

UUID PK; actor admin FK; action; target type/ID; source command ID; timestamp; redacted before/after metadata. Append-only application access. Index actor/time and target/time for review.

Do not log passwords, raw claim/reset tokens, or unnecessary contact values. Club actions identify club account/device elsewhere; shared credentials cannot prove the human operator's identity.

Business sources: [configuration](../../../../business_logic/product/admin/modules/configuration/README.md), [player management](../../../../business_logic/product/admin/modules/player-management/README.md).
