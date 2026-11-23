package google

import (
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// claimWithGoogle is POST /api/claim/{token}/google, P-CLAIM with Google instead of a password (claimWithGoogle): the profile is
// claimed with the Google account the callback verified and holds, the Google email becomes the confirmed ROTRA email, and the
// player is signed in. { outcome: 'taken' } when that Google account is already on another ROTRA account: nothing changes
// and the held account is dropped, so the player picks another Google account.
func (h *Handlers) claimWithGoogle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if err := h.svc.Limiter().CheckClaim(ctx, httpapi.ClientIPFrom(ctx)); err != nil {
		h.fin.Limited(w, r, err)
		return
	}
	// The route's own checks come first, as in the Route Handler: the body is an object and the typed phone is a number, before
	// anything about the held Google account is asked. The held email joins the claim below.
	in, refusal := claim.GoogleFinish(r, r.PathValue("token"), "")
	if refusal != nil {
		writes.Write(w, r, h.log, writes.Fail(refusal.Code, refusal.Fields))
		return
	}
	held, ok := h.Held(r)
	if !ok {
		// The callback already found this Google account on another account.
		if res, seen := h.ReadResult(r); seen && res.Intent == IntentClaim && res.Outcome == OutcomeTaken {
			h.taken(w, r, res.Email)
			return
		}
		h.failed(w, r)
		return
	}
	isNew, err := h.IsNew(ctx, held.Email)
	if err != nil {
		h.unavailable(w, r, "checking a Google claim failed", err)
		return
	}
	if !isNew {
		h.taken(w, r, held.Email)
		return
	}
	in.Email, in.GoogleEmail = held.Email, held.Email
	// The email that another account won after the check is the same answer; every other refusal is the claim's own.
	in.OnRefusal = func(w http.ResponseWriter, code httpapi.ErrorCode, f map[string]string) bool {
		if code == httpapi.ErrConflict && f["email"] != "" {
			h.taken(w, r, held.Email)
			return true
		}
		return false
	}
	h.fin.Complete(w, r, in, func(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID, _ bool) {
		h.claimed(w, r, ident, playerID)
	})
}

func (h *Handlers) taken(w http.ResponseWriter, r *http.Request, email string) {
	h.jar(w, r).clear(HeldCookie, ResultCookie, ReturnCookie)
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{"outcome": "taken", "email": email}, httpapi.Private)
}

// claimed answers a finished Google claim: the player is signed in and the answer is the claim's, with the outcome.
func (h *Handlers) claimed(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID) {
	ctx := r.Context()
	row, err := sqlcgen.New(h.pool).GetPlayerClaimResult(ctx, pgUUID(playerID))
	if err != nil {
		h.fin.Unexpected(w, r, "reading a claimed player failed", err)
		return
	}
	if !h.fin.Issue(w, r, ident, playerID) {
		return
	}
	var nick *string
	if row.Nickname.Valid {
		nick = &row.Nickname.String
	}
	var b sessionBody
	b.Account.ID, b.Account.Name, b.Account.Audience = playerID, row.FullName, string(store.AudiencePlayer)
	h.jar(w, r).clear(HeldCookie, ResultCookie, ReturnCookie)
	h.clearGate(w, r)
	httpapi.WriteJSON(w, http.StatusOK, map[string]any{
		"outcome": "claimed", "playerId": playerID, "rtrId": strings.TrimSpace(row.RtrID.String), "firstName": fields.FirstName(row.FullName, nick), "session": b,
	}, httpapi.Private)
}
