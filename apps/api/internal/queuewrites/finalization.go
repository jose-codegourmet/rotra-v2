package queuewrites

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/collate"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Session done: POST /api/sessions/{sessionId}/finalization (packages/db/src/queue/finalization.ts finalizeSession and the Route Handler that
// calls it). One transaction under the session lock checks every barrier, then commits the one session_finalizations row, the facts, the
// session summaries, the completed state, the released reservation and the downstream projection jobs. The jobs then run in the same request
// (finalization_jobs.go), as the Route Handler does. Permanent results and ranking: see the sign-off list in the plan's deviations log.

const (
	// factVersion and summaryVersion are the reducer versions. A version is never permission to change a winner.
	factVersion    = 1
	summaryVersion = 1
)

func (s *server) registerFinalization(rt *signedin.Router) {
	rt.Handle("POST /api/sessions/{sessionId}/finalization", store.AudienceClub, s.club(s.finalizeRoute))
}

// finalizationJob and finalizationStatus are statusDto. The jobs have no order in the TypeScript; Go lists them in creation order.
type finalizationJob struct {
	Kind          string  `json:"kind"`
	Status        string  `json:"status"`
	Attempts      int32   `json:"attempts"`
	LastErrorCode *string `json:"lastErrorCode"`
}

type finalizationStatus struct {
	SessionID   string  `json:"sessionId"`
	CommandID   string  `json:"commandId"`
	State       string  `json:"state"`
	Stage       string  `json:"stage"`
	Accepted    bool    `json:"accepted"`
	CommittedAt *string `json:"committedAt"`
	CompletedAt *string `json:"completedAt"`
	FailedStage *string `json:"failedStage"`
	FailureCode *string `json:"failureCode"`
	// RecordGames is false for a session run with Record games off (D-2026-11-20-02): not ranked; the done toast says so.
	RecordGames bool              `json:"recordGames"`
	Jobs        []finalizationJob `json:"jobs"`
}

func isoOf(ts pgtype.Timestamptz) *string {
	if !ts.Valid {
		return nil
	}
	v := httpapi.ToIso(ts.Time)
	return &v
}

// statusOf is statusDto.
func statusOf(ctx context.Context, q *sqlcgen.Queries, f sqlcgen.SessionFinalization) (finalizationStatus, error) {
	rows, err := q.ListSessionFinalizationJobs(ctx, f.SessionID)
	if err != nil {
		return finalizationStatus{}, err
	}
	jobs := make([]finalizationJob, 0, len(rows))
	for _, j := range rows {
		var code *string
		if j.LastErrorCode.Valid {
			code = &j.LastErrorCode.String
		}
		jobs = append(jobs, finalizationJob{Kind: string(j.Kind), Status: string(j.Status), Attempts: j.Attempts, LastErrorCode: code})
	}
	var failedStage *string
	if f.FailedStage.Valid {
		v := string(f.FailedStage.FinalizationStage)
		failedStage = &v
	}
	var failure *string
	if f.FailureCode.Valid {
		failure = &f.FailureCode.String
	}
	recordGames, err := q.GetSessionRecordGames(ctx, f.SessionID)
	if errors.Is(err, pgx.ErrNoRows) {
		recordGames, err = true, nil
	}
	if err != nil {
		return finalizationStatus{}, err
	}
	return finalizationStatus{
		RecordGames: recordGames,
		SessionID:   f.SessionID.String(), CommandID: f.CommandID.String(), State: string(f.State), Stage: string(f.Stage), Accepted: f.CommittedAt.Valid,
		CommittedAt: isoOf(f.CommittedAt), CompletedAt: isoOf(f.CompletedAt), FailedStage: failedStage, FailureCode: failure, Jobs: jobs,
	}, nil
}

// readFinalizationStatus is readFinalizationStatus: the status after a lost response, recovered by session. Another club's finalization and none
// are not found.
func (s *server) readFinalizationStatus(ctx context.Context, club, session pgtype.UUID) (finalizationStatus, error) {
	q := sqlcgen.New(s.pool)
	f, err := q.GetSessionFinalization(ctx, session)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && f.ClubID != club {
		return finalizationStatus{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return finalizationStatus{}, err
	}
	return statusOf(ctx, q, f)
}

type finalizeReply struct {
	Status   finalizationStatus `json:"status"`
	Warnings struct {
		BelowMinimum []signedin.Shortfall `json:"belowMinimum"`
	} `json:"warnings"`
}

// finalizeRoute is POST finalization, keyed on `commandId` (one per open sheet). The commit happens once; a retry or a second command returns
// the committed status. Then this request drives the session's jobs, a retry also making its failed jobs due again, and answers the status as
// stored after that.
func (s *server) finalizeRoute(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	commandID := body.Text("commandId")
	if !strictUUID.MatchString(commandID) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"commandId": "A confirmation ID is required."})
	}
	session, err := parseSessionID(r.PathValue("sessionId"))
	if err != nil {
		return writes.Result{}, err
	}
	warnings, err := s.finalizeSession(r.Context(), club, session, commandID)
	if err != nil {
		return writes.Result{}, err
	}
	// A first commit has no failed jobs, so retrying only matters for Try again. Job work never fails the reply.
	s.driveQuietly(r.Context(), club, session, true)
	status, err := s.readFinalizationStatus(r.Context(), club, session)
	if err != nil {
		return writes.Result{}, err
	}
	reply := finalizeReply{Status: status}
	reply.Warnings.BelowMinimum = warnings
	return writes.Result{Body: reply}, nil
}

// manifestEntry is one verified stream seal of the manifest, in the key order JSON.stringify writes it.
type manifestEntry struct {
	StreamID      string  `json:"streamId"`
	FinalSequence string  `json:"finalSequence"`
	Digest        *string `json:"digest"`
}

// finalizeSession is finalizeSession. It returns the belowMinimum warnings of a first commit (none for a status that already existed).
func (s *server) finalizeSession(ctx context.Context, club, session pgtype.UUID, commandID string) ([]signedin.Shortfall, error) {
	cmd, ok := writes.ParseUUID(commandID)
	if !ok {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"commandId": "A confirmation ID is required."})
	}
	warnings := []signedin.Shortfall{}
	_, err := s.lockedSession(ctx, club, session.String(), false, func(t *txn) (any, error) {
		w, err := t.finalize(cmd)
		warnings = w
		if err != nil {
			return nil, err
		}
		// Session done changes its registered players' own results (B-50).
		players, err := t.q.ListSessionRegisteredPlayers(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		liveupdates.Note(t.ctx, t.club, t.sess.ID, players...)
		return nil, nil
	})
	if err == nil {
		return warnings, nil
	}
	var se *writes.Error
	if errors.As(err, &se) {
		return nil, err
	}
	// A concurrent Session done, or a command used by another session, lost a unique key: the answer is the status of this session's own.
	if writes.IsUniqueViolation(err) {
		if _, err := s.readFinalizationStatus(ctx, club, session); err != nil {
			return nil, err
		}
		return []signedin.Shortfall{}, nil
	}
	return nil, mapDatabaseError(err)
}

// finalize is the body of finalizeSession's transaction, on the locked session.
func (t *txn) finalize(command pgtype.UUID) ([]signedin.Shortfall, error) {
	// A finalization that exists answers its status before any check: a retry, or another command for a finalized session.
	_, err := t.q.GetSessionFinalization(t.ctx, t.sess.ID)
	if err == nil {
		return []signedin.Shortfall{}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err := t.requireSessionAccess(); err != nil {
		return nil, err
	}
	if t.sess.State != sqlcgen.QueueSessionStateActive {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"state": "Only a running session can be finished."})
	}
	now := t.stamp()
	policy, blocking, err := t.barriers(now)
	if err != nil {
		return nil, err
	}
	if len(blocking) > 0 || !policy.ID.Valid {
		fields := map[string]string{}
		for _, b := range blocking {
			fields[b] = b
		}
		return nil, writes.Fail(httpapi.ErrConflict, fields)
	}
	streams, err := t.q.ListSealedSessionStreams(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	manifest := make([]manifestEntry, 0, len(streams))
	for _, st := range streams {
		var digest *string
		if st.SealedDigest != nil {
			d := hex.EncodeToString(st.SealedDigest)
			digest = &d
		}
		manifest = append(manifest, manifestEntry{StreamID: st.ID.String(), FinalSequence: st.FinalSequence, Digest: digest})
	}
	manifestJSON, err := json.Marshal(manifest)
	if err != nil {
		return nil, err
	}
	warnings, err := signedin.BelowMinimum(t.ctx, t.q, t.sess.ID, t.sess.MinimumGames)
	if err != nil {
		return nil, err
	}
	recorded := t.sess.RecordGames
	var facts []fact
	if recorded {
		if facts, err = t.buildFacts(); err != nil {
			return nil, err
		}
	}
	digest, err := factsDigest(facts)
	if err != nil {
		return nil, err
	}
	state, stage := sqlcgen.FinalizationStateDone, sqlcgen.FinalizationStageFinishing
	var completedAt pgtype.Timestamptz
	if recorded {
		// Recorded: the facts are final and the jobs still run after the commit. Unrecorded: nothing runs after it, so the row is finished here.
		state, stage = sqlcgen.FinalizationStateCommitted, sqlcgen.FinalizationStagePlayerRecords
	} else {
		completedAt = now
	}
	manifestSum := sha256.Sum256(manifestJSON)
	if err := t.q.InsertSessionFinalization(t.ctx, sqlcgen.InsertSessionFinalizationParams{
		SessionID: t.sess.ID, ClubID: t.club, CommandID: command, State: state, Stage: stage, StreamManifest: manifestJSON, ManifestDigest: manifestSum[:],
		AcceptedSessionRevision: t.sess.Revision, PolicyVersionID: policy.ID, Now: now, CompletedAt: completedAt, FactsDigest: digest,
	}); err != nil {
		return nil, err
	}
	if recorded {
		for _, f := range facts {
			if err := t.insertFact(f); err != nil {
				return nil, err
			}
		}
		if err := t.insertSummaries(facts, now); err != nil {
			return nil, err
		}
	}
	if err := t.dropUnstarted(now); err != nil {
		return nil, err
	}
	// Handicap · tonight is session only (D-2026-11-25-03): Session done clears it.
	if err := t.q.ClearSessionHandicaps(t.ctx, t.sess.ID); err != nil {
		return nil, err
	}
	// Finishing closes every open match request (kept on the record, hidden).
	if err := t.closeSessionMatchRequests(now); err != nil {
		return nil, err
	}
	if err := t.q.CompleteQueueSession(t.ctx, sqlcgen.CompleteQueueSessionParams{Now: now, ID: t.sess.ID}); err != nil {
		return nil, err
	}
	if err := t.q.DeleteQueueSessionReservations(t.ctx, sqlcgen.DeleteQueueSessionReservationsParams{ClubID: t.club, SessionID: t.sess.ID}); err != nil {
		return nil, err
	}
	// No summaries, snapshot, history or rank work for an unrecorded session: no jobs at all.
	if !recorded {
		return warnings, nil
	}
	if err := t.insertJob(sqlcgen.ProjectionKindClubSessionSummaries, summaryVersion, sqlcgen.ProjectionJobStatusDone, now); err != nil {
		return nil, err
	}
	for _, kind := range []sqlcgen.ProjectionKind{sqlcgen.ProjectionKindResultSnapshot, sqlcgen.ProjectionKindPlayerHistory, sqlcgen.ProjectionKindPlayerRank} {
		if err := t.insertJob(kind, 1, sqlcgen.ProjectionJobStatusPending, pgtype.Timestamptz{}); err != nil {
			return nil, err
		}
	}
	return warnings, nil
}

func (t *txn) insertJob(kind sqlcgen.ProjectionKind, version int32, status sqlcgen.ProjectionJobStatus, completed pgtype.Timestamptz) error {
	id, err := newestID()
	if err != nil {
		return err
	}
	return t.q.InsertProjectionJob(t.ctx, sqlcgen.InsertProjectionJobParams{ID: id, Kind: kind, KindVersion: version, SessionID: t.sess.ID, Status: status, Now: t.stamp(), CompletedAt: completed})
}

// barriers is barriers: what blocks Session done, read under the session lock: completeness proven (every stream sealed and settled, no open
// conflict), no active match, and an effective ranking policy. The reasons come in the order the TypeScript lists them.
func (t *txn) barriers(now pgtype.Timestamptz) (sqlcgen.LatestEffectiveRankingPolicyRow, []string, error) {
	completeness, err := t.q.GetQueueSyncCompleteness(t.ctx, t.sess.ID)
	if err != nil {
		return sqlcgen.LatestEffectiveRankingPolicyRow{}, nil, err
	}
	active, err := t.q.CountQueueActiveMatches(t.ctx, t.sess.ID)
	if err != nil {
		return sqlcgen.LatestEffectiveRankingPolicyRow{}, nil, err
	}
	policy, err := t.q.LatestEffectiveRankingPolicy(t.ctx, now)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return sqlcgen.LatestEffectiveRankingPolicyRow{}, nil, err
	}
	var blocking []string
	if active > 0 {
		blocking = append(blocking, "active_matches")
	}
	if completeness.OpenStreams > 0 {
		blocking = append(blocking, "unsealed_streams")
	}
	if completeness.OpenConflicts > 0 {
		blocking = append(blocking, "open_conflicts")
	}
	if completeness.PendingOperations > 0 {
		blocking = append(blocking, "pending_operations")
	}
	if !policy.ID.Valid {
		blocking = append(blocking, "no_ranking_policy")
	}
	return policy, blocking, nil
}

// dropUnstarted is dropUnstarted: every match that never started is dropped. Waiting ones leave the queue; On court ones (placed, never started,
// so not results) first give up their court and player holds, then go back to waiting and are removed the same way. Court usage is closed with no
// release operation, which the database refuses for a usage row (a CHECK): a Session done with a placed match fails and changes nothing, as the
// TypeScript does today.
func (t *txn) dropUnstarted(now pgtype.Timestamptz) error {
	placed, err := t.q.ListUnstartedOnCourtMatchIDs(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	if len(placed) > 0 {
		if err := t.q.ReleaseUnstartedCourtUsage(t.ctx, sqlcgen.ReleaseUnstartedCourtUsageParams{Now: now, MatchIds: placed}); err != nil {
			return err
		}
		if err := t.q.DeleteHeldCourtsOf(t.ctx, placed); err != nil {
			return err
		}
		if err := t.q.DeleteHeldPlayersOf(t.ctx, placed); err != nil {
			return err
		}
		if err := t.q.ResetUnstartedMatches(t.ctx, sqlcgen.ResetUnstartedMatchesParams{Now: now, MatchIds: placed}); err != nil {
			return err
		}
	}
	return t.q.RemoveAllWaitingMatches(t.ctx, sqlcgen.RemoveAllWaitingMatchesParams{Now: now, SessionID: t.sess.ID})
}

// fact is one row of player_match_facts before it is written: one per (completed match, participant).
type fact struct {
	club, match, entry, clubPlayer pgtype.UUID
	player                         pgtype.UUID
	playedAt                       pgtype.Timestamptz
	format                         sqlcgen.MatchFormat
	team, winner                   sqlcgen.TeamSide
	full, standard                 bool
	level                          int16
	partners, opponents            []pgtype.UUID
	scoreA, scoreB                 pgtype.Int4
}

// buildFacts is buildFacts: the authoritative fact rows, one per (completed match, participant), with full participation recomputed from segments
// (started, finished, one segment). Invalid matches have no decision of kind completed and so produce nothing. The segments are read in segment
// order (the TypeScript names none), so a player's last segment is their latest.
func (t *txn) buildFacts() ([]fact, error) {
	matches, err := t.q.ListFinalizableMatches(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	parts, err := t.q.ListFinalizableParticipations(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	entryRows, err := t.q.ListEveryRosterEntry(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	entries := map[pgtype.UUID]sqlcgen.ListEveryRosterEntryRow{}
	for _, e := range entryRows {
		entries[e.ID] = e
	}
	var facts []fact
	for _, m := range matches {
		if !m.WinningTeam.Valid {
			continue
		}
		var segs []sqlcgen.ListFinalizableParticipationsRow
		for _, p := range parts {
			if p.MatchID == m.ID {
				segs = append(segs, p)
			}
		}
		var order []pgtype.UUID
		byPlayer := map[pgtype.UUID][]sqlcgen.ListFinalizableParticipationsRow{}
		for _, p := range segs {
			if _, seen := byPlayer[p.SessionPlayerID]; !seen {
				order = append(order, p.SessionPlayerID)
			}
			byPlayer[p.SessionPlayerID] = append(byPlayer[p.SessionPlayerID], p)
		}
		for _, id := range order {
			segments := byPlayer[id]
			entry, ok := entries[id]
			if !ok {
				continue
			}
			if !entry.SkillLevelID.Valid {
				return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"roster": entry.NameSnapshot + " has no level."})
			}
			last := segments[len(segments)-1]
			team := last.Team
			f := fact{
				club: m.ClubID, match: m.ID, entry: id, clubPlayer: entry.ClubPlayerID, player: entry.PlayerIDAtEntry,
				format: m.Format, team: team, winner: m.WinningTeam.TeamSide, level: entry.SkillLevelID.Int16,
				full:     len(segments) == 1 && last.StartedWithMatch && last.FinishedWithMatch,
				standard: m.Format == sqlcgen.MatchFormatSingles || m.Format == sqlcgen.MatchFormatDoubles,
				scoreA:   m.TeamAScore, scoreB: m.TeamBScore, partners: []pgtype.UUID{}, opponents: []pgtype.UUID{},
			}
			switch {
			case m.StartedAt.Valid:
				f.playedAt = m.StartedAt
			case m.EndedAt.Valid:
				f.playedAt = m.EndedAt
			default:
				f.playedAt = m.ConfirmedAt
			}
			for _, p := range segs {
				if !p.FinishedWithMatch {
					continue
				}
				if p.Team == team && p.SessionPlayerID != id {
					f.partners = append(f.partners, p.SessionPlayerID)
				}
				if p.Team != team {
					f.opponents = append(f.opponents, p.SessionPlayerID)
				}
			}
			facts = append(facts, f)
		}
	}
	return facts, nil
}

// factsDigest is the SHA-256 of JSON.stringify of the facts' rows [match, entry, team, winning team, full, score A, score B], sorted by the match
// and entry ids as text (localeCompare). An empty set digests "[]".
func factsDigest(facts []fact) ([]byte, error) {
	type row struct {
		key string
		val []any
	}
	rows := make([]row, 0, len(facts))
	for _, f := range facts {
		nullable := func(v pgtype.Int4) any {
			if !v.Valid {
				return nil
			}
			return v.Int32
		}
		rows = append(rows, row{key: f.match.String() + f.entry.String(), val: []any{f.match.String(), f.entry.String(), string(f.team), string(f.winner), f.full, nullable(f.scoreA), nullable(f.scoreB)}})
	}
	slices.SortStableFunc(rows, func(a, b row) int { return collate.Compare(a.key, b.key) })
	out := make([][]any, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.val)
	}
	raw, err := json.Marshal(out)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(raw)
	return sum[:], nil
}

func (t *txn) insertFact(f fact) error {
	id, err := newestID()
	if err != nil {
		return err
	}
	return t.q.InsertPlayerMatchFact(t.ctx, sqlcgen.InsertPlayerMatchFactParams{
		ID: id, ClubID: f.club, SessionID: t.sess.ID, MatchID: f.match, SessionPlayerID: f.entry, ClubPlayerID: f.clubPlayer, PlayerIDAtFinalization: f.player,
		PlayedAt: f.playedAt, Format: f.format, Team: f.team, WinningTeam: f.winner, FullParticipation: f.full, StandardMatch: f.standard,
		SkillLevelSnapshotID: f.level, PartnerEntryIds: f.partners, OpponentEntryIds: f.opponents, TeamAScore: f.scoreA, TeamBScore: f.scoreB,
		FactVersion: factVersion, Now: t.stamp(),
	})
}

// creditedKeys is creditedKeys: the session game credit after in-game substitutions (the Queue Master's choice) as `match:entry` keys. `credit_to`
// sits on the incoming segment: `incoming` gives the game to that entry, `outgoing` to the entry whose segment the same operation closed.
func creditedKeys(parts []sqlcgen.ListQueueCompletedParticipationsRow) map[string]bool {
	keys := map[string]bool{}
	for _, p := range parts {
		if p.CreditTo == "incoming" {
			keys[p.MatchID.String()+":"+p.SessionPlayerID.String()] = true
		}
		if p.CreditTo != "outgoing" {
			continue
		}
		for _, o := range parts {
			if o.MatchID == p.MatchID && o.ID != p.ID && o.LeftOperationID.Valid && o.LeftOperationID == p.JoinedOperationID {
				keys[p.MatchID.String()+":"+o.SessionPlayerID.String()] = true
				break
			}
		}
	}
	return keys
}

// insertSummaries is the session summaries of finalizeSession: one row per live roster entry from the facts, full games plus the credited
// substitute games, so they agree with the session standings. Partial games nobody was given count nothing.
func (t *txn) insertSummaries(facts []fact, now pgtype.Timestamptz) error {
	roster, err := t.q.ListQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	parts, err := t.q.ListQueueCompletedParticipations(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	credited := creditedKeys(parts)
	for _, e := range roster {
		games, standard, wins := 0, 0, 0
		for _, f := range facts {
			if f.entry != e.ID || !f.full && !credited[f.match.String()+":"+f.entry.String()] {
				continue
			}
			games++
			if f.standard {
				standard++
			}
			if f.team == f.winner {
				wins++
			}
		}
		id, err := newestID()
		if err != nil {
			return err
		}
		if err := t.q.InsertClubSessionSummary(t.ctx, sqlcgen.InsertClubSessionSummaryParams{
			ID: id, ClubID: e.ClubID, SessionID: t.sess.ID, SessionPlayerID: e.ID, ClubPlayerID: e.ClubPlayerID, PlayerIDSnapshot: e.PlayerIDAtEntry,
			FullGames: int32(games), StandardGames: int32(standard), FunGames: int32(games - standard), Wins: int32(wins), Losses: int32(games - wins),
			SkillLevelSnapshotID: e.SkillLevelID, SummaryVersion: summaryVersion, Now: now,
		}); err != nil {
			return err
		}
	}
	return nil
}
