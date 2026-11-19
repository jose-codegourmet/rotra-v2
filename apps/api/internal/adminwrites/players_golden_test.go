package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The Admin player writes, replayed against what the real Route Handlers answered and left behind. The golden files are
// captured by apps/api/testdata/tools/capture-writes-players.test.mjs, which runs apps/admin/src/app/api/players/** and
// the real @rotra/db services (Prisma) on a throwaway Postgres seeded with testdata/players.seed.sql (cut and extended
// by gen-writes-admin-players-cases.py), at the fixed instant of the cases files.
//
// Every case starts from that seed again. Each pins the answers (status, headers, body) and the rows the write left
// behind: players, their private contacts and accounts, social links, RTR ID allocations, counters and shared entries,
// the club records and their private intake, the contact-change requests, the email edits, the admin audit events (R1:
// the same audit events as today) and the player notifications. Where Go answers differently on purpose the case has
// "goExpects" (a former or unknown admin is 401 here and 403 in the Route Handler, as in the Admin reads); the
// deviations are in the plan's deviations log.

// TestPlayerVerificationMatchesRouteHandler is PATCH /api/players/{playerId}/verification.
func TestPlayerVerificationMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "playerverify", build)
}

// TestPlayerAddMatchesRouteHandler is POST /api/players (Add player).
func TestPlayerAddMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "playercreate", build)
}

// TestPlayerEditMatchesRouteHandler is PATCH /api/players/{playerId} (Edit): the profile, phone, links and picture, the
// RTR ID and the records that hold it, the email and the password of a registered player, and an unclaimed person's
// shared entry. The provider calls of the Edit route are mocked in the capture (see capture-writes-players.test.mjs); the
// Go side has the sign-in identity of each account (testdata/players.seed.sql) and changes it for real.
func TestPlayerEditMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "playeredit", build)
}
