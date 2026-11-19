package session

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

type principalKey struct{}

// PrincipalFrom returns the principal Require put in the request context.
func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(Principal)
	return p, ok
}

// Require is middleware that authenticates the request for aud in the given mode and puts the Principal in the
// context. The access pass is read from the Authorization bearer header, else the audience's access cookie.
// Failures are answered with the standard error envelope and the handler never runs:
//
//	ErrExpired                         401 {"error":{"code":"expired"}}  (the client refreshes once and retries)
//	ErrUnauthenticated, ErrSessionRevoked  401 unauthenticated
//	ErrWrongAccount                    403 wrong_account
//	anything else                      500 internal (details go to the log only)
func (a *Authenticator) Require(aud store.Audience, mode Mode) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			p, err := a.Authenticate(r.Context(), TokenFromRequest(r, aud), aud, mode)
			if err != nil {
				a.fail(w, r, err)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), principalKey{}, p)))
		})
	}
}

// RequireByMethod is Require with the mode chosen by the method: GET, HEAD and OPTIONS read, everything else
// writes (so an unknown or unusual method gets the stricter check).
func (a *Authenticator) RequireByMethod(aud store.Audience) func(http.Handler) http.Handler {
	read, write := a.Require(aud, ModeRead), a.Require(aud, ModeWrite)
	return func(next http.Handler) http.Handler {
		r, w := read(next), write(next)
		return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			switch req.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
				r.ServeHTTP(rw, req)
			default:
				w.ServeHTTP(rw, req)
			}
		})
	}
}

// expiredBody is the distinct 401 a client answers with one refresh. The code is not in httpapi's catalog of
// Route Handler codes (it has no TypeScript twin yet), so it is written here.
type expiredBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// WriteExpired answers the distinct 401 `expired` that tells the client to refresh once.
func WriteExpired(w http.ResponseWriter) {
	var b expiredBody
	b.Error.Code, b.Error.Message = "expired", "Your session expired. Refresh and try again."
	httpapi.WriteJSON(w, http.StatusUnauthorized, b, httpapi.Private)
}

func (a *Authenticator) fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrExpired):
		WriteExpired(w)
	case errors.Is(err, ErrWrongAccount):
		httpapi.WriteError(w, httpapi.ErrWrongAccount, nil)
	case errors.Is(err, ErrUnauthenticated), errors.Is(err, ErrSessionRevoked):
		httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
	default:
		a.log.ErrorContext(r.Context(), "authenticating a request failed", slog.Any("error", err))
		httpapi.WriteInternal(w)
	}
}

// Optional is Require for routes a visitor may read too (the TypeScript optionalPlayerId). With no pass, or a
// pass that does not verify, is for another app, or whose account can no longer sign in, the request is a
// visitor: the handler runs and PrincipalFrom finds nothing. A valid pass puts the Principal in the context.
//
// An expired pass (or one signed by a removed key) is answered with the distinct 401 `expired`, not as a
// visitor: the TypeScript side refreshed the provider session through its cookies and then read as that
// player, so a silent downgrade to visitor would show a signed-in player the wrong page. The client refreshes
// once and retries, as it does for every other signed-in read. A database failure is a 500.
func (a *Authenticator) Optional(aud store.Audience) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := TokenFromRequest(r, aud)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			p, err := a.Authenticate(r.Context(), token, aud, ModeRead)
			switch {
			case err == nil:
				next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), principalKey{}, p)))
			case errors.Is(err, ErrUnauthenticated), errors.Is(err, ErrWrongAccount), errors.Is(err, ErrSessionRevoked):
				next.ServeHTTP(w, r)
			default:
				a.fail(w, r, err)
			}
		})
	}
}
