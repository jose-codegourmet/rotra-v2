package queuewrites

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"math"
	"net/http"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/phone"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the club's writes in the Queue app: the invite link, the saved venues, the club settings and the saved players
// (apps/queue/src/app/api/{club,venues}/**, packages/db/src/admin/{club-invite,clubs}.ts, queue/{club-players,club-player-move,
// club-player-delete}.ts and player/claim.ts). Each checks the club's entitlement before its transaction, as the TypeScript does.

// errLogoPending is the club logo write (updateClubLogo): an upload to storage, which is out of this track's scope.
var errLogoPending = errors.New("queuewrites: saving the club logo is not ported (uploads are out of scope)")

// errNotAUUID is an id the TypeScript hands to Postgres as a uuid and Postgres refuses (22P02): it names nothing, so the
// answer is 404, not 500 (isMalformedId, packages/db/src/service/handler.ts; main #1108). A value that is no text or
// number, or no enum, stays a 500 (errTypeError).
var errNotAUUID = writes.Fail(httpapi.ErrNotFound, nil)

const (
	inviteAttempts = 5
	claimLinkDays  = 7
)

var hyphenatedUUID = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func (s *server) registerClubWrites(rt *signedin.Router) {
	club := store.AudienceClub
	rt.Handle("PATCH /api/club", club, s.club(s.updateClubSettings))
	rt.Handle("POST /api/club/invite", club, s.club(s.regenerateInvite))
	rt.Handle("POST /api/venues", club, s.club(s.saveVenue))
	rt.Handle("POST /api/club/players", club, s.club(s.addSavedPlayer))
	rt.Handle("DELETE /api/club/players/{clubPlayerId}", club, s.club(s.deleteSavedPlayer))
	rt.Handle("POST /api/club/players/{clubPlayerId}/move", club, s.club(s.moveSavedPlayer))
	rt.Handle("POST /api/club/players/{clubPlayerId}/club-nickname", club, s.club(s.setClubNickname))
	rt.Handle("POST /api/club/players/{clubPlayerId}/registration-link", club, s.club(s.issueClaimLink))
}

// entitled is requireClubEntitlement before a transaction.
func (s *server) entitled(ctx context.Context, club pgtype.UUID) error {
	return requireClubEntitlement(ctx, sqlcgen.New(s.pool), club, s.at())
}

// inClub runs change in one transaction on the club (no session).
func (s *server) inClub(ctx context.Context, club pgtype.UUID, change func(t *txn) (any, error)) (any, error) {
	var out any
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		var err error
		out, err = change(&txn{ctx: ctx, q: q, s: s, club: club})
		if err == nil {
			liveupdates.Note(ctx, club, pgtype.UUID{}) // a club-wide change: the club's screens re-read
		}
		return err
	})
	return out, err
}

// ---- POST /api/club/invite

// regenerateInvite is regenerateClubInvite (#712): replaces the code, so the old link and its QR images stop working. A new code
// is never the one it replaces; the rare clash with another club's code is tried again.
func (s *server) regenerateInvite(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	q := sqlcgen.New(s.pool)
	previous, err := q.GetClubInviteCode(r.Context(), club)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return writes.Result{}, err
	}
	for attempt := 0; ; attempt++ {
		code, err := signedin.NewInviteCode()
		for err == nil && code == previous.String {
			code, err = signedin.NewInviteCode()
		}
		if err != nil {
			return writes.Result{}, err
		}
		// Each try is a small transaction of its own, so a clash rolls back only that try and the live-update event commits with the code (B-26).
		var n int64
		err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, tq *sqlcgen.Queries) error {
			var err error
			n, err = tq.RegenerateClubInviteCode(ctx, sqlcgen.RegenerateClubInviteCodeParams{Code: pgtype.Text{String: code, Valid: true}, Now: s.stamp(), ClubID: club})
			if err == nil && n > 0 {
				liveupdates.Note(ctx, club, pgtype.UUID{})
			}
			return err
		})
		if err != nil {
			if !writes.IsUniqueViolation(err) || attempt+1 >= inviteAttempts {
				return writes.Result{}, err
			}
			continue
		}
		if n == 0 {
			return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
		}
		return writes.Result{Body: map[string]any{"inviteCode": code}}, nil
	}
}

// ---- POST /api/venues

// feeOf is intOrNull and validateFee: bad is a number that is no whole amount of zero or more. A fee beyond an Int column passes
// validateFee and Prisma refuses it where the venue is written (tooBig, a 500 there).
func feeOf(b writes.Body, key string) (value pgtype.Int4, tooBig, bad bool) {
	f, ok := b.NumberOrNull(key)
	if !ok {
		return pgtype.Int4{}, false, false
	}
	if !safeInteger(f) || f < 0 {
		return pgtype.Int4{}, false, true
	}
	if f > math.MaxInt32 {
		return pgtype.Int4{}, true, false
	}
	return pgtype.Int4{Int32: int32(f), Valid: true}, false, false
}

// saveVenue is saveVenue: creates or edits a saved venue. Editing never rewrites sessions that already copied it. The id is the
// client's stable command ID, so a retried create answers the same venue; an existing venue is only edited when an expected
// revision comes with it.
func (s *server) saveVenue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	name := fields.JSTrim(body.Text("name"))
	if name == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter a venue name."})
	}
	// courtFeeMinor and entranceFeeMinor: intOrNull, then validateFee (a number that is no whole amount of zero or more is refused).
	courtFee, courtTooBig, bad := feeOf(body, "courtFeeMinor")
	if bad {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"courtFee": "Enter an amount of zero or more."})
	}
	entranceFee, entranceTooBig, bad := feeOf(body, "entranceFeeMinor")
	if bad {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"entranceFee": "Enter an amount of zero or more."})
	}
	id, ok := writes.ParseUUID(body.Text("id"))
	expected, hasExpected := body["expectedRevision"].(string)
	address := pgtype.Text{}
	if a := fields.JSTrim(body.Text("address")); a != "" {
		address = pgtype.Text{String: a, Valid: true}
	}
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		if !ok {
			return nil, errNotAUUID
		}
		existing, err := t.q.GetClubVenueByID(t.ctx, id)
		found := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if found && existing.ClubID != t.club {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		var venue sqlcgen.ClubVenue
		switch {
		case !found:
			if courtTooBig || entranceTooBig {
				return nil, errTypeError // Prisma refuses a number beyond an Int column
			}
			venue, err = t.q.InsertClubVenue(t.ctx, sqlcgen.InsertClubVenueParams{
				ID: id, ClubID: t.club, Name: name, Address: address, CourtFeePerCourtHourMinor: courtFee, EntranceFeeMinor: entranceFee, Now: t.stamp(),
			})
		case !hasExpected:
			venue = existing
		default:
			if err := requireRevision(existing.Revision, expected); err != nil {
				return nil, err
			}
			if courtTooBig || entranceTooBig {
				return nil, errTypeError
			}
			venue, err = t.q.UpdateClubVenue(t.ctx, sqlcgen.UpdateClubVenueParams{
				Name: name, Address: address, CourtFeePerCourtHourMinor: courtFee, EntranceFeeMinor: entranceFee, Now: t.stamp(), ID: id,
			})
		}
		if err != nil {
			return nil, err
		}
		return map[string]any{"venue": signedin.VenueOf(venue)}, nil
	})
	if err != nil && writes.IsUniqueViolation(err) {
		err = writes.Fail(httpapi.ErrConflict, map[string]string{"name": "This club already has a venue with this name."})
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, err
}

// ---- PATCH /api/club

// optionalText is the route's text(): an absent field is not set, a string is, anything else is invalid with the field.
func optionalText(b writes.Body, key string) (value pgtype.Text, set bool, err error) {
	v, has := b[key]
	if !has {
		return pgtype.Text{}, false, nil
	}
	text, isText := v.(string)
	if !isText {
		return pgtype.Text{}, false, writes.Fail(httpapi.ErrInvalid, map[string]string{key: "Enter text."})
	}
	return pgtype.Text{String: text, Valid: true}, true, nil
}

// updateClubSettings is PATCH club without a logo: the Facebook post fields (template, description, court rules) and the Players can
// check themselves in switch, at the club's displayed revision. `template: null` restores the default template. The logo write
// uploads a picture, which is out of this track's scope.
func (s *server) updateClubSettings(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if body.Has("logoUrl") {
		return writes.Result{}, errLogoPending
	}
	expected, ok := body["expectedRevision"].(string)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"revision": "Reload and try again."})
	}
	var params sqlcgen.UpdateClubSettingsParams
	if v, has := body["template"]; has && v != nil {
		text, isText := v.(string)
		if !isText {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"template": "Enter text."})
		}
		params.PostTemplate = pgtype.Text{String: text, Valid: true}
	}
	_, params.SetPostTemplate = body["template"]
	if v, has := body["selfCheckInEnabled"]; has {
		on, isBool := v.(bool)
		if !isBool {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"selfCheckInEnabled": "Choose on or off."})
		}
		params.SelfCheckInEnabled, params.SetSelfCheckIn = on, true
	}
	if params.Description, params.SetDescription, err = optionalText(body, "description"); err != nil {
		return writes.Result{}, err
	}
	if params.CourtRules, params.SetCourtRules, err = optionalText(body, "courtRules"); err != nil {
		return writes.Result{}, err
	}
	params.Description.String, params.CourtRules.String = fields.JSTrim(params.Description.String), fields.JSTrim(params.CourtRules.String)
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		locked, err := t.q.LockClub(t.ctx, club)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		if err := requireRevision(locked.Revision, expected); err != nil {
			return nil, err
		}
		params.Now, params.ID = t.stamp(), club
		c, err := t.q.UpdateClubSettings(t.ctx, params)
		if err != nil {
			return nil, err
		}
		return map[string]any{"club": clubSettingsOf(c)}, nil
	})
	return writes.Result{Body: out}, err
}

// clubSettings is clubSettingsDto on the wire.
type clubSettings struct {
	ID                     string         `json:"id"`
	Name                   string         `json:"name"`
	LogoRef                *string        `json:"logoRef"`
	DefaultPlayersPerCourt int16          `json:"defaultPlayersPerCourt"`
	DefaultEntranceFee     *httpapi.Money `json:"defaultEntranceFee"`
	Description            string         `json:"description"`
	CourtRules             string         `json:"courtRules"`
	PostTemplate           *string        `json:"postTemplate"`
	SelfCheckInEnabled     bool           `json:"selfCheckInEnabled"`
	Revision               string         `json:"revision"`
}

func clubSettingsOf(c sqlcgen.UpdateClubSettingsRow) clubSettings {
	d := clubSettings{
		ID: c.ID.String(), Name: c.Name, DefaultPlayersPerCourt: c.DefaultPlayersPerCourt, Description: c.Description.String, CourtRules: c.CourtRules.String,
		SelfCheckInEnabled: c.SelfCheckInEnabled, Revision: httpapi.ToDecimalString(c.Revision),
	}
	if c.LogoRef.Valid {
		d.LogoRef = &c.LogoRef.String
	}
	if c.PostTemplate.Valid {
		d.PostTemplate = &c.PostTemplate.String
	}
	if c.DefaultEntranceFeeMinor.Valid {
		d.DefaultEntranceFee = &httpapi.Money{AmountMinor: int64(c.DefaultEntranceFeeMinor.Int32), Currency: c.Currency}
	}
	return d
}

// ---- POST /api/club/players

func alreadySaved(name string) error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{"player": name + " is already in your saved players."})
}

// addSavedPlayer is POST club/players, Saved players Add player: saves to the club only, never to a session. `source: 'directory'`
// saves a Player lookup match (with `name` for another club's unclaimed player); otherwise a new player: a guest, or with an email
// an unclaimed player or a linked registered one (D-2026-11-16-04). A person or a phone the club already has is refused.
func (s *server) addSavedPlayer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operationID := body.Text("operationId")
	directory := body.Text("source") == "directory"
	var e164 string
	if !directory {
		if raw := fields.JSTrim(body.Text("phone")); raw != "" {
			var ok bool
			if e164, ok = phone.Parse(raw); !ok {
				return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"phone": "Enter a valid phone number."})
			}
		}
	}
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		if directory {
			cp, created, err := t.clubPlayerForProfile(operationID, body.Text("playerId"), t.stamp(), body.Text("name"))
			if err != nil {
				return nil, err
			}
			if !created {
				return nil, alreadySaved(cp.DisplayName)
			}
			if err := t.saveLevel(cp.ID, body.Text("level")); err != nil {
				return nil, err
			}
			return map[string]any{"clubPlayerId": cp.ID.String(), "name": cp.DisplayName}, nil
		}
		if e164 != "" {
			match, err := t.q.FindSavedPlayerByPhone(t.ctx, sqlcgen.FindSavedPlayerByPhoneParams{ClubID: t.club, Phone: pgtype.Text{String: e164, Valid: true}})
			if err == nil {
				return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"phone": match + " already has this number."})
			}
			if !errors.Is(err, pgx.ErrNoRows) {
				return nil, err
			}
		}
		person := newClubPlayer{name: body.Text("name"), nickname: body.Text("nickname"), email: body.Text("email"), socialLink: body.Text("socialLink"), phone: e164}
		cp, words, err := t.createClubPlayer(operationID, person, t.stamp())
		if err != nil {
			return nil, err
		}
		if err := t.saveLevel(cp.ID, body.Text("level")); err != nil {
			return nil, err
		}
		return map[string]any{"clubPlayerId": cp.ID.String(), "name": cp.DisplayName, "emailWords": words}, nil
	})
	// A service error comes back as it is; anything else goes through mapDatabaseError.
	return writes.Result{Status: http.StatusCreated, Body: out}, mapDatabaseError(err)
}

// ---- POST /api/club/players/{id}/club-nickname

// setClubNickname is setClubNickname (D-2026-11-18-03): this club's own nickname for a registered saved player; an empty one
// removes it. The answer's message is the toast.
func (s *server) setClubNickname(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	idText := r.PathValue("clubPlayerId")
	if !hyphenatedUUID.MatchString(idText) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	id, _ := writes.ParseUUID(idText)
	next := fields.JSTrim(body.Text("clubNickname"))
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		row, err := t.q.GetSavedPlayerForNickname(t.ctx, sqlcgen.GetSavedPlayerForNicknameParams{ID: id, ClubID: t.club})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrNotFound, map[string]string{"player": "Player not available."})
		}
		if err != nil {
			return nil, err
		}
		if !row.PlayerProfileState.Valid || row.PlayerProfileState.PlayerProfileState != sqlcgen.PlayerProfileStateClaimed {
			return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"player": "Only a registered player has a club nickname."})
		}
		had := fields.JSTrim(row.Nickname.String) != ""
		stored := pgtype.Text{}
		if next != "" {
			stored = pgtype.Text{String: next, Valid: true}
		}
		if err := t.q.SetClubPlayerNickname(t.ctx, sqlcgen.SetClubPlayerNicknameParams{Nickname: stored, Now: t.stamp(), ClubID: t.club, ID: id}); err != nil {
			return nil, err
		}
		name := row.PlayerFullName.String
		message := "No club nickname · " + name
		switch {
		case next != "":
			message = "Club nickname saved · " + name
		case had:
			message = "Club nickname removed · " + name
		}
		var shown *string
		if next != "" {
			shown = &next
		}
		return map[string]any{"clubPlayerId": id.String(), "clubNickname": shown, "message": message}, nil
	})
	return writes.Result{Body: out}, err
}

// ---- DELETE /api/club/players/{id}

// deleteSavedPlayer is deleteClubPlayer (owner decision, 2026-11-08): a soft delete. The club stops seeing the player; finished
// sessions, results and the ROTRA profile keep them. Prepared sessions release their slot and every waitlist spot goes. In the
// running session they are marked not present (a match on court or playing blocks the delete).
func (s *server) deleteSavedPlayer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	id, ok := writes.ParseUUID(r.PathValue("clubPlayerId"))
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		if !ok {
			return nil, writes.Fail(httpapi.ErrNotFound, nil) // the TypeScript crashes on a malformed id: a 500
		}
		row, err := t.q.GetQueueSavedClubPlayer(t.ctx, sqlcgen.GetQueueSavedClubPlayerParams{ClubID: t.club, ClubPlayerID: id})
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.RemovedAt.Valid) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		entry, err := t.q.GetQueueLiveActiveEntry(t.ctx, sqlcgen.GetQueueLiveActiveEntryParams{ClubID: t.club, ClubPlayerID: id})
		if err == nil {
			busy, err := t.q.CountQueueEntryMatches(t.ctx, sqlcgen.CountQueueEntryMatchesParams{States: []string{"on_court", "active"}, SessionPlayerID: entry.ID})
			if err != nil {
				return nil, err
			}
			if busy > 0 {
				return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": row.DisplayName + " is on court. Finish or substitute that match first."})
			}
			if err := t.q.SetSessionPlayerPresence(t.ctx, sqlcgen.SetSessionPlayerPresenceParams{Present: false, Now: t.stamp(), ID: entry.ID}); err != nil {
				return nil, err
			}
			if _, err := t.q.CloseStaleQueueMatchRequests(t.ctx, sqlcgen.CloseStaleQueueMatchRequestsParams{Now: t.stamp(), SessionID: entry.SessionID}); err != nil {
				return nil, err
			}
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err := t.q.ReleasePreparedEntriesOfClubPlayer(t.ctx, sqlcgen.ReleasePreparedEntriesOfClubPlayerParams{Now: t.stamp(), ClubID: t.club, ClubPlayerID: id}); err != nil {
			return nil, err
		}
		if err := t.q.DeleteWaitlistOfClubPlayer(t.ctx, sqlcgen.DeleteWaitlistOfClubPlayerParams{ClubID: t.club, ClubPlayerID: id}); err != nil {
			return nil, err
		}
		if err := t.q.SoftDeleteSavedPlayer(t.ctx, sqlcgen.SoftDeleteSavedPlayerParams{Now: t.stamp(), ClubID: t.club, ID: id}); err != nil {
			return nil, err
		}
		saved, err := t.q.GetClubPlayerByID(t.ctx, id)
		if err != nil {
			return nil, err
		}
		// D-2026-11-16-04: deleting the last record of an unclaimed person (a mistyped email) retires the shared entry.
		if err := t.retireEntryIfOrphan(saved.SharedEntryID); err != nil {
			return nil, err
		}
		return map[string]any{"clubPlayerId": id.String(), "name": row.DisplayName}, nil
	})
	return writes.Result{Body: out}, err
}

// retireEntryIfOrphan is retireEntryIfOrphan: when no saved record of an unclaimed person's open entry is left, the entry is
// retired. Its RTR ID is never reused and counters are not rewound; the mistyped email is cleared.
func (t *txn) retireEntryIfOrphan(entry pgtype.UUID) error {
	if !entry.Valid {
		return nil
	}
	state, err := t.q.GetSharedEntryState(t.ctx, entry)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if state.ClaimedPlayerID.Valid || state.RetiredAt.Valid {
		return nil
	}
	current, err := t.q.CountLiveRecordsOfEntry(t.ctx, entry)
	if err != nil || current > 0 {
		return err
	}
	return t.q.RetireSharedEntry(t.ctx, sqlcgen.RetireSharedEntryParams{Now: t.stamp(), ID: entry})
}

// ---- POST /api/club/players/{id}/move

const (
	moveNotAvailable = "Player not available."
	moveSameSession  = "Both players are in a match in the same session. Finish or remove one of them there first."
)

// moveSavedPlayer is moveSavedPlayer, the Same person step (D-2026-11-16-04): the email typed in Edit details for a guest already
// belongs to another saved player of this club, and the Queue Master confirmed "Same person as NAME?". Live slots, waitlist spots
// and pending join requests move to the other record; where both hold a live slot in one session the move is refused. Finished
// sessions, assessments and facts stay on the moved record, which is hidden and points to the other.
func (s *server) moveSavedPlayer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	email, ok := identity.NormalizeEmail(body.Text("email"))
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"email": "Enter an email address, like name@example.com."})
	}
	movedID, movedOK := writes.ParseUUID(r.PathValue("clubPlayerId"))
	targetID, targetOK := writes.ParseUUID(body.Text("intoClubPlayerId"))
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		if !movedOK || !targetOK {
			return nil, errNotAUUID // Prisma refuses an id that is no uuid
		}
		return t.moveSaved(movedID, targetID, email)
	})
	return writes.Result{Body: out}, err
}

func (t *txn) moveSaved(movedID, targetID pgtype.UUID, email string) (any, error) {
	now := t.stamp()
	rows, err := t.q.ListSavedPlayersForMove(t.ctx, sqlcgen.ListSavedPlayersForMoveParams{ClubID: t.club, Ids: []pgtype.UUID{movedID, targetID}})
	if err != nil {
		return nil, err
	}
	var moved, target *sqlcgen.ListSavedPlayersForMoveRow
	for i := range rows {
		switch rows[i].ID {
		case movedID:
			moved = &rows[i]
		case targetID:
			target = &rows[i]
		}
	}
	if moved == nil || target == nil || moved.ID == target.ID {
		return nil, writes.Fail(httpapi.ErrNotFound, map[string]string{"player": moveNotAvailable})
	}
	if moved.PlayerID.Valid || moved.SharedEntryID.Valid {
		return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": "This player already has an email on file."})
	}
	resolution, err := t.resolveEmail(email, now, false)
	if err != nil {
		return nil, err
	}
	var same *sqlcgen.GetSavedRecordForPersonRow
	if resolution != nil {
		if same, err = t.savedRecordExcept(resolution, moved.ID); err != nil {
			return nil, err
		}
	}
	if same == nil || same.ID != target.ID {
		return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": moveNotAvailable})
	}
	name := target.DisplayName
	if target.PlayerFullName.String != "" {
		name = target.PlayerFullName.String
	}
	live, err := t.q.ListMovableEntries(t.ctx, sqlcgen.ListMovableEntriesParams{ClubID: t.club, ClubPlayerID: moved.ID})
	if err != nil {
		return nil, err
	}
	for _, slot := range live {
		// One row per player per session (unique): a session both played in can't take this slot.
		kept, err := t.q.HasSessionEntry(t.ctx, sqlcgen.HasSessionEntryParams{ClubID: t.club, ClubPlayerID: target.ID, SessionID: slot.SessionID})
		if err != nil {
			return nil, err
		}
		if kept {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": moveSameSession})
		}
		if err := t.q.MoveSessionPlayerTo(t.ctx, sqlcgen.MoveSessionPlayerToParams{Target: target.ID, Name: name, Now: now, ID: slot.ID}); err != nil {
			return nil, err
		}
	}
	// One place per session: the other player's slot or spot wins over this record's spot.
	spots, err := t.q.ListWaitlistOfClubPlayer(t.ctx, sqlcgen.ListWaitlistOfClubPlayerParams{ClubID: t.club, ClubPlayerID: moved.ID})
	if err != nil {
		return nil, err
	}
	for _, spot := range spots {
		taken, err := t.q.IsWaitingOrLive(t.ctx, sqlcgen.IsWaitingOrLiveParams{SessionID: spot.SessionID, ClubPlayerID: target.ID})
		if err != nil {
			return nil, err
		}
		if taken.Bool {
			err = t.q.DeleteSessionWaitlistEntry(t.ctx, spot.ID)
		} else {
			err = t.q.MoveWaitlistEntryTo(t.ctx, sqlcgen.MoveWaitlistEntryToParams{Target: target.ID, Now: now, ID: spot.ID})
		}
		if err != nil {
			return nil, err
		}
	}
	if err := t.q.MovePendingJoinRequests(t.ctx, sqlcgen.MovePendingJoinRequestsParams{Target: target.ID, Now: now, ClubID: t.club, Moved: moved.ID}); err != nil {
		return nil, err
	}
	if err := t.q.RevokeClubPlayerClaimLinks(t.ctx, sqlcgen.RevokeClubPlayerClaimLinksParams{Now: now, ClubID: t.club, ClubPlayerID: moved.ID}); err != nil {
		return nil, err
	}
	if err := t.q.HideMovedClubPlayer(t.ctx, sqlcgen.HideMovedClubPlayerParams{Now: now, Target: target.ID, ClubID: t.club, ID: moved.ID}); err != nil {
		return nil, err
	}
	return map[string]any{"clubPlayerId": target.ID.String(), "movedClubPlayerId": moved.ID.String(), "name": name}, nil
}

// ---- POST /api/club/players/{id}/registration-link

// issueClaimLink is issueClaimLink, Saved players Invite: a 7-day, single-use registration link for this club's unclaimed player
// or guest; the earlier one is revoked. The plaintext token is answered once and never stored (only its SHA-256 digest is).
func (s *server) issueClaimLink(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return writes.Result{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	digest := sha256.Sum256([]byte(token))
	id, ok := writes.ParseUUID(r.PathValue("clubPlayerId"))
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		if !ok {
			return nil, errNotAUUID
		}
		row, err := t.q.GetSavedPlayerForLink(t.ctx, sqlcgen.GetSavedPlayerForLinkParams{ClubID: t.club, ID: id})
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.RemovedAt.Valid) {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return nil, err
		}
		if row.PlayerProfileState.Valid && row.PlayerProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": "This player has already registered."})
		}
		now := t.at()
		expires := pgtype.Timestamptz{Time: now.Add(claimLinkDays * 24 * time.Hour), Valid: true}
		linkID, err := newestID()
		if err != nil {
			return nil, err
		}
		if row.PlayerID.Valid {
			if err := t.q.RevokePlayerClaimLinks(t.ctx, sqlcgen.RevokePlayerClaimLinksParams{Now: t.stamp(), PlayerID: row.PlayerID}); err != nil {
				return nil, err
			}
			err = t.q.InsertIssuedPlayerClaimLink(t.ctx, sqlcgen.InsertIssuedPlayerClaimLinkParams{
				ID: linkID, PlayerID: row.PlayerID, ClubID: t.club, TokenDigest: digest[:], Now: t.stamp(), ExpiresAt: expires,
			})
		} else {
			if err := t.q.RevokeClubPlayerClaimLinks(t.ctx, sqlcgen.RevokeClubPlayerClaimLinksParams{Now: t.stamp(), ClubID: t.club, ClubPlayerID: row.ID}); err != nil {
				return nil, err
			}
			err = t.q.InsertClubPlayerClaimLink(t.ctx, sqlcgen.InsertClubPlayerClaimLinkParams{
				ID: linkID, ClubID: t.club, ClubPlayerID: row.ID, TokenDigest: digest[:], Now: t.stamp(), ExpiresAt: expires,
			})
		}
		if err != nil {
			return nil, err
		}
		return map[string]any{"token": token, "expiresAt": httpapi.ToIso(expires.Time)}, nil
	})
	return writes.Result{Body: out}, err
}

// at is `new Date()` inside a transaction.
func (t *txn) at() time.Time { return t.s.at() }
