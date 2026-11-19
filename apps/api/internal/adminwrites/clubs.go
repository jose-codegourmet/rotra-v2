package adminwrites

import (
	"context"
	"errors"
	"math"
	"net/http"
	"strings"
	"unicode/utf16"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Add club: POST /api/clubs (A-ADD-CLUB, Create club). Port of apps/admin/src/app/api/clubs/route.ts POST and stageClub and
// provisionClubAccount in packages/db/src/admin/clubs.ts. The directory read is signedin's.

func (s *server) registerClubs(rt *signedin.Router) {
	rt.Handle("POST /api/clubs", store.AudienceAdmin, s.admin(s.createClub))
}

// Messages of Add club (the service's own words).
const (
	passwordShort   = "Use at least 8 characters."
	locationMissing = "Choose the founding city."
	clubFields      = "Enter a club name, address and username."
	clubTaken       = "A club with this name or username already exists."
	// clubAuthProvider is the auth_provider of an account that signs in with ROTRA's own sign-in (auth_identities),
	// as the player accounts of a claim have it. The TypeScript wrote "supabase".
	clubAuthProvider = "rotra"
)

// utf16Len is String.length: UTF-16 code units, so a letter outside the basic plane counts twice.
func utf16Len(s string) int { return len(utf16.Encode([]rune(s))) }

// createClub is the POST handler. The order is the TypeScript's: the JSON body; the password (8 UTF-16 units at least,
// `invalid` on `password`); the founding city (`invalid` on `location`); the club's name, address and username
// (`invalid` on `club`); the price (`invalid` on `price`); the command ID; then one transaction.
//
// The TypeScript runs two stages with the provider between them: stageClub commits the club, its account (no sign-in
// yet), its entitlement row and the `club.created` event, then the provider makes the club's login, then
// provisionClubAccount records it and the `club.account_provisioned` event. Go has no provider, so both stages are one
// transaction: the club, the account, the entitlement, the sign-in identity (audience club, the username as login key,
// argon2id), the account pointing at it, and both events, or none of them. The writes are in the TypeScript's order, and
// the account is written then updated, so its revision is 2 as there.
//
// A retried command finds its club: one with a sign-in answers as it did; one staged by the TypeScript that never got its
// login (the provider failed) is resumed: the sign-in is made now with the password sent now.
//
// A password is 8 characters or more as the route says, and at most 1024 (the hash limit of the shared password rules; the
// TypeScript has none). A command ID that is no UUID is `invalid` here, a 500 there. A price beyond the 32-bit column is
// an unexpected error in both.
func (s *server) createClub(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	price := body.Object("price")
	pw := body.Text("password")
	if utf16Len(pw) < 8 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"password": passwordShort})
	}
	if errors.Is(password.Validate(pw), password.ErrTooLong) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"password": password.MessageTooLong})
	}
	country, city := splitCityCode(body.Text("cityCode"))
	name := fields.JSTrim(body.Text("name"))
	address := fields.JSTrim(body.Text("foundingAddress"))
	username := club.NormalizeUsername(body.Text("username"))
	free := price.Text("pricing") == "free"
	monthly, yearly := price.Number("monthly"), price.Number("yearly")
	command, commandOK := pgUUID(body.Text("sourceCommandId"))

	// The founding city is looked up outside any transaction, as findLocationCode is in the route.
	var location pgtype.UUID
	if country != "" && city != "" {
		location, err = sqlcgen.New(s.pool).FindLocationCode(r.Context(), sqlcgen.FindLocationCodeParams{CountryCode: country, CityCode: city})
	} else {
		err = pgx.ErrNoRows
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"location": locationMissing})
	}
	if err != nil {
		return writes.Result{}, err
	}
	if name == "" || address == "" || username == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"club": clubFields})
	}
	if !free {
		if msg, ok := club.CheckPaid(monthly, yearly); !ok {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"price": msg})
		}
	}
	if !commandOK {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	// The password is hashed once, before the transaction: the hash costs far more than a statement and must not hold
	// a connection and the locks of the transaction.
	hash, err := s.hasher.Hash(r.Context(), pw)
	if err != nil {
		return writes.Result{}, err
	}
	var out struct {
		ClubID string `json:"clubId"`
		Name   string `json:"name"`
	}
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		clubID, clubName, err := s.stageClub(ctx, q, p, command, location, name, address, username, free, monthly, yearly)
		if err != nil {
			return err
		}
		if err := s.provisionClub(ctx, q, p, clubID, hash); err != nil {
			return err
		}
		out.ClubID, out.Name = uuid.UUID(clubID.Bytes).String(), clubName
		return nil
	})
	if writes.IsUniqueViolation(err) {
		// The name or username of another club, or one made at the same moment, or a sign-in that has the username.
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"name": clubTaken})
	}
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

// splitCityCode is findLocationCode's `code.split('-')`: the first two parts, country and city. A code with a part
// missing or empty gives none, and any part after the second is ignored.
func splitCityCode(code string) (country, city string) {
	parts := strings.Split(code, "-")
	if len(parts) < 2 {
		return "", ""
	}
	return parts[0], parts[1]
}

// stageClub is stageClub (stage 1): the club, its account with no sign-in yet, its entitlement row and the
// `club.created` event, repeat-safe on the command: a command that already made a club answers that club and writes
// nothing. A free club stores no paid amounts.
func (s *server) stageClub(ctx context.Context, q *sqlcgen.Queries, p session.Principal, command, location pgtype.UUID, name, address, username string, free bool, monthly, yearly float64) (pgtype.UUID, string, error) {
	existing, err := q.GetClubBySourceCommand(ctx, command)
	if err == nil {
		return existing.ID, existing.Name, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, "", err
	}
	id, err := newUUID()
	if err != nil {
		return pgtype.UUID{}, "", err
	}
	invite, err := newInviteCode()
	if err != nil {
		return pgtype.UUID{}, "", err
	}
	now := s.stamp()
	in := sqlcgen.InsertClubParams{
		ID: id, Name: name, NameKey: club.NameKey(name), FoundingLocationCodeID: location, FoundingAddress: address,
		LicensePricing: sqlcgen.LicensePricingFree, SourceCommandID: command, InviteCode: pgtype.Text{String: invite, Valid: true}, CreatedAt: now,
	}
	pricing := "free"
	if !free {
		pricing = "paid"
		if monthly > math.MaxInt32 || yearly > math.MaxInt32 { // the columns are 32-bit integers; Prisma fails the write
			return pgtype.UUID{}, "", errors.New("club price does not fit the column")
		}
		in.LicensePricing = sqlcgen.LicensePricingPaid
		in.LicenseMonthlyMinor = pgtype.Int4{Int32: int32(monthly), Valid: true}
		in.LicenseYearlyMinor = pgtype.Int4{Int32: int32(yearly), Valid: true}
	}
	if err := q.InsertClub(ctx, in); err != nil {
		return pgtype.UUID{}, "", err
	}
	if err := q.InsertClubAccount(ctx, sqlcgen.InsertClubAccountParams{ClubID: id, Username: username, AuthProvider: clubAuthProvider, CreatedAt: now}); err != nil {
		return pgtype.UUID{}, "", err
	}
	if err := q.InsertClubEntitlement(ctx, sqlcgen.InsertClubEntitlementParams{ClubID: id, RefreshedAt: now}); err != nil {
		return pgtype.UUID{}, "", err
	}
	if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
		Action: "club.created", TargetType: "club", TargetID: uuid.UUID(id.Bytes).String(), SourceCommandID: command,
		Metadata: map[string]any{"pricing": pricing},
	}); err != nil {
		return pgtype.UUID{}, "", err
	}
	return id, name, nil
}

// provisionClub is provisionClubAccount (stage 2) without the provider: it makes the club's sign-in identity, points the
// account at it, and records `club.account_provisioned`. An account that already has its sign-in is left as it is. The
// club row is locked first, so two retries at once make one identity: the second finds the account provisioned.
func (s *server) provisionClub(ctx context.Context, q *sqlcgen.Queries, p session.Principal, clubID pgtype.UUID, hash string) error {
	if _, err := q.LockClubForWrite(ctx, clubID); err != nil {
		return err
	}
	account, err := q.GetClubAccountForProvision(ctx, clubID)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return err
	}
	if account.ProvisionedAt.Valid {
		return nil
	}
	now := s.stamp()
	identity := store.NewID()
	if _, err := q.InsertAuthIdentity(ctx, sqlcgen.InsertAuthIdentityParams{
		ID: pgtype.UUID{Bytes: identity, Valid: true}, Audience: string(store.AudienceClub), LoginKey: loginKey(account.Username),
		PasswordHash: hash, PasswordScheme: store.SchemeArgon2id, Now: now,
	}); err != nil {
		return err
	}
	if err := q.ProvisionClubAccount(ctx, sqlcgen.ProvisionClubAccountParams{ClubID: clubID, AuthSubject: pgtype.UUID{Bytes: identity, Valid: true}, ProvisionedAt: now}); err != nil {
		return err
	}
	return s.recordAudit(ctx, q, p.AccountID, auditEvent{Action: "club.account_provisioned", TargetType: "club", TargetID: uuid.UUID(clubID.Bytes).String()})
}

// loginKey is the key sign-in looks a club up by: the username as typed, trimmed and lower-cased (signin/credentials.go
// signIn), so a club signs in with the username it was shown.
func loginKey(username string) string { return strings.ToLower(strings.TrimSpace(username)) }
