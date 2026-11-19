package adminwrites

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Add player: POST /api/players (A-PLAYERS). Port of apps/admin/src/app/api/players/route.ts POST and createAdminPlayer
// in packages/db/src/admin/player-create.ts: it saves the club's unclaimed record (club_players and its private intake),
// as Queue's Add player does. No global player and no RTR ID: both come at registration (D-2026-11-16-04). The directory
// read it answers with is signedin's.

// Messages of Add player (the service's own words).
const (
	clubRequired   = "Choose a club. A player with no club cannot be saved yet."
	phoneRequired  = "Enter a phone number. It links the player when they register."
	clubUnknown    = "Choose an available club."
	phoneLinked    = "This phone number is already linked to another player."
	emailLinked    = "This email is already linked to another player."
	placeTemplateA = "This club registers players in "
	placeTemplateB = ". Choose that place."
)

// addPlayer is the POST handler. The order is the TypeScript's: the JSON body; the schema (`invalid`, the first message of
// each field); a club (`invalid` on `clubId`); a phone (`invalid` on `phone`); then one transaction that finds the club
// (`invalid` on `clubId`, and a club ID Postgres cannot read is the same: the Route Handler crashes there), checks the
// place is the one the club registers in (`invalid` on `place`), refuses a number or email a registered or unclaimed
// player's private contact has (`conflict`, on `phone` when the row found has the number, else on `email`) and a number a
// current record of the club already has (`conflict` on `phone`), and saves the record, its intake and the audit event.
// The answer is the record's directory row.
//
// The two findFirst calls of the TypeScript have no order; here the contact with the number comes first, and the oldest
// record of the club comes first. Nothing serializes two Add player requests of one number, as in the TypeScript.
func (s *server) addPlayer(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	values, bad := adminplayer.ParseCreate(body)
	if bad != nil {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, bad)
	}
	if values.ClubID == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"clubId": clubRequired})
	}
	if values.Phone == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"phone": phoneRequired})
	}
	club, ok := pgUUID(values.ClubID)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"clubId": clubUnknown})
	}
	email := pgtype.Text{}
	if lower := strings.ToLower(values.Email); lower != "" {
		email = pgtype.Text{String: lower, Valid: true}
	}
	var created pgtype.UUID
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		place, err := q.GetClubFoundingPlace(ctx, club)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrInvalid, map[string]string{"clubId": clubUnknown})
		}
		if err != nil {
			return err
		}
		if place.CityCode != values.Place {
			return writes.Fail(httpapi.ErrInvalid, map[string]string{"place": placeTemplateA + place.DisplayName + placeTemplateB})
		}
		registered, err := q.FindRegisteredContact(ctx, sqlcgen.FindRegisteredContactParams{Phone: values.Phone, Email: email})
		if err == nil {
			if registered == values.Phone {
				return writes.Fail(httpapi.ErrConflict, map[string]string{"phone": phoneLinked})
			}
			return writes.Fail(httpapi.ErrConflict, map[string]string{"email": emailLinked})
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		saved, err := q.FindSavedClubPlayerByPhone(ctx, sqlcgen.FindSavedClubPlayerByPhoneParams{ClubID: place.ID, Phone: pgtype.Text{String: values.Phone, Valid: true}})
		if err == nil {
			return writes.Fail(httpapi.ErrConflict, map[string]string{"phone": saved + " already has this number in this club."})
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		now := s.stamp()
		created = pgtype.UUID{Bytes: uuid.New(), Valid: true} // crypto.randomUUID() is a version 4 UUID
		nickname := pgtype.Text{}
		if values.Nickname != "" {
			nickname = pgtype.Text{String: values.Nickname, Valid: true}
		}
		if err := q.InsertClubPlayer(ctx, sqlcgen.InsertClubPlayerParams{ID: created, ClubID: place.ID, DisplayName: values.Name, Nickname: nickname, Now: now}); err != nil {
			return err
		}
		if err := q.InsertClubPlayerPrivateInput(ctx, sqlcgen.InsertClubPlayerPrivateInputParams{
			ClubPlayerID: created, ClubID: place.ID, Phone: pgtype.Text{String: values.Phone, Valid: true}, Email: email, Now: now,
		}); err != nil {
			return err
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.created", TargetType: "player", TargetID: uuid.UUID(created.Bytes).String(),
			Metadata: map[string]any{"name": values.Name, "clubId": uuid.UUID(place.ID.Bytes).String()},
		})
	})
	if err != nil {
		return writes.Result{}, err
	}
	rows, err := signedin.ReadAdminPlayerDirectory(r.Context(), sqlcgen.New(s.pool), created, s.now)
	if err != nil {
		return writes.Result{}, err
	}
	if len(rows) == 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return writes.Result{Body: struct {
		Player signedin.AdminPlayer `json:"player"`
	}{rows[0]}}, nil
}
