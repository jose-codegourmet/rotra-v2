package signedin

import (
	"context"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/levelrestriction"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Queue sessions: GET /api/sessions and GET /api/sessions/{sessionId}. Ports of readQueueSessions and
// readQueueSession in packages/db/src/queue/session-preparation.ts. A session of another club is not found, like an
// unknown id; a malformed id is not found here too (the TypeScript read crashes on it: a database error, 500).

// registerQueueSessions adds the Queue app's session reads.
func (s *server) registerQueueSessions(rt *Router) {
	club := store.AudienceClub
	rt.Handle("GET /api/sessions", club, s.club(s.queueSessions))
	rt.Handle("GET /api/sessions/{sessionId}", club, s.club(s.queueSession))
	rt.Handle("GET /api/sessions/{sessionId}/roster", club, s.club(s.queueRoster))
	rt.Handle("GET /api/sessions/{sessionId}/matches", club, s.club(s.queueMatches))
	rt.Handle("GET /api/sessions/{sessionId}/results", club, s.club(s.queueResults))
	rt.Handle("GET /api/sessions/{sessionId}/requests", club, s.club(s.queueRequests))
	rt.Handle("GET /api/sessions/{sessionId}/cost", club, s.club(s.queueCost))
	rt.Handle("GET /api/sessions/{sessionId}/payments", club, s.club(s.queuePayments))
}

// requestFormatsRecord is requestFormatsRecord: one switch per format the Players can request.
func requestFormatsRecord(formats []string) map[string]bool {
	out := make(map[string]bool, len(requestFormatOrder))
	for _, f := range requestFormatOrder {
		out[f] = slices.Contains(formats, f)
	}
	return out
}

type queueSessionDTO struct {
	ID                   string          `json:"id"`
	ClubID               string          `json:"clubId"`
	Title                string          `json:"title"`
	Notes                string          `json:"notes"`
	ScheduledStartAt     string          `json:"scheduledStartAt"`
	ScheduledEndAt       string          `json:"scheduledEndAt"`
	VenueID              *string         `json:"venueId"`
	VenueName            string          `json:"venueName"`
	VenueAddress         string          `json:"venueAddress"`
	State                string          `json:"state"`
	InvalidReason        *string         `json:"invalidReason"`
	CancelledAt          *string         `json:"cancelledAt"`
	CancelReason         *string         `json:"cancelReason"`
	SessionMode          string          `json:"sessionMode"`
	AllowSingles         bool            `json:"allowSingles"`
	AllowDoubles         bool            `json:"allowDoubles"`
	MinimumGames         int32           `json:"minimumGames"`
	MinimumIsCalculated  bool            `json:"minimumIsCalculated"`
	PlayersPerCourt      int16           `json:"playersPerCourt"`
	ExpectedPlayers      *int32          `json:"expectedPlayers"`
	StartedAt            *string         `json:"startedAt"`
	FinalizedAt          *string         `json:"finalizedAt"`
	SeriesID             *string         `json:"seriesId"`
	PublicSlug           string          `json:"publicSlug"`
	AcceptJoinRequests   bool            `json:"acceptJoinRequests"`
	AlwaysRequireRequest bool            `json:"alwaysRequireRequest"`
	CourtFillMode        string          `json:"courtFillMode"`
	RequestFormats       map[string]bool `json:"requestFormats"`
	RecordGames          bool            `json:"recordGames"`
	// LevelRestriction is Restrictions (D-2026-11-19-12): which levels may take a slot; all by default.
	LevelRestriction levelrestriction.Wire `json:"levelRestriction"`
	Revision         string                `json:"revision"`
	// PlannedBeforeStart is the planned window the session had when it started (Back to preparation puts it back); null before Start.
	PlannedBeforeStart *PlannedWindow `json:"plannedBeforeStart"`
}

func sessionDTOOf(r sqlcgen.ListQueueSessionsRow) queueSessionDTO {
	d := queueSessionDTO{
		ID: r.ID.String(), ClubID: r.ClubID.String(), Title: r.Title, Notes: r.Notes.String,
		ScheduledStartAt: httpapi.ToIso(r.ScheduledStartAt.Time), ScheduledEndAt: httpapi.ToIso(r.ScheduledEndAt.Time),
		VenueID: uuidPtr(r.VenueID), VenueName: r.VenueName.String, VenueAddress: r.VenueAddress.String, State: string(r.State),
		InvalidReason: textPtr(r.InvalidReason), CancelledAt: isoPtr(r.CancelledAt), CancelReason: textPtr(r.CancelReason),
		SessionMode: string(r.SessionMode), AllowSingles: r.AllowSingles, AllowDoubles: r.AllowDoubles, MinimumGames: r.MinimumGames,
		MinimumIsCalculated: r.MinimumIsCalculated, PlayersPerCourt: r.PlayersPerCourt, StartedAt: isoPtr(r.StartedAt),
		FinalizedAt: isoPtr(r.FinalizedAt), SeriesID: uuidPtr(r.SeriesID), PublicSlug: r.PublicSlug, AcceptJoinRequests: r.AcceptJoinRequests,
		AlwaysRequireRequest: r.AlwaysRequireRequest, CourtFillMode: string(r.CourtFillMode), RequestFormats: requestFormatsRecord(r.RequestFormats),
		RecordGames: r.RecordGames, Revision: httpapi.ToDecimalString(r.Revision),
		LevelRestriction: levelrestriction.Of(r.LevelRestriction, r.BeginnerSlots, r.IntermediateSlots, r.AdvancedSlots),
	}
	if r.ExpectedPlayers.Valid {
		v := r.ExpectedPlayers.Int32
		d.ExpectedPlayers = &v
	}
	if r.PlannedStartBeforeStartAt.Valid && r.PlannedEndBeforeStartAt.Valid {
		d.PlannedBeforeStart = &PlannedWindow{StartAt: httpapi.ToIso(r.PlannedStartBeforeStartAt.Time), EndAt: httpapi.ToIso(r.PlannedEndBeforeStartAt.Time)}
	}
	return d
}

type queueCourtDTO struct {
	ID            string  `json:"id"`
	SessionID     string  `json:"sessionId"`
	Label         string  `json:"label"`
	Position      int32   `json:"position"` // court order in the session, from 1
	StartsAt      *string `json:"startsAt"`
	OpenedEarlyAt *string `json:"openedEarlyAt"`
	OpenUntil     *string `json:"openUntil"`
	RemovedAt     *string `json:"removedAt"`
}

// queueSessionSummary is sessionSummaryDto: the session, its live courts and the counts Q-HOME and Q-SESSION show.
// RequestCount is only there for a prepared or a live session.
type queueSessionSummary struct {
	Session      queueSessionDTO `json:"session"`
	Courts       []queueCourtDTO `json:"courts"`
	RosterCount  int32           `json:"rosterCount"`
	PresentCount int32           `json:"presentCount"`
	Capacity     int32           `json:"capacity"`
	WaitlistCnt  int32           `json:"waitlistCount"`
	CourtsInUse  int32           `json:"courtsInUse"`
	GamesPlayed  int32           `json:"gamesPlayed"`
	QueuedCount  int32           `json:"queuedCount"`
	RequestCount *int32          `json:"requestCount,omitempty"`
}

func queueSummaryOf(r sqlcgen.ListQueueSessionsRow, courts []sqlcgen.ListQueueLiveCourtsRow) queueSessionSummary {
	d := queueSessionSummary{
		Session: sessionDTOOf(r), Courts: []queueCourtDTO{}, RosterCount: r.RosterCount, PresentCount: r.PresentCount,
		WaitlistCnt: r.WaitlistCount, CourtsInUse: r.CourtsInUse, GamesPlayed: r.GamesPlayed, QueuedCount: r.QueuedCount,
	}
	n := int32(0)
	for _, c := range courts {
		if c.SessionID != r.ID {
			continue
		}
		n++
		d.Courts = append(d.Courts, queueCourtDTO{
			ID: c.ID.String(), SessionID: c.SessionID.String(), Label: c.Label, Position: c.Position, StartsAt: isoPtr(c.StartsAt),
			OpenedEarlyAt: isoPtr(c.OpenedEarlyAt), OpenUntil: isoPtr(c.OpenUntil), RemovedAt: isoPtr(c.RemovedAt),
		})
	}
	d.Capacity = n * int32(r.PlayersPerCourt)
	return d
}

func (s *server) queueSessions(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	rows, err := q.ListQueueSessions(ctx, sqlcgen.ListQueueSessionsParams{ClubID: club})
	if err != nil {
		return nil, err
	}
	courts, err := q.ListQueueLiveCourts(ctx, club)
	if err != nil {
		return nil, err
	}
	out := make([]queueSessionSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, queueSummaryOf(row, courts))
	}
	return struct {
		Sessions []queueSessionSummary `json:"sessions"`
	}{out}, nil
}

// ownSession is the club's session by id: another club's id, an unknown one and a malformed one are not found.
func ownSession(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, raw string) (sqlcgen.ListQueueSessionsRow, error) {
	id, ok := parseUUIDString(raw)
	if !ok {
		return sqlcgen.ListQueueSessionsRow{}, errNotFound
	}
	rows, err := q.ListQueueSessions(ctx, sqlcgen.ListQueueSessionsParams{ClubID: club, SessionID: id})
	if err != nil {
		return sqlcgen.ListQueueSessionsRow{}, err
	}
	if len(rows) == 0 {
		return sqlcgen.ListQueueSessionsRow{}, errNotFound
	}
	return rows[0], nil
}

// requireSessionAccess is requireSessionAccess: an active session that a licence term started keeps running after the
// licence expires; every other session needs a current entitlement.
func (s *server) requireSessionAccess(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, row sqlcgen.ListQueueSessionsRow) error {
	if row.State == sqlcgen.QueueSessionStateActive && row.HasStartTerm {
		return nil
	}
	return requireClubEntitlement(ctx, q, club, s.now())
}

// session loads the club's session and makes the access check of the services that read it after the lookup.
func (s *server) session(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (sqlcgen.ListQueueSessionsRow, error) {
	row, err := ownSession(r.Context(), q, club, r.PathValue("sessionId"))
	if err != nil {
		return row, err
	}
	return row, s.requireSessionAccess(r.Context(), q, club, row)
}

func (s *server) queueSession(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	row, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	courts, err := q.ListQueueLiveCourts(ctx, club)
	if err != nil {
		return nil, err
	}
	d := queueSummaryOf(row, courts)
	switch row.State {
	case sqlcgen.QueueSessionStatePrepared:
		// Requests · N: pending join requests plus open drop-out notices.
		joining, err := q.CountQueuePendingJoinRequests(ctx, row.ID)
		if err != nil {
			return nil, err
		}
		notices, err := q.CountQueueOpenDropOuts(ctx, row.ID)
		if err != nil {
			return nil, err
		}
		n := joining + notices
		d.RequestCount = &n
	case sqlcgen.QueueSessionStateActive:
		// Match requests · N: the open match requests whose named players are all present.
		n, err := q.CountQueueLiveOpenRequests(ctx, row.ID)
		if err != nil {
			return nil, err
		}
		d.RequestCount = &n
	}
	return d, nil
}
