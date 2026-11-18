package signin

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/netip"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// account is the account row an identity is linked to, for the audience that is signing in.
type account struct {
	id uuid.UUID
	// ok is false when the account row is missing or may not sign in (club not provisioned or disabled,
	// player disabled, Admin inactive).
	ok bool
}

// accountOf finds the account linked to an identity. A missing row is not an error: it is ok == false.
func (h *handlers) accountOf(ctx context.Context, aud store.Audience, identityID uuid.UUID) (account, error) {
	var a account
	var err error
	switch aud {
	case store.AudienceClub:
		var c store.ClubAccount
		if c, err = h.st.ClubAccountBySubject(ctx, identityID); err == nil {
			a = account{id: c.ClubID, ok: c.CanSignIn()}
		}
	case store.AudiencePlayer:
		var p store.PlayerAccount
		if p, err = h.st.PlayerAccountBySubject(ctx, identityID); err == nil {
			a = account{id: p.PlayerID, ok: p.CanSignIn()}
		}
	default:
		var ad store.AdminAccount
		if ad, err = h.st.AdminAccountBySubject(ctx, identityID); err == nil {
			a = account{id: ad.ID, ok: ad.CanSignIn()}
		}
	}
	if errors.Is(err, store.ErrNotFound) {
		return account{}, nil
	}
	return a, err
}

// sessionBody is the body each app's hooks read (sign-in.ts:37-59): Queue and Player `{ account: { id, name,
// audience } }`, Admin `{ kind: 'owner', account: { id, email } }`. The Admin email is the login key. found is
// false when the account's display row is gone (the caller reads that as signed out).
func (h *handlers) sessionBody(ctx context.Context, aud store.Audience, accountID uuid.UUID, loginKey string) (body any, found bool, err error) {
	type named struct {
		ID       uuid.UUID `json:"id"`
		Name     string    `json:"name"`
		Audience string    `json:"audience"`
	}
	var name string
	switch aud {
	case store.AudienceAdmin:
		type adminAccount struct {
			ID    uuid.UUID `json:"id"`
			Email string    `json:"email"`
		}
		return struct {
			Kind    string       `json:"kind"`
			Account adminAccount `json:"account"`
		}{"owner", adminAccount{accountID, loginKey}}, true, nil
	case store.AudienceClub:
		name, err = h.st.ClubName(ctx, accountID)
	default:
		name, err = h.st.PlayerFullName(ctx, accountID)
	}
	if errors.Is(err, store.ErrNotFound) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return struct {
		Account named `json:"account"`
	}{named{accountID, name, string(aud)}}, true, nil
}

// clientIP is the trusted client IP as an address, or nil.
func clientIP(ctx context.Context) *netip.Addr {
	if ip, err := netip.ParseAddr(httpapi.ClientIPFrom(ctx)); err == nil {
		return &ip
	}
	return nil
}

// setCookies puts a new access pass, and a new refresh pass when there is one, in the browser. Lifetimes are
// measured on the Service's clock so they match the passes. The access cookie lives as long as the session
// (refreshExp, even when the refresh cookie itself is left alone in the B-29 grace window), not as long as the
// pass inside it: after 15 minutes the browser still sends the expired pass, Go answers `expired` and the
// client refreshes (B-62 amendment).
func (h *handlers) setCookies(w http.ResponseWriter, r *http.Request, aud store.Audience, access, refresh string, refreshExp time.Time) {
	maxAge := refreshExp.Sub(h.now())
	session.SetCookies(w, r, aud, session.Cookies{
		Access: access, AccessMaxAge: maxAge, Refresh: refresh, RefreshMaxAge: maxAge,
	})
}

// signIn is POST /api/auth/sign-in. The order is fixed:
//
//  1. validate the body (before anything is counted, as sign-in.ts:74-85 does before the provider call);
//  2. count the attempt against the IP and device and refuse a locked account (pool-bound, before any tx);
//  3. find the identity by (audience, login key);
//  4. verify the password, or run the dummy hash for an unknown login (same cost either way);
//  5. a wrong password or unknown login is counted, then the generic 401;
//  6. a locked identity or an account that may not sign in is the same generic 401 (Admin: `denied`, no session);
//  7. rehash an old hash; load the body data; issue the session; set the cookies.
func (h *handlers) signIn(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	ctx := r.Context()
	body := readObject(r)
	identifier, _ := str(body, "identifier")
	identifier = strings.TrimSpace(identifier) // sign-in.ts:74
	pw, _ := str(body, "password")             // sign-in.ts:75: the password is never trimmed
	if identifier == "" || pw == "" {
		fail(w, http.StatusUnprocessableEntity, "invalid", msgInvalid[aud])
		return
	}
	loginKey := strings.ToLower(identifier) // the club username and the email are both trimmed and lowercased (sign-in.ts:87)
	var device *uuid.UUID
	label := ""
	if aud == store.AudienceClub {
		device, label = deviceID(body), deviceLabel(body)
	}
	attempt := session.SignInAttempt{Audience: aud, LoginKey: loginKey, DeviceID: device, IP: httpapi.ClientIPFrom(ctx)}
	limiter := h.svc.Limiter()

	if err := limiter.BeginSignIn(ctx, attempt); err != nil {
		h.signInError(w, r, err)
		return
	}

	ident, found, err := h.findIdentity(ctx, aud, loginKey)
	if err != nil {
		h.signInError(w, r, err)
		return
	}
	hasher := h.svc.Hasher()
	passwordOK, needsRehash := false, false
	if found {
		passwordOK, needsRehash, err = hasher.Verify(ctx, pw, ident.PasswordHash)
		if errors.Is(err, password.ErrMalformedHash) || errors.Is(err, password.ErrUnsupportedScheme) {
			// A stored hash nobody can read is a data fault, not something to show: log it, refuse like any
			// wrong password.
			h.log.ErrorContext(ctx, "an identity has an unreadable password hash", slog.String("identity_id", ident.ID.String()), slog.Any("error", err))
			passwordOK, needsRehash, err = false, false, nil
		}
	} else {
		_, err = hasher.VerifyUnknown(ctx, pw)
	}
	if err != nil {
		h.signInError(w, r, err)
		return
	}
	if !passwordOK {
		if err := limiter.RecordWrongPassword(ctx, attempt); err != nil {
			h.signInError(w, r, err)
			return
		}
		badCredentials(w, aud)
		return
	}
	if ident.DisabledAt != nil {
		badCredentials(w, aud)
		return
	}
	acct, err := h.accountOf(ctx, aud, ident.ID)
	if err != nil {
		h.signInError(w, r, err)
		return
	}
	if !acct.ok {
		if aud == store.AudienceAdmin {
			// The password is right but this identity has no platform authority: tell the app, issue nothing.
			httpapi.WriteJSON(w, http.StatusOK, struct {
				Kind               string `json:"kind"`
				AccountDescription string `json:"accountDescription"`
			}{"denied", ident.LoginKey}, httpapi.Private)
			return
		}
		badCredentials(w, aud)
		return
	}

	if needsRehash {
		h.rehash(ctx, ident, pw)
	}
	resp, found, err := h.sessionBody(ctx, aud, acct.id, ident.LoginKey)
	if err != nil {
		h.signInError(w, r, err)
		return
	}
	if !found {
		badCredentials(w, aud)
		return
	}
	issued, err := h.svc.Issue(ctx, session.IssueInput{
		Identity: ident, AccountID: acct.id, DeviceID: device, DeviceLabel: label, IP: clientIP(ctx),
	})
	switch {
	case errors.Is(err, store.ErrDeviceOtherClub): // registerDevice's not_found
		httpapi.WriteError(w, httpapi.ErrNotFound, nil)
		return
	case errors.Is(err, store.ErrDeviceRevoked): // registerDevice's forbidden
		httpapi.WriteError(w, httpapi.ErrForbidden, nil)
		return
	case err != nil:
		h.signInError(w, r, err)
		return
	}
	h.setCookies(w, r, aud, issued.AccessPass, issued.RefreshPass, issued.RefreshExpiresAt)
	httpapi.WriteJSON(w, http.StatusOK, resp, httpapi.Private)
}

// findIdentity looks the login up. A key Postgres cannot hold (a NUL) is simply not found.
func (h *handlers) findIdentity(ctx context.Context, aud store.Audience, loginKey string) (store.Identity, bool, error) {
	if strings.ContainsRune(loginKey, 0) {
		return store.Identity{}, false, nil
	}
	ident, err := h.st.GetIdentityByLogin(ctx, aud, loginKey)
	if errors.Is(err, store.ErrNotFound) {
		return store.Identity{}, false, nil
	}
	return ident, err == nil, err
}

// rehash stores the password again under the current argon2id parameters. A failure is logged and never fails
// the sign-in: the old hash still works and the next sign-in tries again.
func (h *handlers) rehash(ctx context.Context, ident store.Identity, pw string) {
	hash, err := h.svc.Hasher().Hash(ctx, pw)
	if err == nil {
		err = h.st.UpdatePassword(ctx, ident.ID, hash, store.SchemeArgon2id, h.now())
	}
	if err != nil {
		h.log.WarnContext(ctx, "rehashing a password failed", slog.String("identity_id", ident.ID.String()), slog.Any("error", err))
	}
}

// signInError answers a limiter refusal as 429 and anything else as the 503 of sign-in.ts:91, logging the cause.
func (h *handlers) signInError(w http.ResponseWriter, r *http.Request, err error) {
	var limited *session.RateLimitedError
	if errors.As(err, &limited) {
		rateLimited(w, limited)
		return
	}
	h.log.ErrorContext(r.Context(), "signing in failed", slog.Any("error", err))
	unavailable(w)
}
