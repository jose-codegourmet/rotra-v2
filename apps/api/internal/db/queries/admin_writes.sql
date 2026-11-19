-- Admin writes (internal/adminwrites). Ports of packages/db/src/admin/*.ts. Every write runs in one transaction.

-- ---- the audit trail every Admin write appends to (admin/audit.ts recordAudit) ----

-- name: GetAdminAuditEventByCommand :one
-- Repeat-safe on the command: the event a command id already recorded.
SELECT id, action, target_type, target_id FROM admin_audit_events WHERE source_command_id = $1;

-- name: InsertAdminAuditEvent :exec
-- Prisma stamps occurred_at with the application clock ($8), so Go does too.
INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, source_command_id, metadata, occurred_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- ---- feature flags (admin/configuration.ts createFeatureFlag, setFeatureFlag) ----

-- name: GetAdminFeatureFlag :one
-- One flag with the admins' display names (flagInclude). Read after LockFeatureFlag, the lock is already held.
SELECT f.key, f.name, f.description, f.value, f.created_at, f.updated_at, f.revision,
       cb.display_name AS created_by_name, ub.display_name AS updated_by_name
FROM feature_flags f
LEFT JOIN admin_accounts cb ON cb.id = f.created_by_admin_id
LEFT JOIN admin_accounts ub ON ub.id = f.updated_by_admin_id
WHERE f.key = $1;

-- name: LockFeatureFlag :one
-- setFeatureFlag takes the row lock first, so two switches of one flag run one after the other.
SELECT key FROM feature_flags WHERE key = $1 FOR UPDATE;

-- name: ListFeatureFlagIdentities :many
-- The names and keys a new flag must not repeat. The TypeScript has no order; the key is unique.
SELECT key, name FROM feature_flags ORDER BY key;

-- name: InsertFeatureFlag :exec
-- Prisma stamps created_at (@default(now())) and updated_at (@updatedAt) with the application clock ($6), both the same.
INSERT INTO feature_flags (key, name, description, value, created_by_admin_id, updated_by_admin_id, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $5, $6, $6);

-- name: SetFeatureFlagValue :exec
UPDATE feature_flags
SET value = $2, updated_by_admin_id = $3, updated_at = $4, revision = revision + 1
WHERE key = $1;
