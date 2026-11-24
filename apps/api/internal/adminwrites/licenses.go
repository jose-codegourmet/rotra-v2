package adminwrites

import (
	"context"
	"errors"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/license"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// License write: POST /api/clubs/{clubId}/licenses (D-LICENSE, Activate / Renew license). Port of
// apps/admin/src/app/api/clubs/[clubId]/licenses/route.ts and activateLicense and refreshEntitlement in
// packages/db/src/admin/licenses.ts. The directory read is signedin's.

func (s *server) registerLicenses(rt *signedin.Router) {
	rt.Handle("POST /api/clubs/{clubId}/licenses", store.AudienceAdmin, s.admin(s.activateLicense))
}

// Messages of the license rules (the service's own words).
const (
	startsOnRefused = "The term start is computed by ROTRA and cannot be sent."
	planRefused     = "Choose monthly or yearly."
	amountRefused   = "Enter the amount the club paid."
	paidOnRefused   = "Enter the date the club paid."
)

// termDTO is termDto: a recorded term as the club and the admin see it.
type termDTO struct {
	ID                  string    `json:"id"`
	ClubID              string    `json:"clubId"`
	Plan                string    `json:"plan"`
	StartsAt            string    `json:"startsAt"`
	EndsAt              string    `json:"endsAt"`
	ActivatedAt         string    `json:"activatedAt"`
	PricingAtActivation string    `json:"pricingAtActivation"`
	PaidOn              *string   `json:"paidOn"`
	Amount              moneyJSON `json:"amount"`
	PaymentReference    string    `json:"paymentReference"`
	Notes               string    `json:"notes"`
}

// moneyJSON is toMoney: integer minor units and the ISO 4217 currency.
type moneyJSON struct {
	AmountMinor int32  `json:"amountMinor"`
	Currency    string `json:"currency"`
}

func termBody(t sqlcgen.GetClubLicenseTermByIDRow) struct {
	Term termDTO `json:"term"`
} {
	var paidOn *string
	if t.PaidOn.Valid {
		d := t.PaidOn.Time.Format("2006-01-02")
		paidOn = &d
	}
	return struct {
		Term termDTO `json:"term"`
	}{termDTO{
		ID: t.ID.String(), ClubID: t.ClubID.String(), Plan: string(t.Plan), StartsAt: httpapi.ToIso(t.StartsAt.Time),
		EndsAt: httpapi.ToIso(t.EndsAt.Time), ActivatedAt: httpapi.ToIso(t.ActivatedAt.Time),
		PricingAtActivation: string(t.PricingAtActivation), PaidOn: paidOn, Amount: moneyJSON{t.AmountMinor, t.Currency},
		PaymentReference: t.PaymentReference, Notes: t.Notes.String,
	}}
}

// activateLicense is the POST handler and activateLicense. The order is the TypeScript's: the JSON body, a term
// start in the body (refused whatever it holds), the plan, then in one transaction the club row lock (a missing club
// is `not_found`), the command lookup (a repeated command answers the term it recorded; another club's is a
// `conflict`), the amount and the date paid, and the writes: the term, the running expiry cycle cancelled, the
// entitlement refreshed and the audit event.
//
// The period is computed, never sent (D-2026-11-11-06): a club with access starts the moment it ends, any other
// club now, and the end is one month or twelve on, the way Date.setUTCMonth adds them. A free club records 0 and no
// date paid. The amount of a paid club has no fallback to the listed price: the route reads a missing amount as NaN.
//
// Three things the TypeScript crashes on (a 500) are answered `invalid` or `not_found` here, logged in the plan: a
// club ID or command ID Postgres refuses, and a date paid that is not a date.
func (s *server) activateLicense(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if body.Has("startsOn") || body.Has("startsAt") {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"startsOn": startsOnRefused})
	}
	var plan license.Plan
	var months int
	switch body.Text("plan") {
	case "Yearly":
		plan, months = license.Yearly, 12
	case "Monthly":
		plan, months = license.Monthly, 1
	default:
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"plan": planRefused})
	}
	amount := body.Number("amountMinor")
	paidOn, _ := body["paidOn"].(string) // a value that is not a string is no date
	notes := fields.JSTrim(body.Text("reference"))
	clubID, ok := pgUUID(r.PathValue("clubId"))
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	var out any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		c, err := q.LockClubForWrite(ctx, clubID)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		liveupdates.Note(ctx, c.ID, pgtype.UUID{}) // the club's license (what its Queue app may do) and the Admin lists change
		command, ok := pgUUID(body.Text("sourceCommandId"))
		if !ok {
			return writes.Fail(httpapi.ErrInvalid, nil)
		}
		repeated, err := q.GetClubLicenseTermByCommand(ctx, command)
		switch {
		case err == nil:
			if repeated.ClubID != c.ID {
				return writes.Fail(httpapi.ErrConflict, nil)
			}
			out = termBody(sqlcgen.GetClubLicenseTermByIDRow(repeated))
			return nil
		case !errors.Is(err, pgx.ErrNoRows):
			return err
		}
		now := s.stamp().Time
		free := c.LicensePricing == sqlcgen.LicensePricingFree
		amountMinor := int64(0)
		if !free {
			if !club.IsSafeInteger(amount) || amount < 0 {
				return writes.Fail(httpapi.ErrInvalid, map[string]string{"amount": amountRefused})
			}
			amountMinor = int64(amount)
			if paidOn == "" {
				return writes.Fail(httpapi.ErrInvalid, map[string]string{"paidOn": paidOnRefused})
			}
		}
		var paidDate pgtype.Date
		if !free {
			d, ok := license.ParsePaidOn(paidOn)
			if !ok {
				return writes.Fail(httpapi.ErrInvalid, map[string]string{"paidOn": paidOnRefused})
			}
			paidDate = pgtype.Date{Time: d, Valid: true}
		}
		entitlement, err := q.GetClubEntitlement(ctx, c.ID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		// A renewal stacks after the current term; a lapsed or never-licensed club starts today. JavaScript keeps
		// milliseconds, so the stored access end is read as the milliseconds it holds.
		startsAt := now
		if end := entitlement.EffectiveAccessEndsAt; end.Valid && msFloor(end.Time).After(now) {
			startsAt = msFloor(end.Time)
		}
		endsAt := license.AddMonthsOverflow(startsAt, months)
		count, err := q.CountClubLicenseTerms(ctx)
		if err != nil {
			return err
		}
		termID, err := newUUID()
		if err != nil {
			return err
		}
		if amountMinor > math.MaxInt32 { // the column is a 32-bit integer; Prisma fails the write
			return errors.New("license amount does not fit the column")
		}
		if err := q.InsertClubLicenseTerm(ctx, sqlcgen.InsertClubLicenseTermParams{
			ID: termID, ClubID: c.ID, Plan: sqlcgen.LicensePlan(lower(plan)), StartsAt: tstz(startsAt), EndsAt: tstz(endsAt),
			ActivatedByAdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, ActivatedAt: tstz(now), SourceCommandID: command,
			PricingAtActivation: c.LicensePricing, PaidOn: paidDate, AmountMinor: int32(amountMinor), Currency: c.Currency,
			PaymentReference: license.PaymentReference(count), Notes: pgtype.Text{String: notes, Valid: notes != ""},
		}); err != nil {
			return err
		}
		if err := q.CancelRunningExpiryCycles(ctx, sqlcgen.CancelRunningExpiryCyclesParams{ClubID: c.ID, CancelledAt: tstz(now), CancellationTermID: termID}); err != nil {
			return err
		}
		if err := refreshEntitlement(ctx, q, c.ID, now); err != nil {
			return err
		}
		action := "club.license_activated"
		if entitlement.EffectiveTermID.Valid {
			action = "club.license_renewed"
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: action, TargetType: "club", TargetID: uuid.UUID(c.ID.Bytes).String(), SourceCommandID: command,
			Metadata: map[string]any{"plan": lower(plan), "amountMinor": amountMinor, "termId": uuid.UUID(termID.Bytes).String()},
		}); err != nil {
			return err
		}
		t, err := q.GetClubLicenseTermByID(ctx, termID)
		if err != nil {
			return err
		}
		out = termBody(t)
		return nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

// refreshEntitlement is refreshEntitlement: it recomputes a club's access projection from its terms at now. The
// term that has started with the latest end wins; it is live when it ends after now. Without a live term the club's
// running expiry cycle goes on, or, when there is none but there was a term, a new cycle starts (six months to the
// deletion of the public pages) and the club's live pages are put under it. Call it with the club row locked.
func refreshEntitlement(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, now time.Time) error {
	latest, err := q.LatestStartedLicenseTerm(ctx, sqlcgen.LatestStartedLicenseTermParams{ClubID: club, StartsAt: tstz(now)})
	hasLatest := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	latestEnd := msFloor(latest.EndsAt.Time)
	live := hasLatest && latestEnd.After(now)
	running, err := q.GetRunningExpiryCycle(ctx, club)
	hasRunning := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var cycle pgtype.UUID
	switch {
	case live:
	case hasRunning:
		cycle = running
	case hasLatest:
		id, err := newUUID()
		if err != nil {
			return err
		}
		if err := q.InsertExpiryCycle(ctx, sqlcgen.InsertExpiryCycleParams{
			ID: id, ClubID: club, ExpiredAt: tstz(latestEnd),
			DeletePublicPagesAfter: tstz(license.AddMonthsOverflow(latestEnd, license.RetentionMonths)), CreatedAt: tstz(now),
		}); err != nil {
			return err
		}
		cycle = id
		// Each later expiry is a new cycle; pages are retained under it, never an old deadline.
		if err := q.RetainPublicationsUnderCycle(ctx, sqlcgen.RetainPublicationsUnderCycleParams{ClubID: club, ExpiryCycleID: id, UpdatedAt: tstz(now)}); err != nil {
			return err
		}
	}
	up := sqlcgen.UpsertClubEntitlementParams{ClubID: club, CurrentExpiryCycleID: cycle, RefreshedAt: tstz(now)}
	if live {
		up.EffectiveTermID, up.EffectiveAccessEndsAt = latest.ID, tstz(latestEnd)
	}
	return q.UpsertClubEntitlement(ctx, up)
}

// msFloor is the instant as JavaScript holds it: milliseconds, the rest dropped.
func msFloor(t time.Time) time.Time { return t.Truncate(time.Millisecond) }

func tstz(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func lower(p license.Plan) string {
	if p == license.Yearly {
		return "yearly"
	}
	return "monthly"
}
