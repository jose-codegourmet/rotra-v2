package queuewrites

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The Queue visitor's routes (apps/queue/src/app/api/public-sessions/[slug]/{join-request,my-request}/route.ts, receipt-cookie.ts and
// packages/db/src/queue/public-session.ts sendJoinRequest, readMyJoinRequest). A visitor has no account: they own their request by holding its
// receipt, an HMAC of the request id under a server secret (ROTRA_VISITOR_RECEIPT_SECRET, proposal pending #248), kept in an httpOnly, same-site
// cookie that only this slug's public-session routes receive. No receipt is stored in the database, and the secret is never logged.
//
// The routes are registered for the Queue app whether or not the secret is set, as the Route Handlers are: with no secret the TypeScript answers
// 503 (unavailable) where it needs one (receiptFor), after it has checked the body and the slug.

const (
	receiptCookieName   = "rotra_join_request"
	visitorSessionClose = "This session is cancelled."
	visitorNotTaking    = "This session is not taking requests."
	maxPendingVisitor   = maxPendingRequests
)

var (
	bands = []string{"beginner", "intermediate", "advanced", "unsure"}
	// requestUUID is the UUID test of public-session.ts: hyphenated, either case.
	requestUUID = strictUUID
)

func (s *server) registerVisitor(rt *signedin.Router) {
	rt.Handle("POST /api/public-sessions/{slug}/join-request", store.AudienceClub, http.HandlerFunc(s.visitorJoin))
	rt.Handle("GET /api/public-sessions/{slug}/my-request", store.AudienceClub, http.HandlerFunc(s.visitorMine))
}

// receiptFor is receiptFor: HMAC-SHA256 of "join-request:<id>" under the secret, base64url without padding. With no secret it is unavailable.
func (s *server) receiptFor(requestID string) (string, error) {
	if s.visitorSecret == "" {
		return "", writes.Fail(httpapi.ErrUnavailable, nil)
	}
	mac := hmac.New(sha256.New, []byte(s.visitorSecret))
	mac.Write([]byte("join-request:" + requestID))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

// receiptMatches is receiptMatches: the same length, then a constant-time comparison.
func (s *server) receiptMatches(requestID, receipt string) (bool, error) {
	if receipt == "" {
		return false, nil
	}
	expected, err := s.receiptFor(requestID)
	if err != nil {
		return false, err
	}
	return len(expected) == len(receipt) && subtle.ConstantTimeCompare([]byte(expected), []byte(receipt)) == 1, nil
}

// receiptCookie is receiptCookie as Next writes it: the value is <requestId>.<receipt>, the path is this slug's routes, httpOnly, SameSite lax,
// and Secure in production. Next's attribute order is Path, Secure, HttpOnly, SameSite. Go knows it is in production by the request being https
// (the apps forward the scheme), where the TypeScript reads NODE_ENV.
func receiptCookie(r *http.Request, slug, requestID, receipt string) string {
	c := receiptCookieName + "=" + url.QueryEscape(requestID+"."+receipt) + "; Path=/api/public-sessions/" + url.PathEscape(slug)
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		c += "; Secure"
	}
	return c + "; HttpOnly; SameSite=lax"
}

// cookieValue is cookies().get(name)?.value of Next: the Cookie header split on "; *", the value decoded with decodeURIComponent (a pair that
// does not decode is skipped), and the last of several cookies of one name wins.
func cookieValue(r *http.Request, name string) (string, bool) {
	header := strings.Join(r.Header.Values("Cookie"), ", ")
	var value string
	var found bool
	for _, pair := range regexp.MustCompile(`; *`).Split(header, -1) {
		if pair == "" {
			continue
		}
		key, raw, hasValue := strings.Cut(pair, "=")
		decoded := "true"
		if hasValue {
			plain, err := url.PathUnescape(raw)
			if err != nil || !utf8.ValidString(plain) {
				continue
			}
			decoded = plain
		}
		if key == name {
			value, found = decoded, true
		}
	}
	return value, found
}

// visitorAnswer is myRequestDto.
type visitorAnswer struct {
	RequestID        string `json:"requestId"`
	Name             string `json:"name"`
	Status           string `json:"status"`
	WaitlistPosition *int   `json:"waitlistPosition"`
	Placement        string `json:"placement"`
}

// myRequestDto: a confirmed request that holds a saved player shows that player's place on the waitlist, when they are on it.
func (s *server) myRequestDto(q *sqlcgen.Queries, r *http.Request, id, session, clubPlayer pgtype.UUID, name, status, placement string) (visitorAnswer, error) {
	out := visitorAnswer{RequestID: id.String(), Name: name, Status: status, Placement: placement}
	if status != "confirmed" || !clubPlayer.Valid {
		return out, nil
	}
	rows, err := q.ListQueueWaitlist(r.Context(), session)
	if err != nil {
		return out, err
	}
	for i, w := range signedin.OrderedWaitlist(rows) {
		if w.ClubPlayerID == clubPlayer {
			position := i + 1
			out.WaitlistPosition = &position
			break
		}
	}
	return out, nil
}

func (s *server) writeVisitor(w http.ResponseWriter, r *http.Request, body any, cookie string, err error) {
	if err != nil {
		writes.Write(w, r, s.log, err)
		return
	}
	if cookie != "" {
		w.Header().Add("Set-Cookie", cookie)
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
}

// visitorJoin is POST join-request, Q-PUBLIC-JOIN Request to join. `requestId` is generated once per open sheet, so a retry with the same fields
// returns the same request. Prepared sessions with requests on only; it never reserves a slot (only the Queue Master's confirmation places the
// player). The receipt goes only in the cookie, never in the body.
func (s *server) visitorJoin(w http.ResponseWriter, r *http.Request) {
	body, cookie, err := s.sendJoinRequest(r)
	s.writeVisitor(w, r, body, cookie, err)
}

func (s *server) sendJoinRequest(r *http.Request) (any, string, error) {
	slug := r.PathValue("slug")
	in, err := writes.ReadBody(r)
	if err != nil {
		return nil, "", err
	}
	requestText := in.Text("requestId")
	if !requestUUID.MatchString(requestText) {
		return nil, "", writes.Fail(httpapi.ErrInvalid, nil)
	}
	// A placement that is not text reads as missing: a slot (D-2026-11-11-02).
	placement := "slot"
	if p, ok := in["placement"].(string); ok {
		placement = p
	}
	if placement != "slot" && placement != "waitlist" {
		return nil, "", writes.Fail(httpapi.ErrInvalid, map[string]string{"placement": "Pick Join a slot or Be waitlisted."})
	}
	name := jsTrim(in.Text("name"))
	if name == "" {
		return nil, "", writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter your name."})
	}
	band := in.Text("statedBand")
	if !slices.Contains(bands, band) {
		return nil, "", writes.Fail(httpapi.ErrInvalid, map[string]string{"statedBand": "Choose a level."})
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return nil, "", err
	}
	receipt, err := s.receiptFor(requestText)
	if err != nil {
		return nil, "", err
	}
	id, _ := writes.ParseUUID(requestText)
	nickname := pgtype.Text{}
	if n, ok := in["nickname"].(string); ok {
		if trimmed := jsTrim(n); trimmed != "" {
			nickname = pgtype.Text{String: trimmed, Valid: true}
		}
	}
	var answer visitorAnswer
	_, err = s.inPageSession(r, ps, false, func(t *txn) (any, error) {
		existing, err := t.q.GetVisitorJoinRequest(t.ctx, id)
		switch {
		case err == nil:
			if existing.SessionID != t.sess.ID || existing.Name != name {
				return nil, writes.Fail(httpapi.ErrConflict, nil)
			}
			answer, err = s.myRequestDto(t.q, r, existing.ID, existing.SessionID, existing.ClubPlayerID, existing.Name, existing.Status, existing.Placement)
			return nil, err
		case !errors.Is(err, pgx.ErrNoRows):
			return nil, err
		}
		// A cancelled session's page shows Cancelled and takes no requests.
		switch {
		case t.sess.State == sqlcgen.QueueSessionStateCancelled:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": visitorSessionClose})
		case t.sess.State == sqlcgen.QueueSessionStateActive:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": joinRequestsStarted})
		case t.sess.State != sqlcgen.QueueSessionStatePrepared || !t.sess.AcceptJoinRequests:
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"request": visitorNotTaking})
		}
		// D-2026-11-11-02: players cannot join a slot while every slot is taken; the waitlist remains.
		if placement == "slot" {
			full, err := t.slotsFull()
			if err != nil {
				return nil, err
			}
			if full {
				return nil, conflict("placement", slotsFullText)
			}
		}
		pending, err := t.q.CountPendingJoinRequests(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		if pending >= maxPendingVisitor {
			return nil, writes.Fail(httpapi.ErrUnavailable, map[string]string{"request": "Too many requests are waiting. Try again later."})
		}
		if err := t.q.InsertVisitorJoinRequest(t.ctx, sqlcgen.InsertVisitorJoinRequestParams{
			ID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, Name: name, Nickname: nickname, StatedBand: sqlcgen.StatedBand(band),
			Placement: sqlcgen.JoinRequestPlacement(placement), Now: t.stamp(),
		}); err != nil {
			return nil, err
		}
		answer = visitorAnswer{RequestID: id.String(), Name: name, Status: "pending", Placement: placement}
		return nil, nil
	})
	if err != nil {
		if writes.IsUniqueViolation(err) {
			return nil, "", writes.Fail(httpapi.ErrConflict, nil)
		}
		return nil, "", err
	}
	return answer, receiptCookie(r, slug, id.String(), receipt), nil
}

// visitorMine is GET my-request, Q-PUBLIC My request: this browser's own request on the slug, or null when it holds no receipt. A receipt that no
// longer matches (another slug, an unknown id) also reads as null. A request id that is no UUID cannot be a request: the TypeScript crashes on
// it (a 500) once the receipt matches, and Go answers null, as for an unknown id.
func (s *server) visitorMine(w http.ResponseWriter, r *http.Request) {
	body, err := s.readMine(r)
	s.writeVisitor(w, r, body, "", err)
}

func (s *server) readMine(r *http.Request) (any, error) {
	value, _ := cookieValue(r, receiptCookieName)
	parts := strings.Split(value, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, nil
	}
	requestText, receipt := parts[0], parts[1]
	match, err := s.receiptMatches(requestText, receipt)
	if err != nil {
		return nil, err
	}
	if !match {
		return nil, nil
	}
	id, ok := writes.ParseUUID(requestText)
	if !ok {
		return nil, nil
	}
	q := sqlcgen.New(s.pool)
	req, err := q.GetVisitorJoinRequest(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && req.PublicSlug != r.PathValue("slug") {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return s.myRequestDto(q, r, req.ID, req.SessionID, req.ClubPlayerID, req.Name, req.Status, req.Placement)
}
