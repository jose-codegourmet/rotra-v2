package claim

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// Finisher finishes the staged link of a guest registration (internal/auth/register): in the TypeScript the registration is
// a staged claim, registerGuest stages a player and a link and registerFromClaim finishes it, so the Go registration stages
// the same rows and finishes them with the claim's own transaction (the same locks, rechecks and races). The routes of
// this package do not use it.
type Finisher struct{ h *handlers }

// NewFinisher builds the finisher from the claim's dependencies (the read limiter is not needed).
func NewFinisher(d Deps) (*Finisher, error) {
	if d.Pool == nil || d.Service == nil || d.Store == nil {
		return nil, errors.New("claim: a finisher needs a pool, a session service and a store")
	}
	h := &handlers{pool: d.Pool, svc: d.Service, st: d.Store, read: d.ReadLimiter, now: d.Clock, log: d.Logger}
	return h.withDefaults().finisher(), nil
}

func (h *handlers) finisher() *Finisher { return &Finisher{h: h} }

// Finish is what a registration hands the claim: the staging link's token, the typed email (trimmed, lower case), the
// password, the phone on the link's contact and the profile details, already checked.
type Finish struct {
	Token, Email, Password, Phone string
	Details                       profile.Input
	// OnRefusal, when set, sees each refusal of the claim before it is answered: a code and its field messages. It answers
	// and returns true to take the refusal over.
	OnRefusal func(w http.ResponseWriter, code httpapi.ErrorCode, fields map[string]string) bool
}

// SignedIn answers a finished registration: the claim committed (retried false), or the link was already used and the
// password proved the account (retried true). It must answer the request.
type SignedIn = signedIn

// Complete claims the staged link, or, when it was claimed before, proves the password against the account (the retry of a
// lost answer), and calls then with the account. Every refusal is answered by Complete itself, in the claim's envelope.
func (f *Finisher) Complete(w http.ResponseWriter, r *http.Request, in Finish, then SignedIn) {
	s := submission{email: in.Email, password: in.Password, phone: in.Phone, input: in.Details}
	if in.OnRefusal != nil {
		s.onRefusal = func(w http.ResponseWriter, p *problem) bool { return in.OnRefusal(w, p.code, p.fields) }
	}
	f.h.finish(w, r, s, digestOf(in.Token), then)
}

// Issue makes the session of an account and sets the Player cookies. A failure is answered (503) and reported as false.
func (f *Finisher) Issue(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID) bool {
	return f.h.issue(w, r, ident, playerID)
}

// Unexpected logs the cause and answers the 500 body handler.ts sends for a non-ServiceError.
func (f *Finisher) Unexpected(w http.ResponseWriter, r *http.Request, msg string, err error) {
	f.h.unexpected(w, r, msg, err)
}
