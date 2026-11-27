package queuewrites

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/phone"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Edit details of a saved player (packages/db/src/queue/club-player-details.ts, owner decision 2026-11-08, D-2026-11-16-04): the club
// fills in what it knows about its own guest or unclaimed player. A registered player owns their details. The email is the club's
// once and never changed here; a phone already on file is never replaced. The GET of the same path is a read (signedin).

const (
	detailsNotEditable = "This player registered, so they keep their own details."
	detailsEmailError  = "Enter an email address, like name@example.com."
	detailsPhoneError  = "Enter a Philippine mobile number, like 0917 555 0142."
	ownDetailsVersion  = 1
)

var socialProviders = []string{"facebook", "instagram", "youtube", "linkedin"}

func (s *server) registerClubPlayerDetails(rt *signedin.Router) {
	rt.Handle("PATCH /api/club/players/{clubPlayerId}", store.AudienceClub, s.club(s.editClubPlayerDetails))
}

// detailsAnswer is what Edit details answers: the message for the toast, and who the typed email turned out to be already.
type detailsAnswer struct {
	ClubPlayerID string      `json:"clubPlayerId"`
	Message      string      `json:"message"`
	SamePerson   *samePerson `json:"samePerson"`
}

type samePerson struct {
	ClubPlayerID string `json:"clubPlayerId"`
	Name         string `json:"name"`
}

// editClubPlayerDetails is PATCH /api/club/players/{id}. The route parses the phone before the service runs (so before the
// entitlement check); the service then checks the name, the phone again, and the experience before it reads the saved player.
func (s *server) editClubPlayerDetails(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	typedPhone := fields.JSTrim(body.Text("phone"))
	e164 := ""
	if typedPhone != "" {
		var ok bool
		if e164, ok = phone.Parse(typedPhone); !ok {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"phone": detailsPhoneError})
		}
	}
	links := map[string]string{}
	given := body.Object("socialLinks")
	for _, p := range socialProviders {
		links[p], _ = given[p].(string)
	}
	in := detailsInput{
		fullName: body.Text("fullName"), nickname: body.Text("nickname"), phone: e164, email: body.Text("email"),
		playingStyle: body.Text("playingStyle"), links: links,
	}
	in.years, in.hasYears = body.NumberOrNull("experienceYears")
	in.months, in.hasMonths = body.NumberOrNull("experienceMonths")
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	in.name = fields.JSTrim(in.fullName)
	if in.name == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"fullName": "Enter a name."})
	}
	experience, err := in.experience()
	if err != nil {
		return writes.Result{}, err
	}
	id, err := parseRowID(r.PathValue("clubPlayerId"))
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		return t.updateDetails(id, in, experience)
	})
	return writes.Result{Body: out}, err
}

type detailsInput struct {
	fullName, nickname, phone, email, playingStyle string
	links                                          map[string]string
	years, months                                  float64
	hasYears, hasMonths                            bool
	name                                           string
}

// experience is the months of experience typed, nil when both are empty. Whole years from 0 to 80 and months from 0 to 11.
func (in detailsInput) experience() (*int64, error) {
	years, months := in.years, in.months
	if !in.hasYears {
		years = 0
	}
	if !in.hasMonths {
		months = 0
	}
	whole := func(f float64) bool { return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) }
	if !whole(years) || !whole(months) || years < 0 || years > 80 || months < 0 || months > 11 {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"experience": "Enter whole years from 0 to 80 and months from 0 to 11."})
	}
	if !in.hasYears && !in.hasMonths {
		return nil, nil
	}
	total := int64(years)*12 + int64(months)
	return &total, nil
}

// updateDetails is the transaction of updateClubPlayerDetails.
func (t *txn) updateDetails(id pgtype.UUID, in detailsInput, experience *int64) (any, error) {
	row, err := t.q.GetQueueClubPlayerEditable(t.ctx, sqlcgen.GetQueueClubPlayerEditableParams{ClubID: t.club, ClubPlayerID: id})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.RemovedAt.Valid) {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return nil, err
	}
	if row.ProfileState.Valid && row.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed {
		return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"player": detailsNotEditable})
	}
	onFile := row.InputPhone.Valid && row.InputPhone.String != ""
	unclaimed := row.SharedEntryID.Valid || row.PlayerID.Valid || onFile
	emailOnFile := row.SharedEntryID.Valid || row.PlayerID.Valid
	typedEmail, email := "", ""
	if !emailOnFile {
		typedEmail = fields.JSTrim(in.email)
		if typedEmail != "" {
			email, _ = identity.NormalizeEmail(typedEmail)
		}
	}
	if typedEmail != "" && email == "" {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"email": detailsEmailError})
	}
	now := t.stamp()
	nick := pgtype.Text{}
	if n := fields.JSTrim(in.nickname); n != "" {
		nick = pgtype.Text{String: n, Valid: true}
	}
	if err := t.q.UpdateClubPlayerDetails(t.ctx, sqlcgen.UpdateClubPlayerDetailsParams{DisplayName: in.name, Nickname: nick, Now: now, ClubID: t.club, ID: row.ID}); err != nil {
		return nil, err
	}
	// A phone is taken only for an unclaimed player with none on file; a guest has none.
	newPhone := pgtype.Text{}
	if unclaimed && in.phone != "" && !onFile {
		newPhone = pgtype.Text{String: in.phone, Valid: true}
		taken, err := t.q.FindSavedPlayerWithPhone(t.ctx, sqlcgen.FindSavedPlayerWithPhoneParams{ClubID: t.club, ID: row.ID, Phone: newPhone})
		if err == nil {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"phone": taken + " already has this number."})
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}
	if unclaimed {
		raw, err := ownDetailsJSON(row.PresetFields, in, experience, t.at())
		if err != nil {
			return nil, err
		}
		if err := t.q.UpsertClubPlayerOwnDetails(t.ctx, sqlcgen.UpsertClubPlayerOwnDetailsParams{
			ClubPlayerID: row.ID, ClubID: t.club, Phone: newPhone, PresetFields: raw, Now: now,
		}); err != nil {
			return nil, err
		}
	}
	message := "Details saved · " + in.name
	// #1019: the entry's link key follows this club's links; no email and no link left is a guest.
	if row.SharedEntryID.Valid && !row.PlayerID.Valid {
		stored, err := t.q.GetClubPlayerPresetFields(t.ctx, row.ID)
		if err != nil {
			return nil, err
		}
		guest, err := t.followClubLinks(row.ID, row.SharedEntryID, signedin.OwnDetailsOf(stored).Links)
		if err != nil {
			return nil, err
		}
		if guest {
			return detailsAnswer{ClubPlayerID: row.ID.String(), Message: message + " · now a guest"}, nil
		}
	}
	if email == "" {
		return detailsAnswer{ClubPlayerID: row.ID.String(), Message: message}, nil
	}
	known, err := t.resolveEmail(email, now, false)
	if err != nil {
		return nil, err
	}
	if known != nil {
		same, err := t.savedRecordExcept(known, row.ID)
		if err != nil {
			return nil, err
		}
		if same != nil {
			who := same.DisplayName
			if same.PlayerFullName.Valid && same.PlayerFullName.String != "" {
				who = same.PlayerFullName.String
			}
			return detailsAnswer{ClubPlayerID: row.ID.String(), Message: message, SamePerson: &samePerson{ClubPlayerID: same.ID.String(), Name: who}}, nil
		}
	}
	resolution := known
	if resolution == nil {
		if resolution, err = t.resolveEmail(email, now, true); err != nil {
			return nil, err
		}
	}
	if err := t.pointRecordAt(row.ID, resolution); err != nil {
		return nil, err
	}
	return detailsAnswer{ClubPlayerID: row.ID.String(), Message: message + " · " + emailWords(resolution)}, nil
}

// ownDetailsJSON is ownDetailsJson of the details after this save: the playing style and links as typed (an empty text replaces what
// was there), and the experience months and the date they were recorded, which move together. An unchanged count keeps its date.
func ownDetailsJSON(stored []byte, in detailsInput, experience *int64, now time.Time) ([]byte, error) {
	own := signedin.OwnDetailsOf(stored)
	var shown *int64
	if own.Months != nil {
		m := signedin.CurrentExperienceMonths(*own.Months, own.RecordedAt, now)
		shown = &m
	}
	months, recorded := own.Months, any(nil)
	if own.RecordedAt != "" {
		recorded = own.RecordedAt
	}
	same := (experience == nil && shown == nil) || (experience != nil && shown != nil && *experience == *shown)
	if !same {
		months, recorded = experience, nil
		if experience != nil {
			recorded = now.UTC().Format("2006-01-02T15:04:05.000Z")
		}
	}
	links := map[string]string{}
	for _, p := range socialProviders {
		links[p] = fields.JSTrim(in.links[p])
	}
	return json.Marshal(map[string]any{
		"version": ownDetailsVersion, "playingStyle": fields.JSTrim(in.playingStyle), "experienceMonths": months,
		"experienceRecordedAt": recorded, "socialLinks": links,
	})
}
