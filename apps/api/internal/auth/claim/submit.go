package claim

import (
	"context"
	"errors"
	"net/http"
	"net/netip"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// submit is POST /api/claim/{token}: finish registering. In order:
//
//  1. count the attempt against the client IP (R4: 30 per hour), 429 over it;
//  2. the body must be a JSON object; the typed phone, the email and the password are checked (the route and
//     registerFromClaim, with the new password policy);
//  3. the link is read and its branch checked, with the TypeScript's answers; a used link is the retry path;
//  4. the profile details are validated (before any write; the TypeScript saved them after the claim);
//  5. the password is hashed, then one transaction claims the link and creates the account;
//  6. the player is signed in: a session and its cookies, like POST /api/auth/sign-in.
func (h *handlers) submit(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := h.svc.Limiter().CheckClaim(ctx, httpapi.ClientIPFrom(ctx)); err != nil {
		h.limited(w, r, err)
		return
	}
	body, ok := readObject(r)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	s, prob := parse(body)
	if prob != nil {
		writeProblem(w, prob)
		return
	}
	digest := digestOf(r.PathValue("token"))
	now := h.now()

	// A concurrent identical claim (a double tap, a retry, two tabs) can win while this one is between its reads
	// and its transaction. Then this one saw half of the winner's work and would answer the field conflict a
	// genuinely different claimant gets. So a conflict is re-run once from the link lookup: the second pass sees
	// the consumed link and signs in with the right password; if it still conflicts, it was a different claimant.
	var hash string
	for pass := 0; ; pass++ {
		done, replied := h.attempt(w, r, s, digest, now, &hash, pass == 0)
		if replied {
			return
		}
		if done != nil {
			h.signIn(w, r, done.ident, done.playerID)
			return
		}
	}
}

// attempt is one pass over the link: it answers the request itself and reports replied, or returns the claim to
// sign in. A conflict on the first pass (canRerun) answers nothing and returns (nil, false): the caller runs the
// pass again. The password hash is computed once and kept in *hash.
func (h *handlers) attempt(w http.ResponseWriter, r *http.Request, s submission, digest []byte, now time.Time, hash *string, canRerun bool) (done *claimed, replied bool) {
	ctx := r.Context()
	// Only a field conflict (the email or phone is taken) can be the work of a concurrent identical claim. The
	// field-less conflict of the transaction's own re-checks means the club changed the link since it was read:
	// that is answered as it is, never re-run (the player never saw the new phone).
	conflict := func(p *problem) bool {
		return canRerun && p != nil && p.code == httpapi.ErrConflict && len(p.fields) > 0
	}
	l, err := findLink(ctx, sqlcgen.New(h.pool), digest)
	if err != nil {
		h.unexpected(w, r, "reading a claim link failed", err)
		return nil, true
	}
	if l == nil {
		writeProblem(w, refuse(httpapi.ErrForbidden, "link", msgExpired))
		return nil, true
	}
	if afterLinkRead != nil {
		afterLinkRead("link")
	}
	dec, err := decide(ctx, sqlcgen.New(h.pool), l, s, now)
	if err != nil {
		h.unexpected(w, r, "checking a claim link failed", err)
		return nil, true
	}
	if conflict(dec.problem) {
		return nil, false
	}
	if dec.problem != nil {
		writeProblem(w, dec.problem)
		return nil, true
	}
	if dec.retry != uuid.Nil {
		h.retry(w, r, s, dec.retry)
		return nil, true
	}

	details, ferr := profile.Parse(s.input)
	if ferr != nil {
		writeProblem(w, refuse(httpapi.ErrInvalid, ferr.Field, ferr.Message))
		return nil, true
	}
	if *hash == "" {
		*hash, err = h.svc.Hasher().Hash(ctx, s.password)
		if err != nil {
			h.unavailable(w, r, "hashing a password failed", err)
			return nil, true
		}
	}
	if afterLinkRead != nil {
		afterLinkRead("transaction")
	}
	out, err := h.claim(ctx, digest, s, details, *hash, now)
	if p := asProblem(err); p != nil {
		// A unique violation, deadlock or serialization failure of the transaction itself is always worth one pass:
		// it is what a concurrent claim holding the same rows does.
		if canRerun && p.code == httpapi.ErrConflict {
			return nil, false
		}
		writeProblem(w, p)
		return nil, true
	}
	switch {
	case err != nil:
		h.unexpected(w, r, "claiming a link failed", err)
	case conflict(out.problem):
		return nil, false
	case out.problem != nil:
		writeProblem(w, out.problem)
	case out.retry != uuid.Nil: // the link was used while this request waited for it
		h.retry(w, r, s, out.retry)
	default:
		return out.done, false
	}
	return nil, true
}

// afterLinkRead is a test seam, nil in production: a test runs a competing claim at the named point ("link": the
// link was read, its checks not yet; "transaction": the checks passed, the transaction not yet begun).
var afterLinkRead func(stage string)

// retry is the TypeScript's "a retry after success signs in again": the link is already used, so this is a
// sign-in, and only the right password for the account's own login gets a session. The answer never says which of
// the email and password was wrong, or whether the email has an account. The sign-in limiter bounds guessing the
// way it does on the sign-in route.
func (h *handlers) retry(w http.ResponseWriter, r *http.Request, s submission, playerID uuid.UUID) {
	ctx := r.Context()
	limiter := h.svc.Limiter()
	attempt := session.SignInAttempt{Audience: store.AudiencePlayer, LoginKey: s.email, IP: httpapi.ClientIPFrom(ctx)}
	if err := limiter.BeginSignIn(ctx, attempt); err != nil {
		h.limited(w, r, err)
		return
	}
	ident, ok, err := h.prove(ctx, s, playerID)
	if err != nil {
		h.unavailable(w, r, "checking a claim retry failed", err)
		return
	}
	if !ok {
		if err := limiter.RecordWrongPassword(ctx, attempt); err != nil {
			h.limited(w, r, err)
			return
		}
		writeProblem(w, refuse(httpapi.ErrInvalid, "email", msgCredentials))
		return
	}
	h.signIn(w, r, ident, playerID)
}

// prove checks the email and password against the identity of the player's account. Whatever is missing or
// disabled, a password hash is still computed, so the answer takes about as long either way.
func (h *handlers) prove(ctx context.Context, s submission, playerID uuid.UUID) (store.Identity, bool, error) {
	hasher := h.svc.Hasher()
	ident, usable, err := h.accountIdentity(ctx, playerID)
	if err != nil {
		return store.Identity{}, false, err
	}
	if !usable || ident.LoginKey != s.email {
		_, err := hasher.VerifyUnknown(ctx, s.password)
		return store.Identity{}, false, err
	}
	ok, _, err := hasher.Verify(ctx, s.password, ident.PasswordHash)
	if errors.Is(err, password.ErrMalformedHash) || errors.Is(err, password.ErrUnsupportedScheme) {
		h.log.ErrorContext(ctx, "an identity has an unreadable password hash", "identity_id", ident.ID.String())
		return store.Identity{}, false, nil // a data fault is refused like a wrong password
	}
	return ident, ok && err == nil, err
}

// accountIdentity finds the identity a player signs in with. usable is false when there is none or either it or
// the player account is disabled.
func (h *handlers) accountIdentity(ctx context.Context, playerID uuid.UUID) (store.Identity, bool, error) {
	acct, err := sqlcgen.New(h.pool).GetPlayerAccountByPlayerID(ctx, pgUUID(playerID))
	if errors.Is(err, pgx.ErrNoRows) {
		return store.Identity{}, false, nil
	}
	if err != nil {
		return store.Identity{}, false, err
	}
	ident, err := h.st.GetIdentityByID(ctx, uuidOf(acct.AuthSubject))
	if errors.Is(err, store.ErrNotFound) {
		return store.Identity{}, false, nil
	}
	if err != nil {
		return store.Identity{}, false, err
	}
	usable := !acct.DisabledAt.Valid && ident.DisabledAt == nil && ident.Audience == store.AudiencePlayer
	return ident, usable, nil
}

// claimedBody is what a finished claim answers: playerId, rtrId and firstName, and the session the app's hooks read
// (account: { id, name, audience }), as registerFromClaim returns them.
type claimedBody struct {
	PlayerID  uuid.UUID `json:"playerId"`
	RTRID     string    `json:"rtrId"`
	FirstName string    `json:"firstName"`
	Session   struct {
		Account struct {
			ID       uuid.UUID `json:"id"`
			Name     string    `json:"name"`
			Audience string    `json:"audience"`
		} `json:"account"`
	} `json:"session"`
}

// signIn issues the session and sets the cookies. Everything the body needs is read first, so a failed read
// leaves no orphan session. If issuing fails after a committed claim the answer is 503: the retry finds the used
// link and signs the player in.
func (h *handlers) signIn(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID) {
	ctx := r.Context()
	row, err := sqlcgen.New(h.pool).GetPlayerClaimResult(ctx, pgUUID(playerID))
	if err != nil {
		h.unexpected(w, r, "reading a claimed player failed", err)
		return
	}
	var ip *netip.Addr
	if a, err := netip.ParseAddr(httpapi.ClientIPFrom(ctx)); err == nil {
		ip = &a
	}
	issued, err := h.svc.Issue(ctx, session.IssueInput{Identity: ident, AccountID: playerID, IP: ip})
	if err != nil {
		h.unavailable(w, r, "signing in after a claim failed", err)
		return
	}
	now := h.now()
	session.SetCookies(w, r, store.AudiencePlayer, session.Cookies{
		Access: issued.AccessPass, AccessMaxAge: issued.RefreshExpiresAt.Sub(now), // as long as the session (B-62 amendment)
		Refresh: issued.RefreshPass, RefreshMaxAge: issued.RefreshExpiresAt.Sub(now),
	})
	var nick *string
	if row.Nickname.Valid {
		nick = &row.Nickname.String
	}
	var b claimedBody
	b.PlayerID, b.RTRID, b.FirstName = playerID, orEmpty(row.RtrID), fields.FirstName(row.FullName, nick)
	b.Session.Account.ID, b.Session.Account.Name, b.Session.Account.Audience = playerID, row.FullName, string(store.AudiencePlayer)
	httpapi.WriteJSON(w, http.StatusOK, b, httpapi.Private)
}

func writeProblem(w http.ResponseWriter, p *problem) { httpapi.WriteError(w, p.code, p.fields) }

// limited answers a limiter refusal as the 429 envelope; any other limiter failure is a 503, like sign-in.
func (h *handlers) limited(w http.ResponseWriter, r *http.Request, err error) {
	var limited *session.RateLimitedError
	if errors.As(err, &limited) {
		httpapi.WriteRateLimited(w, limited.RetryAfterSeconds(), claimMessage)
		return
	}
	h.unavailable(w, r, "the claim limiter failed", err)
}

// unavailable logs the cause and answers the catalog's 503.
func (h *handlers) unavailable(w http.ResponseWriter, r *http.Request, msg string, err error) {
	h.log.ErrorContext(r.Context(), msg, "request_id", httpapi.RequestIDFrom(r.Context()), "error", err.Error())
	httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
}

// unexpected logs the cause (never the request) and answers the body handler.ts sends for a non-ServiceError.
func (h *handlers) unexpected(w http.ResponseWriter, r *http.Request, msg string, err error) {
	h.log.ErrorContext(r.Context(), msg, "request_id", httpapi.RequestIDFrom(r.Context()), "error", err.Error())
	httpapi.WriteInternal(w)
}
