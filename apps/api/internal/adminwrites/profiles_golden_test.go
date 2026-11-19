package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The profile banner and profile character writes (show and hide, delete, restore, make default), replayed against
// what the real Route Handlers answered and left behind: testdata/profiles.golden.json is captured by
// apps/api/testdata/tools/capture-writes-profiles.test.mjs, which runs apps/admin/src/app/api/profile-banners/** and
// profile-characters/** and the real @rotra/db services (Prisma) on a throwaway Postgres seeded with
// testdata/profiles.seed.sql, at the fixed instant of profiles.cases.json. The two upload routes are not covered
// (the pictures track owns them).
//
// Every case starts from that seed again. Each pins the answers (status, headers, body), the profile_banners and
// profile_characters rows (shown, deleted_at, is_default), the admin_audit_events (R1: the same audit events as
// today) and the player_notifications (these writes send none). The races are of one banner or image at once, whose
// answers do not depend on who wins; the races whose answers do are in profiles_race_test.go.
//
// Where Go answers differently on purpose the case has "goExpects": a former or unknown admin is 401 here and 403 in
// the Route Handler, as in the Admin reads. The deviations are in the plan's deviations log.
func TestProfileLibraryWritesMatchRouteHandlers(t *testing.T) {
	writetest.Replay(t, "testdata", "profiles", build)
}
