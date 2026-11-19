-- Admin writes of the ranking settings (internal/adminwrites/ranking.go). Port of saveRankingPolicy in
-- packages/db/src/admin/configuration.ts.

-- name: LockRankingPolicyVersions :exec
-- The advisory lock saveRankingPolicy takes. The key is the TypeScript's, so a Go save and a Next.js save of the
-- same moment run one after the other.
SELECT pg_advisory_xact_lock(hashtext('ranking_policy_versions'));

-- name: GetLatestRankingPolicy :one
-- The newest version (findFirst orderBy version desc). The version is unique.
SELECT version, algorithm_version FROM ranking_policy_versions ORDER BY version DESC LIMIT 1;

-- name: InsertRankingPolicy :exec
-- Prisma stamps created_at with the application clock, and effective_at is that same instant ($3).
INSERT INTO ranking_policy_versions (id, version, effective_at, assessment_weight_bp, performance_weight_bp,
  recent_standard_match_threshold, algorithm_version, created_by_admin_id, change_note, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3);

-- name: GetAdminRankingPolicyByID :one
-- One version with the admin's display name (include createdBy). The id is text: an audit event of another kind of
-- target has a target id that is no UUID, and that is an unexpected error in the TypeScript, as here.
SELECT v.id, v.version, v.effective_at, v.assessment_weight_bp, v.performance_weight_bp,
       v.recent_standard_match_threshold, v.algorithm_version, v.change_note, v.created_at,
       a.display_name AS created_by_name
FROM ranking_policy_versions v
LEFT JOIN admin_accounts a ON a.id = v.created_by_admin_id
WHERE v.id::text = @id::text;
