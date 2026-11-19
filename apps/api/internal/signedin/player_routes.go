package signedin

import "github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"

// registerPlayer adds the Player app's signed-in reads. Their paths belong to the Player app alone, so any
// other app gets the generic 404 for them, as it does today.
func (s *server) registerPlayer(rt *Router) {
	player := store.AudiencePlayer
	rt.Handle("GET /api/me/account", player, s.myAccount())
	rt.Handle("GET /api/me/clubs", player, s.myClubs())
	rt.Handle("GET /api/me/notifications", player, s.myNotifications())
	rt.Handle("GET /api/me/notifications/unread-count", player, s.myUnreadCount())
	rt.Handle("GET /api/me/sessions", player, s.mySessions())
	rt.Handle("GET /api/me/sessions/{sessionId}/share", player, s.myShareSession())
	rt.Handle("GET /api/invites/{clubId}", player, s.invite())
	rt.Handle("GET /api/me/verification", player, s.myVerification())
	rt.Handle("GET /api/account/contact-change", player, s.myContactChange())
	rt.Handle("GET /api/me/profile", player, s.myProfile())
	rt.Handle("GET /api/leaderboard/me", player, s.myLeaderboard())
	rt.Handle("GET /api/rtr-ids/{rtrId}/stats", player, s.rtrStats())
	// The reads a visitor may make too share their paths with the Admin app, so they are routed per app. The viewer
	// is the signed-in Player when the pass is valid and a visitor otherwise.
	optional := s.auth.Optional(player)
	rt.Handle("GET /api/leaderboard", player, optional(s.viewer.Leaderboard))
	rt.Handle("GET /api/leaderboard/search", player, optional(s.viewer.Search))
	rt.Handle("GET /api/players/{playerId}", player, optional(s.viewer.Profile))
	rt.Handle("GET /api/players/{playerId}/rank", player, optional(s.viewer.Rank))
	rt.Handle("GET /api/players/{playerId}/games", player, optional(s.viewer.Games))
	rt.Handle("GET /api/rtr-ids/{rtrId}", player, optional(s.viewer.FindByRTR))
}
