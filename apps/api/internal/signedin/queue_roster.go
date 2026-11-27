package signedin

import (
	"context"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/winchance"
)

// GET /api/sessions/{sessionId}/roster: the Queue Master's roster read. Port of readSessionRoster in
// packages/db/src/queue/session-roster.ts and rosterEntryDto, waitlistDto and joinRequestDto in queue/dto.ts.

type queueRosterEntryDTO struct {
	ID                   string  `json:"id"`
	SessionID            string  `json:"sessionId"`
	ClubPlayerID         string  `json:"clubPlayerId"`
	NameSnapshot         string  `json:"nameSnapshot"`
	NicknameSnapshot     *string `json:"nicknameSnapshot"`
	ClubNickname         *string `json:"clubNickname"`
	Present              bool    `json:"present"`
	PresentChangedAt     string  `json:"presentChangedAt"`
	Level                *string `json:"level"`
	LevelLockedAt        *string `json:"levelLockedAt"`
	ConfirmedAt          string  `json:"confirmedAt"`
	GamesAdjustment      int32   `json:"gamesAdjustment"`
	SelfCheckedInAt      *string `json:"selfCheckedInAt"`
	LeftAt               *string `json:"leftAt"`
	Revision             string  `json:"revision"`
	HasPlayedAtClubBfore *bool   `json:"hasPlayedAtClubBefore,omitempty"`
	NoShowAt             *string `json:"noShowAt,omitempty"`
	// Form is the player's lasting signals at this club (Win chance, D-2026-11-27-02); absent for a first-timer.
	Form *queueFormDTO `json:"form,omitempty"`
}

// queueFormDTO is PlayerForm: the club win rate (null under 10 decided games), whether tonight is their best weekday, and the
// leaderboard place and direction (0 until rank calculation is real).
type queueFormDTO struct {
	ClubWinRate *float64 `json:"clubWinRate"`
	BestDay     bool     `json:"bestDay"`
	Place       int      `json:"place"`
	Trend       int      `json:"trend"`
}

type queueWaitlistDTO struct {
	ID           string  `json:"id"`
	SessionID    string  `json:"sessionId"`
	ClubPlayerID string  `json:"clubPlayerId"`
	Level        *string `json:"level"`
	AddedAt      string  `json:"addedAt"`
	Position     int     `json:"position"`
}

type queueJoinRequestDTO struct {
	ID           string  `json:"id"`
	SessionID    string  `json:"sessionId"`
	Name         string  `json:"name"`
	Nickname     *string `json:"nickname"`
	PhoneE164    *string `json:"phoneE164"`
	StatedBand   string  `json:"statedBand"`
	Placement    string  `json:"placement"`
	Status       string  `json:"status"`
	RequestedAt  string  `json:"requestedAt"`
	DecidedAt    *string `json:"decidedAt"`
	ClubPlayerID *string `json:"clubPlayerId"`
	PlayerID     *string `json:"playerId"`
	Picture      *string `json:"picture"`
	PictureName  *string `json:"pictureName"`
}

// rosterNames is rosterNamesOf for one entry: a registered player's account nickname with the club's own (trimmed,
// null when blank), else the club's nickname alone.
func rosterNames(clubNickname, playerNickname pgtype.Text, state sqlcgen.NullPlayerProfileState) (nickname, club *string) {
	if state.Valid && state.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed {
		if n := strings.TrimFunc(clubNickname.String, publicreads.IsJSSpace); clubNickname.Valid && n != "" {
			club = &n
		}
		return textPtr(playerNickname), club
	}
	return textPtr(clubNickname), nil
}

func rosterEntryOf(e sqlcgen.ListQueueRosterRow) queueRosterEntryDTO {
	nick, club := rosterNames(e.ClubNickname, e.PlayerNickname, e.ProfileState)
	return queueRosterEntryDTO{
		ID: e.ID.String(), SessionID: e.SessionID.String(), ClubPlayerID: e.ClubPlayerID.String(), NameSnapshot: e.NameSnapshot,
		NicknameSnapshot: nick, ClubNickname: club, Present: e.Present, PresentChangedAt: httpapi.ToIso(e.PresentChangedAt.Time),
		Level: levelOf(e.SkillLevelID), LevelLockedAt: isoPtr(e.LevelLockedAt), ConfirmedAt: httpapi.ToIso(e.ConfirmedAt.Time),
		GamesAdjustment: e.GamesAdjustment, SelfCheckedInAt: isoPtr(e.SelfCheckedInAt), LeftAt: isoPtr(e.LeftAt),
		Revision: httpapi.ToDecimalString(e.Revision),
	}
}

// orderedQueueWaitlist is orderedWaitlist in session-store.ts: strictly by the time each entry joined the waitlist (the demotion time
// for a player moved off the roster, otherwise the arrival), a demotion batch in its original slot order, the id last
// (D-2026-11-23-06). Every time compares at the millisecond the TypeScript's Date has, and a missing slot time counts as 0.
func orderedQueueWaitlist(rows []sqlcgen.ListQueueWaitlistRow) []sqlcgen.ListQueueWaitlistRow {
	ms := func(t pgtype.Timestamptz) int64 {
		if !t.Valid {
			return 0
		}
		return t.Time.UnixMilli()
	}
	joined := func(r sqlcgen.ListQueueWaitlistRow) int64 {
		if r.DemotedAt.Valid {
			return ms(r.DemotedAt)
		}
		return ms(r.AddedAt)
	}
	out := append([]sqlcgen.ListQueueWaitlistRow(nil), rows...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if d := joined(a) - joined(b); d != 0 {
			return d < 0
		}
		if d := ms(a.DemotedConfirmedAt) - ms(b.DemotedConfirmedAt); d != 0 {
			return d < 0
		}
		return a.ID.String() < b.ID.String()
	})
	return out
}

func (s *server) queueRoster(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	sess, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	return s.rosterOf(r.Context(), q, club, sess)
}

// rosterOf is readSessionRosterIn: the roster, the No show entries, the waitlist and the pending requests of a session
// the caller has already found and checked. The roster burst batch reads it inside its own transaction.
func (s *server) rosterOf(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, sess sqlcgen.ListQueueSessionsRow) (any, error) {
	all, err := q.ListQueueRoster(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	var live, noShows []sqlcgen.ListQueueRosterRow
	for _, e := range all {
		if e.NoShowAt.Valid {
			noShows = append(noShows, e)
		} else {
			live = append(live, e)
		}
	}
	// No show (cancelled) entries: still unreleased, off the live roster, oldest first.
	sort.SliceStable(noShows, func(i, j int) bool {
		if d := noShows[i].NoShowAt.Time.UnixMilli() - noShows[j].NoShowAt.Time.UnixMilli(); d != 0 {
			return d < 0
		}
		return noShows[i].ID.String() < noShows[j].ID.String()
	})
	waitRows, err := q.ListQueueWaitlist(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	var ids []pgtype.UUID
	seen := map[pgtype.UUID]bool{}
	for _, e := range live {
		if !seen[e.ClubPlayerID] {
			seen[e.ClubPlayerID] = true
			ids = append(ids, e.ClubPlayerID)
		}
	}
	returning := map[pgtype.UUID]bool{}
	forms := map[pgtype.UUID]*queueFormDTO{}
	if len(ids) > 0 {
		before := sess.FinalizedAt
		if !before.Valid {
			before = pgtype.Timestamptz{Time: s.now().Truncate(time.Millisecond), Valid: true}
		}
		prior, err := q.ListQueueReturningPlayers(ctx, sqlcgen.ListQueueReturningPlayersParams{ClubID: club, ClubPlayerIds: ids, SessionID: sess.ID, Before: before})
		if err != nil {
			return nil, err
		}
		// Win chance inputs: each player's win and loss record at this club, by the weekday of the session (Manila). A player with no
		// finalized session here (a first-timer) has no form.
		weekday := func(t time.Time) int { return int(t.Add(8 * time.Hour).UTC().Weekday()) }
		history := map[pgtype.UUID][]winchance.SessionRecord{}
		for _, p := range prior {
			returning[p.ClubPlayerID] = true
			history[p.ClubPlayerID] = append(history[p.ClubPlayerID], winchance.SessionRecord{Weekday: weekday(p.ScheduledStartAt.Time), Wins: int(p.Wins), Losses: int(p.Losses)})
		}
		tonight := weekday(sess.ScheduledStartAt.Time)
		for id, rows := range history {
			f := winchance.FormFromHistory(rows, tonight)
			forms[id] = &queueFormDTO{ClubWinRate: f.ClubWinRate, BestDay: f.BestDay, Place: f.Place, Trend: f.Trend}
		}
	}
	reqs, err := q.ListQueuePendingJoinRequests(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	courts, err := q.ListQueueLiveCourts(ctx, club)
	if err != nil {
		return nil, err
	}
	capacity := int32(0)
	for _, c := range courts {
		if c.SessionID == sess.ID {
			capacity += int32(sess.PlayersPerCourt)
		}
	}
	out := struct {
		Capacity     int32                 `json:"capacity"`
		Roster       []queueRosterEntryDTO `json:"roster"`
		NoShows      []queueRosterEntryDTO `json:"noShows"`
		Waitlist     []queueWaitlistDTO    `json:"waitlist"`
		JoinRequests []queueJoinRequestDTO `json:"joinRequests"`
	}{Capacity: capacity, Roster: []queueRosterEntryDTO{}, NoShows: []queueRosterEntryDTO{}, Waitlist: []queueWaitlistDTO{}, JoinRequests: []queueJoinRequestDTO{}}
	for _, e := range live {
		d := rosterEntryOf(e)
		played := returning[e.ClubPlayerID]
		d.HasPlayedAtClubBfore = &played
		d.Form = forms[e.ClubPlayerID]
		out.Roster = append(out.Roster, d)
	}
	for _, e := range noShows {
		d := rosterEntryOf(e)
		d.NoShowAt = isoPtr(e.NoShowAt)
		out.NoShows = append(out.NoShows, d)
	}
	for i, w := range orderedQueueWaitlist(waitRows) {
		out.Waitlist = append(out.Waitlist, queueWaitlistDTO{
			ID: w.ID.String(), SessionID: w.SessionID.String(), ClubPlayerID: w.ClubPlayerID.String(), Level: levelOf(w.SkillLevelID),
			AddedAt: httpapi.ToIso(effectiveJoin(w.DemotedAt, w.AddedAt)), Position: i + 1,
		})
	}
	for _, j := range reqs {
		out.JoinRequests = append(out.JoinRequests, queueJoinRequestDTO{
			ID: j.ID.String(), SessionID: j.SessionID.String(), Name: j.Name, Nickname: textPtr(j.Nickname), PhoneE164: textPtr(j.PhoneE164),
			StatedBand: string(j.StatedBand), Placement: string(j.Placement), Status: string(j.Status), RequestedAt: httpapi.ToIso(j.RequestedAt.Time),
			DecidedAt: isoPtr(j.DecidedAt), ClubPlayerID: uuidPtr(j.ClubPlayerID), PlayerID: uuidPtr(j.PlayerID),
			Picture: textPtr(j.AvatarRef), PictureName: textPtr(j.PlayerFullName),
		})
	}
	return out, nil
}

// effectiveJoin is `demotedAt ?? addedAt`: when they joined the waitlist (the move time for a player moved off the roster).
func effectiveJoin(demoted, added pgtype.Timestamptz) time.Time {
	if demoted.Valid {
		return demoted.Time
	}
	return added.Time
}
