package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// POST /api/ranking-settings, replayed against what the real Route Handler answered and left behind:
// testdata/ranking.golden.json is captured by apps/api/testdata/tools/capture-writes-clubs.test.mjs (group
// "ranking") from apps/admin/src/app/api/ranking-settings/route.ts and saveRankingPolicy (Prisma), on a throwaway
// Postgres seeded with testdata/clubs.seed.sql, at the fixed instant of ranking.cases.json.
//
// Every case starts from that seed again. Each pins the answers (status, headers, body), the ranking_policy_versions
// rows, the admin_audit_events (R1) and the player_notifications (a save sends none). The version's ID and the audit
// event's ID and target are generated and are redacted by name; "target_is_a_version" pins that the event's target
// is the new version. In the race case the rows that show who won are redacted by name.
//
// Where Go answers differently on purpose, the case has "goExpects": a missing or malformed command ID makes the
// Route Handler crash with a 500 (Prisma refuses it); Go answers 422 invalid. A former or unknown admin is 401 here,
// 403 there, as in the Admin reads. The deviations are in the plan's deviations log.
func TestRankingSettingsWritesMatchRouteHandlers(t *testing.T) {
	writetest.Replay(t, "testdata", "ranking", build)
}
