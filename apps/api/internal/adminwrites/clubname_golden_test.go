package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// PATCH /api/clubs/{clubId} (A-REQUESTS, the name change review), replayed against what the real Route Handler answered
// and left behind: testdata/clubname.golden.json is captured by apps/api/testdata/tools/capture-writes-clubs.test.mjs
// (group "clubname") from apps/admin/src/app/api/clubs/[clubId]/route.ts and reviewClubNameChange (Prisma), on a
// throwaway Postgres seeded with testdata/clubs.seed.sql, at the fixed instant of clubname.cases.json.
//
// Every case starts from that seed again. Each pins the answers (status, headers, body), the clubs (name, name key,
// revision), the club_name_change_requests, the admin_audit_events (R1) and the player_notifications (a review sends
// none). The route takes no revision: its conflict is the pending request ID not matching, and an unknown club is
// that same conflict, not a 404.
//
// Where Go answers differently on purpose the case has "goExpects": a club ID of 36 hex digits or dashes that is no
// UUID makes the Route Handler crash with a 500; Go answers 404, as the directory read does.
func TestClubNameReviewMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "clubname", build)
}
