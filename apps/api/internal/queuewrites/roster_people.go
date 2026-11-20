package queuewrites

import (
	"errors"
	"regexp"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the saved-player half of packages/db/src/queue/session-roster.ts (createClubPlayer, clubPlayerForProfile) and
// of packages/db/src/player/shared-entry.ts (resolveEmail, savedRecordFor, pointRecordAt, createSharedEntry).

var e164 = regexp.MustCompile(`^\+[1-9][0-9]{7,14}$`)

const newPlayerEmailError = "Enter an email address, like name@example.com, or leave it empty."

// emailResolution is EmailResolution: what a club's email resolves to.
type emailResolution struct {
	registered bool
	email      string
	playerID   pgtype.UUID // a registered player
	entryID    pgtype.UUID // an unclaimed person's shared entry
	rtrID      string
	created    bool
}

// resolveEmail is resolveEmail: the registered player who has the email, else the open shared entry for it, else (when
// create) a new entry with a new RTR ID. It takes the email lock first. Without create a new email is no resolution (nil).
func (t *txn) resolveEmail(email string, at pgtype.Timestamptz, create bool) (*emailResolution, error) {
	if err := t.q.LockEmailAddress(t.ctx, email); err != nil {
		return nil, err
	}
	player, err := t.registeredPlayerByEmail(email)
	if err != nil {
		return nil, err
	}
	if player.Valid {
		return &emailResolution{registered: true, email: email, playerID: player}, nil
	}
	open, err := t.q.GetOpenSharedEntryByEmail(t.ctx, pgtype.Text{String: email, Valid: true})
	if err == nil {
		return &emailResolution{email: email, entryID: open.ID, rtrID: open.RtrID}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if !create {
		return nil, nil
	}
	id, rtr, err := t.createSharedEntry(email, at)
	if err != nil {
		return nil, err
	}
	return &emailResolution{email: email, entryID: id, rtrID: rtr, created: true}, nil
}

// registeredPlayerByEmail is registeredPlayerByEmail: the claimed player whose ROTRA email or connected Google email it
// is; the ROTRA email wins when the two belong to different accounts.
func (t *txn) registeredPlayerByEmail(email string) (pgtype.UUID, error) {
	id, err := t.q.GetRegisteredPlayerByContactEmail(t.ctx, pgtype.Text{String: email, Valid: true})
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, err
	}
	id, err = t.q.GetRegisteredPlayerByGoogleEmail(t.ctx, pgtype.Text{String: email, Valid: true})
	if errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, nil
	}
	return id, err
}

// createSharedEntry creates the shared entry for a new email and allocates its RTR ID: one atomic counter step for the creating
// club's founding location and today's sync day, the same counter registered players use. The caller holds the email lock.
func (t *txn) createSharedEntry(email string, at pgtype.Timestamptz) (pgtype.UUID, string, error) {
	loc, err := t.q.GetClubFoundingLocation(t.ctx, t.club)
	if err != nil {
		return pgtype.UUID{}, "", err
	}
	syncDate := identity.SyncDate(at.Time)
	day, err := parseDay(syncDate)
	if err != nil {
		return pgtype.UUID{}, "", err
	}
	seq, err := t.q.NextPlayerSequence(t.ctx, sqlcgen.NextPlayerSequenceParams{LocationCodeID: loc.ID, SyncDate: day})
	if err != nil {
		return pgtype.UUID{}, "", err
	}
	id := randomID()
	rtr := identity.FormatRTRID(loc.CountryCode, loc.CityCode, syncDate, seq)
	err = t.q.InsertSharedPlayerEntry(t.ctx, sqlcgen.InsertSharedPlayerEntryParams{
		ID: id, Email: pgtype.Text{String: email, Valid: true}, RtrID: rtr, CreatingClubID: t.club, LocationCodeID: loc.ID,
		CountryCode: loc.CountryCode, CityCode: loc.CityCode, SyncDate: day, Sequence: seq, AllocatedAt: at, Now: t.stamp(),
	})
	return id, rtr, err
}

// emailWords is the words after the name in the saved message, as the mock words them.
func emailWords(r *emailResolution) string {
	if r.registered {
		return "linked to their ROTRA account"
	}
	if r.created {
		return "unclaimed · " + r.rtrID
	}
	return "already on ROTRA · " + r.rtrID
}

// personOf is the resolution as the nullable player and entry IDs the queries take.
func (r *emailResolution) personOf() (player, entry pgtype.UUID) {
	if r.registered {
		return r.playerID, pgtype.UUID{}
	}
	return pgtype.UUID{}, r.entryID
}

// savedRecordFor is savedRecordFor: the club's current saved record that already is this person, if any.
func (t *txn) savedRecordFor(r *emailResolution) (*sqlcgen.GetSavedRecordForPersonRow, error) {
	player, entry := r.personOf()
	row, err := t.q.GetSavedRecordForPerson(t.ctx, sqlcgen.GetSavedRecordForPersonParams{ClubID: t.club, PlayerID: player, EntryID: entry})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &row, err
}

// pointRecordAt points a club's record at the resolved person, keeping the club's own name, nickname and level. A registered
// player's row keeps no copied nickname. A deleted record of this club for the same person holds the per-club unique key; it
// stays deleted with its history, and this record takes its place.
func (t *txn) pointRecordAt(clubPlayerID pgtype.UUID, r *emailResolution) error {
	player, entry := r.personOf()
	clash, err := t.q.FindClubPlayerClash(t.ctx, sqlcgen.FindClubPlayerClashParams{ClubID: t.club, ClubPlayerID: clubPlayerID, PlayerID: player, EntryID: entry})
	if err == nil {
		if err := t.q.ClearClubPlayerPerson(t.ctx, sqlcgen.ClearClubPlayerPersonParams{ClearPlayer: r.registered, Now: t.stamp(), ClubID: t.club, ID: clash}); err != nil {
			return err
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	return t.q.PointClubPlayerAtPerson(t.ctx, sqlcgen.PointClubPlayerAtPersonParams{
		Registered: r.registered, PlayerID: player, EntryID: entry, Now: t.stamp(), ClubID: t.club, ID: clubPlayerID,
	})
}

// newClubPlayer is the input of createClubPlayer.
type newClubPlayer struct {
	name     string
	nickname string // empty is none
	phone    string // empty is none
	email    string // empty is none
}

// createClubPlayer creates a new guest or phone-entered player (Q-ROSTER New player). A phone is kept only as private intake
// awaiting identity resolution after sync; it never reaches roster payloads. An email makes the record unclaimed (or links a
// registered player); one the club already saved is refused, naming that player. It returns the record and the words for the
// toast (nil for a guest, and for a retry).
func (t *txn) createClubPlayer(operationID string, in newClubPlayer, at pgtype.Timestamptz) (sqlcgen.ClubPlayer, *string, error) {
	id := derivedID(operationID, "club-player")
	existing, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: id})
	if err == nil {
		return existing, nil, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return existing, nil, err
	}
	name := fields.JSTrim(in.name)
	if name == "" {
		return existing, nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter a name."})
	}
	phone := fields.JSTrim(in.phone)
	if phone != "" && !e164.MatchString(phone) {
		return existing, nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"phone": "Enter a full mobile number, or leave it empty."})
	}
	typedEmail := fields.JSTrim(in.email)
	email := ""
	if typedEmail != "" {
		if email, _ = identity.NormalizeEmail(typedEmail); email == "" {
			return existing, nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"email": newPlayerEmailError})
		}
	}
	var resolution *emailResolution
	if email != "" {
		if resolution, err = t.resolveEmail(email, at, false); err != nil {
			return existing, nil, err
		}
	}
	if resolution != nil {
		same, err := t.savedRecordFor(resolution)
		if err != nil {
			return existing, nil, err
		}
		if same != nil {
			who := same.DisplayName
			if same.PlayerFullName.Valid && same.PlayerFullName.String != "" {
				who = same.PlayerFullName.String
			}
			return existing, nil, writes.Fail(httpapi.ErrConflict, map[string]string{"email": "That email is already " + who + " in your saved players."})
		}
	}
	nick := pgtype.Text{}
	if n := fields.JSTrim(in.nickname); n != "" {
		nick = pgtype.Text{String: n, Valid: true}
	}
	if err := t.q.InsertGuestClubPlayer(t.ctx, sqlcgen.InsertGuestClubPlayerParams{ID: id, ClubID: t.club, DisplayName: name, Nickname: nick, Now: t.stamp()}); err != nil {
		return existing, nil, err
	}
	if phone != "" {
		if err := t.q.InsertGuestPrivateInput(t.ctx, sqlcgen.InsertGuestPrivateInputParams{
			ClubPlayerID: id, ClubID: t.club, Phone: pgtype.Text{String: phone, Valid: true}, Now: t.stamp(),
		}); err != nil {
			return existing, nil, err
		}
	}
	if email != "" {
		resolved := resolution
		if resolved == nil {
			if resolved, err = t.resolveEmail(email, at, true); err != nil {
				return existing, nil, err
			}
		}
		if err := t.pointRecordAt(id, resolved); err != nil {
			return existing, nil, err
		}
		words := emailWords(resolved)
		cp, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: id})
		return cp, &words, err
	}
	cp, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: id})
	return cp, nil, err
}

const ownNameError = "Enter a name."

// clubPlayerForProfile is the club's saved player for a Player lookup match (D-2026-11-16-04), created when the club has not
// saved them yet. profileID is a registered player's id, or the id of an unclaimed person's shared entry: then the club's own
// record is made with ownName (another club's name, picture and level are never shown). A deleted saved player is restored
// rather than duplicated. A registered player's row keeps no nickname.
func (t *txn) clubPlayerForProfile(operationID string, profileText string, at pgtype.Timestamptz, ownName string) (sqlcgen.ClubPlayer, error) {
	profileID, err := parseRowID(profileText)
	if err != nil {
		return sqlcgen.ClubPlayer{}, err
	}
	player, perr := t.q.GetDirectoryPlayerForRoster(t.ctx, profileID)
	if perr != nil && !errors.Is(perr, pgx.ErrNoRows) {
		return sqlcgen.ClubPlayer{}, perr
	}
	hasPlayer := perr == nil
	var entryID pgtype.UUID
	if !hasPlayer {
		entryID, err = t.q.GetOpenSharedEntryByID(t.ctx, profileID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return sqlcgen.ClubPlayer{}, err
		}
	}
	isEntry := entryID.Valid
	registered := hasPlayer && player.HasAllocation && player.ProfileState == sqlcgen.PlayerProfileStateClaimed
	if !registered && !isEntry {
		return sqlcgen.ClubPlayer{}, writes.Fail(httpapi.ErrNotFound, map[string]string{"player": "Player not available."})
	}
	var saved sqlcgen.ClubPlayer
	if isEntry {
		saved, err = t.q.GetClubPlayerOfSharedEntry(t.ctx, sqlcgen.GetClubPlayerOfSharedEntryParams{ClubID: t.club, SharedEntryID: entryID})
	} else {
		saved, err = t.q.GetClubPlayerOfPlayer(t.ctx, sqlcgen.GetClubPlayerOfPlayerParams{ClubID: t.club, PlayerID: profileID})
	}
	hasSaved := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return saved, err
	}
	if hasSaved && !saved.RemovedAt.Valid {
		return saved, nil
	}
	name := player.FullName
	if isEntry {
		name = fields.JSTrim(ownName)
	}
	if name == "" {
		return saved, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": ownNameError})
	}
	// A deleted saved player is restored rather than duplicated (one saved row per person per club). The guarded write
	// restores once, so a replayed operation tells a registered player once.
	if hasSaved {
		restored, err := t.q.RestoreClubPlayer(t.ctx, sqlcgen.RestoreClubPlayerParams{SetName: isEntry, DisplayName: name, Now: t.stamp(), ClubID: t.club, ID: saved.ID})
		if err != nil {
			return saved, err
		}
		if restored > 0 && !isEntry {
			op, err := opUUID(operationID)
			if err != nil {
				return saved, err
			}
			if err := t.notifySavedPlayer(profileID, op); err != nil {
				return saved, err
			}
		}
		return t.q.GetClubPlayerByID(t.ctx, saved.ID)
	}
	id := derivedID(operationID, "club-player")
	params := sqlcgen.InsertProfileClubPlayerParams{ID: id, ClubID: t.club, DisplayName: name, Now: t.stamp()}
	if isEntry {
		params.SharedEntryID = entryID
	} else {
		params.PlayerID = profileID
	}
	if err := t.q.InsertProfileClubPlayer(t.ctx, params); err != nil {
		return saved, err
	}
	// Only a registered player has an inbox; an unclaimed person's shared entry has no account.
	if !isEntry {
		op, err := opUUID(operationID)
		if err != nil {
			return saved, err
		}
		if err := t.notifySavedPlayer(profileID, op); err != nil {
			return saved, err
		}
	}
	return t.q.GetClubPlayerByID(t.ctx, id)
}
