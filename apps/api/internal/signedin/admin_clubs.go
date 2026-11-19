package signedin

import (
	"context"
	"net/http"
	"regexp"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The club directory: GET /api/clubs and GET /api/clubs/{clubId}. Ports of readAdminClubDirectory and adminClubDto in
// packages/db/src/admin/clubs.ts.

// adminClubDTO is the Admin view of a club plus what the directory adds: city, terms, a pending name request, the
// running session and the earlier names. The account shows its provisioning state, never a password or subject.
type adminClubDTO struct {
	ID                     string         `json:"id"`
	Name                   string         `json:"name"`
	LogoRef                *string        `json:"logoRef"`
	FoundingLocationCodeID string         `json:"foundingLocationCodeId"`
	FoundingAddress        string         `json:"foundingAddress"`
	LicensePricing         string         `json:"licensePricing"`
	LicenseMonthly         *httpapi.Money `json:"licenseMonthly"`
	LicenseYearly          *httpapi.Money `json:"licenseYearly"`
	Username               *string        `json:"username"`
	AccountState           string         `json:"accountState"`
	CreatedAt              string         `json:"createdAt"`
	Revision               string         `json:"revision"`
	ProvisionedAt          *string        `json:"provisionedAt"`
	City                   string         `json:"city"`
	CityCode               string         `json:"cityCode"`
	Terms                  []termDTO      `json:"terms"`
	PendingNameRequest     *pendingName   `json:"pendingNameRequest"`
	RunningSession         *runningClub   `json:"runningSession"`
	EarlierNames           []string       `json:"earlierNames"`
}

type pendingName struct {
	ID            string `json:"id"`
	RequestedName string `json:"requestedName"`
	RequestedAt   string `json:"requestedAt"`
}

type runningClub struct {
	Title     string `json:"title"`
	VenueName string `json:"venueName"`
	StartedAt string `json:"startedAt"`
}

// accountState is adminClubDto's: missing, disabled, ready or provisioning.
func accountState(c sqlcgen.ListAdminClubsRow) string {
	switch {
	case !c.HasAccount:
		return "missing"
	case c.DisabledAt.Valid:
		return "disabled"
	case c.ProvisionedAt.Valid:
		return "ready"
	}
	return "provisioning"
}

// adminClubDirectory is readAdminClubDirectory: newest club first; an invalid club narrows to nothing.
func adminClubDirectory(ctx context.Context, q *sqlcgen.Queries, clubID pgtype.UUID) ([]adminClubDTO, error) {
	clubs, err := q.ListAdminClubs(ctx, clubID)
	if err != nil {
		return nil, err
	}
	ids := make([]pgtype.UUID, len(clubs))
	text := make([]string, len(clubs))
	for i, c := range clubs {
		ids[i], text[i] = c.ID, c.ID.String()
	}
	termRows, err := q.ListAdminClubTerms(ctx, ids)
	if err != nil {
		return nil, err
	}
	terms := map[pgtype.UUID][]termDTO{}
	for _, t := range termRows {
		terms[t.ClubID] = append(terms[t.ClubID], termOf(termRow{
			ID: t.ID, ClubID: t.ClubID, Plan: t.Plan, StartsAt: t.StartsAt, EndsAt: t.EndsAt, ActivatedAt: t.ActivatedAt,
			Pricing: t.PricingAtActivation, PaidOn: t.PaidOn, AmountMinor: t.AmountMinor, Currency: t.Currency,
			PaymentReference: t.PaymentReference, Notes: t.Notes, SourceCommandID: t.SourceCommandID,
			ActivatedByAdminID: t.ActivatedByAdminID, ActivatedByName: t.ActivatedByName,
		}))
	}
	pendingRows, err := q.ListPendingClubNameRequests(ctx, ids)
	if err != nil {
		return nil, err
	}
	pending := map[pgtype.UUID]*pendingName{}
	for _, p := range pendingRows {
		pending[p.ClubID] = &pendingName{ID: p.ID.String(), RequestedName: p.RequestedName, RequestedAt: httpapi.ToIso(p.RequestedAt.Time)}
	}
	runningRows, err := q.ListRunningClubSessions(ctx, ids)
	if err != nil {
		return nil, err
	}
	running := map[pgtype.UUID]*runningClub{}
	for _, x := range runningRows {
		running[x.ClubID] = &runningClub{Title: x.Title, VenueName: x.VenueName.String, StartedAt: isoOrEmpty(x.StartedAt)}
	}
	earlierRows, err := q.ListClubEarlierNames(ctx, text)
	if err != nil {
		return nil, err
	}
	earlier := map[string][]string{}
	for _, e := range earlierRows {
		earlier[e.TargetID] = append(earlier[e.TargetID], e.BeforeName)
	}
	out := make([]adminClubDTO, 0, len(clubs))
	for _, c := range clubs {
		d := adminClubDTO{
			ID: c.ID.String(), Name: c.Name, LogoRef: textPtr(c.LogoRef), FoundingLocationCodeID: c.FoundingLocationCodeID.String(),
			FoundingAddress: c.FoundingAddress, LicensePricing: string(c.LicensePricing),
			LicenseMonthly: moneyOrNil(c.LicenseMonthlyMinor, c.Currency), LicenseYearly: moneyOrNil(c.LicenseYearlyMinor, c.Currency),
			Username: textPtr(c.Username), AccountState: accountState(c), CreatedAt: httpapi.ToIso(c.CreatedAt.Time),
			Revision: httpapi.ToDecimalString(c.Revision), ProvisionedAt: isoPtr(c.ProvisionedAt),
			City: c.CityName, CityCode: c.CountryCode + "-" + c.CityCode,
			Terms: terms[c.ID], PendingNameRequest: pending[c.ID], RunningSession: running[c.ID],
			EarlierNames: stringsOrEmpty(earlier[c.ID.String()]),
		}
		if d.Terms == nil {
			d.Terms = []termDTO{}
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *server) adminClubs(r *http.Request, q *sqlcgen.Queries) (any, error) {
	clubs, err := adminClubDirectory(r.Context(), q, pgtype.UUID{})
	if err != nil {
		return nil, err
	}
	return struct {
		Clubs []adminClubDTO `json:"clubs"`
	}{clubs}, nil
}

// looseClubID is the check the club read makes on the segment: 36 hex digits or dashes, either case.
var looseClubID = regexp.MustCompile(`^[0-9a-fA-F-]{36}$`)

func (s *server) adminClub(r *http.Request, q *sqlcgen.Queries) (any, error) {
	raw := r.PathValue("clubId")
	if !looseClubID.MatchString(raw) {
		return nil, errNotFound
	}
	id, ok := uuidKey(raw)
	if !ok {
		return nil, errNotFound // the TypeScript read answers a 500 for 36 such characters that are not a UUID
	}
	clubs, err := adminClubDirectory(r.Context(), q, id)
	if err != nil {
		return nil, err
	}
	if len(clubs) == 0 {
		return nil, errNotFound
	}
	return struct {
		Club adminClubDTO `json:"club"`
	}{clubs[0]}, nil
}
