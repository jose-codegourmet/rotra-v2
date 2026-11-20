package queuewrites

import (
	"context"
	"crypto/rand"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The signed-in Player's writes on a public Queue Session (packages/db/src/queue/public-session.ts and the Route Handlers of
// apps/player/src/app/api/public-sessions/[slug]/*): request to join as NAME, cancel the request, I'm here, I'm leaving, I can't make
// it and the Session invite. The Queue session page calls them from the paired Queue origin with a JSON body, so each route checks the
// origin and the content type first, answers the CORS preflight, and only then the pass (the Player app, write mode) and the Google
// deadline gate. A Player is identified by the pass only; the roster link proves they are in the session.

const (
	joinRequestsStarted    = "The session has started, so online join requests are closed."
	slotsFullText          = "All slots are taken. Join the waitlist instead."
	maxPendingRequests     = 60
	inviteCodeAlphabet     = "abcdefghjkmnpqrstuvwxyz23456789"
	inviteCodeLength       = 8
	inviteCodeAttempts     = 5
	notOnTheRosterText     = "Only confirmed players in this session can do this."
	requestAlreadySentText = "Your request is already sent."
)

func (s *server) registerPublicSession(rt *signedin.Router) {
	routes := map[string]writes.Command{
		"join":        s.joinSession,
		"cancel":      s.cancelJoinRequest,
		"check-in":    s.selfCheckIn,
		"leave":       s.leaveSession,
		"drop-out":    s.sendDropOut,
		"invite-code": s.sessionInviteCode,
	}
	for action, cmd := range routes {
		path := "/api/public-sessions/{slug}/" + action
		rt.Handle("POST "+path, store.AudiencePlayer, s.fromQueueOrigin(s.player(cmd)))
		rt.Handle("OPTIONS "+path, store.AudiencePlayer, http.HandlerFunc(s.preflight))
	}
}

// player is handleAccountRequest('player', ...) for a write: the pass check in write mode, then the Google deadline gate (none of these
// routes passes allowWithoutGoogle), then the command.
func (s *server) player(cmd writes.Command) http.Handler {
	gated := func(r *http.Request, p session.Principal) (writes.Result, error) {
		required, err := signedin.GoogleRequired(r.Context(), s.pool, s.now, playerOf(p))
		if err != nil {
			return writes.Result{}, err
		}
		if required {
			return writes.Result{}, writes.Fail(httpapi.ErrForbidden, map[string]string{"google": signedin.GoogleRequiredMessage})
		}
		return cmd(r, p)
	}
	return s.auth.Require(store.AudiencePlayer, session.ModeWrite)(writes.Handle(s.log, gated))
}

func playerOf(p session.Principal) pgtype.UUID { return pgtype.UUID{Bytes: p.AccountID, Valid: true} }

// corsWriter adds the CORS headers of the paired Queue origin to every response and makes it vary by Origin as well as the cookie.
type corsWriter struct {
	http.ResponseWriter
	origin  string
	allowed bool
}

func (c *corsWriter) WriteHeader(status int) {
	h := c.Header()
	h.Set("Vary", "Origin, Cookie")
	if c.allowed {
		h.Set("Access-Control-Allow-Origin", c.origin)
		h.Set("Access-Control-Allow-Credentials", "true")
	}
	c.ResponseWriter.WriteHeader(status)
}

func (c *corsWriter) cors(r *http.Request, origins []string) {
	c.origin = r.Header.Get("Origin")
	c.allowed = c.origin != "" && slices.Contains(origins, c.origin)
}

// forbidden is the 403 of the guard: no message, and no CORS headers unless the origin is the paired one.
func (c *corsWriter) forbidden() {
	h := c.Header()
	h.Set("Cache-Control", "private, no-store")
	h.Set("Content-Type", "application/json")
	c.WriteHeader(http.StatusForbidden)
	_, _ = c.Write([]byte(`{"error":{"code":"forbidden"}}`))
}

// fromQueueOrigin is queueCorsHeaders and the JSON check of these Route Handlers: only the paired Queue origin may call, and a JSON body
// forces the preflight, so a call that is not JSON is refused. The Go API cannot check that the Queue origin is paired with the Player
// origin it was called on (the TypeScript compares the two); it allows the configured Queue origins.
func (s *server) fromQueueOrigin(inner http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cw := &corsWriter{ResponseWriter: w}
		cw.cors(r, s.queueOrigins)
		if !cw.allowed || !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			cw.forbidden()
			return
		}
		inner.ServeHTTP(cw, r)
	})
}

// preflight is the OPTIONS of the JSON POSTs: the paired Queue origin only.
func (s *server) preflight(w http.ResponseWriter, r *http.Request) {
	cw := &corsWriter{ResponseWriter: w}
	cw.cors(r, s.queueOrigins)
	if !cw.allowed {
		cw.forbidden()
		return
	}
	h := cw.Header()
	h.Set("Cache-Control", "private, no-store")
	h.Set("Access-Control-Allow-Methods", "POST")
	h.Set("Access-Control-Allow-Headers", "Content-Type")
	h.Set("Access-Control-Max-Age", "600")
	cw.WriteHeader(http.StatusNoContent)
}

// pageSession is the session behind a public link (findUnique by publicSlug, no publication check); an unknown link is not found.
type pageSession struct{ id, club pgtype.UUID }

func (s *server) sessionOfSlug(r *http.Request) (pageSession, error) {
	row, err := sqlcgen.New(s.pool).GetSessionOfSlug(r.Context(), r.PathValue("slug"))
	if errors.Is(err, pgx.ErrNoRows) {
		return pageSession{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return pageSession{id: row.ID, club: row.ClubID}, err
}

// inPageSession is lockSession for a Player command: the session row is locked with no club entitlement check (the Player is not the
// club), and a database error maps as the command's catch does when mapped is true.
func (s *server) inPageSession(r *http.Request, ps pageSession, mapped bool, change func(t *txn) (any, error)) (any, error) {
	out, err := s.lockedSession(r.Context(), ps.club, ps.id.String(), false, change)
	if mapped && err != nil {
		return nil, mapDatabaseError(err)
	}
	return out, err
}

func conflict(field, text string) error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{field: text})
}

func invalid(field, text string) error {
	return writes.Fail(httpapi.ErrInvalid, map[string]string{field: text})
}

// slotsFull is slotsFull: before the start, the live roster is at the slot budget. During play the Queue Master can admit more.
func (t *txn) slotsFull() (bool, error) {
	if t.sess.State == sqlcgen.QueueSessionStateActive {
		return false, nil
	}
	count, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return false, err
	}
	capacity, err := t.capacityOf()
	return int64(count) >= capacity, err
}

// ownEntryOf is ownEntry: the signed-in Player's live roster entry in the session.
func (t *txn) ownEntryOf(player pgtype.UUID) (sqlcgen.GetOwnLiveEntryOfPlayerRow, error) {
	e, err := t.q.GetOwnLiveEntryOfPlayer(t.ctx, sqlcgen.GetOwnLiveEntryOfPlayerParams{SessionID: t.sess.ID, PlayerID: player})
	if errors.Is(err, pgx.ErrNoRows) {
		return e, invalid("player", notOnTheRosterText)
	}
	return e, err
}

// joinAnswer is what a join answers: the request made (null when a club member was placed right away) and the toast.
type joinAnswer struct {
	RequestID    *string `json:"requestId"`
	ClubPlayerID *string `json:"clubPlayerId,omitempty"`
	Message      string  `json:"message"`
}

// joinSession is POST join: Request to join as NAME (D-2026-11-09-02). A club member on a prepared session that takes requests and does not
// always require one is placed right away (D-2026-11-12-02), with the saved level, like a confirmed request: no request row. Anyone else
// sends a request that never reserves a slot. A body that is not JSON answers 422 here; the Route Handler throws outside its handler (a 500
// from Next), and reads the body before the pass, where Go checks the pass first.
func (s *server) joinSession(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	// typeof body.placement === 'string' ? body.placement : null, then `?? 'slot'`.
	placement := "slot"
	if v, ok := body["placement"].(string); ok {
		placement = v
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	if placement != "slot" && placement != "waitlist" && placement != "from_waitlist" {
		return writes.Result{}, invalid("placement", "Pick Join a slot or Be waitlisted.")
	}
	player := playerOf(p)
	requestID := randomID()
	var joined *joinAnswer
	_, err = s.inPageSession(r, ps, false, func(t *txn) (any, error) {
		cur := t.sess
		switch {
		case cur.State == sqlcgen.QueueSessionStateCancelled:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": "This session is cancelled."})
		case cur.State == sqlcgen.QueueSessionStateActive:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": joinRequestsStarted})
		case cur.State != sqlcgen.QueueSessionStatePrepared || !cur.AcceptJoinRequests:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": "This session is not taking requests."})
		}
		standing, err := signedin.StandingOf(t.ctx, t.q, player, t.sess.ID)
		if errors.Is(err, signedin.ErrNoSuchPlayer) {
			return nil, writes.Fail(httpapi.ErrForbidden, nil)
		}
		if err != nil {
			return nil, err
		}
		if standing.RequestPending {
			return nil, conflict("request", requestAlreadySentText)
		}
		full, err := t.slotsFull()
		if err != nil {
			return nil, err
		}
		var member *sqlcgen.ClubPlayer
		var memberLevel pgtype.Int2
		if placement != "from_waitlist" && !cur.AlwaysRequireRequest {
			if member, memberLevel, err = t.memberOf(player); err != nil {
				return nil, err
			}
		}
		if member != nil {
			if standing.InSession {
				return nil, conflict("request", "You're already in this session.")
			}
			placed, err := t.place(*member, memberLevel, requestID.String(), t.stamp(), placement == "waitlist" || full, false)
			if err != nil {
				return nil, err
			}
			touched, err := t.touch()
			if err != nil {
				return nil, err
			}
			if _, err := t.recomputeMinimum(touched); err != nil {
				return nil, err
			}
			id := member.ID.String()
			message := "You're in"
			if placed.Waitlist != nil {
				message = "You're on the waitlist"
			}
			joined = &joinAnswer{ClubPlayerID: &id, Message: message}
			return nil, nil
		}
		// D-2026-11-11-02: Join from waitlist, only for a waitlisted Player while a slot is open.
		switch {
		case placement == "from_waitlist":
			if !standing.WaitlistClubPlayerID.Valid {
				if standing.InSession {
					return nil, conflict("request", "You're already in this session.")
				}
				return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": "Only waitlisted players can ask to join from the waitlist."})
			}
			if full {
				return nil, conflict("request", "All slots are taken. You keep your place on the waitlist.")
			}
		case standing.InSession:
			return nil, conflict("request", "You're already in this session.")
		case placement == "slot" && full:
			return nil, conflict("placement", slotsFullText)
		}
		pending, err := t.q.CountPendingJoinRequests(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		if pending >= maxPendingRequests {
			return nil, writes.Fail(httpapi.ErrUnavailable, map[string]string{"request": "Too many requests are waiting. Try again later."})
		}
		profile, err := t.q.GetStandingPlayer(t.ctx, player)
		if err != nil {
			return nil, err
		}
		band, err := t.bandFor(player)
		if err != nil {
			return nil, err
		}
		waitlisted := pgtype.UUID{}
		if placement == "from_waitlist" {
			waitlisted = standing.WaitlistClubPlayerID
		}
		return nil, t.q.InsertPlayerJoinRequest(t.ctx, sqlcgen.InsertPlayerJoinRequestParams{
			ID: requestID, ClubID: t.sess.ClubID, SessionID: t.sess.ID, PlayerID: player, Name: profile.FullName, Nickname: profile.Nickname,
			StatedBand: sqlcgen.StatedBand(band), Placement: sqlcgen.JoinRequestPlacement(placement), ClubPlayerID: waitlisted, Now: t.stamp(),
		})
	})
	if err != nil {
		if writes.IsUniqueViolation(err) {
			return writes.Result{}, conflict("request", requestAlreadySentText)
		}
		return writes.Result{}, err
	}
	if joined != nil {
		return writes.Result{Body: joined}, nil
	}
	id := requestID.String()
	message := "Request sent"
	if placement == "from_waitlist" {
		message = "Slot requested"
	}
	return writes.Result{Body: joinAnswer{RequestID: &id, Message: message}}, nil
}

// memberOf is memberOf (D-2026-11-12-02): the Player's current saved record in the club and its playing level, the latest club
// assessment of that record. None when the Player is not saved in the club, or the record has no level yet.
func (t *txn) memberOf(player pgtype.UUID) (*sqlcgen.ClubPlayer, pgtype.Int2, error) {
	cp, err := t.q.GetClubPlayerOfPlayer(t.ctx, sqlcgen.GetClubPlayerOfPlayerParams{ClubID: t.sess.ClubID, PlayerID: player})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && cp.RemovedAt.Valid) {
		return nil, pgtype.Int2{}, nil
	}
	if err != nil {
		return nil, pgtype.Int2{}, err
	}
	level, err := t.q.GetLatestClubAssessmentLevel(t.ctx, sqlcgen.GetLatestClubAssessmentLevelParams{ClubID: t.sess.ClubID, ClubPlayerID: cp.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgtype.Int2{}, nil
	}
	return &cp, pgtype.Int2{Int16: level, Valid: true}, err
}

// bandFor is bandFor: the Player's latest club level as a stated band, for a one-tap request; unsure without one.
func (t *txn) bandFor(player pgtype.UUID) (string, error) {
	id, err := t.q.GetLatestLevelOfPlayerInClub(t.ctx, sqlcgen.GetLatestLevelOfPlayerInClubParams{ClubID: t.sess.ClubID, PlayerID: player})
	if errors.Is(err, pgx.ErrNoRows) || !id.Valid || int(id.Int16) >= len(levels) {
		return "unsure", nil
	}
	band, _, _ := strings.Cut(levels[id.Int16], "_")
	switch band {
	case "beginner", "intermediate", "advanced":
		return band, nil
	}
	return "unsure", nil
}

// cancelJoinRequest is POST cancel: the Player's own pending request becomes cancelled. It runs no transaction and takes no lock; the
// update is guarded on pending, so a request the Queue Master decided meanwhile is never overwritten.
func (s *server) cancelJoinRequest(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	q := sqlcgen.New(s.pool)
	decided := writes.Fail(httpapi.ErrConflict, map[string]string{"request": "This join request has already been decided."})
	pending, err := q.GetPendingJoinRequestOfPlayer(r.Context(), sqlcgen.GetPendingJoinRequestOfPlayerParams{SessionID: ps.id, PlayerID: playerOf(p)})
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, decided
	}
	if err != nil {
		return writes.Result{}, err
	}
	n, err := q.CancelPendingJoinRequest(r.Context(), sqlcgen.CancelPendingJoinRequestParams{Now: s.stamp(), ID: pending})
	if err != nil {
		return writes.Result{}, err
	}
	if n == 0 {
		return writes.Result{}, decided
	}
	return writes.Result{Body: map[string]string{"requestId": pending.String(), "message": "Request cancelled"}}, nil
}

// rosterAnswer is what check-in and leave answer.
type rosterAnswer struct {
	RosterID string `json:"rosterId"`
	Message  string `json:"message"`
}

// selfCheckIn is POST check-in (D-2026-11-09-03), live sessions only: the Player's own roster entry becomes Present with the "checked in
// themselves" mark. Refused while the club has self check-in off, and for anyone without a live entry. A tap while already present is a 409.
func (s *server) selfCheckIn(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		if err := requireState(t.sess, "Check-in opens when the session starts.", sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		on, err := t.q.GetClubSelfCheckIn(t.ctx, t.sess.ClubID)
		if err != nil {
			return nil, err
		}
		if !on {
			return nil, invalid("player", "Your club has turned self check-in off.")
		}
		entry, err := t.ownEntryOf(playerOf(p))
		if err != nil {
			return nil, err
		}
		if entry.Present {
			return nil, conflict("player", "You're already marked present.")
		}
		if err := t.q.SelfCheckInEntry(t.ctx, sqlcgen.SelfCheckInEntryParams{Now: t.stamp(), ID: entry.ID}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return rosterAnswer{RosterID: entry.ID.String(), Message: "Checked in"}, nil
	})
	return writes.Result{Body: out}, err
}

// leaveSession is POST leave (D-2026-11-09-03), live sessions only: the entry turns Present off with the "Left" mark and every open match
// request that names them closes. It never releases the slot, and it is allowed with self check-in off.
func (s *server) leaveSession(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		if err := requireState(t.sess, "Only a live session can be left.", sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		entry, err := t.ownEntryOf(playerOf(p))
		if err != nil {
			return nil, err
		}
		if !entry.Present {
			return nil, conflict("player", "You're not marked present.")
		}
		now := t.stamp()
		if err := t.q.LeaveEntry(t.ctx, sqlcgen.LeaveEntryParams{Now: now, ID: entry.ID}); err != nil {
			return nil, err
		}
		if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: now, SessionID: t.sess.ID}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return rosterAnswer{RosterID: entry.ID.String(), Message: "Told the QM you're leaving"}, nil
	})
	return writes.Result{Body: out}, err
}

// sendDropOut is POST drop-out (D-2026-11-09-03), before the start only: the Player's own entry gets an open drop-out notice for the Queue
// Master. The slot stays until the Queue Master acts. A Player with an open notice already gets a 409.
func (s *server) sendDropOut(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		if t.sess.State != sqlcgen.QueueSessionStatePrepared {
			return nil, invalid("state", "The session has already started.")
		}
		entry, err := t.ownEntryOf(playerOf(p))
		if err != nil {
			return nil, err
		}
		_, err = t.q.GetOpenDropOutNoticeOfEntry(t.ctx, entry.ID)
		if err == nil {
			return nil, conflict("player", "Told the QM you can't make it")
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		id := randomID()
		if err := t.q.InsertDropOutNotice(t.ctx, sqlcgen.InsertDropOutNoticeParams{
			ID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, SessionPlayerID: entry.ID, PlayerID: playerOf(p), Now: t.stamp(),
		}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return map[string]string{"noticeId": id.String(), "message": "Told the QM you can't make it"}, nil
	})
	return writes.Result{Body: out}, err
}

// newSessionInviteCode is makeInviteCode: a random 8-character Session invite code, never the RTR ID (modulo bias as in the original).
func newSessionInviteCode() (string, error) {
	b := make([]byte, inviteCodeLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i, v := range b {
		b[i] = inviteCodeAlphabet[int(v)%len(inviteCodeAlphabet)]
	}
	return string(b), nil
}

// sessionInviteCode is POST invite-code (D-2026-11-09-08): the Player's code for this session, made the first time and the same on every
// later call. Only a confirmed or waitlisted Player, only while the session is Prepared and takes join requests. A taken code or a
// parallel first call is retried, each try in its own transaction.
func (s *server) sessionInviteCode(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	for range inviteCodeAttempts {
		var code string
		err := writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
			sess, err := q.GetQueueSession(ctx, ps.id)
			if err != nil {
				return err
			}
			if sess.State != sqlcgen.QueueSessionStatePrepared {
				return invalid("state", "Invites close when the session starts.")
			}
			if !sess.AcceptJoinRequests {
				return invalid("state", "This session is not taking requests.")
			}
			_, entryErr := q.GetOwnLiveEntryOfPlayer(ctx, sqlcgen.GetOwnLiveEntryOfPlayerParams{SessionID: ps.id, PlayerID: player})
			if entryErr != nil && !errors.Is(entryErr, pgx.ErrNoRows) {
				return entryErr
			}
			_, waitErr := q.GetWaitlistEntryOfPlayer(ctx, sqlcgen.GetWaitlistEntryOfPlayerParams{SessionID: ps.id, PlayerID: player})
			if waitErr != nil && !errors.Is(waitErr, pgx.ErrNoRows) {
				return waitErr
			}
			if entryErr != nil && waitErr != nil {
				return invalid("player", "Only confirmed or waitlisted players can invite.")
			}
			saved, err := q.GetSessionInviteCodeOfPlayer(ctx, sqlcgen.GetSessionInviteCodeOfPlayerParams{SessionID: ps.id, PlayerID: player})
			if err == nil {
				code = saved
				return nil
			}
			if !errors.Is(err, pgx.ErrNoRows) {
				return err
			}
			fresh, err := newSessionInviteCode()
			if err != nil {
				return err
			}
			code, err = q.InsertSessionInviteCode(ctx, sqlcgen.InsertSessionInviteCodeParams{
				ID: randomID(), ClubID: sess.ClubID, SessionID: ps.id, PlayerID: player, Code: fresh, Now: s.stamp(),
			})
			return err
		})
		if err == nil {
			return writes.Result{Body: map[string]string{"code": code}}, nil
		}
		// A taken code or a parallel first call: try again (the retry reads the saved code).
		if writes.IsUniqueViolation(err) {
			continue
		}
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{}, writes.Fail(httpapi.ErrConflict, nil)
}
