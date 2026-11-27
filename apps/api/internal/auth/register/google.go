package register

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// RegisterGoogle builds POST /api/register/{clubId}/google, Google registration from a club or session invite (registerWithGoogle,
// registerGuestWithGoogle): the same link rules, staging and joins as the password registration, with the Google account the
// callback verified and holds instead of an email and a password. Not found while the player_google_sign_in flag is off.
//
// POST /api/register/google is the Admin link's registration (D-2026-11-20-01): no club and no session, the RTR ID placed by the city the
// player picks, and the player joins no club. (The password form's Admin link is POST /api/register in register.go.)
func RegisterGoogle(d Deps, g *google.Handlers) (func(*http.ServeMux), error) {
	if g == nil {
		return nil, errors.New("register: Google registration needs the Google handlers")
	}
	fin, err := claim.NewFinisher(d)
	if err != nil {
		return nil, err
	}
	h := &handlers{pool: d.Pool, svc: d.Service, st: d.Store, fin: fin, now: d.Clock, log: d.Logger}
	if h.now == nil {
		h.now = time.Now
	}
	if h.log == nil {
		h.log = slog.New(slog.DiscardHandler)
	}
	return func(mux *http.ServeMux) {
		mux.Handle("POST /api/register/{clubId}/google", g.Gate(h.postGoogle(g, false)))
		mux.Handle("POST /api/register/google", g.Gate(h.postGoogle(g, true)))
	}, nil
}

func (h *handlers) postGoogle(g *google.Handlers, admin bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if err := h.svc.Limiter().CheckClaim(ctx, httpapi.ClientIPFrom(ctx)); err != nil {
			h.limited(w, r, err)
			return
		}
		body, err := writes.ReadBody(r)
		if err != nil {
			writes.Write(w, r, h.log, err)
			return
		}
		f, issues := parseForm(body, true)
		if issues != nil {
			writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, issues))
			return
		}
		// The Google account is the one the callback verified, never one the body names, and it must have no ROTRA account.
		held, ok := g.Held(r)
		if ok {
			var isNew bool
			if isNew, err = g.IsNew(ctx, held.Email); err != nil {
				h.fin.Unexpected(w, r, "checking a held Google account failed", err)
				return
			}
			ok = isNew
		}
		if !ok {
			writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, map[string]string{"google": google.Message}))
			return
		}
		clubText := r.PathValue("clubId")
		var where link
		if !admin {
			if where, err = linkOf(ctx, sqlcgen.New(h.pool), clubText, r.URL.Query()); err != nil {
				writes.Write(w, r, h.log, err)
				return
			}
		}
		if _, ferr := profile.Parse(f.details); ferr != nil {
			writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, map[string]string{ferr.Field: ferr.Message}))
			return
		}
		var place pgtype.UUID
		if admin {
			if place, err = placeOf(ctx, sqlcgen.New(h.pool), f.cityCode); err != nil {
				writes.Write(w, r, h.log, err)
				return
			}
		}
		f.email = held.Email
		// The attempt is keyed on the Google account, so a retry resumes the same registration.
		token := "registration:google:" + held.Email
		staged, err := h.stage(ctx, stageInput{token: token, clubText: clubText, club: where.club, place: place, email: f.email, phone: f.phone, name: f.details.FullName, nickname: f.details.Nickname})
		if err != nil {
			writes.Write(w, r, h.log, err)
			return
		}
		if !staged {
			h.match(w) // the phone or the Google email already belongs to an account: nothing is created, the held account stays
			return
		}
		if afterStage != nil {
			afterStage()
		}
		h.fin.Complete(w, r, claim.Finish{
			Token: token, Email: f.email, GoogleEmail: f.email, Phone: f.phone, Details: f.details,
			OnRefusal: func(w http.ResponseWriter, code httpapi.ErrorCode, fields map[string]string) bool {
				if code == httpapi.ErrConflict && fields["email"] != "" {
					h.match(w)
					return true
				}
				return false
			},
		}, func(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID, retried bool) {
			g.Drop(w, r) // the held Google account was the proof; it is used now
			h.signedIn(w, r, ident, playerID, retried, where, f)
		})
	}
}
