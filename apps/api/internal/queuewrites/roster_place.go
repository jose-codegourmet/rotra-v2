package queuewrites

import (
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the placement half of packages/db/src/queue/session-roster.ts and session-store.ts: place, promoteWaiter and
// assessEntry, which every roster add and every confirmed join request go through.

func failLevel() error {
	return writes.Fail(httpapi.ErrInvalid, map[string]string{"level": "Choose a level for this club before confirming."})
}

// addPlacement is AddPlacement: Add anyway / Add to waitlist on a full roster (#735). Only `true` counts.
type addPlacement struct{ allowOverfill, toWaitlist bool }

// placed is what place answers: the roster entry, or the waitlist entry, the other being null.
type placed struct {
	RosterEntry *signedin.RosterEntry   `json:"rosterEntry"`
	Waitlist    *signedin.WaitlistEntry `json:"waitlist"`
}

// opUUID reads an operation id where the TypeScript hands it to Prisma as a uuid (a source operation id, a notification
// source): a malformed one is invalid here, a 500 there.
func opUUID(op string) (pgtype.UUID, error) { return parseOperationID(op, "operationId") }

// rosterNamesFor is rosterNamesFor: the names a Queue Master read shows for a saved player (D-2026-11-18-03), or none.
func (t *txn) rosterNamesFor(clubPlayerID pgtype.UUID) (nickname, club *string, err error) {
	row, err := t.q.GetRosterNames(t.ctx, clubPlayerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	nickname, club = signedin.RosterNames(row.ClubNickname, row.PlayerNickname, row.ProfileState)
	return nickname, club, nil
}

// rosterEntryOf is rosterEntryDto(entry, rosterNamesFor(clubPlayer)).
func (t *txn) rosterEntryOf(entry sqlcgen.SessionPlayer, clubPlayerID pgtype.UUID) (*signedin.RosterEntry, error) {
	nick, club, err := t.rosterNamesFor(clubPlayerID)
	if err != nil {
		return nil, err
	}
	d := signedin.RosterEntryOf(entry, nick, club)
	return &d, nil
}

// waitlistPosition is the 1-based place of an entry in the waitlist order.
func (t *txn) waitlistPosition(entryID pgtype.UUID) (int, error) {
	rows, err := t.q.ListQueueWaitlist(t.ctx, t.sess.ID)
	if err != nil {
		return 0, err
	}
	return signedin.WaitlistPosition(rows, entryID), nil
}

// assessEntry appends an assessment for this exact roster entry and selects it, superseding the entry's previous
// selection. It is repeat-safe on the operation id and refused once the entry's level is locked.
func (t *txn) assessEntry(entry sqlcgen.SessionPlayer, skillLevelID int16, operationID string) (sqlcgen.ClubAssessment, error) {
	op, err := opUUID(operationID)
	if err != nil {
		return sqlcgen.ClubAssessment{}, err
	}
	existing, err := t.q.GetClubAssessmentByOperation(t.ctx, op)
	if err == nil {
		if existing.SessionPlayerID != entry.ID {
			return existing, writes.Fail(httpapi.ErrConflict, nil)
		}
		return existing, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return existing, err
	}
	if entry.LevelLockedAt.Valid {
		return existing, writes.Fail(httpapi.ErrInvalid, map[string]string{"level": "Levels are locked after the session starts."})
	}
	assessment, err := t.q.InsertClubAssessment(t.ctx, sqlcgen.InsertClubAssessmentParams{
		ID: randomID(), ClubID: t.club, ClubPlayerID: entry.ClubPlayerID, SessionID: entry.SessionID, SessionPlayerID: entry.ID,
		PlayerIDAtAssessment: entry.PlayerIDAtEntry, SkillLevelID: skillLevelID, SupersedesID: entry.AssessmentID,
		SourceOperationID: op, Now: t.stamp(), AcceptedRevision: t.sess.Revision,
	})
	if err != nil {
		return assessment, err
	}
	return assessment, t.q.SelectSessionPlayerAssessment(t.ctx, sqlcgen.SelectSessionPlayerAssessmentParams{
		AssessmentID: assessment.ID, SkillLevelID: pgtype.Int2{Int16: skillLevelID, Valid: true}, Now: t.stamp(), ID: entry.ID,
	})
}

// waiter is the part of a waitlist row promoteWaiter reads.
type waiter struct {
	ID           pgtype.UUID
	ClubPlayerID pgtype.UUID
	SkillLevelID pgtype.Int2
}

// promoteWaiter gives a waitlisted player a slot: it deletes the waitlist row and reactivates that player's released roster
// entry (keeping its paid marks and assessments) or inserts a new one, then selects an assessment for the waitlist level. In
// an active session the entry is present and its level locks.
func (t *txn) promoteWaiter(w waiter, operationID string, overBudget bool) (sqlcgen.SessionPlayer, error) {
	if !w.SkillLevelID.Valid {
		return sqlcgen.SessionPlayer{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"level": "Choose a level before giving a slot."})
	}
	clubPlayer, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: w.ClubPlayerID})
	if err != nil {
		return sqlcgen.SessionPlayer{}, err
	}
	if err := t.q.DeleteSessionWaitlistEntry(t.ctx, w.ID); err != nil {
		return sqlcgen.SessionPlayer{}, err
	}
	active := t.sess.State == sqlcgen.QueueSessionStateActive
	var over pgtype.Timestamptz
	if overBudget {
		over = t.stamp()
	}
	var entry sqlcgen.SessionPlayer
	released, err := t.q.GetSessionPlayerOfClubPlayer(t.ctx, sqlcgen.GetSessionPlayerOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: clubPlayer.ID})
	switch {
	case err == nil:
		entry, err = t.q.ReactivateSessionPlayer(t.ctx, sqlcgen.ReactivateSessionPlayerParams{Now: t.stamp(), Present: active, OverBudgetAt: over, ID: released.ID})
	case errors.Is(err, pgx.ErrNoRows):
		entry, err = t.q.InsertSessionPlayer(t.ctx, sqlcgen.InsertSessionPlayerParams{
			ID: derivedID(operationID, "entry"), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: clubPlayer.ID,
			PlayerIDAtEntry: clubPlayer.PlayerID, NameSnapshot: clubPlayer.DisplayName, Present: active, Now: t.stamp(), OverBudgetAt: over,
		})
	}
	if err != nil {
		return entry, err
	}
	// Each admission records its level as new assessment evidence, keyed on the operation.
	assessment, err := t.assessEntry(entry, w.SkillLevelID.Int16, operationID)
	if err != nil {
		return entry, err
	}
	if err := t.notifySpotConfirmed(clubPlayer.PlayerID, assessment.ID); err != nil {
		return entry, err
	}
	if active {
		if err := t.q.LockSessionPlayerLevel(t.ctx, sqlcgen.LockSessionPlayerLevelParams{Now: t.stamp(), ID: entry.ID}); err != nil {
			return entry, err
		}
	}
	return t.q.GetSessionPlayer(t.ctx, entry.ID)
}

// place places a club player: a slot while one is open, otherwise the waitlist. toWaitlist (a Be waitlisted request, or Add to
// waitlist) always gives the waitlist place, even during play; allowOverfill (Add anyway) gives the slot beyond the budget.
// It refuses a player already live on the roster or waiting. Concurrent admissions are serialized by the session lock.
// Repeat-safe on the operation id: a retry answers the entry the first try made.
func (t *txn) place(clubPlayer sqlcgen.ClubPlayer, skillLevelID pgtype.Int2, operationID string, addedAt pgtype.Timestamptz, toWaitlist, allowOverfill bool) (placed, error) {
	waitlistID := derivedID(operationID, "waitlist")
	op, err := opUUID(operationID)
	if err != nil {
		return placed{}, err
	}
	// A retry of the same operation returns what it already did.
	admitted, err := t.q.GetClubAssessmentByOperation(t.ctx, op)
	if err == nil {
		entry, err := t.q.GetSessionPlayer(t.ctx, admitted.SessionPlayerID)
		if err != nil {
			return placed{}, err
		}
		d, err := t.rosterEntryOf(entry, clubPlayer.ID)
		return placed{RosterEntry: d}, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return placed{}, err
	}
	waiting, err := t.q.GetSessionWaitlistEntryOfClubPlayer(t.ctx, sqlcgen.GetSessionWaitlistEntryOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: clubPlayer.ID})
	hasWaiting := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return placed{}, err
	}
	if hasWaiting && waiting.ID == waitlistID {
		pos, err := t.waitlistPosition(waiting.ID)
		d := signedin.WaitlistEntryOf(waiting, pos)
		return placed{Waitlist: &d}, err
	}
	live, err := t.q.GetSessionPlayerOfClubPlayer(t.ctx, sqlcgen.GetSessionPlayerOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: clubPlayer.ID})
	hasLive := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return placed{}, err
	}
	if hasWaiting || (hasLive && !live.ReleasedAt.Valid) {
		return placed{}, writes.Fail(httpapi.ErrConflict, map[string]string{"player": "This player is already on the roster or waitlist."})
	}
	row, err := t.q.InsertSessionWaitlistEntry(t.ctx, sqlcgen.InsertSessionWaitlistEntryParams{
		ID: waitlistID, ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: clubPlayer.ID, SkillLevelID: skillLevelID, AddedAt: addedAt, Now: t.stamp(),
	})
	if err != nil {
		return placed{}, err
	}
	rosterCount, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return placed{}, err
	}
	capacity, err := t.capacityOf()
	if err != nil {
		return placed{}, err
	}
	atBudget := int64(rosterCount) >= capacity
	if toWaitlist || (atBudget && !allowOverfill) {
		pos, err := t.waitlistPosition(row.ID)
		if err != nil {
			return placed{}, err
		}
		if err := t.notifyWaitlistPlace(clubPlayer.PlayerID, row.ID, pos); err != nil {
			return placed{}, err
		}
		d := signedin.WaitlistEntryOf(row, pos)
		return placed{Waitlist: &d}, nil
	}
	entry, err := t.promoteWaiter(waiter{ID: row.ID, ClubPlayerID: row.ClubPlayerID, SkillLevelID: row.SkillLevelID}, operationID, atBudget)
	if err != nil {
		return placed{}, err
	}
	d, err := t.rosterEntryOf(entry, clubPlayer.ID)
	return placed{RosterEntry: d}, err
}
