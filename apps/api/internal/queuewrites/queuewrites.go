// Package queuewrites serves the Queue app's POST, PATCH, PUT and DELETE routes that moved from the Next.js Route
// Handlers (apps/queue/src/app/api/**/route.ts and packages/db/src/queue/*.ts). Each route keeps the contract of the
// handler it replaces: same path, JSON shape, status codes, error envelope and cache headers, and the same rows,
// notifications and revision checks in the database.
//
// Every route runs behind the club pass check in write mode and through writes.Handle. A command on one Queue Session runs
// in one transaction that locks the session row first (session.go: inSession, rosterCommand), so writes to one session
// queue and writes to different sessions do not wait on each other.
//
// # What is shared (the helpers the later slices build on)
//
//	server.club           the club pass check + writes.Handle for a command that gets the club's ID
//	server.inSession      lock the club's session, check access (entitlement, or an active session a license term started)
//	server.rosterCommand  inSession + the open states + close stale match requests + revision bump + minimum recompute
//	server.lockedSession  inSession with the access check optional (create, edit, start and delete check the entitlement before the transaction)
//	server.inClub         one transaction on the club with no session (venues, settings, saved players); server.entitled is the check before it
//	txn.reload, txn.touch the session as stored now, and touchSession: the session queries return no row (pgx cannot scan an enum array)
//	requireRevision       the expected-revision check of a command (409 conflict, or 422 for a revision that is no number)
//	requireState          the session state check (422 invalid with the field state)
//	derivedID             a stable UUID derived from an operation id, for the extra rows one command writes
//	parseOperationID      the operation id as Postgres reads a uuid; a malformed one is 404
//	place, promoteWaiter, assessEntry, createClubPlayer, clubPlayerForProfile, resolveEmail
//	                      the roster building blocks (roster_*.go); the batch and the single-operation routes both call them
//	stepDownIn, liveEntry, requireLiveCourt, retireEntryIfOrphan, signedin.SessionOf / CourtOf / VenueOf
//	                      what the match and money slices reuse (Move to waitlist for a signed-in Player, the court helpers, the DTOs)
//
// The idempotency of a command is not one table: each command repeats safely in its own way, as the TypeScript does. An
// admission keys on club_assessments.source_operation_id and on rows whose ID is derived from the operation id, a request
// decision on the request's status. A retry therefore recomputes its answer (it can differ from the first), and it still
// bumps the session revision, because rosterCommand always does.
package queuewrites

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Deps is what the Queue writes are built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Auth checks the access pass of each request; it comes from the sign-in session service.
	Auth *session.Authenticator
	// Logger may be nil: then nothing is logged.
	Logger *slog.Logger
	// Now is the clock the rows are stamped with (Prisma stamps created and updated times with the application clock) and
	// the notification texts and entitlement checks read. Nil is time.Now.
	Now func() time.Time
	// QueueOrigins are the exact Queue app origins that may call the Player routes of a public session (ROTRA_QUEUE_ORIGINS).
	QueueOrigins []string
	// VisitorReceiptSecret is ROTRA_VISITOR_RECEIPT_SECRET: the key of the visitor's join request receipt. Empty leaves the visitor routes answering
	// 503 where they need it, as the Route Handlers do. It is never logged.
	VisitorReceiptSecret string
	// PlayerSignOut is the Player app's sign-out (signin.SignOut with the player app): the sign-out route of a public Queue Session
	// runs it after its origin and content type checks. Nil leaves that route (and its preflight) unregistered.
	PlayerSignOut http.Handler
}

type server struct {
	pool *pgxpool.Pool
	auth *session.Authenticator
	log  *slog.Logger
	now  func() time.Time
	// queueOrigins are the origins the Player routes of a public session answer to.
	queueOrigins []string
	// visitorSecret is Deps.VisitorReceiptSecret.
	visitorSecret string
	// playerSignOut is Deps.PlayerSignOut.
	playerSignOut http.Handler
}

// Routes returns what registers the Queue writes on the shared signedin router (signedin.Deps.Routes).
func Routes(d Deps) (func(*signedin.Router), error) {
	if d.Pool == nil || d.Auth == nil {
		return nil, errors.New("queuewrites: routes need a pool and an authenticator")
	}
	s := &server{pool: d.Pool, auth: d.Auth, log: d.Logger, now: d.Now, queueOrigins: d.QueueOrigins, visitorSecret: d.VisitorReceiptSecret, playerSignOut: d.PlayerSignOut}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	return s.registerRoutes, nil
}

// registerRoutes adds the Queue app's writes (X-Rotra-App club). A path that another app answers too is routed per app.
func (s *server) registerRoutes(rt *signedin.Router) {
	s.registerRosterBatch(rt)
	s.registerRosterOps(rt)
	s.registerSessionPrep(rt)
	s.registerCourts(rt)
	s.registerClubWrites(rt)
	s.registerJoinRequests(rt)
	s.registerMatchRequests(rt)
	s.registerCourtFill(rt)
	s.registerDropOuts(rt)
	s.registerClubPlayerDetails(rt)
	s.registerPublicSession(rt)
	s.registerMatchControl(rt)
	s.registerMatchQueue(rt)
	s.registerSessionFinish(rt)
	s.registerResultsPublication(rt)
	s.registerInventory(rt)
	s.registerPayments(rt)
	s.registerFinalization(rt)
	s.registerVisitor(rt)
	s.registerHosts(rt)
}

// at is `new Date()`: the clock in milliseconds.
func (s *server) at() time.Time { return s.now().Truncate(time.Millisecond) }

// stamp is the clock as Prisma writes it.
func (s *server) stamp() pgtype.Timestamptz { return pgtype.Timestamptz{Time: s.at(), Valid: true} }

// club is handleAccountRequest('club', ...) for a write: the pass check in write mode, then the command with the club's ID.
func (s *server) club(cmd func(r *http.Request, club pgtype.UUID) (writes.Result, error)) http.Handler {
	run := func(r *http.Request, p session.Principal) (writes.Result, error) {
		return cmd(r, pgtype.UUID{Bytes: p.AccountID, Valid: true})
	}
	return s.auth.Require(store.AudienceClub, session.ModeWrite)(writes.Handle(s.log, run))
}

// DriveFinalization returns what GET finalization runs before it reads: the projection jobs of a committed Session done (signedin.Deps.DriveFinalization).
func DriveFinalization(d Deps) (func(ctx context.Context, club, session pgtype.UUID), error) {
	if d.Pool == nil || d.Auth == nil {
		return nil, errors.New("queuewrites: the drive needs a pool and an authenticator")
	}
	s := &server{pool: d.Pool, auth: d.Auth, log: d.Logger, now: d.Now}
	if s.log == nil {
		s.log = slog.New(slog.DiscardHandler)
	}
	if s.now == nil {
		s.now = time.Now
	}
	return s.DriveFinalization, nil
}
