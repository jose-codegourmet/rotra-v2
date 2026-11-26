package google

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The rules, all decided from ROTRA's own record (player_accounts.google_email), as in the TypeScript's header comment:
//
//   - Google is connected to an account only when that account's google_email says so. An account whose ROTRA email is the Google
//     email but has no Google yet is asked "Connect Google to your account?" first, every time, until the player says yes.
//     Declining or leaving signs nobody in.
//   - A Google account with no ROTRA account never creates a player on /login. On an invite or a registration link it is held
//     until the form is sent, and is nobody (no session) if the form never is.
//   - One Google email per ROTRA account, and never another account's ROTRA email.
//   - Connecting never changes the ROTRA email. There is no disconnect.

const takenFor = " is already used by another ROTRA account."

type account struct {
	playerID    uuid.UUID
	subject     uuid.UUID
	name        string
	disabled    bool
	googleEmail string
	rotraEmail  string
}

// decision is what the callback decided: the outcome, whether the Google account is held, and the Google account for display.
type decision struct {
	outcome Outcome
	held    bool
	google  Held
}

func (d decision) with(v Verified) decision {
	d.google = Held(v)
	return d
}

func (h *Handlers) accountByGoogleEmail(ctx context.Context, email string) (*account, error) {
	row, err := sqlcgen.New(h.pool).GetGoogleAccountByGoogleEmail(ctx, pgtype.Text{String: email, Valid: true})
	if errNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account{playerID: uuidOf(row.PlayerID), subject: uuidOf(row.AuthSubject), name: row.FullName, disabled: row.DisabledAt.Valid, googleEmail: email}, nil
}

func (h *Handlers) accountByPlayerID(ctx context.Context, id uuid.UUID) (*account, error) {
	row, err := sqlcgen.New(h.pool).GetGoogleAccountByPlayerID(ctx, pgUUID(id))
	if errNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account{playerID: uuidOf(row.PlayerID), subject: uuidOf(row.AuthSubject), name: row.FullName, disabled: row.DisabledAt.Valid, googleEmail: row.GoogleEmail.String, rotraEmail: row.RotraEmail.String}, nil
}

// contact is the player whose private contact has an email: with the account it has, or none (an unclaimed player).
type contact struct {
	playerID uuid.UUID
	account  *account
}

func (h *Handlers) contactByEmail(ctx context.Context, email string) (*contact, error) {
	row, err := sqlcgen.New(h.pool).GetGoogleContactByEmail(ctx, pgtype.Text{String: email, Valid: true})
	if errNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c := &contact{playerID: uuidOf(row.PlayerID)}
	if row.AccountPlayerID.Valid {
		c.account = &account{playerID: c.playerID, subject: uuidOf(row.AuthSubject), name: row.FullName, disabled: row.DisabledAt.Valid, googleEmail: row.GoogleEmail.String, rotraEmail: email}
	}
	return c, nil
}

// decide is decideSignIn (login, register and claim) and decideConnect. It signs the player in, for the signed-in outcome.
func (h *Handlers) decide(w http.ResponseWriter, r *http.Request, intent Intent, v Verified) decision {
	d, err := h.decideRules(w, r, intent, v)
	if err != nil {
		h.log.ErrorContext(r.Context(), "deciding a Google sign-in failed", "error", err.Error())
		return decision{outcome: OutcomeFailed}.with(v)
	}
	return d.with(v)
}

func (h *Handlers) decideRules(w http.ResponseWriter, r *http.Request, intent Intent, v Verified) (decision, error) {
	ctx := r.Context()
	if intent == IntentConnect {
		return h.decideConnect(w, r, v)
	}
	elsewhere := OutcomeTaken
	if intent == IntentLogin {
		elsewhere = OutcomeNotConnected
	}
	connected, err := h.accountByGoogleEmail(ctx, v.Email)
	if err != nil {
		return decision{}, err
	}
	if connected != nil {
		switch {
		case connected.disabled:
			return decision{outcome: OutcomeFailed}, nil
		case intent == IntentClaim:
			// A registration link is for a profile with no account yet: an existing account's Google is taken.
			return decision{outcome: OutcomeTaken}, nil
		}
		if err := h.issue(w, r, connected.subject, connected.playerID); err != nil {
			return decision{}, err
		}
		return decision{outcome: OutcomeSignedIn}, nil
	}
	c, err := h.contactByEmail(ctx, v.Email)
	if err != nil {
		return decision{}, err
	}
	switch {
	case c != nil && c.account != nil:
		if c.account.disabled {
			return decision{outcome: OutcomeFailed}, nil
		}
		if intent == IntentClaim {
			return decision{outcome: OutcomeTaken}, nil
		}
		// The email of a ROTRA account that has no Google yet: ask first, never sign in.
		return decision{outcome: OutcomeHeld, held: true}, nil
	case c != nil:
		// A ROTRA email that belongs to a profile with no account: not a new player, and not a Google account to sign in.
		return decision{outcome: elsewhere}, nil
	case intent == IntentLogin:
		// Google on /login with no ROTRA account never creates one (invites and the Admin link only).
		return decision{outcome: OutcomeNotConnected}, nil
	}
	return decision{outcome: OutcomeHeld, held: true}, nil
}

// decideConnect is Connect or Change Google while signed in: the Google account is recorded on the player's own account.
func (h *Handlers) decideConnect(w http.ResponseWriter, r *http.Request, v Verified) (decision, error) {
	ctx := r.Context()
	id, ok, _ := h.currentPlayer(nil, r)
	if !ok {
		return decision{outcome: OutcomeFailed}, nil
	}
	me, err := h.accountByPlayerID(ctx, id)
	if err != nil {
		return decision{}, err
	}
	if me == nil || me.disabled {
		return decision{outcome: OutcomeFailed}, nil
	}
	if me.googleEmail == v.Email {
		return decision{outcome: OutcomeConnected}, nil // the Google account that is already connected: nothing to change
	}
	inUse, err := h.emailInUse(ctx, v.Email, me)
	if err != nil {
		return decision{}, err
	}
	if inUse {
		return decision{outcome: OutcomeTaken}, nil
	}
	if recorded, err := h.recordGoogle(ctx, me.playerID, v.Email); err != nil {
		return decision{}, err
	} else if !recorded {
		return decision{outcome: OutcomeTaken}, nil
	}
	return decision{outcome: OutcomeConnected}, nil
}

// emailInUse: another account has this email, as its connected Google or as its ROTRA email, or another login of the Player app
// uses it (googleEmailInUse and the provider's emailHasOtherLogin).
func (h *Handlers) emailInUse(ctx context.Context, email string, except *account) (bool, error) {
	if a, err := h.accountByGoogleEmail(ctx, email); err != nil || (a != nil && a.playerID != except.playerID) {
		return err == nil, err
	}
	if c, err := h.contactByEmail(ctx, email); err != nil || (c != nil && c.playerID != except.playerID) {
		return err == nil, err
	}
	return sqlcgen.New(h.pool).GoogleEmailHasOtherLogin(ctx, sqlcgen.GoogleEmailHasOtherLoginParams{Email: email, Subject: pgUUID(except.subject)})
}

// recordGoogle records Google on an account. False when another account already has this Google email.
func (h *Handlers) recordGoogle(ctx context.Context, playerID uuid.UUID, email string) (bool, error) {
	err := sqlcgen.New(h.pool).SetPlayerGoogleEmail(ctx, sqlcgen.SetPlayerGoogleEmailParams{
		Email: pgtype.Text{String: email, Valid: true}, Now: pgtype.Timestamptz{Time: h.now(), Valid: true}, PlayerID: pgUUID(playerID),
	})
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23505" {
		return false, nil
	}
	return err == nil, err
}

func (h *Handlers) failed(w http.ResponseWriter, r *http.Request) {
	writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, map[string]string{"google": Message}))
}

type sessionBody struct {
	Account struct {
		ID       uuid.UUID `json:"id"`
		Name     string    `json:"name"`
		Audience string    `json:"audience"`
	} `json:"account"`
}

func sessionOf(a *account) sessionBody {
	var b sessionBody
	b.Account.ID, b.Account.Name, b.Account.Audience = a.playerID, a.name, "player"
	return b
}

// peek is GET outcome: is a Google result waiting, and for which screen? The Google name and email are for display. A failed
// trip is reported once and forgotten here.
func (h *Handlers) peek(w http.ResponseWriter, r *http.Request) {
	res, ok := h.ReadResult(r)
	if !ok {
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"waiting": nil}, httpapi.Private)
		return
	}
	if res.Outcome == OutcomeFailed {
		h.jar(w, r).clear(ResultCookie, ReturnCookie)
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"waiting": map[string]any{"key": res.Key, "failed": Message}}, httpapi.Private)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"waiting": map[string]any{"key": res.Key, "google": Held{Email: res.Email, Name: res.Name}}}, httpapi.Private)
}

// outcome is POST outcome: what the callback decided, in the shapes the screens already read (GoogleSignInOutcome,
// ConnectGoogleOutcome). Read once. Anything that grants something is checked again here against the session or the held
// Google account, not taken from the cookie.
func (h *Handlers) outcome(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	res, ok := h.ReadResult(r)
	h.jar(w, r).clear(ResultCookie, ReturnCookie)
	if !ok {
		h.failed(w, r)
		return
	}
	google := Held{Email: res.Email, Name: res.Name}
	switch res.Outcome {
	case OutcomeSignedIn:
		id, signed, replied := h.currentPlayer(w, r)
		if replied {
			return
		}
		var me *account
		var err error
		if signed {
			me, err = h.accountByPlayerID(ctx, id)
		}
		if err != nil {
			h.unavailable(w, r, "reading the signed-in Google player failed", err)
			return
		}
		// A session Google started is a player's only while ROTRA's own record says Google is connected (loadAccountContext).
		if me == nil || me.googleEmail == "" {
			h.failed(w, r)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "signed-in", "google": google, "session": sessionOf(me)}, httpapi.Private)
	case OutcomeHeld:
		h.heldOutcome(w, r)
	case OutcomeNotConnected:
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "not-connected", "triedEmail": res.Email}, httpapi.Private)
	case OutcomeTaken:
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "taken", "email": res.Email}, httpapi.Private)
	case OutcomeConnected:
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "connected"}, httpapi.Private)
	default:
		h.failed(w, r)
	}
}

// heldOutcome answers the held Google account: ask to connect it to the ROTRA account that has its email, or start a new account.
func (h *Handlers) heldOutcome(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	held, ok := h.Held(r)
	if !ok {
		h.failed(w, r)
		return
	}
	connected, err := h.accountByGoogleEmail(ctx, held.Email)
	if err != nil {
		h.unavailable(w, r, "reading a held Google account failed", err)
		return
	}
	c, err := h.contactByEmail(ctx, held.Email)
	if err != nil {
		h.unavailable(w, r, "reading a held Google account failed", err)
		return
	}
	switch {
	case connected != nil:
		h.failed(w, r) // connected meanwhile: nothing is held for it
	case c != nil && c.account != nil:
		if c.account.disabled {
			h.failed(w, r)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "ask-to-connect", "google": held, "playerId": c.account.playerID, "playerName": c.account.name}, httpapi.Private)
	case c != nil:
		h.failed(w, r)
	default:
		// Clubs saved this verified Google email as an unclaimed player (D-2026-11-16-04): the identity cards, so registering keeps
		// the RTR ID and joins every club's record.
		cards, err := h.unclaimedFor(ctx, held.Email)
		if err != nil {
			h.unavailable(w, r, "reading the identity cards of a Google email failed", err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "new-account", "google": held, "unclaimed": cards}, httpapi.Private)
	}
}

// link is POST link, P-GOOGLE-LINK "Connect Google and sign in": the player's one yes. Only the account whose ROTRA email is the
// held Google email can be asked; Google is recorded on it, then the player is signed in. The ROTRA email is not touched.
func (h *Handlers) link(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	body, err := writes.ReadBody(r)
	if err != nil {
		writes.Write(w, r, h.log, err)
		return
	}
	held, ok := h.Held(r)
	if !ok {
		h.failed(w, r)
		return
	}
	c, err := h.contactByEmail(ctx, held.Email)
	if err != nil {
		h.unavailable(w, r, "reading a held Google account failed", err)
		return
	}
	typed := strings.ToLower(strings.TrimSpace(body.Text("googleEmail")))
	if c == nil || c.account == nil || c.account.disabled || c.account.playerID.String() != body.Text("playerId") || typed != held.Email {
		writes.Write(w, r, h.log, writes.Fail(httpapi.ErrForbidden, map[string]string{"google": connectForbidden}))
		return
	}
	recorded, err := h.recordGoogle(ctx, c.account.playerID, held.Email)
	if err != nil {
		h.unavailable(w, r, "connecting Google failed", err)
		return
	}
	if !recorded {
		writes.Write(w, r, h.log, writes.Fail(httpapi.ErrConflict, map[string]string{"google": held.Email + takenFor}))
		return
	}
	if err := h.issue(w, r, c.account.subject, c.account.playerID); err != nil {
		h.unavailable(w, r, "signing in after connecting Google failed", err)
		return
	}
	h.jar(w, r).clear(HeldCookie, ResultCookie, ReturnCookie)
	h.clearGate(w, r)
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"session": sessionOf(c.account)}, httpapi.Private)
}

// unclaimed is GET unclaimed (getUnclaimedIdentities, D-2026-11-16-04): the identity cards for the Google account the callback
// verified and holds (?email= must be that account's email), and only while that email has no ROTRA account. Null when no club saved it.
func (h *Handlers) unclaimed(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	typed := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("email")))
	held, ok := h.Held(r)
	if !ok || held.Email != typed {
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"unclaimed": nil}, httpapi.Private)
		return
	}
	connected, err1 := h.accountByGoogleEmail(ctx, held.Email)
	c, err2 := h.contactByEmail(ctx, held.Email)
	if err := errors.Join(err1, err2); err != nil {
		h.unavailable(w, r, "reading the identity cards of a Google email failed", err)
		return
	}
	if connected != nil || (c != nil && c.account != nil) {
		httpapi.WriteJSON(w, http.StatusOK, map[string]any{"unclaimed": nil}, httpapi.Private)
		return
	}
	cards, err := h.unclaimedFor(ctx, held.Email)
	if err != nil {
		h.unavailable(w, r, "reading the identity cards of a Google email failed", err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"unclaimed": cards}, httpapi.Private)
}

func (h *Handlers) unavailable(w http.ResponseWriter, r *http.Request, msg string, err error) {
	h.log.ErrorContext(r.Context(), msg, "request_id", httpapi.RequestIDFrom(r.Context()), "error", err.Error())
	httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
}
