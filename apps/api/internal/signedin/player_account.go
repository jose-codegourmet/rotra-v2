package signedin

import (
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The signed-in Player's own account reads. Ports of apps/player/src/app/api/{me/account,me/clubs,
// me/verification,account/contact-change}/route.ts and packages/db/src/player/{profile,my-clubs,
// account-verification,contact-change}.ts. Every read is scoped to the player in the pass.

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func isoPtr(t pgtype.Timestamptz) *string {
	if !t.Valid {
		return nil
	}
	s := httpapi.ToIso(t.Time)
	return &s
}

// ---- GET /api/me/account ----

// accountDTO is MyAccount: the player's own contacts, phone privacy, visibility and Google identity.
type accountDTO struct {
	PlayerID            string  `json:"playerId"`
	Phone               string  `json:"phone"`
	Email               string  `json:"email"`
	PhoneHidden         bool    `json:"phoneHidden"`
	ProfileVisibility   string  `json:"profileVisibility"`
	HiddenFromDirectory bool    `json:"hiddenFromDirectory"`
	GoogleEmail         *string `json:"googleEmail"`
	GoogleLinkedAt      *string `json:"googleLinkedAt"`
	HasPassword         bool    `json:"hasPassword"`
	Revision            string  `json:"revision"`
}

// readMyAccount is readMyAccount. A missing player is an unexpected failure (findUniqueOrThrow), so a 500.
func readMyAccount(r *http.Request, q *sqlcgen.Queries, who viewer) (accountDTO, error) {
	row, err := q.GetMyAccount(r.Context(), who.ID)
	if err != nil {
		return accountDTO{}, err
	}
	google := textPtr(row.GoogleEmail)
	dto := accountDTO{
		PlayerID: row.ID.String(), Phone: row.PhoneE164.String, Email: row.Email.String,
		PhoneHidden: row.HidePhoneFromClubs, ProfileVisibility: string(row.ProfileVisibility),
		HiddenFromDirectory: row.HiddenFromDirectory, GoogleEmail: google, GoogleLinkedAt: isoPtr(row.GoogleLinkedAt),
		HasPassword: true, Revision: httpapi.ToDecimalString(row.Revision),
	}
	// Only an account made with Google can have no password, so the sign-in identity is asked only then.
	if google != nil && *google != "" && row.AccountPlayerID.Valid {
		present, err := q.IdentityHasPassword(r.Context(), row.AuthSubject)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return accountDTO{}, err
		}
		dto.HasPassword = err == nil && present
	}
	return dto, nil
}

func (s *server) myAccount() http.Handler {
	// Open after the Google deadline too: the connect screen (P-GOOGLE-REQUIRED) shows this account.
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		a, err := readMyAccount(r, q, who)
		if err != nil {
			return nil, err
		}
		return struct {
			Account accountDTO `json:"account"`
		}{a}, nil
	}, withoutGoogle)
}

// ---- GET /api/me/clubs ----

type myClubDTO struct {
	ID        string                  `json:"id"`
	Name      string                  `json:"name"`
	Initials  publicreads.UTF16String `json:"initials"`
	LogoURL   *string                 `json:"logoUrl"`
	JoinedVia string                  `json:"joinedVia"`
}

func (s *server) myClubs() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		rows, err := q.ListMyClubs(r.Context(), who.ID)
		if err != nil {
			return nil, err
		}
		clubs := make([]myClubDTO, 0, len(rows))
		for _, c := range rows {
			via := "club_added"
			if c.ViaSessionLink {
				via = "session_link"
			}
			clubs = append(clubs, myClubDTO{
				ID: c.ID.String(), Name: c.Name, Initials: publicreads.ClubInitials(c.Name), LogoURL: textPtr(c.LogoRef), JoinedVia: via,
			})
		}
		return struct {
			Clubs []myClubDTO `json:"clubs"`
		}{clubs}, nil
	})
}

// ---- GET /api/me/verification ----

// verificationEmail is VerificationEmail: google_missing, match or mismatch.
type verificationEmail struct {
	Kind                string `json:"kind"`
	RotraEmail          string `json:"rotraEmail,omitempty"`
	GoogleEmail         string `json:"googleEmail,omitempty"`
	PendingEmailRequest *bool  `json:"pendingEmailRequest,omitempty"`
}

// verificationDTO is AccountVerification.
type verificationDTO struct {
	PlayerID        string            `json:"playerId"`
	Verified        bool              `json:"verified"`
	VerifiedByAdmin bool              `json:"verifiedByAdmin"`
	CompletedSteps  int               `json:"completedSteps"`
	GoogleEmail     *string           `json:"googleEmail"`
	MaskedPhone     *string           `json:"maskedPhone"`
	Email           verificationEmail `json:"email"`
}

// verification is readVerification: the derived checks plus what notifications need. Nil for a player who is
// not claimed or has no account.
type verification struct {
	dto            verificationDTO
	reminderReadAt pgtype.Timestamptz
}

func normalizeGoogleEmail(s string) string { return strings.ToLower(publicreads.JSTrim(s)) }

func readVerification(r *http.Request, q *sqlcgen.Queries, id pgtype.UUID) (*verification, error) {
	ctx := r.Context()
	facts, err := q.GetVerificationFacts(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	changes, err := q.ListVerificationEmailChanges(ctx, id)
	if err != nil {
		return nil, err
	}
	byAdmin := facts.VerificationOverride.Valid && facts.VerificationOverride.PlayerVerificationOverride == sqlcgen.PlayerVerificationOverrideVerified
	google := normalizeGoogleEmail(facts.GoogleEmail.String)
	phone := publicreads.JSTrim(facts.PhoneE164.String)
	dto := verificationDTO{PlayerID: id.String(), VerifiedByAdmin: byAdmin}
	steps := 0
	if google != "" {
		steps++
		dto.GoogleEmail = &google
	}
	if phone != "" {
		steps++
		masked := maskPhone(phone)
		dto.MaskedPhone = &masked
	}
	switch rotra := normalizeGoogleEmail(facts.Email.String); {
	case google == "":
		dto.Email = verificationEmail{Kind: "google_missing"}
	case rotra == google:
		steps++
		dto.Email = verificationEmail{Kind: "match", RotraEmail: rotra, GoogleEmail: google}
	default:
		pending := false
		for _, c := range changes {
			if normalizeGoogleEmail(c.ProposedValue) == google {
				pending = true
			}
		}
		dto.Email = verificationEmail{Kind: "mismatch", RotraEmail: rotra, GoogleEmail: google, PendingEmailRequest: &pending}
	}
	dto.CompletedSteps = steps
	dto.Verified = byAdmin || steps == 3
	return &verification{dto: dto, reminderReadAt: facts.VerificationReminderReadAt}, nil
}

// maskPhone is maskPhone in @rotra/schema/phone: '+639185550377' becomes '+63 918 ••• ••77'. Input with no
// digits is returned unchanged.
func maskPhone(value string) string {
	var digits []byte
	for i := 0; i < len(value); i++ {
		if value[i] >= '0' && value[i] <= '9' {
			digits = append(digits, value[i])
		}
	}
	if len(digits) == 0 {
		return value
	}
	d := string(digits)
	if len(d) == 11 && d[0] == '0' {
		d = "63" + d[1:]
	}
	country := d[:min(2, len(d))]
	if len(d) > 10 {
		country = d[:len(d)-10]
	}
	rest := d[len(country):]
	tail := rest
	if len(rest) > 2 {
		tail = rest[len(rest)-2:]
	}
	return "+" + country + " " + rest[:min(3, len(rest))] + " ••• ••" + tail
}

func (s *server) myVerification() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		v, err := readVerification(r, q, who.ID)
		if err != nil {
			return nil, err
		}
		var dto *verificationDTO
		if v != nil {
			dto = &v.dto
		}
		return struct {
			Verification *verificationDTO `json:"verification"`
		}{dto}, nil
	})
}

// ---- GET /api/account/contact-change ----

// contactChangeDTO is the player's own view of a request: review evidence is not theirs to see.
type contactChangeDTO struct {
	ID            string  `json:"id"`
	PlayerID      string  `json:"playerId"`
	Field         string  `json:"field"`
	OriginalValue *string `json:"originalValue"`
	ProposedValue string  `json:"proposedValue"`
	Status        string  `json:"status"`
	RequestedAt   string  `json:"requestedAt"`
	AppliedAt     *string `json:"appliedAt"`
	RejectedAt    *string `json:"rejectedAt"`
	SupersededAt  *string `json:"supersededAt"`
}

// statusLabel: approved, applying and failed all read as approved, not applied yet.
func statusLabel(status sqlcgen.ContactChangeStatus) string {
	switch status {
	case sqlcgen.ContactChangeStatusApproved, sqlcgen.ContactChangeStatusApplying, sqlcgen.ContactChangeStatusFailed:
		return "approved_pending"
	}
	return string(status)
}

func (s *server) myContactChange() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		rows, err := q.ListOwnContactChanges(r.Context(), who.ID)
		if err != nil {
			return nil, err
		}
		var latest *contactChangeDTO
		if len(rows) > 0 {
			c := rows[0]
			latest = &contactChangeDTO{
				ID: c.ID.String(), PlayerID: c.PlayerID.String(), Field: string(c.Field), OriginalValue: textPtr(c.OriginalValue),
				ProposedValue: c.ProposedValue, Status: statusLabel(c.Status), RequestedAt: httpapi.ToIso(c.RequestedAt.Time),
				AppliedAt: isoPtr(c.AppliedAt), RejectedAt: isoPtr(c.RejectedAt), SupersededAt: isoPtr(c.SupersededAt),
			}
		}
		return struct {
			Request *contactChangeDTO `json:"request"`
		}{latest}, nil
	})
}

// parseUUIDString reads the 8-4-4-4-12 hex form, either case, and nothing else (the UUID test the TypeScript
// services use on a URL segment or a stored target).
func parseUUIDString(s string) (pgtype.UUID, bool) {
	if len(s) != 36 {
		return pgtype.UUID{}, false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case i == 8 || i == 13 || i == 18 || i == 23:
			if c != '-' {
				return pgtype.UUID{}, false
			}
		case c >= '0' && c <= '9', c >= 'a' && c <= 'f', c >= 'A' && c <= 'F':
		default:
			return pgtype.UUID{}, false
		}
	}
	var id pgtype.UUID
	if err := id.Scan(s); err != nil {
		return pgtype.UUID{}, false
	}
	return id, true
}
