package recovery

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/netip"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// AppHeader names the app a request is for; the recovery routes answer "player" only.
const AppHeader = "X-Rotra-App"

// maxBody is far more than these bodies need (an email, or a token and a password); a larger body is refused.
const maxBody = 16 << 10

// limitMessage is the human text of the 429: no reset throttle copy exists in the screen docs, so the public
// reads' sentence is reused. Retry-After carries the real wait.
const limitMessage = "Too many requests. Try again in a minute."

// Routes registers the two public routes of the Player app: POST /api/auth/password-reset (P-FORGOT) and POST
// /api/auth/reset-password (P-RESET). They are not in the proxy guard's open list, so they answer 404 without the
// proxy secret (B-30). The Admin list and review routes are not registered here: signedin serves the list (ReadRequests)
// and adminwrites the review (Review), each behind the Admin pass check.
func (r *Recovery) Routes() func(*http.ServeMux) {
	return func(mux *http.ServeMux) {
		mux.Handle("POST /api/auth/password-reset", r.forPlayerApp(http.HandlerFunc(r.submitRoute)))
		mux.Handle("POST /api/auth/reset-password", r.forPlayerApp(http.HandlerFunc(r.resetRoute)))
	}
}

// forPlayerApp refuses every request that is not from the Player app, before anything is counted.
func (r *Recovery) forPlayerApp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if store.Audience(req.Header.Get(AppHeader)) != store.AudiencePlayer {
			httpapi.WriteError(w, httpapi.ErrNotFound, nil)
			return
		}
		next.ServeHTTP(w, req)
	})
}

// count counts the attempt against the trusted client IP. Both routes share the reset budget (R4: 30 per hour per
// IP, the limiter's reset_request action): the table's action list has no separate one for the reset itself. It
// reports false after answering the refusal.
func (r *Recovery) count(w http.ResponseWriter, req *http.Request) bool {
	err := r.svc.Limiter().CheckResetRequest(req.Context(), httpapi.ClientIPFrom(req.Context()))
	if err == nil {
		return true
	}
	var limited *session.RateLimitedError
	if errors.As(err, &limited) {
		httpapi.WriteRateLimited(w, limited.RetryAfterSeconds(), limitMessage)
		return false
	}
	r.log.ErrorContext(req.Context(), "the reset limiter failed", "request_id", httpapi.RequestIDFrom(req.Context()), "error", err.Error())
	httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
	return false
}

// submitRoute is POST /api/auth/password-reset: the same {acknowledged: true} for every address.
func (r *Recovery) submitRoute(w http.ResponseWriter, req *http.Request) {
	if !r.count(w, req) {
		return
	}
	body, ok := readObject(req)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	if err := r.Submit(req.Context(), str(body["email"])); err != nil {
		r.fail(w, req, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]bool{"acknowledged": true}, httpapi.Private)
}

// resetRoute is POST /api/auth/reset-password. It sets no cookie: the player signs in with the new password.
func (r *Recovery) resetRoute(w http.ResponseWriter, req *http.Request) {
	if !r.count(w, req) {
		return
	}
	body, ok := readObject(req)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	var ip *netip.Addr
	if a, err := netip.ParseAddr(httpapi.ClientIPFrom(req.Context())); err == nil {
		ip = &a
	}
	if err := r.Reset(req.Context(), str(body["token"]), str(body["password"]), ip); err != nil {
		r.fail(w, req, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]bool{"saved": true}, httpapi.Private)
}

// fail answers a service error: a refusal in its own code and fields, anything else as handler.ts answers a
// non-ServiceError (a 500; the cause goes to the log, never the wire).
func (r *Recovery) fail(w http.ResponseWriter, req *http.Request, err error) {
	var re *Error
	if errors.As(err, &re) {
		httpapi.WriteError(w, re.Code, re.Fields)
		return
	}
	r.log.ErrorContext(req.Context(), "a password recovery request failed", "request_id", httpapi.RequestIDFrom(req.Context()), "error", err.Error())
	httpapi.WriteInternal(w)
}

// readObject is readJsonBody (service/request.ts): the body must be a JSON object, or the answer is a plain
// `invalid`. A body over maxBody is refused the same way.
func readObject(req *http.Request) (map[string]any, bool) {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, req.Body, maxBody))
	if err != nil {
		return nil, false
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, false
	}
	m, ok := v.(map[string]any)
	return m, ok && m != nil
}

// str is text() in request.ts: a string as it came, anything else is ”.
func str(v any) string {
	s, _ := v.(string)
	return s
}
