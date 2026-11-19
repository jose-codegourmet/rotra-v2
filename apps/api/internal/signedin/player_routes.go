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
}
