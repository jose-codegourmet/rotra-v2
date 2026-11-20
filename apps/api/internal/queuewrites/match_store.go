package queuewrites

import (
	"context"
	"errors"
	"regexp"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file is the match store the request and match commands share (packages/db/src/queue/{match-store,match-queue,match-control}.ts):
// matchCommand, the match context, appendMatch, and the way a match is put On court. Add to queue and Auto Queue use it now; the
// match control commands build on the same pieces.

// strictUUID is the TypeScript's UUID test of the request and notice routes: hyphenated, either case. Postgres reads more forms,
// but those routes answer not found for anything else.
var strictUUID = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// rowIDStrict reads a path or body id the way those routes do: not hyphenated like a UUID is not found.
func rowIDStrict(text string) (pgtype.UUID, error) {
	if !strictUUID.MatchString(text) {
		return pgtype.UUID{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return parseRowID(text)
}

// txnRequest is what a command on one session is run for: the club and the session of the path.
type txnRequest struct {
	ctx       context.Context
	club      pgtype.UUID
	sessionID string
}

// commandDone is what a match command answers: the result and the queue revision it bumped.
type commandDone struct {
	Result        any    `json:"result"`
	QueueRevision string `json:"queueRevision"`
}

// matchCommand is matchCommand: change runs on the locked, active session (the states and the message of requireState), and every
// change bumps the queue revision. A command that needs an expected revision checks it in change.
func (s *server) matchCommand(r *txnRequest, change func(t *txn) (any, error)) (commandDone, error) {
	out, err := s.inSession(r.ctx, r.club, r.sessionID, func(t *txn) (any, error) {
		if err := requireState(t.sess, "Start the session first.", sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		res, err := change(t)
		if err != nil {
			return nil, err
		}
		if err := t.q.BumpQueueRevision(t.ctx, sqlcgen.BumpQueueRevisionParams{Now: t.stamp(), ID: t.sess.ID}); err != nil {
			return nil, err
		}
		bumped, err := t.reload(t.sess.ID)
		if err != nil {
			return nil, err
		}
		return commandDone{Result: res, QueueRevision: httpapi.ToDecimalString(bumped.QueueRevision)}, nil
	})
	if err != nil {
		return commandDone{}, mapDatabaseError(err)
	}
	return out.(commandDone), nil
}

// matchState is matchContext: the session's roster, matches and courts in the shapes the shared rules read, with the stored roster.
type matchState struct {
	signedin.MatchContext
	stored []sqlcgen.SessionPlayer
}

// matchContext reads the roster, matches and courts of the locked session.
func (t *txn) matchContext() (matchState, error) {
	mc, err := signedin.MatchContextOf(t.ctx, t.q, t.sess.ID)
	if err != nil {
		return matchState{}, err
	}
	stored, err := t.q.ListQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return matchState{}, err
	}
	return matchState{MatchContext: mc, stored: stored}, nil
}

// rules is the context the shared rules read, at the clock of the command.
func (m matchState) rules(now int64) model.Context {
	return model.Context{Roster: m.Roster, Matches: m.Matches, Courts: m.Courts, Now: now}
}

// rosterIDs is the set of the live roster's entry ids.
func (m matchState) rosterIDs() map[string]bool {
	ids := make(map[string]bool, len(m.Roster))
	for _, p := range m.Roster {
		ids[p.ID] = true
	}
	return ids
}

// matchOf is matchDto of a match of the session as stored now.
func (t *txn) matchOf(id pgtype.UUID) (signedin.Match, error) {
	m, found, err := signedin.MatchOf(t.ctx, t.q, t.sess.ID, id)
	if err != nil {
		return signedin.Match{}, err
	}
	if !found {
		return signedin.Match{}, pgx.ErrNoRows
	}
	return m, nil
}

// lineupInput is how appendMatch is told what to write.
type lineupInput struct {
	operationID     string
	origin          sqlcgen.MatchOrigin
	manualProtected bool
}

// appendMatch is appendMatch: one waiting match with the next immutable match number at the end of the queue. Repeat-safe on the
// operation: a retry returns the stored match and never renumbers or duplicates it.
func (t *txn) appendMatch(rosterIDs map[string]bool, lineup model.Lineup, in lineupInput) (pgtype.UUID, error) {
	op, err := opUUID(in.operationID)
	if err != nil {
		return pgtype.UUID{}, err
	}
	existing, err := t.q.GetMatchBySourceOperation(t.ctx, op)
	if err == nil {
		if existing.SessionID != t.sess.ID {
			return pgtype.UUID{}, writes.Fail(httpapi.ErrConflict, nil)
		}
		return existing.ID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, err
	}
	if err := t.validateLineup(rosterIDs, lineup, in.origin == sqlcgen.MatchOriginManual); err != nil {
		return pgtype.UUID{}, err
	}
	no, err := t.q.NextQueueMatchNo(t.ctx, t.sess.ID)
	if err != nil {
		return pgtype.UUID{}, err
	}
	position, err := t.q.NextQueuePosition(t.ctx, t.sess.ID)
	if err != nil {
		return pgtype.UUID{}, err
	}
	id := derivedID(in.operationID, "match")
	now := t.stamp()
	if err := t.q.InsertQueueMatch(t.ctx, sqlcgen.InsertQueueMatchParams{
		ID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchNo: no, Format: sqlcgen.MatchFormat(lineup.Format),
		QueuePosition: pgtype.Int8{Int64: position, Valid: true}, Origin: in.origin, ManualProtected: in.manualProtected, SourceOperationID: op, Now: now,
	}); err != nil {
		return pgtype.UUID{}, err
	}
	for _, side := range []struct {
		team sqlcgen.TeamSide
		ids  []string
	}{{sqlcgen.TeamSideA, lineup.TeamA}, {sqlcgen.TeamSideB, lineup.TeamB}} {
		for _, playerID := range side.ids {
			player, err := parseRowID(playerID)
			if err != nil {
				return pgtype.UUID{}, err
			}
			if err := t.q.InsertMatchParticipation(t.ctx, sqlcgen.InsertMatchParticipationParams{
				ID: derivedID(in.operationID, id.String()+":"+playerID), ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: id,
				SessionPlayerID: player, Team: side.team, JoinedOperationID: op, Now: now,
			}); err != nil {
				return pgtype.UUID{}, err
			}
		}
	}
	return id, nil
}

// validateLineup is validateLineup: every slot filled by a different live roster entry; formats switched off are refused.
func (t *txn) validateLineup(rosterIDs map[string]bool, lineup model.Lineup, manual bool) error {
	players := slices.Concat(lineup.TeamA, lineup.TeamB)
	if !match.CompleteLineup(lineup) || slices.ContainsFunc(players, func(id string) bool { return !rosterIDs[id] }) {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"lineup": "Fill every slot with a different roster player."})
	}
	if lineup.Format == "singles" && !t.sess.AllowSingles {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"format": "singles is off for this session"})
	}
	if lineup.Format == "doubles" && !t.sess.AllowDoubles {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"format": "doubles is off for this session"})
	}
	if !manual && strings.HasPrefix(string(lineup.Format), "fun_") {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"format": "Add a fun game manually instead."})
	}
	return nil
}

// putOnCourt is putOnCourt: a waiting match goes On court with placed_at and out of the queue, then every court and player hold
// (the hold trigger needs the state first). One way to place a match for Put on court, Swap with the queue and Auto Queue.
func (t *txn) putOnCourt(matchID pgtype.UUID, stored []sqlcgen.SessionPlayer, courtIDs []pgtype.UUID, operationID string, now pgtype.Timestamptz) error {
	if err := t.q.PlaceQueueMatchOnCourt(t.ctx, sqlcgen.PlaceQueueMatchOnCourtParams{Now: now, ID: matchID}); err != nil {
		return err
	}
	if err := t.acquireCourts(matchID, courtIDs, operationID, now); err != nil {
		return err
	}
	return t.holdPlayers(matchID, stored, now)
}

// acquireCourts is acquireCourts: one court hold per court and the court usage, keyed on the operation. Usage is unique per match and
// court and never deleted, so a match coming back to a court it used before takes its released row up again.
func (t *txn) acquireCourts(matchID pgtype.UUID, courtIDs []pgtype.UUID, operationID string, now pgtype.Timestamptz) error {
	op, err := opUUID(operationID)
	if err != nil {
		return err
	}
	for _, court := range courtIDs {
		if err := t.q.InsertActiveCourtHold(t.ctx, sqlcgen.InsertActiveCourtHoldParams{CourtID: court, ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: matchID, Now: now}); err != nil {
			return err
		}
		used, err := t.q.GetMatchCourtUsageOfCourt(t.ctx, sqlcgen.GetMatchCourtUsageOfCourtParams{MatchID: matchID, CourtID: court})
		if err == nil {
			err = t.q.TakeUpMatchCourtUsage(t.ctx, sqlcgen.TakeUpMatchCourtUsageParams{Now: now, AcquireOperationID: op, ID: used.ID})
		} else if errors.Is(err, pgx.ErrNoRows) {
			err = t.q.InsertMatchCourtUsage(t.ctx, sqlcgen.InsertMatchCourtUsageParams{
				ID: derivedID(operationID, "court:"+court.String()), ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: matchID, CourtID: court, Now: now, AcquireOperationID: op,
			})
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// holdPlayers is holdPlayers: the player holds match the current lineup, a hold for every open segment and none for anyone who left it.
func (t *txn) holdPlayers(matchID pgtype.UUID, stored []sqlcgen.SessionPlayer, now pgtype.Timestamptz) error {
	parts, err := t.q.ListQueueMatchParticipations(t.ctx, matchID)
	if err != nil {
		return err
	}
	lineup := map[pgtype.UUID]bool{}
	for _, p := range parts {
		if !p.LeftAt.Valid {
			lineup[p.SessionPlayerID] = true
		}
	}
	held, err := t.q.ListActivePlayerHolds(t.ctx, matchID)
	if err != nil {
		return err
	}
	have := map[pgtype.UUID]bool{}
	var stale []pgtype.UUID
	for _, h := range held {
		have[h.SessionPlayerID] = true
		if !lineup[h.SessionPlayerID] {
			stale = append(stale, h.SessionPlayerID)
		}
	}
	if len(stale) > 0 {
		if err := t.q.DeleteActivePlayerHolds(t.ctx, sqlcgen.DeleteActivePlayerHoldsParams{MatchID: matchID, SessionPlayerIds: stale}); err != nil {
			return err
		}
	}
	playerAtEntry := map[pgtype.UUID]pgtype.UUID{}
	for _, e := range stored {
		playerAtEntry[e.ID] = e.PlayerIDAtEntry
	}
	// The TypeScript walks a Set in insertion order, which is the order of the participations.
	for _, p := range parts {
		id := p.SessionPlayerID
		if p.LeftAt.Valid || have[id] {
			continue
		}
		have[id] = true
		if err := t.q.InsertActivePlayerHold(t.ctx, sqlcgen.InsertActivePlayerHoldParams{
			SessionPlayerID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: matchID, PlayerID: playerAtEntry[id], Now: now,
		}); err != nil {
			return err
		}
	}
	return nil
}
