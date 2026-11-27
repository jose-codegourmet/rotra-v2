package liveupdates

import (
	"net/http"
	"strings"
)

// Kinds are what an event says changed. A screen invalidates only the queries that kind touches (live-updates R3); a
// kind it does not know means "re-read everything". Plain text in the table (B-45): a new kind needs no migration.
const (
	KindSession      = "session"      // the session's details, state, start, end, cancel, delete, create
	KindRoster       = "roster"       // roster, waitlist, presence, levels, no shows, drop-out notices
	KindCourts       = "courts"       // courts and early opening
	KindQueue        = "queue"        // matches, the queue and Auto Queue
	KindRequests     = "requests"     // join requests and match requests
	KindPayments     = "payments"     // payment marks and amounts
	KindResults      = "results"      // published results
	KindFinalization = "finalization" // Session done and its result projection
	KindClub         = "club"         // club settings, venues, invite, license
	KindPlayers      = "players"      // saved players and club membership
	KindInventory    = "inventory"    // the club's inventory
)

// Route says what a write route tells the screens, or why it tells them nothing.
type Route struct {
	// Kind is the kind of the event the route's writes add (see the constants above). Empty with a Skip.
	Kind string
	// Skip is the reason a route adds no event: it changes nothing a live screen shows, or it is not done yet and is listed
	// as left out.
	Skip string
	// Left marks a Skip that is a gap and not a decision: a write that changes what a screen shows but has no event yet.
	Left bool
	// Replay marks a route that answers 2xx and writes nothing when its command was already applied (Create session with
	// the same command id), so an answer with no event is no gap. The write-test audit allows it for this route only.
	Replay bool
}

const (
	noScreen      = "changes nothing another screen shows (the caller's own settings or sign-in)"
	noClubProfile = "a player's picture, nickname or visibility shows on rosters, directories and club pages of every club they are in; one event needs one club, so it waits for the club-less decision"
	noClub        = "changes a platform-wide or club-less thing; an event needs a club (club_id is NOT NULL in the approved table), owner decision needed"
)

func skip(reason string) Route  { return Route{Skip: reason} }
func left(reason string) Route  { return Route{Skip: reason, Left: true} }
func kind(k string) Route       { return Route{Kind: k} }
func replayable(k string) Route { return Route{Kind: k, Replay: true} }

// routes classifies every write route of the signed-in routers by "<app> <pattern>". The audit test fails when a registered
// write route, or a write pattern in the source, is missing here, so no write is forgotten.
var routes = map[string]Route{
	// ---- Queue app (club)
	"club POST /api/sessions":                                                  replayable(KindSession),
	"club PATCH /api/sessions/{sessionId}":                                     kind(KindSession),
	"club DELETE /api/sessions/{sessionId}":                                    kind(KindSession),
	"club POST /api/sessions/{sessionId}/start":                                kind(KindSession),
	"club POST /api/sessions/{sessionId}/cancel":                               kind(KindSession),
	"club POST /api/sessions/{sessionId}/end":                                  kind(KindSession),
	"club POST /api/sessions/{sessionId}/extend":                               kind(KindSession),
	"club POST /api/sessions/{sessionId}/invalid":                              kind(KindSession),
	"club POST /api/sessions/{sessionId}/courts":                               kind(KindCourts),
	"club PATCH /api/sessions/{sessionId}/courts/{courtId}":                    kind(KindCourts),
	"club DELETE /api/sessions/{sessionId}/courts/{courtId}":                   kind(KindCourts),
	"club POST /api/sessions/{sessionId}/courts/open-early":                    kind(KindCourts),
	"club POST /api/sessions/{sessionId}/courts/{courtId}/open-early":          kind(KindCourts),
	"club DELETE /api/sessions/{sessionId}/courts/{courtId}/open-early":        kind(KindCourts),
	"club POST /api/sessions/{sessionId}/court-fill":                           kind(KindQueue),
	"club PATCH /api/sessions/{sessionId}/court-fill":                          kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches":                              kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/auto":                         kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/regenerate":                   kind(KindQueue),
	"club PATCH /api/sessions/{sessionId}/matches/{matchId}":                   kind(KindQueue),
	"club DELETE /api/sessions/{sessionId}/matches/{matchId}":                  kind(KindQueue),
	"club POST /api/sessions/{sessionId}/back-to-preparation":                  kind(KindSession),
	"club PATCH /api/sessions/{sessionId}/courts/order":                        kind(KindCourts),
	"club POST /api/sessions/{sessionId}/matches/clear":                        kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/almost-done":        kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/pause":              kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/swap-from-match":    kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/switch-sides":       kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/trade-courts":       kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/invalid":            kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/move":               kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/place":              kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/position":           kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/replace":            kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/result":             kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/send-back":          kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/start":              kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/substitution":       kind(KindQueue),
	"club POST /api/sessions/{sessionId}/matches/{matchId}/swap":               kind(KindQueue),
	"club POST /api/sessions/{sessionId}/match-requests/{requestId}/add":       kind(KindRequests),
	"club POST /api/sessions/{sessionId}/match-requests/{requestId}/decline":   kind(KindRequests),
	"club POST /api/sessions/{sessionId}/roster":                               kind(KindRoster),
	"club POST /api/sessions/{sessionId}/roster/batch":                         kind(KindRoster),
	"club PATCH /api/sessions/{sessionId}/roster/games":                        kind(KindRoster),
	"club DELETE /api/sessions/{sessionId}/roster/{rosterId}":                  kind(KindRoster),
	"club POST /api/sessions/{sessionId}/roster/{rosterId}/level":              kind(KindRoster),
	"club POST /api/sessions/{sessionId}/roster/{rosterId}/no-show":            kind(KindRoster),
	"club DELETE /api/sessions/{sessionId}/roster/{rosterId}/no-show":          kind(KindRoster),
	"club POST /api/sessions/{sessionId}/roster/{rosterId}/waitlist":           kind(KindRoster),
	"club DELETE /api/sessions/{sessionId}/waitlist/{waitlistId}":              kind(KindRoster),
	"club POST /api/sessions/{sessionId}/waitlist/fill":                        kind(KindRoster),
	"club POST /api/sessions/{sessionId}/waitlist/{waitlistId}/slot":           kind(KindRoster),
	"club POST /api/sessions/{sessionId}/presence":                             kind(KindRoster),
	"club POST /api/sessions/{sessionId}/requests/drop-outs/{noticeId}/keep":   kind(KindRoster),
	"club POST /api/sessions/{sessionId}/requests/drop-outs/{noticeId}/remove": kind(KindRoster),
	"club POST /api/join-requests/{requestId}/confirm":                         kind(KindRequests),
	"club POST /api/join-requests/{requestId}/decline":                         kind(KindRequests),
	"club POST /api/public-sessions/{slug}/join-request":                       kind(KindRequests),
	"club POST /api/sessions/{sessionId}/payments":                             kind(KindPayments),
	"club POST /api/sessions/{sessionId}/payments/amount":                      kind(KindPayments),
	"club POST /api/sessions/{sessionId}/payments/mark-all":                    kind(KindPayments),
	"club POST /api/sessions/{sessionId}/results/publication":                  kind(KindResults),
	"club POST /api/sessions/{sessionId}/finalization":                         kind(KindFinalization),
	"club POST /api/club/trusted-hosts":                                        kind(KindClub),
	"club DELETE /api/club/trusted-hosts/{clubPlayerId}":                       kind(KindClub),
	"club POST /api/sessions/{sessionId}/hosts":                                kind(KindSession),
	"club DELETE /api/sessions/{sessionId}/hosts/{clubPlayerId}":               kind(KindSession),
	"club PATCH /api/club":                                                     kind(KindClub),
	"club POST /api/club/invite":                                               kind(KindClub),
	"club POST /api/venues":                                                    kind(KindClub),
	"club POST /api/club/players":                                              kind(KindPlayers),
	"club PATCH /api/club/players/{clubPlayerId}":                              kind(KindPlayers),
	"club DELETE /api/club/players/{clubPlayerId}":                             kind(KindPlayers),
	"club POST /api/club/players/{clubPlayerId}/move":                          kind(KindPlayers),
	"club PATCH /api/club/players/{clubPlayerId}/name":                         kind(KindPlayers),
	"club POST /api/club/name-change":                                          kind(KindClub),
	"club DELETE /api/club/name-change":                                        kind(KindClub),
	"club POST /api/club/players/{clubPlayerId}/club-nickname":                 kind(KindPlayers),
	"club POST /api/club/players/{clubPlayerId}/registration-link":             skip("issues a link; changes nothing a screen shows"),
	"club POST /api/inventory":                                                 kind(KindInventory),
	"club POST /api/inventory/{itemId}/stock":                                  kind(KindInventory),
	"club DELETE /api/inventory/{itemId}":                                      kind(KindInventory),

	// ---- Player app
	"player POST /api/public-sessions/{slug}/join":                 kind(KindRoster),
	"player POST /api/public-sessions/{slug}/cancel":               kind(KindRoster),
	"player POST /api/public-sessions/{slug}/step-down":            kind(KindRoster),
	"player POST /api/public-sessions/{slug}/check-in":             kind(KindRoster),
	"player POST /api/public-sessions/{slug}/leave":                kind(KindRoster),
	"player POST /api/public-sessions/{slug}/drop-out":             kind(KindRoster),
	"player POST /api/public-sessions/{slug}/match-request":        kind(KindRequests),
	"player POST /api/public-sessions/{slug}/match-request/cancel": kind(KindRequests),
	"player POST /api/public-sessions/{slug}/invite-code":          skip("makes the player's own invite code; changes nothing a screen shows"),
	"player POST /api/me/clubs":                                    kind(KindPlayers),
	"player DELETE /api/me/clubs/{clubId}":                         kind(KindPlayers),
	"player POST /api/me/gender":                                   left(noClubProfile),
	"player POST /api/me/onboarding-answers":                       left(noClubProfile),
	"player PATCH /api/me/profile":                                 left(noClubProfile),
	"player POST /api/me/profile-banner":                           left(noClubProfile),
	"player POST /api/me/profile-visibility":                       left(noClubProfile),
	"player POST /api/me/stats-visibility":                         left(noClubProfile),
	"player POST /api/me/directory-visibility":                     left(noClubProfile),
	"player POST /api/me/phone-privacy":                            left(noClubProfile),
	"player PATCH /api/me/notifications":                           skip(noScreen),
	"player PATCH /api/me/notifications/{notificationId}":          skip(noScreen),
	"player POST /api/account/contact-change":                      left(noClub),

	// ---- Admin app
	"admin POST /api/clubs":                                       kind(KindClub),
	"admin PATCH /api/clubs/{clubId}":                             kind(KindClub),
	"admin POST /api/clubs/{clubId}/licenses":                     kind(KindClub),
	"admin POST /api/feature-flags":                               left(noClub),
	"admin PATCH /api/feature-flags/{key}":                        left(noClub),
	"admin POST /api/ranking-settings":                            left(noClub),
	"admin POST /api/players":                                     left(noClub),
	"admin PATCH /api/players/{playerId}":                         left(noClub),
	"admin PATCH /api/players/{playerId}/verification":            left(noClub),
	"admin POST /api/contact-change-requests":                     left(noClub),
	"admin POST /api/contact-change-requests/{requestId}/approve": left(noClub),
	"admin POST /api/contact-change-requests/{requestId}/check":   left(noClub),
	"admin POST /api/contact-change-requests/{requestId}/decline": left(noClub),
	"admin POST /api/contact-change-requests/{requestId}/retry":   left(noClub),
	"admin POST /api/password-reset-requests/{requestId}":         left(noClub),
	"admin PATCH /api/profile-banners/{id}":                       left(noClub),
	"admin DELETE /api/profile-banners/{id}":                      left(noClub),
	"admin POST /api/profile-banners/{id}/default":                left(noClub),
	"admin POST /api/profile-banners/{id}/restore":                left(noClub),
	"admin PATCH /api/profile-characters/{id}":                    left(noClub),
	"admin DELETE /api/profile-characters/{id}":                   left(noClub),
	"admin POST /api/profile-characters/{id}/restore":             left(noClub),

	// ---- routes registered straight on the mux (sign-in, claim, registration, recovery): not on the signed-in router
	"- POST /api/auth/sign-in":             skip("sign-in; no screen shows it"),
	"- POST /api/auth/sign-out":            skip("sign-out; no screen shows it"),
	"- POST /api/auth/refresh":             skip("pass refresh; no screen shows it"),
	"- POST /api/auth/password-reset":      skip("asks for a reset; the Admin list of requests is club-less (see the Admin routes)"),
	"- POST /api/auth/reset-password":      skip("sets a new password; no screen shows it"),
	"- POST /api/auth/google/start":        skip("sign-in step; no screen shows it"),
	"- POST /api/auth/google/outcome":      skip("sign-in step; no screen shows it"),
	"- POST /api/auth/google/link":         skip(noScreen),
	"- POST /api/claim/{token}":            left("a player claims a saved profile: the club's saved players and roster change; the claim runs outside the signed-in router and needs its own Note"),
	"- POST /api/claim/{token}/google":     left("same as POST /api/claim/{token}"),
	"- POST /api/register/{clubId}":        left("a guest registers through a club or session link: the club's players and the session's requests change; needs its own Note"),
	"- POST /api/register/{clubId}/google": left("same as POST /api/register/{clubId}"),
	"- POST /api/register":                 left("registration from the Admin link: no club or session, but the clubs' saved players with the same phone or email join the account; needs its own Note"),
	"- POST /api/register/google":          left("same as POST /api/register"),
}

// Lookup finds the classification of a write route by app ("club", "player", "admin" or "-" for a route on the mux) and
// pattern such as "POST /api/sessions".
func Lookup(app, pattern string) (Route, bool) {
	r, ok := routes[app+" "+pattern]
	return r, ok
}

// Classified lists every classified route as "<app> <pattern>" (the audit test reads it).
func Classified() map[string]Route {
	out := make(map[string]Route, len(routes))
	for k, v := range routes {
		out[k] = v
	}
	return out
}

// IsWrite reports whether the pattern's method changes data.
func IsWrite(pattern string) bool {
	method, _, _ := strings.Cut(pattern, " ")
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	}
	return false
}

// Observation is what one classified write route did, for the audit hook.
type Observation struct {
	App, Pattern string
	Status       int
	// Appended is how many events the route's transactions added, and Transactions how many reached their commit.
	Appended, Transactions int
}

// Audit, when set (by tests only), sees every classified write route after it answered. The write-test harness uses it to
// fail a route that answered 2xx without telling the screens.
var Audit func(Observation)

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) { s.status = code; s.ResponseWriter.WriteHeader(code) }
func (s *statusWriter) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
func (s *statusWriter) Unwrap() http.ResponseWriter { return s.ResponseWriter }

// Scoped wraps the handler of a classified write route so what its commands note becomes events when they commit. A route
// that is not classified, or classified with a Skip, is returned unchanged.
func Scoped(app, pattern string, h http.Handler) http.Handler {
	r, ok := Lookup(app, pattern)
	if !ok || r.Kind == "" {
		return h
	}
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		ctx := WithScope(req.Context(), r.Kind)
		if Audit == nil {
			h.ServeHTTP(w, req.WithContext(ctx))
			return
		}
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		h.ServeHTTP(sw, req.WithContext(ctx))
		Audit(Observation{App: app, Pattern: pattern, Status: sw.status, Appended: scopeOf(ctx).appended(), Transactions: scopeOf(ctx).transactions()})
	})
}
