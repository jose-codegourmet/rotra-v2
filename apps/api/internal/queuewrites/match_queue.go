package queuewrites

import (
	"errors"
	"net/http"
	"slices"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/queuewrites/queuegen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The queue of waiting matches (packages/db/src/queue/match-queue.ts and the routes of apps/queue/src/app/api/sessions/[sessionId]/matches):
// Add match in its four sources, Auto queue, Regenerate, edit, remove and reorder. The server generates lineups from `n` (the device sends
// its own later, BL-3), with queuegen.

func (s *server) registerMatchQueue(rt *signedin.Router) {
	const matches = "/api/sessions/{sessionId}/matches"
	rt.Handle("POST "+matches, store.AudienceClub, s.club(s.addMatch))
	rt.Handle("POST "+matches+"/auto", store.AudienceClub, s.club(s.autoQueue))
	rt.Handle("POST "+matches+"/regenerate", store.AudienceClub, s.club(s.regenerateQueue))
	rt.Handle("PATCH "+matches+"/{matchId}", store.AudienceClub, s.club(s.updateWaitingLineup))
	rt.Handle("DELETE "+matches+"/{matchId}", store.AudienceClub, s.club(s.removeWaitingMatch))
	rt.Handle("POST "+matches+"/{matchId}/position", store.AudienceClub, s.club(s.moveMatch))
}

var lineupFormats = []model.Format{"singles", "doubles", "fun_1v2", "fun_3v3", "fun_4v4", "fun_5v5"}

var errLineup = map[string]string{"lineup": "Fill every slot with a different roster player."}

// lineupOf is lineupOf: a lineup from a request body; anything malformed is invalid before the session is locked.
func lineupOf(value any) (model.Lineup, error) {
	obj, _ := value.(map[string]any)
	ids := func(team any) []string {
		list, ok := team.([]any)
		if !ok {
			return nil
		}
		out := make([]string, len(list))
		for i, v := range list {
			id, ok := v.(string)
			if !ok {
				return nil
			}
			out[i] = id
		}
		return out
	}
	format, _ := obj["format"].(string)
	a, b := ids(obj["teamA"]), ids(obj["teamB"])
	if !slices.Contains(lineupFormats, model.Format(format)) || a == nil || b == nil {
		return model.Lineup{}, writes.Fail(httpapi.ErrInvalid, errLineup)
	}
	return model.Lineup{Format: model.Format(format), TeamA: a, TeamB: b}, nil
}

// queueSession is the session as generation reads it.
func (t *txn) queueSession() queuegen.Session {
	return queuegen.Session{ID: t.sess.ID.String(), Mode: string(t.sess.SessionMode), AllowSingles: t.sess.AllowSingles, AllowDoubles: t.sess.AllowDoubles}
}

// addedAlready is addedAlready: a retried add (its operation already made the match) returns as it was, with no Auto Queue.
func (t *txn) addedAlready(operationID string) (bool, error) {
	op, err := opUUID(operationID)
	if err != nil {
		return false, err
	}
	_, err = t.q.GetMatchBySourceOperation(t.ctx, op)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return false, err
}

// addMatch is POST matches: add one waiting match keyed on the client's operationId. `source` picks the command: selection (Make match),
// suggested (an accepted suggestion), auto (reviewed Auto queue drafts) or a manual lineup (the default). A free open court takes the
// next eligible match in the same transaction in Auto Queue, never on a repeat.
func (s *server) addMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op := body.Text("operationId")
	var run func(t *txn, placed *[]signedin.Match) (any, error)
	switch body["source"] {
	case "selection":
		selection := textList(body, "selection")
		var arranged *model.Lineup
		if body["lineup"] != nil {
			l, err := lineupOf(body["lineup"])
			if err != nil {
				return writes.Result{}, err
			}
			arranged = &l
		}
		run = func(t *txn, placed *[]signedin.Match) (any, error) {
			return t.makeMatch(op, selection, arranged, placed)
		}
	case "auto":
		drafts, err := autoQueueDraftsOf(body["drafts"])
		if err != nil {
			return writes.Result{}, err
		}
		queueRev, rev := body.Text("expectedQueueRevision"), body.Text("expectedRevision")
		run = func(t *txn, placed *[]signedin.Match) (any, error) {
			return t.addDrafts(drafts, queueRev, rev, placed)
		}
	case "suggested":
		lineup, err := lineupOf(body["lineup"])
		if err != nil {
			return writes.Result{}, err
		}
		switched, _ := body["switched"].(bool)
		queueRev, rev := body.Text("expectedQueueRevision"), body.Text("expectedRevision")
		run = func(t *txn, placed *[]signedin.Match) (any, error) {
			if err := requireRevision(t.sess.QueueRevision, queueRev); err != nil {
				return nil, err
			}
			if err := requireRevision(t.sess.Revision, rev); err != nil {
				return nil, err
			}
			return t.addOne(op, lineup, sqlcgen.MatchOriginSuggested, switched, placed)
		}
	default:
		lineup, err := lineupOf(body["lineup"])
		if err != nil {
			return writes.Result{}, err
		}
		run = func(t *txn, placed *[]signedin.Match) (any, error) {
			return t.addOne(op, lineup, sqlcgen.MatchOriginManual, true, placed)
		}
	}
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) { return run(t, &placed) })
	return writes.Result{Status: http.StatusCreated, Body: placedReply(done, placed)}, err
}

// addOne is addManualMatch and addSuggestedMatch: the lineup becomes one waiting match, and Auto Queue fills unless it was a repeat.
func (t *txn) addOne(op string, lineup model.Lineup, origin sqlcgen.MatchOrigin, protected bool, placed *[]signedin.Match) (any, error) {
	repeat, err := t.addedAlready(op)
	if err != nil {
		return nil, err
	}
	state, err := t.matchContext()
	if err != nil {
		return nil, err
	}
	id, err := t.appendMatch(state.rosterIDs(), lineup, lineupInput{operationID: op, origin: origin, manualProtected: protected})
	if err != nil {
		return nil, err
	}
	result, err := t.matchOf(id)
	if err != nil {
		return nil, err
	}
	if !repeat {
		*placed, err = t.fillCourts(t.sess, op, fillOptions{})
	}
	return result, err
}

// makeMatch is makeMatch: the selection decides the format; the operator confirms the teams (the arranged lineup must be the same players
// in that format), or the teams are balanced by level.
func (t *txn) makeMatch(op string, selection []string, arranged *model.Lineup, placed *[]signedin.Match) (any, error) {
	repeat, err := t.addedAlready(op)
	if err != nil {
		return nil, err
	}
	state, err := t.matchContext()
	if err != nil {
		return nil, err
	}
	format, reason := queuegen.FormatForSelection(len(selection), t.sess.AllowSingles, t.sess.AllowDoubles)
	if format == nil {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"selection": reason})
	}
	selected := make([]model.Player, 0, len(selection))
	for _, id := range selection {
		i := slices.IndexFunc(state.Roster, func(p model.Player) bool { return p.ID == id })
		if i < 0 {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"selection": "Player not available."})
		}
		selected = append(selected, state.Roster[i])
	}
	var lineup model.Lineup
	if arranged != nil {
		all := slices.Concat(arranged.TeamA, arranged.TeamB)
		unique := slices.Clone(all)
		slices.Sort(unique)
		if arranged.Format != *format || len(all) != len(selection) || len(slices.Compact(unique)) != len(all) ||
			slices.ContainsFunc(all, func(id string) bool { return !slices.Contains(selection, id) }) {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"lineup": "The lineup no longer matches the selected players."})
		}
		lineup = *arranged
	} else {
		lineup = queuegen.BalanceTeams(selected, *format)
	}
	id, err := t.appendMatch(state.rosterIDs(), lineup, lineupInput{operationID: op, origin: sqlcgen.MatchOriginManual, manualProtected: true})
	if err != nil {
		return nil, err
	}
	result, err := t.matchOf(id)
	if err != nil {
		return nil, err
	}
	if !repeat {
		*placed, err = t.fillCourts(t.sess, op, fillOptions{})
	}
	return result, err
}

// draft is one reviewed Auto queue draft of Add to Main Queue.
type draft struct {
	operationID string
	mode        string
	lineup      model.Lineup
}

var errDrafts = func(text string) error { return writes.Fail(httpapi.ErrInvalid, map[string]string{"drafts": text}) }

// autoQueueDraftsOf is autoQueueDraftsOf: the reviewed drafts from a request body; anything malformed is invalid before any lock.
func autoQueueDraftsOf(value any) ([]draft, error) {
	list, _ := value.([]any)
	if len(list) == 0 || len(list) > len(queuegen.AutoQueueModes)*6 {
		return nil, errDrafts("Review a non-empty selection of drafts.")
	}
	out := make([]draft, len(list))
	seen := map[string]bool{}
	for i, v := range list {
		obj, _ := v.(map[string]any)
		mode, _ := obj["mode"].(string)
		op, isText := obj["operationId"].(string)
		if !isText || jsTrim(op) == "" {
			return nil, errDrafts("A confirmation ID is required.")
		}
		if !slices.Contains(queuegen.AutoQueueModes, mode) {
			return nil, errDrafts("Review a non-empty selection of drafts.")
		}
		lineup, err := lineupOf(obj["lineup"])
		if err != nil {
			return nil, err
		}
		out[i] = draft{operationID: op, mode: mode, lineup: lineup}
		seen[op] = true
	}
	if len(seen) != len(out) {
		return nil, errDrafts("Review a non-empty selection of different drafts.")
	}
	return out, nil
}

// addDrafts is addAutoQueueDrafts: Add to Main Queue appends the reviewed drafts in order as unprotected auto matches. Each is keyed on its
// own operation id, so a retried transfer returns the stored matches. Both revisions and every draft are checked again against the locked
// inputs.
func (t *txn) addDrafts(drafts []draft, queueRev, rev string, placed *[]signedin.Match) (any, error) {
	keys := make([]pgtype.UUID, len(drafts))
	for i, d := range drafts {
		keys[i] = derivedID(d.operationID, "auto-queue-draft")
	}
	done, err := t.q.ListMatchesBySourceOperations(t.ctx, keys)
	if err != nil {
		return nil, err
	}
	if len(done) > 0 {
		if len(done) != len(keys) || slices.ContainsFunc(done, func(m sqlcgen.ListMatchesBySourceOperationsRow) bool { return m.SessionID != t.sess.ID }) {
			return nil, writes.Fail(httpapi.ErrConflict, nil)
		}
		out := make([]signedin.Match, 0, len(keys))
		for _, key := range keys {
			i := slices.IndexFunc(done, func(m sqlcgen.ListMatchesBySourceOperationsRow) bool { return m.SourceOperationID == key })
			m, err := t.matchOf(done[i].ID)
			if err != nil {
				return nil, err
			}
			out = append(out, m)
		}
		return out, nil
	}
	if err := requireRevision(t.sess.QueueRevision, queueRev); err != nil {
		return nil, err
	}
	if err := requireRevision(t.sess.Revision, rev); err != nil {
		return nil, err
	}
	state, err := t.matchContext()
	if err != nil {
		return nil, err
	}
	for _, d := range drafts {
		if reason := queuegen.DraftConflict(d.lineup, d.mode, t.queueSession(), state.Roster, state.Matches, t.queueMasterNamer(state)); reason != nil {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"drafts": *reason})
		}
	}
	ids := state.rosterIDs()
	out := make([]signedin.Match, 0, len(drafts))
	for i, d := range drafts {
		id, err := t.appendMatch(ids, d.lineup, lineupInput{operationID: keys[i].String(), origin: sqlcgen.MatchOriginAuto})
		if err != nil {
			return nil, err
		}
		m, err := t.matchOf(id)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	*placed, err = t.fillCourts(t.sess, keys[0].String(), fillOptions{})
	return out, err
}

// queueMasterNamer is queueMasterName of a roster player: the club's nickname for a registered player, else the name players see.
func (t *txn) queueMasterNamer(state matchState) func(model.Player) string {
	return func(p model.Player) string {
		for _, e := range state.stored {
			if e.ID.String() != p.ID {
				continue
			}
			nickname, club, err := t.rosterNamesFor(e.ClubPlayerID)
			if err == nil {
				p.NicknameSnapshot = nickname
				return queuegen.QueueMasterName(club, p)
			}
		}
		return queuegen.QueueMasterName(nil, p)
	}
}

// autoSizes are the batch sizes Auto queue offers (AUTO_QUEUE_SIZES).
var autoSizes = []float64{2, 3, 4, 6}

// autoQueue is POST matches/auto, Q-QUEUE Auto queue: appends the operator's chosen batch (2, 3, 4 or 6) of generated matches against the
// displayed queue revision. A retry returns the stored batch.
func (s *server) autoQueue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, n, queueRev := body.Text("operationId"), body.Number("n"), body.Text("expectedQueueRevision")
	if !slices.Contains(autoSizes, n) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"n": "Choose 2, 3, 4 or 6 matches."})
	}
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		return t.generate(op, queueRev, int(n), "auto", &placed, nil)
	})
	return writes.Result{Status: http.StatusCreated, Body: placedReply(done, placed)}, err
}

// regenerateQueue is POST matches/regenerate, Q-QUEUE Regenerate: rebuilds only waiting auto and suggested drafts and the manual entries
// that need attention. Replaced drafts are marked removed (their numbers are never reused); the new drafts take the replaced queue positions.
func (s *server) regenerateQueue(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, queueRev := body.Text("operationId"), body.Text("expectedQueueRevision")
	var placed []signedin.Match
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		return t.generate(op, queueRev, 0, "regen", &placed, t.regenerateScope)
	})
	return writes.Result{Body: placedReply(done, placed)}, err
}

// regenerateScope is the waiting matches Regenerate replaces, in queue order, and the matches it keeps.
func (t *txn) regenerateScope(state matchState) (replace, kept []model.Match, err error) {
	ctx := state.rules(t.s.at().UnixMilli())
	for _, m := range state.Matches {
		if m.State == model.StateWaiting && (!m.ManualProtected || match.MatchStatus(m, ctx).Kind == "needs-attention") {
			replace = append(replace, m)
		} else {
			kept = append(kept, m)
		}
	}
	slices.SortStableFunc(replace, func(a, b model.Match) int { return int(a.QueuePosition - b.QueuePosition) })
	if len(replace) == 0 {
		return nil, nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"queue": "There are no waiting matches to rebuild."})
	}
	return replace, kept, nil
}

// generate is autoQueue and regenerateQueue: the batch a generation made already (its operation is the generation id) is returned as it
// was; otherwise the queue revision must match, and n lineups (or one per replaced draft) are generated from the operation as the seed.
func (t *txn) generate(op, queueRev string, n int, part string, placed *[]signedin.Match, scope func(matchState) ([]model.Match, []model.Match, error)) (any, error) {
	generation, err := opUUID(op)
	if err != nil {
		return nil, err
	}
	stored, err := t.q.ListMatchIDsOfGeneration(t.ctx, sqlcgen.ListMatchIDsOfGenerationParams{SessionID: t.sess.ID, GenerationID: generation})
	if err != nil {
		return nil, err
	}
	if len(stored) > 0 {
		return t.storedBatch(stored)
	}
	if !t.queueRevisionIs(queueRev) {
		return nil, writes.Fail(httpapi.ErrConflict, nil)
	}
	state, err := t.matchContext()
	if err != nil {
		return nil, err
	}
	matches := state.Matches
	var replace []model.Match
	if scope != nil {
		if replace, matches, err = scope(state); err != nil {
			return nil, err
		}
		n = len(replace)
		ids := make([]pgtype.UUID, len(replace))
		for i, m := range replace {
			if ids[i], err = parseRowID(m.ID); err != nil {
				return nil, err
			}
		}
		if err := t.q.RemoveWaitingMatches(t.ctx, sqlcgen.RemoveWaitingMatchesParams{Now: t.stamp(), Ids: ids}); err != nil {
			return nil, err
		}
	}
	generated := queuegen.GenerateMatches(t.queueSession(), state.Roster, matches, n, queuegen.SeededRng(op))
	if generated.Error != nil {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"queue": *generated.Error})
	}
	ids := state.rosterIDs()
	out := make([]signedin.Match, 0, len(generated.Matches))
	for i, lineup := range generated.Matches {
		in := lineupInput{operationID: derivedID(op, part+":"+strconv.Itoa(i)).String(), origin: sqlcgen.MatchOriginAuto, generationID: op}
		if scope != nil && replace[i].QueuePosition != 0 {
			position := replace[i].QueuePosition
			in.position = &position
		}
		id, err := t.appendMatch(ids, lineup, in)
		if err != nil {
			return nil, err
		}
		m, err := t.matchOf(id)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	*placed, err = t.fillCourts(t.sess, op, fillOptions{})
	return out, err
}

// storedBatch is generationRows' answer: the matches of a generation read again. That read has no orderBy on the segments, and Postgres
// gives them in index order, so each team lists its players by id, not in the order of the other reads (a logged deviation of the order tiebreaker).
func (t *txn) storedBatch(ids []pgtype.UUID) ([]signedin.Match, error) {
	out := make([]signedin.Match, 0, len(ids))
	for _, id := range ids {
		m, err := t.matchOf(id)
		if err != nil {
			return nil, err
		}
		stored, err := t.q.ListMatchSegmentPlayers(t.ctx, id)
		if err != nil {
			return nil, err
		}
		rank := make(map[string]int, len(stored))
		for i, p := range stored {
			if _, seen := rank[p.String()]; !seen {
				rank[p.String()] = i
			}
		}
		byStored := func(a, b string) int { return rank[a] - rank[b] }
		slices.SortStableFunc(m.TeamA, byStored)
		slices.SortStableFunc(m.TeamB, byStored)
		out = append(out, m)
	}
	return out, nil
}

// waitingMatch is waitingMatch: a waiting match that is not a removed draft, or not found, or invalid when it already started.
func (t *txn) waitingMatch(idText string) (*matchRow, error) {
	row, err := t.activeMatch(idText)
	if err != nil {
		return nil, err
	}
	if row.m.State != sqlcgen.MatchStateWaiting {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"match": "Only a waiting match can be changed."})
	}
	return row, nil
}

// updateWaitingLineup is PATCH matches/{matchId}: edit a waiting lineup or switch sides; the entry becomes manual and protected.
func (s *server) updateWaitingLineup(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	op, queueRev := body.Text("operationId"), body.Text("expectedQueueRevision")
	lineup, err := lineupOf(body["lineup"])
	if err != nil {
		return writes.Result{}, err
	}
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		if err := requireRevision(t.sess.QueueRevision, queueRev); err != nil {
			return nil, err
		}
		row, err := t.waitingMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		state, err := t.matchContext()
		if err != nil {
			return nil, err
		}
		if err := t.validateLineup(state.rosterIDs(), lineup, true); err != nil {
			return nil, err
		}
		if err := t.q.DeleteMatchParticipations(t.ctx, row.m.ID); err != nil {
			return nil, err
		}
		opID, err := opUUID(op)
		if err != nil {
			return nil, err
		}
		now := t.stamp()
		if err := t.writeLineup(row.m.ID, lineup, op, opID, now); err != nil {
			return nil, err
		}
		if err := t.q.SetWaitingMatchLineup(t.ctx, sqlcgen.SetWaitingMatchLineupParams{Format: sqlcgen.MatchFormat(lineup.Format), Now: now, ID: row.m.ID}); err != nil {
			return nil, err
		}
		return t.matchOf(row.m.ID)
	})
	return writes.Result{Body: done}, err
}

// removeWaitingMatch is DELETE matches/{matchId}: Remove waiting match. It keeps its number as a removed draft; a retry is a no-op.
func (s *server) removeWaitingMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	queueRev, hasRev := body["expectedQueueRevision"].(string)
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		if hasRev {
			if err := requireRevision(t.sess.QueueRevision, queueRev); err != nil {
				return nil, err
			}
		}
		row, err := t.loadMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		if row == nil {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		if row.m.RemovedAt.Valid {
			return nil, nil
		}
		if row.m.State != sqlcgen.MatchStateWaiting {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"match": "Only a waiting match can be changed."})
		}
		return nil, t.q.RemoveWaitingMatch(t.ctx, sqlcgen.RemoveWaitingMatchParams{Now: t.stamp(), ID: row.m.ID})
	})
	return writes.Result{Body: done}, err
}

// moveMatch is POST matches/{matchId}/position: reorder. It renumbers queue positions only; match numbers never change.
func (s *server) moveMatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	toIndex, queueRev := body.Number("toIndex"), body.Text("expectedQueueRevision")
	if !isInteger(toIndex) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"position": "Choose a queue position."})
	}
	done, err := s.matchCommand(matchRequestOf(r, club), func(t *txn) (any, error) {
		if err := requireRevision(t.sess.QueueRevision, queueRev); err != nil {
			return nil, err
		}
		row, err := t.waitingMatch(r.PathValue("matchId"))
		if err != nil {
			return nil, err
		}
		list, err := t.q.ListWaitingMatchIDs(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		from := slices.Index(list, row.m.ID)
		to := int(max(0, min(float64(len(list)-1), toIndex)))
		moved := list[from]
		list = slices.Insert(slices.Delete(list, from, from+1), to, moved)
		for i, id := range list {
			if err := t.q.SetMatchQueuePosition(t.ctx, sqlcgen.SetMatchQueuePositionParams{QueuePosition: pgtype.Int8{Int64: int64(i + 1), Valid: true}, Now: t.stamp(), ID: id}); err != nil {
				return nil, err
			}
		}
		return map[string]any{"matchId": row.m.ID.String(), "position": to + 1}, nil
	})
	return writes.Result{Body: done}, err
}
