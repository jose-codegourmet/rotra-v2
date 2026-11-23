package signin

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// signedOutBody is what a signed-out read or a sign-out returns (sign-in.ts:107,127): null for Queue and
// Player, an object for Admin.
func signedOutBody(aud store.Audience, ended bool) any {
	if aud == store.AudienceAdmin {
		return struct {
			Kind         string `json:"kind"`
			SessionEnded bool   `json:"sessionEnded"`
		}{"signed-out", ended}
	}
	return nil
}

// readSession is GET /api/auth/session: the verified session as the app's hooks expect it, or signed out.
//
// It does not refresh and writes no cookie. A usable pass is the answer. With no usable pass (expired, missing,
// malformed or another app's) but this app's refresh cookie present, which the browser sends to /api/auth/*,
// a refresh would succeed, so the answer is 401 `expired` (the Authenticator's envelope) and the client
// refreshes through POST /api/auth/refresh (B-62 amendment). With neither it is signed out. It is a read, so a
// pass is trusted for its lifetime (session.ModeRead). The route is not behind the Require middleware.
func (h *handlers) readSession(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	ctx := r.Context()
	p, err := h.svc.Authenticator().Authenticate(ctx, session.TokenFromRequest(r, aud), aud, session.ModeRead)
	switch {
	case errors.Is(err, session.ErrExpired), errors.Is(err, session.ErrUnauthenticated),
		errors.Is(err, session.ErrWrongAccount), errors.Is(err, session.ErrSessionRevoked):
		if c, cerr := r.Cookie(session.RefreshCookieName(aud)); cerr == nil && c.Value != "" {
			session.WriteExpired(w)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, signedOutBody(aud, false), httpapi.Private)
		return
	case err != nil:
		h.log.ErrorContext(ctx, "reading the session failed", slog.Any("error", err))
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
		return
	}
	loginKey := ""
	if aud == store.AudienceAdmin { // the Admin's email is the login key of its identity
		ident, err := h.st.GetIdentityByID(ctx, p.IdentityID)
		if errors.Is(err, store.ErrNotFound) {
			httpapi.WriteJSON(w, http.StatusOK, signedOutBody(aud, false), httpapi.Private)
			return
		}
		if err != nil {
			h.log.ErrorContext(ctx, "reading the session failed", slog.Any("error", err))
			httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
			return
		}
		loginKey = ident.LoginKey
	}
	body, found, err := h.sessionBody(ctx, aud, p.AccountID, loginKey)
	switch {
	case err != nil:
		h.log.ErrorContext(ctx, "reading the session failed", slog.Any("error", err))
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
	case !found:
		httpapi.WriteJSON(w, http.StatusOK, signedOutBody(aud, false), httpapi.Private)
	default:
		if aud == store.AudiencePlayer && h.onPlayer != nil {
			h.onPlayer(w, r, p.AccountID)
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	}
}

// signOut is POST /api/auth/sign-out: ends this device's session and clears both cookies. It is always a 200
// when it could do its job, even with nobody signed in.
//
// The session to revoke comes from a current access pass or, when that is missing or expired (the browser was
// idle past 15 minutes), from the refresh cookie, which the browser sends here because its Path is /api/auth
// (B-62 amendment). A pass that names nothing, or another app's session, revokes nothing and reveals nothing;
// the cookies are cleared all the same. If the revoke itself fails the answer is 503 and the cookies stay, so
// the retry can still name the session.
func (h *handlers) signOut(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	ctx := r.Context()
	ended := readObject(r)["sessionEnded"] == true // only the JSON literal true (route.ts)
	var err error
	claims, verr := h.verifier.Verify(session.TokenFromRequest(r, aud), pass.Audience(aud), h.now())
	if verr == nil {
		if sid, perr := parseID(claims.SessionID); perr == nil {
			err = h.svc.SignOut(ctx, sid, clientIP(ctx))
		}
	} else if c, cerr := r.Cookie(session.RefreshCookieName(aud)); cerr == nil {
		err = h.svc.SignOutByRefresh(ctx, c.Value, aud, clientIP(ctx))
	}
	if err != nil {
		h.log.ErrorContext(ctx, "signing out failed", slog.Any("error", err))
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
		return
	}
	session.ClearCookies(w, r, aud)
	httpapi.WriteJSON(w, http.StatusOK, signedOutBody(aud, ended), httpapi.Private)
}

// refresh is POST /api/auth/refresh: it exchanges the app's refresh cookie for a new access pass (and a rotated
// refresh pass, except inside the B-29 grace window, when the refresh cookie is left alone). The service
// already counts the refresh against the client IP and the session, so this handler does not.
//
//	200 { ok: true }                    cookies set
//	401 unauthenticated                 refused: both cookies cleared
//	429 rate_limited + Retry-After      cookies untouched (the pass may still be good)
//	503 unavailable                     cookies untouched
func (h *handlers) refresh(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	ctx := r.Context()
	token := ""
	if c, err := r.Cookie(session.RefreshCookieName(aud)); err == nil {
		token = c.Value
	}
	res, err := h.svc.Refresh(ctx, token, clientIP(ctx))
	var limited *session.RateLimitedError
	switch {
	case errors.As(err, &limited):
		rateLimited(w, limited)
		return
	case errors.Is(err, session.ErrInvalidRefresh), errors.Is(err, session.ErrRefreshRefused), errors.Is(err, session.ErrRefreshReused):
		h.refused(w, r, aud)
		return
	case err != nil:
		h.log.ErrorContext(ctx, "refreshing a session failed", slog.Any("error", err))
		httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
		return
	}
	if res.Session.Audience != aud {
		// A pass of another app was put in this app's cookie. Never hand it an access pass for this app.
		h.log.WarnContext(ctx, "a refresh pass of another app was presented", slog.String("app", string(aud)))
		h.refused(w, r, aud)
		return
	}
	h.setCookies(w, r, aud, res.AccessPass, res.RefreshPass, res.RefreshExpiresAt)
	httpapi.WriteJSON(w, http.StatusOK, struct {
		OK bool `json:"ok"`
	}{true}, httpapi.Private)
}

func (h *handlers) refused(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	session.ClearCookies(w, r, aud)
	httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
}
