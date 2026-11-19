package signedin

import (
	"math"
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// adminPasswordResets is GET /api/password-reset-requests: the Admin's review list, 25 to a page, from the recovery
// service (readPasswordResetRequests). The page is Number(?page ?? 1), so ” is 0 and 'abc' is NaN: both invalid, as
// is anything outside 1..100000 or not a whole number.
func (s *server) adminPasswordResets() http.Handler {
	run := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		page := 1.0
		if raw, found := publicreads.QueryValue(r.URL.RawQuery, "page"); found {
			page = publicreads.JSToNumber(raw)
		}
		if math.IsNaN(page) || math.IsInf(page, 0) || page != math.Trunc(page) || page < 1 || page > 100000 {
			s.write(w, r, &serviceError{code: httpapi.ErrInvalid})
			return
		}
		body, err := s.resets.ReadRequests(r.Context(), int(page))
		if err != nil {
			s.write(w, r, err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	})
	return s.auth.Require(store.AudienceAdmin, session.ModeRead)(run)
}
