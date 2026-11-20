package queuewrites

import (
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the roster commands of packages/db/src/queue/session-roster.ts that the roster burst batch runs on a locked
// session: add (saved, directory, new), remove, and confirm or decline a join request.

// savedPlayerAdd, directoryPlayerAdd and newPlayerAdd are the three `source`s of an add.
type savedPlayerAdd struct {
	addPlacement
	operationID  string
	clubPlayerID string
	level        string
}

type directoryPlayerAdd struct {
	addPlacement
	operationID string
	playerID    string
	name        string // this club's own name for another club's unclaimed player; empty is none
	level       string
}

type newPlayerAdd struct {
	addPlacement
	operationID string
	person      newClubPlayer
	level       string
}

// addSavedPlayerIn adds a saved club player to the session (Q-ROSTER Saved players). An unclaimed profile is the club's own
// record, so no identity check applies (D-2026-11-11-03).
func (t *txn) addSavedPlayerIn(in savedPlayerAdd) (placed, error) {
	level, err := levelID(in.level)
	if err != nil {
		return placed{}, err
	}
	id, err := parseRowID(in.clubPlayerID)
	if err != nil {
		return placed{}, err
	}
	cp, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: id})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && cp.RemovedAt.Valid) {
		return placed{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return placed{}, err
	}
	return t.place(cp, level, in.operationID, t.stamp(), in.toWaitlist, in.allowOverfill)
}

// addDirectoryPlayerIn adds a Player Information profile to the session, saving them to the club on the way (Q-ROSTER).
func (t *txn) addDirectoryPlayerIn(in directoryPlayerAdd) (placed, error) {
	level, err := levelID(in.level)
	if err != nil {
		return placed{}, err
	}
	now := t.stamp()
	cp, _, err := t.clubPlayerForProfile(in.operationID, in.playerID, now, in.name)
	if err != nil {
		return placed{}, err
	}
	return t.place(cp, level, in.operationID, now, in.toWaitlist, in.allowOverfill)
}

// addNewPlayerIn adds a new guest or phone-entered player. emailWords is what the email did, for the toast; nil for a guest.
func (t *txn) addNewPlayerIn(in newPlayerAdd) (placed, *string, error) {
	level, err := levelID(in.level)
	if err != nil {
		return placed{}, nil, err
	}
	now := t.stamp()
	cp, words, err := t.createClubPlayer(in.operationID, in.person, now)
	if err != nil {
		return placed{}, nil, err
	}
	p, err := t.place(cp, level, in.operationID, now, in.toWaitlist, in.allowOverfill)
	return p, words, err
}

// removeRosterPlayerIn removes a prepared entry by releasing it (reason removed). The row, its assessments and any paid marks
// are kept. An entry already released is left as it is.
func (t *txn) removeRosterPlayerIn(rosterText string) error {
	if err := requireState(t.sess, "Only a prepared roster can remove players.", sqlcgen.QueueSessionStatePrepared); err != nil {
		return err
	}
	id, err := parseRowID(rosterText)
	if err != nil {
		return err
	}
	entry, err := t.q.GetSessionPlayer(t.ctx, id)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && entry.SessionID != t.sess.ID) {
		return writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return err
	}
	if entry.ReleasedAt.Valid {
		return nil
	}
	return t.q.ReleaseSessionPlayer(t.ctx, sqlcgen.ReleaseSessionPlayerParams{Now: t.stamp(), ID: entry.ID})
}

// pendingRequest is pendingRequest: a join request of this club, with its Player's picture and name seed.
func (t *txn) pendingRequest(requestText string) (sqlcgen.GetQueueJoinRequestForUpdateRow, error) {
	id, err := parseRowID(requestText)
	if err != nil {
		return sqlcgen.GetQueueJoinRequestForUpdateRow{}, err
	}
	r, err := t.q.GetQueueJoinRequestForUpdate(t.ctx, id)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && r.ClubID != t.club) {
		return r, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return r, err
}

// confirmed is what confirming a request answers: the request, and the entry or waitlist entry it made.
type confirmed struct {
	Request     *signedin.JoinRequest   `json:"request"`
	RosterEntry *signedin.RosterEntry   `json:"rosterEntry"`
	Waitlist    *signedin.WaitlistEntry `json:"waitlist"`
}

// requestAccept is the input of confirmJoinRequestIn.
type requestAccept struct {
	operationID string
	requestID   string
	level       string
	deviceID    pgtype.UUID
}

// confirmJoinRequestIn confirms a join request on a locked session: a guest's creates the club player (phone kept as private
// intake); a signed-in Player's uses their saved player in this club, created or restored from the profile when needed,
// never a new guest. Then a slot or a waitlist entry that arrives at the request's time. A request of another session is not
// found here. Repeat-safe.
func (t *txn) confirmJoinRequestIn(in requestAccept) (confirmed, error) {
	level, err := levelID(in.level)
	if err != nil {
		return confirmed{}, err
	}
	current, err := t.pendingRequest(in.requestID)
	if err != nil {
		return confirmed{}, err
	}
	if current.SessionID != t.sess.ID {
		return confirmed{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if current.Status != sqlcgen.JoinRequestStatusPending {
		// A Player's request keeps their own saved player, so the derived ID can't identify a replay; confirming it again has
		// the same outcome.
		if current.Status == sqlcgen.JoinRequestStatusConfirmed && (current.PlayerID.Valid || current.ClubPlayerID == derivedID(in.operationID, "club-player")) {
			d := signedin.JoinRequestOf(current)
			return confirmed{Request: &d}, nil
		}
		return confirmed{}, writes.Fail(httpapi.ErrConflict, map[string]string{"request": "This join request has already been decided."})
	}
	now := t.stamp()
	// D-2026-11-11-02: Join from waitlist. Give slot (prepared, never over the budget) / Admit player (live, over the budget
	// allowed) on the Player's own waitlist entry.
	if current.Placement == sqlcgen.JoinRequestPlacementFromWaitlist {
		return t.confirmFromWaitlist(in, current, level, now)
	}
	var cp sqlcgen.ClubPlayer
	if current.PlayerID.Valid {
		cp, _, err = t.clubPlayerForProfile(in.operationID, current.PlayerID.String(), now, "")
	} else {
		// A guest's request saves a guest: a name only (D-2026-11-16-04 removed the request phone and its phone linking).
		cp, _, err = t.createClubPlayer(in.operationID, newClubPlayer{name: current.Name, nickname: current.Nickname.String}, now)
	}
	if err != nil {
		return confirmed{}, err
	}
	p, err := t.place(cp, level, in.operationID, pgtype.Timestamptz{Time: current.RequestedAt.Time.Truncate(time.Millisecond), Valid: true},
		current.Placement == sqlcgen.JoinRequestPlacementWaitlist, false)
	if err != nil {
		return confirmed{}, err
	}
	d, err := t.decideRequest(current.ID, sqlcgen.JoinRequestStatusConfirmed, in.deviceID, cp.ID)
	if err != nil {
		return confirmed{}, err
	}
	return confirmed{Request: d, RosterEntry: p.RosterEntry, Waitlist: p.Waitlist}, nil
}

func (t *txn) confirmFromWaitlist(in requestAccept, current sqlcgen.GetQueueJoinRequestForUpdateRow, level pgtype.Int2, now pgtype.Timestamptz) (confirmed, error) {
	var entry sqlcgen.SessionWaitlist
	found := false
	if current.ClubPlayerID.Valid {
		e, err := t.q.GetSessionWaitlistEntryOfClubPlayer(t.ctx, sqlcgen.GetSessionWaitlistEntryOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: current.ClubPlayerID})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return confirmed{}, err
		}
		entry, found = e, err == nil
	}
	// Removed from the waitlist meanwhile: refused, the QM declines the request.
	if !found {
		return confirmed{}, writes.Fail(httpapi.ErrConflict, map[string]string{"request": fmt.Sprintf("%s is no longer on the waitlist.", current.Name)})
	}
	count, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return confirmed{}, err
	}
	capacity, err := t.capacityOf()
	if err != nil {
		return confirmed{}, err
	}
	over := int64(count) >= capacity
	if over && t.sess.State != sqlcgen.QueueSessionStateActive {
		return confirmed{}, writes.Fail(httpapi.ErrConflict, map[string]string{"request": fmt.Sprintf("Slots are full again. %s stays on the waitlist.", current.Name)})
	}
	levelled, err := t.q.SetSessionWaitlistLevel(t.ctx, sqlcgen.SetSessionWaitlistLevelParams{SkillLevelID: level, Now: now, ID: entry.ID})
	if err != nil {
		return confirmed{}, err
	}
	promoted, err := t.promoteWaiter(waiter{ID: levelled.ID, ClubPlayerID: levelled.ClubPlayerID, SkillLevelID: levelled.SkillLevelID}, in.operationID, over)
	if err != nil {
		return confirmed{}, err
	}
	re, err := t.rosterEntryOf(promoted, promoted.ClubPlayerID)
	if err != nil {
		return confirmed{}, err
	}
	d, err := t.decideRequest(current.ID, sqlcgen.JoinRequestStatusConfirmed, in.deviceID, pgtype.UUID{})
	if err != nil {
		return confirmed{}, err
	}
	return confirmed{Request: d, RosterEntry: re}, nil
}

// decideRequest writes the decision on a request and reads it back with its Player's picture. clubPlayer is set when the
// decision names the saved player the request became (a confirmation of a slot or waitlist request).
func (t *txn) decideRequest(id pgtype.UUID, status sqlcgen.JoinRequestStatus, device, clubPlayer pgtype.UUID) (*signedin.JoinRequest, error) {
	if err := t.q.DecideQueueJoinRequest(t.ctx, sqlcgen.DecideQueueJoinRequestParams{
		Status: status, Now: t.stamp(), DecidedByDeviceID: device, ClubPlayerID: clubPlayer, ID: id,
	}); err != nil {
		return nil, err
	}
	row, err := t.q.GetQueueJoinRequestForUpdate(t.ctx, id)
	if err != nil {
		return nil, err
	}
	d := signedin.JoinRequestOf(row)
	return &d, nil
}

// declineJoinRequestIn declines a request on a locked session. A request already declined answers as it is.
func (t *txn) declineJoinRequestIn(requestID string, device pgtype.UUID) (*signedin.JoinRequest, error) {
	current, err := t.pendingRequest(requestID)
	if err != nil {
		return nil, err
	}
	if current.SessionID != t.sess.ID {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if current.Status == sqlcgen.JoinRequestStatusDeclined {
		d := signedin.JoinRequestOf(current)
		return &d, nil
	}
	if current.Status != sqlcgen.JoinRequestStatusPending {
		return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"request": "This join request has already been decided."})
	}
	return t.decideRequest(current.ID, sqlcgen.JoinRequestStatusDeclined, device, pgtype.UUID{})
}
