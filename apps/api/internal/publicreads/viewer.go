package publicreads

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The reads whose answer depends on who asks: the period leaderboards, the profile, the RTR ID lookup, the rank and
// the games of a player. A visitor and a signed-in Player share one handler per path; the sign-in layer puts the
// Principal in the request context when the pass is valid (session.Authenticator.Optional) and these handlers only
// look at it. Without one the viewer is a visitor.
//
// Their paths are also the Admin app's (/api/players/{playerId}, /games), so the signed-in layer registers them per
// app (internal/signedin) and a server with no sign-in uses RegisterVisitorOnly.

// ViewerReads are the handlers, ready to be mounted on a path. Each one already carries the public-read limit.
type ViewerReads struct {
	Leaderboard http.Handler // GET /api/leaderboard
	Search      http.Handler // GET /api/leaderboard/search
	// ClubLeaderboard is GET /api/clubs/{clubId}/leaderboard. The Queue app calls the Visitor ones: it cannot verify a Player sign-in, so
	// its viewer is always a visitor.
	ClubLeaderboard        http.Handler
	VisitorLeaderboard     http.Handler // GET /api/leaderboard for the Queue app
	VisitorClubLeaderboard http.Handler // GET /api/clubs/{clubId}/leaderboard for the Queue app
	Profile                http.Handler // GET /api/players/{playerId}
	FindByRTR              http.Handler // GET /api/rtr-ids/{rtrId}
	Rank                   http.Handler // GET /api/players/{playerId}/rank
	Games                  http.Handler // GET /api/players/{playerId}/games
	// ClubPage and RankingSettings are public, but Admin answers the same paths with its own reads, so the signed-in
	// layer routes them per app too.
	ClubPage        http.Handler // GET /api/clubs/{clubId}
	RankingSettings http.Handler // GET /api/ranking-settings
}

// viewerOf is the signed-in Player of a request, or a visitor.
func viewerOf(r *http.Request) viewerRef {
	p, ok := session.PrincipalFrom(r.Context())
	if !ok {
		return viewerRef{}
	}
	return viewerRef{id: pgtype.UUID{Bytes: p.AccountID, Valid: true}, ok: true}
}

// NewViewerReads builds the viewer-aware handlers.
func NewViewerReads(d Deps) *ViewerReads {
	d = d.withDefaults()
	lb := &leaderboard{pool: d.Pool, log: d.Logger, now: func() int64 { return d.Now().UnixMilli() }}
	pl := &players{pool: d.Pool, log: d.Logger, now: d.Now, approved: append([]string{}, d.ApprovedAlgorithms...)}
	cp := &clubPages{pool: d.Pool, log: d.Logger, now: d.Now}
	lib := &library{pool: d.Pool, log: d.Logger}
	limited := func(h http.HandlerFunc) http.Handler { return httpapi.RateLimit(d.Limiter, rateLimitMessage, h) }
	return &ViewerReads{
		ClubPage: limited(cp.page), RankingSettings: limited(lib.rankingSettings),
		Leaderboard: limited(lb.page), Search: limited(lb.search), ClubLeaderboard: limited(lb.clubPage),
		VisitorLeaderboard: limited(lb.visitorPage), VisitorClubLeaderboard: limited(lb.visitorClubPage),
		Profile: limited(pl.profile), FindByRTR: limited(pl.findByRTR), Rank: limited(pl.rank), Games: limited(pl.games),
	}
}

// RegisterVisitorOnly mounts the viewer-aware reads for a server that has no sign-in: every caller is a visitor.
func RegisterVisitorOnly(d Deps) func(*http.ServeMux) {
	v := NewViewerReads(d)
	return func(mux *http.ServeMux) {
		mux.Handle("GET /api/leaderboard", v.Leaderboard)
		mux.Handle("GET /api/leaderboard/search", v.Search)
		mux.Handle("GET /api/clubs/{clubId}/leaderboard", v.ClubLeaderboard)
		mux.Handle("GET /api/players/{playerId}", v.Profile)
		mux.Handle("GET /api/players/{playerId}/rank", v.Rank)
		mux.Handle("GET /api/players/{playerId}/games", v.Games)
		mux.Handle("GET /api/rtr-ids/{rtrId}", v.FindByRTR)
		mux.Handle("GET /api/clubs/{clubId}", v.ClubPage)
		mux.Handle("GET /api/ranking-settings", v.RankingSettings)
	}
}
