package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// POST /api/clubs (A-ADD-CLUB, Create club), replayed against what the real Route Handler answered and left behind:
// testdata/clubs.golden.json is captured by apps/api/testdata/tools/capture-writes-clubs.test.mjs (group "clubs") from
// apps/admin/src/app/api/clubs/route.ts, stageClub and provisionClubAccount (Prisma), on a throwaway Postgres seeded with
// testdata/clubs.seed.sql, at the fixed instant of clubs.cases.json.
//
// The club login is the one thing the capture cannot run: it needs a live Supabase, so the capture replaces the provider
// call with one that answers a subject derived from the club (see the header of the capture file). Go has no provider:
// it makes the sign-in identity (auth_identities, argon2id) in the same transaction, so the account's auth_provider and
// auth_subject are not in the snapshot (only "has_subject" and the provisioned time are); clubs_test.go pins the
// identity, and signs the new club in.
//
// Every case starts from the seed again. Each pins the answers (status, headers, body), the clubs (name key, price,
// invite code format), the club accounts, the entitlements, the license terms (a new club has none), the
// admin_audit_events (R1: club.created, then club.account_provisioned) and the player_notifications. Generated IDs are
// redacted by name; the audit events show their club by name.
//
// Where Go answers differently on purpose the case has "goExpects": a missing or malformed command ID makes the Route
// Handler crash with a 500 (Prisma refuses it); Go answers 422 invalid. The deviations are in the plan's deviations log.
func TestAddClubMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "clubs", build)
}
