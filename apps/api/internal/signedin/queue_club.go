package signedin

import (
	"context"
	"crypto/rand"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The club itself: GET /api/club, /api/club/invite, /api/venues, /api/inventory and /api/license. Ports of
// readClubSettings, readClubInvite, readVenues, readInventory and readOwnLicense. None of them checks the entitlement:
// an expired club still sees its own settings, venues, items and license.

// ---- the invite code ----

const (
	inviteAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // CLUB_INVITE_ALPHABET: no I, L, O, 0 or 1
	inviteLength   = 10                                // REAL_INVITE_CODE_LENGTH
	inviteAttempts = 5
)

// newInviteCode is newClubInviteCode: random characters of the alphabet, without modulo bias.
func newInviteCode() (string, error) {
	limit := 256 - (256 % len(inviteAlphabet))
	code := make([]byte, 0, inviteLength)
	buf := make([]byte, inviteLength*2)
	for len(code) < inviteLength {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		for _, b := range buf {
			if int(b) < limit && len(code) < inviteLength {
				code = append(code, inviteAlphabet[int(b)%len(inviteAlphabet)])
			}
		}
	}
	return string(code), nil
}

// isUniqueViolation is the rare clash of a new code with another club's.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// ensureInviteCode is the write inside the club read: a club that has no invite code yet gets one on its first read
// (writeInviteCode with onlyIfMissing), so the code another request just wrote is never replaced. It runs on its own
// connection, outside the read-only snapshot. A club that does not exist is not found.
func (s *server) ensureInviteCode(ctx context.Context, club pgtype.UUID) error {
	q := sqlcgen.New(s.pool)
	current, err := q.GetClubInviteCode(ctx, club)
	if errors.Is(err, pgx.ErrNoRows) {
		return errNotFound
	}
	if err != nil {
		return err
	}
	if current.Valid {
		return nil
	}
	for attempt := 0; ; attempt++ {
		code, err := newInviteCode()
		if err != nil {
			return err
		}
		n, err := q.FillClubInviteCode(ctx, sqlcgen.FillClubInviteCodeParams{ClubID: club, Code: pgtype.Text{String: code, Valid: true}})
		if err != nil {
			if !isUniqueViolation(err) || attempt+1 >= inviteAttempts {
				return err
			}
			continue
		}
		if n > 0 {
			return nil
		}
		current, err = q.GetClubInviteCode(ctx, club)
		if errors.Is(err, pgx.ErrNoRows) {
			return errNotFound
		}
		if err != nil {
			return err
		}
		if current.Valid {
			return nil
		}
	}
}

func (s *server) queueInvite(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	code, err := q.GetClubInviteCode(r.Context(), club)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return struct {
		InviteCode string `json:"inviteCode"`
	}{code.String}, nil
}

// ---- GET /api/club ----

type pendingNameChange struct {
	RequestedName string `json:"requestedName"`
	RequestedAt   string `json:"requestedAt"`
}

// clubSettingsDTO is clubSettingsDto plus what readClubSettings adds. The invite code is the club's own: the club
// reads its own code here (B-55: the public club read no longer sends it).
type clubSettingsDTO struct {
	ID                     string             `json:"id"`
	Name                   string             `json:"name"`
	LogoRef                *string            `json:"logoRef"`
	DefaultPlayersPerCourt int16              `json:"defaultPlayersPerCourt"`
	DefaultEntranceFee     *httpapi.Money     `json:"defaultEntranceFee"`
	Description            string             `json:"description"`
	CourtRules             string             `json:"courtRules"`
	PostTemplate           *string            `json:"postTemplate"`
	SelfCheckInEnabled     bool               `json:"selfCheckInEnabled"`
	Revision               string             `json:"revision"`
	FoundingAddress        string             `json:"foundingAddress"`
	City                   string             `json:"city"`
	CityCode               string             `json:"cityCode"`
	Username               string             `json:"username"`
	InviteCode             string             `json:"inviteCode"`
	LicensePricing         string             `json:"licensePricing"`
	LicenseMonthly         *httpapi.Money     `json:"licenseMonthly"`
	LicenseYearly          *httpapi.Money     `json:"licenseYearly"`
	PendingNameChange      *pendingNameChange `json:"pendingNameChange"`
}

func (s *server) queueClub(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	c, err := q.GetQueueClubSettings(ctx, club)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound // the TypeScript throws here (findUniqueOrThrow): a club with a pass always exists
	}
	if err != nil {
		return nil, err
	}
	d := clubSettingsDTO{
		ID: c.ID.String(), Name: c.Name, LogoRef: textPtr(c.LogoRef), DefaultPlayersPerCourt: c.DefaultPlayersPerCourt,
		DefaultEntranceFee: moneyOrNil(c.DefaultEntranceFeeMinor, c.Currency), Description: c.Description.String, CourtRules: c.CourtRules.String,
		PostTemplate: textPtr(c.PostTemplate), SelfCheckInEnabled: c.SelfCheckInEnabled, Revision: httpapi.ToDecimalString(c.Revision),
		FoundingAddress: c.FoundingAddress, City: c.City, CityCode: c.CountryCode + "-" + c.CityCode, Username: c.Username.String,
		InviteCode: c.InviteCode.String, LicensePricing: string(c.LicensePricing),
		LicenseMonthly: moneyOrNil(c.LicenseMonthlyMinor, c.Currency), LicenseYearly: moneyOrNil(c.LicenseYearlyMinor, c.Currency),
	}
	pending, err := q.GetQueueClubPendingNameChange(ctx, club)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		d.PendingNameChange = &pendingNameChange{RequestedName: pending.RequestedName, RequestedAt: httpapi.ToIso(pending.RequestedAt.Time)}
	}
	return struct {
		Club clubSettingsDTO `json:"club"`
	}{d}, nil
}

// ---- GET /api/venues ----

type queueVenueDTO struct {
	ID                 string         `json:"id"`
	ClubID             string         `json:"clubId"`
	Name               string         `json:"name"`
	Address            string         `json:"address"`
	CourtFeePerCourtHr *httpapi.Money `json:"courtFeePerCourtHour"`
	EntranceFee        *httpapi.Money `json:"entranceFee"`
	Revision           string         `json:"revision"`
}

func (s *server) queueVenues(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	rows, err := q.ListQueueClubVenues(r.Context(), club)
	if err != nil {
		return nil, err
	}
	out := make([]queueVenueDTO, 0, len(rows))
	for _, v := range rows {
		out = append(out, queueVenueDTO{
			ID: v.ID.String(), ClubID: v.ClubID.String(), Name: v.Name, Address: v.Address.String,
			CourtFeePerCourtHr: moneyOrNil(v.CourtFeePerCourtHourMinor, v.Currency), EntranceFee: moneyOrNil(v.EntranceFeeMinor, v.Currency),
			Revision: httpapi.ToDecimalString(v.Revision),
		})
	}
	return struct {
		Venues []queueVenueDTO `json:"venues"`
	}{out}, nil
}

// ---- GET /api/inventory ----

type inventoryDTO struct {
	ID            string  `json:"id"`
	ClubID        string  `json:"clubId"`
	Name          string  `json:"name"`
	Category      string  `json:"category"`
	Unit          string  `json:"unit"`
	Stock         int32   `json:"stock"`
	UnitCostMinor int32   `json:"unitCostMinor"`
	Currency      string  `json:"currency"`
	RemovedAt     *string `json:"removedAt"`
	Revision      string  `json:"revision"`
}

// queueInventory is the club's items, not removed, and what the stock is worth in centavos (stock times unit cost).
func (s *server) queueInventory(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	rows, err := q.ListQueueInventory(r.Context(), club)
	if err != nil {
		return nil, err
	}
	items := make([]inventoryDTO, 0, len(rows))
	var value int64
	for _, i := range rows {
		items = append(items, inventoryDTO{
			ID: i.ID.String(), ClubID: i.ClubID.String(), Name: i.Name, Category: string(i.Category), Unit: i.Unit, Stock: i.Stock,
			UnitCostMinor: i.UnitCostMinor, Currency: i.Currency, RemovedAt: isoPtr(i.RemovedAt), Revision: httpapi.ToDecimalString(i.Revision),
		})
		value += int64(i.Stock) * int64(i.UnitCostMinor)
	}
	return struct {
		Items           []inventoryDTO `json:"items"`
		StockValueMinor int64          `json:"stockValueMinor"`
	}{items, value}, nil
}

// ---- GET /api/license ----

// licenseTermDTO is termDto: a term as the club sees it (no admin names).
type licenseTermDTO struct {
	ID                  string        `json:"id"`
	ClubID              string        `json:"clubId"`
	Plan                string        `json:"plan"`
	StartsAt            string        `json:"startsAt"`
	EndsAt              string        `json:"endsAt"`
	ActivatedAt         string        `json:"activatedAt"`
	PricingAtActivation string        `json:"pricingAtActivation"`
	PaidOn              *string       `json:"paidOn"`
	Amount              httpapi.Money `json:"amount"`
	PaymentReference    string        `json:"paymentReference"`
	Notes               string        `json:"notes"`
}

// queueLicense is readOwnLicense. It answers after expiry too, so the club can see its own state.
func (s *server) queueLicense(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	ent, err := q.GetQueueLicense(ctx, club)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	terms, err := q.ListQueueLicenseTerms(ctx, club)
	if err != nil {
		return nil, err
	}
	payments := make([]licenseTermDTO, 0, len(terms))
	for _, t := range terms {
		payments = append(payments, licenseTermDTO{
			ID: t.ID.String(), ClubID: t.ClubID.String(), Plan: string(t.Plan), StartsAt: httpapi.ToIso(t.StartsAt.Time),
			EndsAt: httpapi.ToIso(t.EndsAt.Time), ActivatedAt: httpapi.ToIso(t.ActivatedAt.Time), PricingAtActivation: string(t.PricingAtActivation),
			PaidOn: dateOnly(t.PaidOn), Amount: httpapi.Money{AmountMinor: int64(t.AmountMinor), Currency: t.Currency},
			PaymentReference: t.PaymentReference, Notes: t.Notes.String,
		})
	}
	now := s.now().Truncate(time.Millisecond)
	active := ent.EffectiveAccessEndsAt.Valid && ent.EffectiveAccessEndsAt.Time.Truncate(time.Millisecond).After(now)
	type license struct {
		AccessEndsAt           *string          `json:"accessEndsAt"`
		Active                 bool             `json:"active"`
		PublicPagesDeleteAfter *string          `json:"publicPagesDeleteAfter"`
		Payments               []licenseTermDTO `json:"payments"`
	}
	return struct {
		License license `json:"license"`
	}{license{isoPtr(ent.EffectiveAccessEndsAt), active, isoPtr(ent.DeletePublicPagesAfter), payments}}, nil
}
