package adminwrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The Admin contact-change and password-reset writes, replayed against what the real Route Handlers answered and left
// behind. The golden files are captured by apps/api/testdata/tools/capture-writes-contacts.test.mjs, which runs
// apps/admin/src/app/api/contact-change-requests/** and password-reset-requests/** and the real @rotra/db services (Prisma) on
// a throwaway Postgres seeded with testdata/contacts.seed.sql (cut and extended by gen-writes-admin-contact-cases.py), at the
// fixed instant of the cases files.
//
// Every case starts from that seed again. Each pins the answers (status, headers, body) and the rows the write left behind:
// the contact-change requests (every column the steps write), the private contacts, the accounts' sync state, the logins (the
// provider: see contacts_apply.go), the Admin's email edits, the Admin audit events (R1: the same audit events as today), the
// player notifications and, for a reset, the requests and whether each holds a link. A generated ID, token or digest is
// redacted by name in the cases file, never by its shape. Where Go answers differently on purpose the case has "goExpects"
// (a former or unknown admin is 401 here and 403 in the Route Handler, as everywhere in the Admin writes); the deviations are in
// the plan's deviations log.
//
// Not in the golden files, because the capture cannot do it or the two sides differ on purpose, and so tested in
// contacts_test.go and resets_test.go: a concurrent decision, a phone read back that was not set first, a reset issued twice at
// once (the TypeScript refuses the second inside a 60 second lease; Go has no lease), an identity that is unusable, and the
// provider's failures the TypeScript can have and Go cannot.

// TestResetReviewMatchesRouteHandler is POST /api/password-reset-requests/{requestId}.
func TestResetReviewMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "resetreview", build)
}

// TestContactCreateMatchesRouteHandler is POST /api/contact-change-requests.
func TestContactCreateMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "contactcreate", build)
}

// TestContactDecideMatchesRouteHandler is POST /api/contact-change-requests/{requestId}/{approve|decline|check|retry}.
func TestContactDecideMatchesRouteHandler(t *testing.T) {
	writetest.Replay(t, "testdata", "contactdecide", build)
}
