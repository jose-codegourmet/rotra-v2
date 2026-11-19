package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// POST /api/clubs/{clubId}/licenses, replayed against what the real Route Handler answered and left behind:
// testdata/licenses.golden.json is captured by apps/api/testdata/tools/capture-writes-clubs.test.mjs (group
// "licenses") from apps/admin/src/app/api/clubs/[clubId]/licenses/route.ts and activateLicense (Prisma), on a
// throwaway Postgres seeded with testdata/clubs.seed.sql, at the fixed instant of licenses.cases.json (or the case's
// own, for the month-end cases).
//
// Every case starts from that seed again. Each pins the answers (status, headers, body) and the rows: the license
// terms, the club entitlements (the projection), the expiry cycles, the public session pages retained under a cycle,
// the clubs (a club's price is never rewritten), the admin_audit_events (R1) and the player_notifications (a license
// sends none). Generated IDs are redacted by name; the audit event's term shows by its payment reference.
//
// Where Go answers differently on purpose the case has "goExpects": the Route Handler crashes with a 500 on a club ID
// that is no UUID, on a command ID Postgres refuses and on a paid-on text that is not a date; Go answers 404, 422 and
// 422. The deviations are in the plan's deviations log.
func TestLicenseWritesMatchRouteHandlers(t *testing.T) {
	writetest.Replay(t, "testdata", "licenses", build)
}
