// Package register is the Player app's guest registration (go-writes-admin-player slice 6b): POST /api/register/{clubId}, where a
// visitor registers a ROTRA Player account through a club's invite link (?k=) or a session link (?session=). It ports
// apps/player/src/app/api/register/[clubId]/route.ts and registerGuest in packages/db/src/player/guest-registration.ts.
//
// The TypeScript registration is a staged claim: registerGuest stages an unclaimed player, its private contact, its RTR ID and a
// claim link (keyed on the digest of "registration:<attempt>", so a retry finds it), then registerFromClaim creates the login at
// Supabase, signs the player in and saves the details. Go has no provider: it stages the same rows and finishes them with the
// claim's own transaction (internal/auth/claim, which makes the identity in `auth_identities` in place of the provider login),
// then signs the player in like POST /api/claim/{token}. After that the player's clubs' records join the account and the player
// joins the club, as separate, best-effort steps that never fail the answer (a failure is only logged).
//
// The route answers only the Player app (X-Rotra-App: player, set by its proxy.ts); another app or none is the catalog's 404. It
// is not in the proxy guard's open list, so it answers 404 without the proxy secret. It counts against the claim's per-address
// limit (R4: 30 per hour), which the TypeScript route has no limit for. Errors use the Route Handler envelope.
package register

import (
	"context"
	"crypto/sha256"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// AppHeader names the app a request is for; the registration answers "player" only.
const AppHeader = claim.AppHeader

// limitMessage is the human text of the 429: no registration throttle copy exists, so the claim's sentence is reused;
// Retry-After carries the real wait.
const limitMessage = "Too many requests. Try again in a minute."

// Deps is what the route is built from. It takes the claim's, because it finishes a claim.
type Deps = claim.Deps

type handlers struct {
	pool *pgxpool.Pool
	svc  *session.Service
	st   *store.Store
	fin  *claim.Finisher
	now  func() time.Time
	log  *slog.Logger
}

// Register builds the route.
func Register(d Deps) (func(*http.ServeMux), error) {
	if d.Pool == nil || d.Service == nil || d.Store == nil {
		return nil, errors.New("register: the route needs a pool, a session service and a store")
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
		mux.Handle("POST /api/register/{clubId}", http.HandlerFunc(h.post))
		// The Admin link (D-2026-11-20-01): no club and no session; the player picks a city for the RTR ID.
		mux.Handle("POST /api/register", http.HandlerFunc(h.postAdmin))
	}, nil
}

// stamp is `new Date()`: the clock in milliseconds, as Prisma stores it.
func (h *handlers) stamp() time.Time { return h.now().Truncate(time.Millisecond) }

// post is the route. In order: the app header; the claim's per-address limit; the body (readJsonBody) and the form's checks
// (zod); the link (404); the password policy and the details the table can hold (checks the TypeScript makes only after the
// account exists, or never: see the deviations log); the staging; the claim; the sign-in.
func (h *handlers) post(w http.ResponseWriter, r *http.Request) { h.handle(w, r, false) }

// postAdmin is the Admin link's route: the same registration with no club or session link, the RTR ID's place from the picked city,
// and the player joins no club.
func (h *handlers) postAdmin(w http.ResponseWriter, r *http.Request) { h.handle(w, r, true) }

func (h *handlers) handle(w http.ResponseWriter, r *http.Request, admin bool) {
	ctx := r.Context()
	if store.Audience(r.Header.Get(AppHeader)) != store.AudiencePlayer {
		httpapi.WriteError(w, httpapi.ErrNotFound, nil)
		return
	}
	if err := h.svc.Limiter().CheckClaim(ctx, httpapi.ClientIPFrom(ctx)); err != nil {
		h.limited(w, r, err)
		return
	}
	body, err := writes.ReadBody(r)
	if err != nil {
		writes.Write(w, r, h.log, err)
		return
	}
	f, issues := parseForm(body, false)
	if issues != nil {
		writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, issues))
		return
	}
	clubText := r.PathValue("clubId")
	var where link
	if !admin {
		var err error
		if where, err = linkOf(ctx, sqlcgen.New(h.pool), clubText, r.URL.Query()); err != nil {
			writes.Write(w, r, h.log, err)
			return
		}
	}
	if err := password.Validate(f.password); err != nil {
		writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, map[string]string{"password": password.Message(err)}))
		return
	}
	if _, ferr := profile.Parse(f.details); ferr != nil {
		writes.Write(w, r, h.log, writes.Fail(httpapi.ErrInvalid, map[string]string{ferr.Field: ferr.Message}))
		return
	}

	// Where the RTR ID takes its place from: the club's founding city, or for the Admin link the founding city the player picked.
	var place pgtype.UUID
	if admin {
		if place, err = placeOf(ctx, sqlcgen.New(h.pool), f.cityCode); err != nil {
			writes.Write(w, r, h.log, err)
			return
		}
	}

	token := "registration:" + f.attempt
	staged, err := h.stage(ctx, stageInput{token: token, clubText: clubText, club: where.club, place: place, email: f.email, phone: f.phone, name: f.details.FullName, nickname: f.details.Nickname})
	if err != nil {
		writes.Write(w, r, h.log, err)
		return
	}
	if !staged {
		h.match(w)
		return
	}
	if afterStage != nil {
		afterStage()
	}
	h.fin.Complete(w, r, claim.Finish{
		Token: token, Email: f.email, Password: f.password, Phone: f.phone, Details: f.details,
		// A login that another account won after the preflight is never used: the answer is the same match.
		OnRefusal: func(w http.ResponseWriter, code httpapi.ErrorCode, fields map[string]string) bool {
			if code == httpapi.ErrConflict && fields["email"] != "" {
				h.match(w)
				return true
			}
			return false
		},
	}, func(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID, retried bool) {
		h.signedIn(w, r, ident, playerID, retried, where, f)
	})
}

// afterStage is a test seam, nil in production: a test runs a competing write between the staging and the claim.
var afterStage func()

// match is MATCH: the phone or email already belongs to an account. The answer says nothing else, and nobody is signed in.
func (h *handlers) match(w http.ResponseWriter) {
	httpapi.WriteJSON(w, http.StatusOK, map[string]string{"status": "account-match"}, httpapi.Private)
}

// registered is what a finished registration answers (finishRegistration). joinedClubs is there only when an email-saved
// record of other clubs joined the account.
type registered struct {
	Status    string    `json:"status"`
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
	JoinedClubs  []string `json:"joinedClubs,omitempty"`
	ClubName     *string  `json:"clubName"`
	SessionSlug  *string  `json:"sessionSlug"`
	SessionTitle *string  `json:"sessionTitle"`
}

// signedIn runs once the account exists: a retry saves the details again (registerFromClaim does, every time), the clubs'
// records join, the player joins the club, and the session and its cookies are issued with the answer.
func (h *handlers) signedIn(w http.ResponseWriter, r *http.Request, ident store.Identity, playerID uuid.UUID, retried bool, where link, f form) {
	ctx := context.WithoutCancel(r.Context())
	if retried {
		if err := h.resave(ctx, playerID, f.details); err != nil {
			h.fin.Unexpected(w, r, "saving the details of a registration retry failed", err)
			return
		}
	}
	joined := h.joinRecords(ctx, playerID, f)
	// The Admin link adds the player to no club (D-2026-11-09-06).
	if where.club.Valid {
		h.joinClub(ctx, playerID, where.club)
	}

	row, err := sqlcgen.New(h.pool).GetPlayerClaimResult(ctx, pgtype.UUID{Bytes: playerID, Valid: true})
	if err != nil {
		h.fin.Unexpected(w, r, "reading a registered player failed", err)
		return
	}
	if !h.fin.Issue(w, r, ident, playerID) {
		return
	}
	var nick *string
	if row.Nickname.Valid {
		nick = &row.Nickname.String
	}
	b := registered{Status: "registered", JoinedClubs: joined, SessionSlug: where.sessionSlug, SessionTitle: where.sessionTitle}
	if where.club.Valid {
		b.ClubName = &where.clubName
	}
	b.PlayerID, b.FirstName = playerID, fields.FirstName(row.FullName, nick)
	if row.RtrID.Valid {
		b.RTRID = row.RtrID.String
	}
	b.Session.Account.ID, b.Session.Account.Name, b.Session.Account.Audience = playerID, row.FullName, string(store.AudiencePlayer)
	httpapi.WriteJSON(w, http.StatusOK, b, httpapi.Private)
}

// resave is saveDetails again, as a retry of a registration whose answer was lost does it: the same details, under the
// current revision.
func (h *handlers) resave(ctx context.Context, playerID uuid.UUID, in profile.Input) error {
	d, ferr := profile.Parse(in)
	if ferr != nil {
		return errors.New(ferr.Message)
	}
	now := h.stamp()
	return h.st.InTxWith(ctx, func(tx pgx.Tx, _ *store.Queries) error {
		_, err := profile.Save(ctx, tx, playerID, d, nil, now)
		return err
	})
}

// joinRecords links the clubs' records that are this person's: the shared entry of the registering email, then every record
// whose private phone is this phone. Both repeat safely. It is best effort: the account is made and signed in, so a failure
// is logged and the answer is still "registered" (the player can tap Join from the same link). It returns the names of the
// clubs whose email-saved records joined, in name order.
func (h *handlers) joinRecords(ctx context.Context, playerID uuid.UUID, f form) []string {
	var names []string
	now := h.stamp()
	err := h.st.InTxWith(ctx, func(tx pgx.Tx, _ *store.Queries) error {
		linked, err := identity.ClaimSharedEntry(ctx, tx, playerID, []string{f.email}, now)
		if err != nil {
			return err
		}
		if len(linked) > 0 {
			ids := make([]pgtype.UUID, len(linked))
			for i, l := range linked {
				ids[i] = pgtype.UUID{Bytes: l.ClubID, Valid: true}
			}
			names, err = sqlcgen.New(tx).ListClubNamesByID(ctx, ids)
			if err != nil {
				return err
			}
		}
		_, err = identity.LinkClubRecordsByPhone(ctx, tx, playerID, f.phone, now)
		return err
	})
	if err != nil {
		h.log.ErrorContext(ctx, "linking club records after a registration failed", "error", err.Error())
		return nil
	}
	return names
}

// joinClub saves the player to the club the link is from (addPlayerToClub). Best effort, like joinRecords. A second join that
// raced the first made the same row: already joined.
func (h *handlers) joinClub(ctx context.Context, playerID uuid.UUID, club pgtype.UUID) {
	now := pgtype.Timestamptz{Time: h.stamp(), Valid: true}
	err := writes.InTx(ctx, h.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		return clubjoin.AddToClub(ctx, q, now, pgtype.UUID{Bytes: playerID, Valid: true}, club)
	})
	if err != nil && !writes.IsUniqueViolation(err) {
		h.log.ErrorContext(ctx, "joining the club after a registration failed", "error", err.Error())
	}
}

// limited answers a limiter refusal as the 429 envelope; any other limiter failure is a 503, like the claim's.
func (h *handlers) limited(w http.ResponseWriter, r *http.Request, err error) {
	var limited *session.RateLimitedError
	if errors.As(err, &limited) {
		httpapi.WriteRateLimited(w, limited.RetryAfterSeconds(), limitMessage)
		return
	}
	h.log.ErrorContext(r.Context(), "the registration limiter failed", "request_id", httpapi.RequestIDFrom(r.Context()), "error", err.Error())
	httpapi.WriteError(w, httpapi.ErrUnavailable, nil)
}

// digestOf is the stored form of a token: SHA-256 of its UTF-8 bytes.
func digestOf(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

// placeOf is placeOf for the Admin link: the founding city `PH-CEB` the player picked, one ROTRA knows (location_codes, Admin-managed). No
// city is allowed only for an email with an open shared entry, which keeps that RTR ID; the allocation refuses the rest with the city
// question. A city ROTRA does not know is refused here, before anything is staged.
func placeOf(ctx context.Context, q *sqlcgen.Queries, cityCode string) (pgtype.UUID, error) {
	parts := strings.Split(strings.ToUpper(fields.JSTrim(cityCode)), "-")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return pgtype.UUID{}, nil
	}
	id, err := q.FindLocationCode(ctx, sqlcgen.FindLocationCodeParams{CountryCode: parts[0], CityCode: parts[1]})
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"cityCode": cityRequired})
	}
	return id, err
}
