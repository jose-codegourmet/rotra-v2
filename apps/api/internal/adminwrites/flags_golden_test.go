package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The feature flag writes, replayed against what the real Route Handlers answered and left behind:
// testdata/flags.golden.json is captured by apps/api/testdata/tools/capture-writes-admin.test.mjs, which runs
// apps/admin/src/app/api/feature-flags/route.ts and [key]/route.ts and the real @rotra/db services (Prisma) on a
// throwaway Postgres seeded with testdata/admin.seed.sql, at the fixed instant of flags.cases.json.
//
// Every case starts from that seed again. Each pins the answers (status, headers, body), the feature_flags rows,
// the admin_audit_events (R1: the same audit events as today) and the player_notifications (a flag write sends none).
// Rows that show who won a race, which is not decided, are redacted by name in the case (see "redact" in the cases).
//
// Where Go answers differently on purpose, the case has "goExpects" (the Route Handler crashes with a 500 on a
// command id Postgres refuses; Go answers 422 invalid; and a former or unknown admin is 401 here, 403 there, as in
// the Admin reads). The deviations are in the plan's deviations log.
func TestFeatureFlagWritesMatchRouteHandlers(t *testing.T) {
	writetest.Replay(t, "testdata", "flags", build)
}
