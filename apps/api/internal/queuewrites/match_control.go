package queuewrites

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"slices"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Match control (Q-MATCH, packages/db/src/queue/match-control.ts and the routes under apps/queue/src/app/api/sessions/[sessionId]/matches/[matchId]).
// Each command is keyed on its operation id, runs through matchCommand (the locked, running session; every change bumps the queue
// revision) and answers the match as stored after the change.

func (s *server) registerMatchControl(rt *signedin.Router) {
	const match = "/api/sessions/{sessionId}/matches/{matchId}"
	rt.Handle("POST "+match+"/place", store.AudienceClub, s.club(s.placeOnCourt))
	rt.Handle("POST "+match+"/start", store.AudienceClub, s.club(s.startMatch))
	rt.Handle("POST "+match+"/send-back", store.AudienceClub, s.club(s.sendBackToQueue))
	rt.Handle("POST "+match+"/move", store.AudienceClub, s.club(s.moveCourt))
	rt.Handle("POST "+match+"/swap", store.AudienceClub, s.club(s.swapWithQueue))
	rt.Handle("POST "+match+"/replace", store.AudienceClub, s.club(s.replacePlayer))
	rt.Handle("POST "+match+"/substitution", store.AudienceClub, s.club(s.substitutePlayer))
	rt.Handle("POST "+match+"/result", store.AudienceClub, s.club(s.completeMatch))
	rt.Handle("POST "+match+"/invalid", store.AudienceClub, s.club(s.invalidateMatch))
}

// matchRow is MatchRow: a match of the session with its segments, holds, court usage and decision.
type matchRow struct {
	m        sqlcgen.Match
	parts    []sqlcgen.MatchParticipation
	holds    []sqlcgen.ActiveCourtHold
	usage    []sqlcgen.MatchCourtUsage
	decision *sqlcgen.MatchDecision
}

// loadMatch is loadMatch: nil when the match is not one of the session's. The id is text so a malformed one is simply not there.
func (t *txn) loadMatch(idText string) (*matchRow, error) {
	id, ok := writes.ParseUUID(idText)
	if !ok {
		return nil, nil
	}
	m, err := t.q.GetQueueMatch(t.ctx, sqlcgen.GetQueueMatchParams{ID: id, SessionID: t.sess.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	row := &matchRow{m: m}
	if row.parts, err = t.q.ListQueueMatchParticipations(t.ctx, id); err != nil {
		return nil, err
	}
	if row.holds, err = t.q.ListMatchCourtHolds(t.ctx, id); err != nil {
		return nil, err
	}
	if row.usage, err = t.q.ListMatchCourtUsages(t.ctx, id); err != nil {
		return nil, err
	}
	d, err := t.q.GetMatchDecision(t.ctx, id)
	if err == nil {
		row.decision = &d
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	return row, nil
}

// activeMatch is activeMatch: the match, or not found when it is unknown or a removed draft.
func (t *txn) activeMatch(idText string) (*matchRow, error) {
	row, err := t.loadMatch(idText)
	if err != nil {
		return nil, err
	}
	if row == nil || row.m.RemovedAt.Valid {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return row, nil
}

func (r *matchRow) acquiredBy(op string) bool {
	return slices.ContainsFunc(r.usage, func(u sqlcgen.MatchCourtUsage) bool {
		return u.AcquireOperationID.Valid && u.AcquireOperationID.String() == op
	})
}

func (r *matchRow) releasedBy(op string) bool {
	return slices.ContainsFunc(r.usage, func(u sqlcgen.MatchCourtUsage) bool {
		return u.ReleaseOperationID.Valid && u.ReleaseOperationID.String() == op
	})
}

func (r *matchRow) open(id string) bool {
	return slices.ContainsFunc(r.parts, func(p sqlcgen.MatchParticipation) bool { return p.SessionPlayerID.String() == id && !p.LeftAt.Valid })
}

func conflictMatch() error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{"match": "Something changed. Review the match again."})
}

// textList is the body's list with the ids that are not text dropped; anything but a list is empty.
func textList(body writes.Body, key string) []string {
	out := []string{}
	if list, ok := body[key].([]any); ok {
		for _, v := range list {
			if id, ok := v.(string); ok {
				out = append(out, id)
			}
		}
	}
	return out
}

// uuids reads ids that passed a rule check; a malformed one (never after the check) is not found.
func uuids(texts []string) ([]pgtype.UUID, error) {
	out := make([]pgtype.UUID, len(texts))
	for i, text := range texts {
		id, err := parseRowID(text)
		if err != nil {
			return nil, err
		}
		out[i] = id
	}
	return out, nil
}

// matchRequest is the club, the session of the path and the context of a match command.
func matchRequestOf(r *http.Request, club pgtype.UUID) *txnRequest {
	return &txnRequest{ctx: r.Context(), club: club, sessionID: r.PathValue("sessionId")}
}

// requireOnCourt is requireOnCourt: an On court match with no decision, or a conflict.
func requireOnCourt(row *matchRow) error {
	if row.m.State != sqlcgen.MatchStateOnCourt || row.decision != nil {
		return conflictMatch()
	}
	return nil
}

// unplace is unplace: an On court match gives up its courts and players and goes back to waiting; the caller sets the queue position.
func (t *txn) unplace(row *matchRow, operationID string, now pgtype.Timestamptz) error {
	op, err := opUUID(operationID)
	if err != nil {
		return err
	}
	if err := t.q.ReleaseMatchCourtUsage(t.ctx, sqlcgen.ReleaseMatchCourtUsageParams{Now: now, ReleaseOperationID: op, MatchID: row.m.ID}); err != nil {
		return err
	}
	if err := t.q.DeleteMatchCourtHolds(t.ctx, row.m.ID); err != nil {
		return err
	}
	if err := t.q.DeleteMatchPlayerHolds(t.ctx, row.m.ID); err != nil {
		return err
	}
	return t.q.UnplaceMatch(t.ctx, sqlcgen.UnplaceMatchParams{Now: now, ID: row.m.ID})
}

// queueAt is queueAt: the waiting matches in queue order with the match at index (0-based), every position renumbered 1..n.
func (t *txn) queueAt(matchID pgtype.UUID, index int) error {
	all, err := t.q.ListWaitingMatchIDs(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	list := slices.DeleteFunc(all, func(id pgtype.UUID) bool { return id == matchID })
	index = max(0, min(len(list), index))
	list = slices.Insert(list, index, matchID)
	for i, id := range list {
		if err := t.q.SetMatchQueuePosition(t.ctx, sqlcgen.SetMatchQueuePositionParams{QueuePosition: pgtype.Int8{Int64: int64(i + 1), Valid: true}, Now: t.stamp(), ID: id}); err != nil {
			return err
		}
	}
	return nil
}

// queuePlace is queuePlace: the 1-based place of a waiting match in the queue (0 when it is not waiting).
func (t *txn) queuePlace(matchID pgtype.UUID) (int, error) {
	list, err := t.q.ListWaitingMatchIDs(t.ctx, t.sess.ID)
	if err != nil {
		return 0, err
	}
	return slices.Index(list, matchID) + 1, nil
}

// withPlaced is withAutoPlaced: the reply of a command that can trigger Auto Queue carries what it placed.
type withPlaced struct {
	Result        any              `json:"result"`
	QueueRevision string           `json:"queueRevision"`
	AutoPlaced    []signedin.Match `json:"autoPlaced"`
}

func placedReply(done commandDone, placed []signedin.Match) withPlaced {
	if placed == nil {
		placed = []signedin.Match{}
	}
	return withPlaced{Result: done.Result, QueueRevision: done.QueueRevision, AutoPlaced: placed}
}

// placeOnCourt is POST place, Q-DISPATCH Put on court: revalidates presence, lineup, session and courts, then takes every court and player
// hold at once. Keyed on the operation id through its court usage rows, so a retry returns the placed match.
func (s *server) placeOnCourt(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, courtIDs := body.Text("operationId"), textList(body, "courtIds")
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.acquiredBy(op) {
			return t.matchOf(row.m.ID)
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		ctx := state.rules(t.s.at().UnixMilli())
		view, ok := state.view(row.m.ID)
		if !ok || !match.CanPlace(view, courtIDs, ctx) {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"match": "Something changed. Review the match again."})
		}
		courts, err := uuids(courtIDs)
		if err != nil {
			return nil, err
		}
		if err := t.putOnCourt(row.m.ID, state.stored, courts, op, t.stamp()); err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// startMatch is POST start, Q-ON-COURT Start match. From On court: no court choice, the holds taken at placement are kept and the timer
// starts. From waiting: the older one-step start, which places and starts at once on the chosen courts.
func (s *server) startMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, courtIDs := body.Text("operationId"), textList(body, "courtIds")
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.acquiredBy(op) {
			return t.matchOf(row.m.ID)
		}
		if row.m.State == sqlcgen.MatchStateActive && row.m.PlacedAt.Valid && row.decision == nil {
			held := map[string]bool{}
			for _, h := range row.holds {
				held[h.CourtID.String()] = true
			}
			if len(courtIDs) == 0 || (len(courtIDs) == len(held) && !slices.ContainsFunc(courtIDs, func(id string) bool { return !held[id] })) {
				return t.matchOf(row.m.ID)
			}
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		view, ok := state.view(row.m.ID)
		if !ok || !match.CanStart(view, courtIDs, state.rules(t.s.at().UnixMilli())) {
			return nil, conflictMatch()
		}
		now := t.stamp()
		placed := row.m.State == sqlcgen.MatchStateOnCourt
		if placed {
			err = t.q.StartPlacedMatch(t.ctx, sqlcgen.StartPlacedMatchParams{Now: now, ID: row.m.ID})
		} else {
			err = t.q.StartWaitingMatch(t.ctx, sqlcgen.StartWaitingMatchParams{Now: now, ID: row.m.ID})
		}
		if err != nil {
			return nil, err
		}
		if err := t.q.MarkMatchSegmentsStarted(t.ctx, sqlcgen.MarkMatchSegmentsStartedParams{Now: now, MatchID: row.m.ID}); err != nil {
			return nil, err
		}
		if placed {
			err = t.holdPlayers(row.m.ID, state.stored, now)
		} else {
			var courts []pgtype.UUID
			if courts, err = uuids(courtIDs); err == nil {
				if err = t.acquireCourts(row.m.ID, courts, op, now); err == nil {
					err = t.holdPlayers(row.m.ID, state.stored, now)
				}
			}
		}
		if err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// sendBackToQueue is POST send-back, Q-ON-COURT Send back to queue: the On court match goes to the top of the queue and its courts and
// players free up. In Auto Queue the freed court is refilled with the next eligible match other than this one.
func (s *server) sendBackToQueue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op := body.Text("operationId")
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.releasedBy(op) {
			return t.matchOf(row.m.ID)
		}
		if err := requireOnCourt(row); err != nil {
			return nil, err
		}
		if err := t.unplace(row, op, t.stamp()); err != nil {
			return nil, err
		}
		if err := t.queueAt(row.m.ID, 0); err != nil {
			return nil, err
		}
		result, err := t.matchOf(row.m.ID)
		if err != nil {
			return nil, err
		}
		except := row.m.ID.String()
		placed, err = t.fillCourts(t.sess, op, fillOptions{exceptMatchID: &except})
		return result, err
	})
	return writes.Result{Body: placedReply(done, placed)}, err
}

// moveCourt is POST move, Q-ON-COURT Move to another court: the On court or Playing match releases its court(s) and takes the chosen free open
// one(s); player holds stay. In Auto Queue the court(s) it left are refilled.
func (s *server) moveCourt(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, courtIDs := body.Text("operationId"), textList(body, "courtIds")
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.acquiredBy(op) {
			return t.matchOf(row.m.ID)
		}
		// A Playing match moves too (owner, November 19, 2026): it keeps playing on the new court(s) with the same start time; only
		// the court usage changes.
		playing := row.m.State == sqlcgen.MatchStateActive
		if playing {
			err = requireLineupEditable(row)
		} else {
			err = requireOnCourt(row)
		}
		if err != nil {
			return nil, err
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		allowed := match.CanMoveCourt
		if playing {
			allowed = match.CanMovePlaying
		}
		view, ok := state.view(row.m.ID)
		if !ok || !allowed(view, courtIDs, state.rules(t.s.at().UnixMilli())) {
			return nil, conflictMatch()
		}
		now := t.stamp()
		opID, err := opUUID(op)
		if err != nil {
			return nil, err
		}
		if err := t.q.ReleaseMatchCourtUsage(t.ctx, sqlcgen.ReleaseMatchCourtUsageParams{Now: now, ReleaseOperationID: opID, MatchID: row.m.ID}); err != nil {
			return nil, err
		}
		if err := t.q.DeleteMatchCourtHolds(t.ctx, row.m.ID); err != nil {
			return nil, err
		}
		courts, err := uuids(courtIDs)
		if err != nil {
			return nil, err
		}
		if err := t.acquireCourts(row.m.ID, courts, op, now); err != nil {
			return nil, err
		}
		if err := t.q.BumpMatchRevision(t.ctx, sqlcgen.BumpMatchRevisionParams{Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		result, err := t.matchOf(row.m.ID)
		if err != nil {
			return nil, err
		}
		placed, err = t.fillCourts(t.sess, op, fillOptions{})
		return result, err
	})
	return writes.Result{Body: placedReply(done, placed)}, err
}

// swapReply is what Swap with the queue answers: both matches and where this one went in the queue.
type swapReply struct {
	Match    signedin.Match `json:"match"`
	Placed   signedin.Match `json:"placed"`
	Position int            `json:"position"`
}

// swapWithQueue is POST swap, Q-ON-COURT Swap with the queue. It rechecks that withMatchId is still the swap target, then this match
// releases its holds and takes the target's queue position, and the target goes On court on the same court(s).
func (s *server) swapWithQueue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, withID := body.Text("operationId"), body.Text("withMatchId")
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		reply := func() (any, error) {
			mine, err := t.matchOf(row.m.ID)
			if err != nil {
				return nil, err
			}
			other, err := t.loadedMatchOf(withID)
			if err != nil {
				return nil, err
			}
			position, err := t.queuePlace(row.m.ID)
			return swapReply{Match: mine, Placed: other, Position: position}, err
		}
		if row.releasedBy(op) {
			return reply()
		}
		if err := requireOnCourt(row); err != nil {
			return nil, err
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		view, ok := state.view(row.m.ID)
		var target *match.SwapTarget
		if ok {
			target = match.Swap(view, state.rules(t.s.at().UnixMilli()))
		}
		if target == nil || target.Match.ID != withID {
			return nil, conflictMatch()
		}
		incoming, err := t.activeMatch(withID)
		if err != nil {
			return nil, err
		}
		courts := make([]pgtype.UUID, len(row.holds))
		for i, h := range row.holds {
			courts[i] = h.CourtID
		}
		now := t.stamp()
		if err := t.unplace(row, op, now); err != nil {
			return nil, err
		}
		if err := t.q.SetMatchQueuePositionOf(t.ctx, sqlcgen.SetMatchQueuePositionOfParams{OtherID: incoming.m.ID, Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		if err := t.putOnCourt(incoming.m.ID, state.stored, courts, op, now); err != nil {
			return nil, err
		}
		return reply()
	})
	return writes.Result{Body: done}, err
}

// loadedMatchOf is matchDto of a match loaded by its text id.
func (t *txn) loadedMatchOf(idText string) (signedin.Match, error) {
	id, err := parseRowID(idText)
	if err != nil {
		return signedin.Match{}, err
	}
	return t.matchOf(id)
}

// requireLineupEditable is requireLineupEditable: an On court or Playing match with no decision, or a conflict.
func requireLineupEditable(row *matchRow) error {
	if (row.m.State != sqlcgen.MatchStateOnCourt && row.m.State != sqlcgen.MatchStateActive) || row.decision != nil {
		return conflictMatch()
	}
	return nil
}

// replacePlayer is POST replace, Q-ON-COURT / Q-MATCH Replace player: a lineup change on an On court or Playing match, never a
// substitution. On a Playing match the open segment is handed to the incoming player in place (segments of a started match are never
// deleted) and the outgoing player is left with nothing from it. The match becomes manual and protected.
func (s *server) replacePlayer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, outID, inID := body.Text("operationId"), body.Text("outId"), body.Text("inId")
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if slices.ContainsFunc(row.parts, func(p sqlcgen.MatchParticipation) bool {
			return p.JoinedOperationID.String() == op && p.SessionPlayerID.String() == inID
		}) || (row.m.State == sqlcgen.MatchStateActive && row.decision == nil && row.open(inID) && !row.open(outID)) {
			return t.matchOf(row.m.ID)
		}
		if err := requireLineupEditable(row); err != nil {
			return nil, err
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		view, ok := state.view(row.m.ID)
		var outgoing *sqlcgen.MatchParticipation
		for i := range row.parts {
			if row.parts[i].SessionPlayerID.String() == outID && !row.parts[i].LeftAt.Valid {
				outgoing = &row.parts[i]
				break
			}
		}
		if !ok || outgoing == nil || !match.CanReplacePlayer(view, outID, inID, state.rules(t.s.at().UnixMilli())) {
			return nil, conflictMatch()
		}
		in, err := parseRowID(inID)
		if err != nil {
			return nil, err
		}
		now := t.stamp()
		if row.m.State == sqlcgen.MatchStateActive {
			segments := 0
			for _, p := range row.parts {
				if p.SessionPlayerID == in {
					segments++
				}
			}
			err = t.q.HandOverMatchSegment(t.ctx, sqlcgen.HandOverMatchSegmentParams{SessionPlayerID: in, SegmentNo: int32(segments + 1), Now: now, ID: outgoing.ID})
		} else {
			if err = t.q.DeleteMatchParticipation(t.ctx, outgoing.ID); err == nil {
				var opID pgtype.UUID
				if opID, err = opUUID(op); err == nil {
					err = t.q.InsertMatchParticipation(t.ctx, sqlcgen.InsertMatchParticipationParams{
						ID: derivedID(op, row.m.ID.String()+":"+inID), ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: row.m.ID,
						SessionPlayerID: in, Team: outgoing.Team, JoinedOperationID: opID, Now: now,
					})
				}
			}
		}
		if err != nil {
			return nil, err
		}
		if err := t.q.MakeMatchManual(t.ctx, sqlcgen.MakeMatchManualParams{Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		if err := t.holdPlayers(row.m.ID, state.stored, now); err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// slotSegments is slotSegments: the earlier substitution segments of a team slot. Walking back from segment, each segment a substitution
// opened (its operation closed another segment), until one that started the match.
func slotSegments(parts []sqlcgen.MatchParticipation, segment sqlcgen.MatchParticipation) []sqlcgen.MatchParticipation {
	var found []sqlcgen.MatchParticipation
	current := segment
	for {
		opened := current
		i := slices.IndexFunc(parts, func(p sqlcgen.MatchParticipation) bool {
			return p.ID != opened.ID && p.LeftOperationID.Valid && p.LeftOperationID == opened.JoinedOperationID
		})
		if i < 0 || slices.ContainsFunc(found, func(p sqlcgen.MatchParticipation) bool { return p.ID == opened.ID }) {
			return found
		}
		found = append(found, opened)
		current = parts[i]
	}
}

// substitutePlayer is POST substitution, Q-MATCH Substitute: the outgoing segment closes and the incoming one opens with the same
// operation, and the player hold moves. creditTo (none, incoming or outgoing) sits on the incoming segment; naming a person clears an
// earlier choice in the same team slot.
func (s *server) substitutePlayer(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, outID, inID := body.Text("operationId"), body.Text("outId"), body.Text("inId")
	credit := "none"
	if body["creditTo"] != nil {
		credit = body.Text("creditTo")
	}
	if credit != "none" && credit != "incoming" && credit != "outgoing" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"creditTo": "Choose who gets this game."})
	}
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if slices.ContainsFunc(row.parts, func(p sqlcgen.MatchParticipation) bool {
			return p.JoinedOperationID.String() == op && p.SessionPlayerID.String() == inID
		}) {
			return t.matchOf(row.m.ID)
		}
		if row.m.State != sqlcgen.MatchStateActive || row.decision != nil {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"match": "This match already has a confirmed outcome or is not active."})
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		ctx := state.rules(t.s.at().UnixMilli())
		view, ok := state.view(row.m.ID)
		var outgoing *sqlcgen.MatchParticipation
		for i := range row.parts {
			if row.parts[i].SessionPlayerID.String() == outID && !row.parts[i].LeftAt.Valid {
				outgoing = &row.parts[i]
				break
			}
		}
		incomingOK := false
		if ok {
			for _, p := range match.SubstitutionCandidates(view, ctx.Roster, ctx.Matches) {
				if p.ID == inID {
					incomingOK = true
					break
				}
			}
		}
		if outgoing == nil || !incomingOK {
			return nil, conflictMatch()
		}
		in, err := parseRowID(inID)
		if err != nil {
			return nil, err
		}
		opID, err := opUUID(op)
		if err != nil {
			return nil, err
		}
		now := t.stamp()
		if err := t.q.CloseMatchSegment(t.ctx, sqlcgen.CloseMatchSegmentParams{Now: now, LeftOperationID: opID, ID: outgoing.ID}); err != nil {
			return nil, err
		}
		segments := 0
		for _, p := range row.parts {
			if p.SessionPlayerID == in {
				segments++
			}
		}
		if err := t.q.InsertMatchSegment(t.ctx, sqlcgen.InsertMatchSegmentParams{
			ID: derivedID(op, "in"), ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: row.m.ID, SessionPlayerID: in, Team: outgoing.Team,
			SegmentNo: int32(segments + 1), JoinedOperationID: opID, Now: now, CreditTo: sqlcgen.SubstitutionCredit(credit),
		}); err != nil {
			return nil, err
		}
		if credit != "none" {
			var earlier []pgtype.UUID
			for _, p := range slotSegments(row.parts, *outgoing) {
				if p.CreditTo != sqlcgen.SubstitutionCreditNone {
					earlier = append(earlier, p.ID)
				}
			}
			if len(earlier) > 0 {
				if err := t.q.ClearSegmentCredits(t.ctx, sqlcgen.ClearSegmentCreditsParams{Now: now, Ids: earlier}); err != nil {
					return nil, err
				}
			}
		}
		out, err := parseRowID(outID)
		if err != nil {
			return nil, err
		}
		// Prisma's delete of a hold that is not there is P2025, which the command maps to not found.
		if n, err := t.q.DeleteActivePlayerHoldOf(t.ctx, out); err != nil {
			return nil, err
		} else if n == 0 {
			return nil, pgx.ErrNoRows
		}
		var playerAtEntry pgtype.UUID
		for _, e := range state.stored {
			if e.ID == in {
				playerAtEntry = e.PlayerIDAtEntry
			}
		}
		if err := t.q.InsertActivePlayerHold(t.ctx, sqlcgen.InsertActivePlayerHoldParams{
			SessionPlayerID: in, ClubID: t.sess.ClubID, SessionID: t.sess.ID, MatchID: row.m.ID, PlayerID: playerAtEntry, Now: now,
		}); err != nil {
			return nil, err
		}
		if err := t.q.BumpMatchRevision(t.ctx, sqlcgen.BumpMatchRevisionParams{Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// outcome is what a decision stores: completed with a winner (nil on a session with Record games off) and the scores, or invalid.
type outcome struct {
	kind   sqlcgen.MatchDecisionKind
	winner *string
	scoreA *int64
	scoreB *int64
}

// attempted is the outcome as the sync conflict's evidence keeps it.
func (o outcome) attempted() map[string]any {
	if o.kind == sqlcgen.MatchDecisionKindInvalid {
		return map[string]any{"kind": "invalid"}
	}
	return map[string]any{"kind": "completed", "winningTeam": o.winner, "teamAScore": o.scoreA, "teamBScore": o.scoreB}
}

type decisionDTO struct {
	Kind        string  `json:"kind"`
	WinningTeam *string `json:"winningTeam"`
	TeamAScore  *int32  `json:"teamAScore"`
	TeamBScore  *int32  `json:"teamBScore"`
	ConfirmedAt string  `json:"confirmedAt"`
}

func decisionOf(d sqlcgen.MatchDecision) decisionDTO {
	out := decisionDTO{Kind: string(d.Kind), ConfirmedAt: httpapi.ToIso(d.ConfirmedAt.Time)}
	if d.WinningTeam.Valid {
		w := string(d.WinningTeam.TeamSide)
		out.WinningTeam = &w
	}
	if d.TeamAScore.Valid {
		out.TeamAScore = &d.TeamAScore.Int32
	}
	if d.TeamBScore.Valid {
		out.TeamBScore = &d.TeamBScore.Int32
	}
	return out
}

type decided struct {
	Match    signedin.Match `json:"match"`
	Decision decisionDTO    `json:"decision"`
}

// quarantined is what the change of a decision returns when another operation contradicts the stored one: the sync conflict row it
// wrote commits, and then the command answers a conflict.
type quarantined struct{}

// decidedAlready is decidedAlready: a second terminal command for a decided match. The same operation returns the original outcome; an
// agreeing one from another device does too; a contradicting one is quarantined as conflict evidence and never overwrites it.
func (t *txn) decidedAlready(row *matchRow, operationID string, o outcome) (any, error) {
	d := *row.decision
	reply := func() (any, error) {
		m, err := t.matchOf(row.m.ID)
		return decided{Match: m, Decision: decisionOf(d)}, err
	}
	if d.SourceOperationID.String() == operationID {
		return reply()
	}
	same := string(d.Kind) == string(o.kind)
	if same && o.kind == sqlcgen.MatchDecisionKindCompleted {
		same = nullableEqual(d.WinningTeam, o.winner) && int4Equal(d.TeamAScore, o.scoreA) && int4Equal(d.TeamBScore, o.scoreB)
	}
	if same {
		return reply()
	}
	evidence, err := json.Marshal(map[string]any{"version": 1, "matchId": row.m.ID.String(), "operationId": operationID, "attempted": o.attempted()})
	if err != nil {
		return nil, err
	}
	if err := t.q.InsertSyncConflict(t.ctx, sqlcgen.InsertSyncConflictParams{
		ID: derivedID(operationID, "conflict"), ClubID: t.sess.ClubID, SessionID: t.sess.ID, Evidence: evidence, Now: t.stamp(),
	}); err != nil {
		return nil, err
	}
	return quarantined{}, nil
}

func nullableEqual(stored sqlcgen.NullTeamSide, want *string) bool {
	if !stored.Valid {
		return want == nil
	}
	return want != nil && string(stored.TeamSide) == *want
}

func int4Equal(stored pgtype.Int4, want *int64) bool {
	if !stored.Valid {
		return want == nil
	}
	return want != nil && int64(stored.Int32) == *want
}

// decide is decide: one transaction closes every open segment, releases court usage, frees all holds and appends the one permanent
// decision. outcomeFor reads the locked session, so what Match done stores follows its Record games flag, and it runs before the match is
// looked up (a bad result is invalid even for an unknown match). In Auto Queue the freed court(s) get the next eligible match.
func (s *server) decide(r *http.Request, club pgtype.UUID, operationID string, outcomeFor func(sess sqlcgen.LockQueueSessionRow) (outcome, error), except []string) (writes.Result, error) {
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		o, err := outcomeFor(t.sess)
		if err != nil {
			return nil, err
		}
		row, err := t.activeMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row.decision != nil {
			return t.decidedAlready(row, operationID, o)
		}
		if row.m.State != sqlcgen.MatchStateActive {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"match": "This match is not active."})
		}
		op, err := opUUID(operationID)
		if err != nil {
			return nil, err
		}
		now := t.stamp()
		if err := t.q.FinishMatchSegments(t.ctx, sqlcgen.FinishMatchSegmentsParams{Now: now, MatchID: row.m.ID}); err != nil {
			return nil, err
		}
		if err := t.q.ReleaseMatchCourtUsage(t.ctx, sqlcgen.ReleaseMatchCourtUsageParams{Now: now, ReleaseOperationID: op, MatchID: row.m.ID}); err != nil {
			return nil, err
		}
		if err := t.q.DeleteMatchCourtHolds(t.ctx, row.m.ID); err != nil {
			return nil, err
		}
		if err := t.q.DeleteMatchPlayerHolds(t.ctx, row.m.ID); err != nil {
			return nil, err
		}
		// The decision goes in before the state change: the match trigger refuses an end without one.
		params := sqlcgen.InsertMatchDecisionParams{
			MatchID: row.m.ID, ClubID: t.sess.ClubID, SessionID: t.sess.ID, Kind: o.kind, SourceOperationID: op, Now: now, ActorClubID: t.club,
		}
		if o.kind == sqlcgen.MatchDecisionKindCompleted {
			if o.winner != nil {
				params.WinningTeam = sqlcgen.NullTeamSide{TeamSide: sqlcgen.TeamSide(*o.winner), Valid: true}
			}
			params.TeamAScore, params.TeamBScore = int4Of(o.scoreA), int4Of(o.scoreB)
		}
		if err := t.q.InsertMatchDecision(t.ctx, params); err != nil {
			return nil, err
		}
		if err := t.q.EndMatch(t.ctx, sqlcgen.EndMatchParams{State: sqlcgen.MatchState(o.kind), Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		// A match finished or made invalid changes its registered players' own results (B-50).
		players, err := t.q.ListMatchRegisteredPlayers(t.ctx, row.m.ID)
		if err != nil {
			return nil, err
		}
		liveupdates.Note(t.ctx, t.club, t.sess.ID, players...)
		d, err := t.q.GetMatchDecision(t.ctx, row.m.ID)
		if err != nil {
			return nil, err
		}
		m, err := t.matchOf(row.m.ID)
		if err != nil {
			return nil, err
		}
		placed, err = t.fillCourts(t.sess, operationID, fillOptions{exceptCourtIDs: except})
		return decided{Match: m, Decision: decisionOf(d)}, err
	})
	if err != nil {
		return writes.Result{}, err
	}
	if _, bad := done.Result.(quarantined); bad {
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"match": "This match already has a confirmed outcome."})
	}
	return writes.Result{Body: placedReply(done, placed)}, nil
}

func int4Of(v *int64) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*v), Valid: true}
}

// completeMatch is POST result, Q-MATCH Team A/B wins. Winner-only results keep both scores null; scores must agree with the winner. A
// session with Record games off ends the match with no winner and no score, whatever the call carries, and validates nothing.
func (s *server) completeMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	var winner *string
	if w := body.Text("winningTeam"); w == "A" || w == "B" {
		winner = &w
	}
	scoreA, hasA := body.NumberOrNull("teamAScore")
	scoreB, hasB := body.NumberOrNull("teamBScore")
	var hold []string
	if id := body.Text("holdCourtId"); id != "" {
		hold = []string{id}
	}
	return s.decide(r, club, body.Text("operationId"), func(sess sqlcgen.LockQueueSessionRow) (outcome, error) {
		in := match.ResultInput{Winner: winner}
		if hasA {
			in.ScoreA = &scoreA
		}
		if hasB {
			in.ScoreB = &scoreB
		}
		check := match.ValidateResult(in)
		if check.Winner == nil {
			return outcome{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"result": *check.Error})
		}
		// Prisma refuses a score that does not fit a 32-bit integer (a 500); it is never stored wrapped.
		if math.Abs(scoreA) > math.MaxInt32 || math.Abs(scoreB) > math.MaxInt32 {
			return outcome{}, errScoreTooBig
		}
		o := outcome{kind: sqlcgen.MatchDecisionKindCompleted, winner: check.Winner}
		if hasA {
			a := int64(scoreA)
			o.scoreA = &a
		}
		if hasB {
			b := int64(scoreB)
			o.scoreB = &b
		}
		return o, nil
	}, hold)
}

var errScoreTooBig = errors.New("queuewrites: a score does not fit a 32-bit integer")

// invalidateMatch is POST invalid, Q-MATCH Invalid: the permanent decision gives no game credit to anyone.
func (s *server) invalidateMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	return s.decide(r, club, body.Text("operationId"), func(sqlcgen.LockQueueSessionRow) (outcome, error) {
		return outcome{kind: sqlcgen.MatchDecisionKindInvalid}, nil
	}, nil)
}

// queueRevisionIs is the plain text compare auto and regenerate make: the stored queue revision against the text that came in.
func (t *txn) queueRevisionIs(expected string) bool {
	return strconv.FormatInt(t.sess.QueueRevision, 10) == expected
}
