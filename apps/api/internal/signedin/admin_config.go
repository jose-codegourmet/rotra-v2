package signedin

import (
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// Configuration reads: feature flags, ranking settings, the club identity index, a license operation and the two
// profile libraries. Ports of packages/db/src/admin/{configuration,clubs,licenses,profile-banners,profile-characters}.ts.

// ---- GET /api/feature-flags ----

// flagDTO is flagDto: the admin who acted shows by display name, never an ID.
type flagDTO struct {
	Key                  string `json:"key"`
	Name                 string `json:"name"`
	Description          string `json:"description"`
	Value                bool   `json:"value"`
	CreatedAt            string `json:"createdAt"`
	CreatedByDisplayName string `json:"createdByDisplayName"`
	UpdatedAt            string `json:"updatedAt"`
	UpdatedByDisplayName string `json:"updatedByDisplayName"`
	Revision             string `json:"revision"`
}

func (s *server) adminFlags(r *http.Request, q *sqlcgen.Queries) (any, error) {
	rows, err := q.ListAdminFeatureFlags(r.Context())
	if err != nil {
		return nil, err
	}
	flags := make([]flagDTO, 0, len(rows))
	for _, f := range rows {
		flags = append(flags, flagDTO{
			Key: f.Key, Name: f.Name, Description: f.Description, Value: f.Value,
			CreatedAt: httpapi.ToIso(f.CreatedAt.Time), CreatedByDisplayName: f.CreatedByName.String,
			UpdatedAt: httpapi.ToIso(f.UpdatedAt.Time), UpdatedByDisplayName: f.UpdatedByName.String,
			Revision: httpapi.ToDecimalString(f.Revision),
		})
	}
	return struct {
		Flags []flagDTO `json:"flags"`
	}{flags}, nil
}

// ---- GET /api/ranking-settings (Admin's own: the notes and who saved them) ----

// policyDTO is policyDto. It is never evidence that any rank was recalculated (#247).
type policyDTO struct {
	ID                           string `json:"id"`
	Version                      int32  `json:"version"`
	EffectiveAt                  string `json:"effectiveAt"`
	AssessmentWeightBp           int16  `json:"assessmentWeightBp"`
	PerformanceWeightBp          int16  `json:"performanceWeightBp"`
	RecentStandardMatchThreshold int16  `json:"recentStandardMatchThreshold"`
	AlgorithmVersion             string `json:"algorithmVersion"`
	ChangeNote                   string `json:"changeNote"`
	CreatedByDisplayName         string `json:"createdByDisplayName"`
	CreatedAt                    string `json:"createdAt"`
}

func (s *server) adminRankingSettings(r *http.Request, q *sqlcgen.Queries) (any, error) {
	rows, err := q.ListAdminRankingPolicies(r.Context())
	if err != nil {
		return nil, err
	}
	versions := make([]policyDTO, 0, len(rows))
	for _, p := range rows {
		versions = append(versions, policyDTO{
			ID: p.ID.String(), Version: p.Version, EffectiveAt: httpapi.ToIso(p.EffectiveAt.Time),
			AssessmentWeightBp: p.AssessmentWeightBp, PerformanceWeightBp: p.PerformanceWeightBp,
			RecentStandardMatchThreshold: p.RecentStandardMatchThreshold, AlgorithmVersion: p.AlgorithmVersion,
			ChangeNote: p.ChangeNote.String, CreatedByDisplayName: p.CreatedByName.String, CreatedAt: httpapi.ToIso(p.CreatedAt.Time),
		})
	}
	return struct {
		Versions []policyDTO `json:"versions"`
	}{versions}, nil
}

// ---- GET /api/clubs/identity ----

// adminClubIdentity is readClubIdentityIndex: taken club names and account usernames, in the order stored.
func (s *server) adminClubIdentity(r *http.Request, q *sqlcgen.Queries) (any, error) {
	names, err := q.ListClubNames(r.Context())
	if err != nil {
		return nil, err
	}
	usernames, err := q.ListClubUsernames(r.Context())
	if err != nil {
		return nil, err
	}
	return struct {
		Names     []string `json:"names"`
		Usernames []string `json:"usernames"`
	}{stringsOrEmpty(names), stringsOrEmpty(usernames)}, nil
}

// ---- GET /api/license-operations/{commandId} ----

// termDTO is adminTermDto: a recorded term, with the command that recorded it and who did.
type termDTO struct {
	ID                     string        `json:"id"`
	ClubID                 string        `json:"clubId"`
	Plan                   string        `json:"plan"`
	StartsAt               string        `json:"startsAt"`
	EndsAt                 string        `json:"endsAt"`
	ActivatedAt            string        `json:"activatedAt"`
	PricingAtActivation    string        `json:"pricingAtActivation"`
	PaidOn                 *string       `json:"paidOn"`
	Amount                 httpapi.Money `json:"amount"`
	PaymentReference       string        `json:"paymentReference"`
	Notes                  string        `json:"notes"`
	SourceCommandID        string        `json:"sourceCommandId"`
	ActivatedByAdminID     string        `json:"activatedByAdminId"`
	ActivatedByDisplayName string        `json:"activatedByDisplayName"`
}

// adminLicenseOperation is readLicenseOperation: the term a command recorded and whether it was the club's first,
// or null when nothing was saved. The term names no admin here (the read does not include who activated it).
func (s *server) adminLicenseOperation(r *http.Request, q *sqlcgen.Queries) (any, error) {
	type body struct {
		Operation *struct {
			Term  termDTO `json:"term"`
			First bool    `json:"first"`
		} `json:"operation"`
	}
	id, ok := uuidKey(r.PathValue("commandId"))
	if !ok {
		return nil, errNotFound // the TypeScript read answers a 500 for an ID that is not a UUID
	}
	t, err := q.GetLicenseTermByCommand(r.Context(), id)
	if err == pgx.ErrNoRows {
		return body{}, nil
	}
	if err != nil {
		return nil, err
	}
	earlier, err := q.CountEarlierLicenseTerms(r.Context(), sqlcgen.CountEarlierLicenseTermsParams{ClubID: t.ClubID, ActivatedAt: t.ActivatedAt})
	if err != nil {
		return nil, err
	}
	out := body{Operation: &struct {
		Term  termDTO `json:"term"`
		First bool    `json:"first"`
	}{Term: termOf(termRow{
		ID: t.ID, ClubID: t.ClubID, Plan: t.Plan, StartsAt: t.StartsAt, EndsAt: t.EndsAt, ActivatedAt: t.ActivatedAt,
		Pricing: t.PricingAtActivation, PaidOn: t.PaidOn, AmountMinor: t.AmountMinor, Currency: t.Currency,
		PaymentReference: t.PaymentReference, Notes: t.Notes, SourceCommandID: t.SourceCommandID, ActivatedByAdminID: t.ActivatedByAdminID,
	}), First: earlier == 0}}
	return out, nil
}

// termRow is the columns of a recorded term, whichever query read them.
type termRow struct {
	ID, ClubID                          pgtype.UUID
	Plan                                sqlcgen.LicensePlan
	StartsAt, EndsAt, ActivatedAt       pgtype.Timestamptz
	Pricing                             sqlcgen.LicensePricing
	PaidOn                              pgtype.Date
	AmountMinor                         int32
	Currency                            string
	PaymentReference                    string
	Notes                               pgtype.Text
	SourceCommandID, ActivatedByAdminID pgtype.UUID
	ActivatedByName                     pgtype.Text
}

func termOf(t termRow) termDTO {
	return termDTO{
		ID: t.ID.String(), ClubID: t.ClubID.String(), Plan: string(t.Plan),
		StartsAt: httpapi.ToIso(t.StartsAt.Time), EndsAt: httpapi.ToIso(t.EndsAt.Time), ActivatedAt: httpapi.ToIso(t.ActivatedAt.Time),
		PricingAtActivation: string(t.Pricing), PaidOn: dateOnly(t.PaidOn),
		Amount:           httpapi.Money{AmountMinor: int64(t.AmountMinor), Currency: t.Currency},
		PaymentReference: t.PaymentReference, Notes: t.Notes.String,
		SourceCommandID: t.SourceCommandID.String(), ActivatedByAdminID: t.ActivatedByAdminID.String(),
		ActivatedByDisplayName: t.ActivatedByName.String,
	}
}

// ---- GET /api/profile-banners and /api/profile-characters: the whole libraries, hidden ones included ----

type bannerDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"`
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
	IsDefault  bool   `json:"isDefault"`
}

func (s *server) adminBanners(r *http.Request, q *sqlcgen.Queries) (any, error) {
	rows, err := q.ListAdminProfileBanners(r.Context())
	if err != nil {
		return nil, err
	}
	out := make([]bannerDTO, 0, len(rows))
	for _, b := range rows {
		out = append(out, bannerDTO{ID: b.ID, Image: b.Image, Shown: b.Shown, UploadedAt: httpapi.ToIso(b.UploadedAt.Time), Number: b.Number, IsDefault: b.IsDefault})
	}
	return struct {
		Banners []bannerDTO `json:"banners"`
	}{out}, nil
}

type characterDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"`
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
}

func (s *server) adminCharacters(r *http.Request, q *sqlcgen.Queries) (any, error) {
	rows, err := q.ListAdminProfileCharacters(r.Context())
	if err != nil {
		return nil, err
	}
	out := make([]characterDTO, 0, len(rows))
	for _, c := range rows {
		out = append(out, characterDTO{ID: c.ID, Image: c.Image, Shown: c.Shown, UploadedAt: httpapi.ToIso(c.UploadedAt.Time), Number: c.Number})
	}
	return struct {
		Characters []characterDTO `json:"characters"`
	}{out}, nil
}
