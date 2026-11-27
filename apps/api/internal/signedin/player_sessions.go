package signedin

import (
	"encoding/json"
	"errors"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionresult"
)

// GET /api/me/sessions and GET /api/me/sessions/{sessionId}/share. Ports of
// apps/player/src/app/api/me/sessions/**/route.ts and packages/db/src/player/my-sessions.ts.

// ---- GET /api/me/sessions ----

type openSessionDTO struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	Slug             string `json:"slug"`
	Start            string `json:"start"`
	End              string `json:"end"`
	ClubName         string `json:"clubName"`
	Status           string `json:"status"`
	WaitlistPosition *int   `json:"waitlistPosition"`
}

type finishedSessionDTO struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	ClubName   string `json:"clubName"`
	FinishedAt string `json:"finishedAt"`
	Published  bool   `json:"published"`
}

func uuidSet(ids []pgtype.UUID) map[pgtype.UUID]bool {
	set := make(map[pgtype.UUID]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}

func (s *server) mySessions() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		ctx := r.Context()
		ids, err := q.ListMyClubPlayerIDs(ctx, who.ID)
		if err != nil {
			return nil, err
		}
		if ids == nil {
			ids = []pgtype.UUID{}
		}
		rows, err := q.ListMyOpenSessions(ctx, sqlcgen.ListMyOpenSessionsParams{PlayerID: who.ID, ClubPlayerIds: ids})
		if err != nil {
			return nil, err
		}
		mine := uuidSet(ids)
		open := make([]openSessionDTO, 0, len(rows))
		for _, row := range rows {
			dto := openSessionDTO{
				ID: row.ID.String(), Title: row.Title, Slug: row.PublicSlug,
				Start: httpapi.ToIso(row.ScheduledStartAt.Time), End: httpapi.ToIso(row.ScheduledEndAt.Time), ClubName: row.ClubName,
			}
			index := -1
			if !row.HasSlot {
				list, err := q.ListSessionWaitlistRows(ctx, row.ID)
				if err != nil {
					return nil, err
				}
				for i, w := range orderedWaitlist(list) {
					if mine[w.ClubPlayerID] {
						index = i
						break
					}
				}
			}
			switch {
			case row.HasSlot && row.State == sqlcgen.QueueSessionStatePrepared:
				dto.Status = "confirmed"
			case row.HasSlot:
				dto.Status = "live"
			case index >= 0:
				dto.Status = "waitlist"
				pos := index + 1
				dto.WaitlistPosition = &pos
			default:
				dto.Status = "requested"
			}
			open = append(open, dto)
		}

		finished, err := s.finishedSessions(r, q, who)
		if err != nil {
			return nil, err
		}
		return struct {
			Sessions []openSessionDTO     `json:"sessions"`
			Finished []finishedSessionDTO `json:"finished"`
		}{open, finished}, nil
	})
}

// finishedSessions is the finished half of My sessions: the player's finished sessions from saved history,
// newest first, with whether each one's results are shared (published with the standings slide).
func (s *server) finishedSessions(r *http.Request, q *sqlcgen.Queries, who viewer) ([]finishedSessionDTO, error) {
	ctx := r.Context()
	facts, err := q.ListPlayerFacts(ctx, who.ID)
	if err != nil {
		return nil, err
	}
	var sessionIDs []pgtype.UUID
	seen := map[pgtype.UUID]bool{}
	for _, f := range facts {
		if !seen[f.SessionID] {
			seen[f.SessionID] = true
			sessionIDs = append(sessionIDs, f.SessionID)
		}
	}
	out := []finishedSessionDTO{}
	if len(sessionIDs) == 0 {
		return out, nil
	}
	completed, err := q.ListCompletedSessions(ctx, sessionIDs)
	if err != nil {
		return nil, err
	}
	var doneIDs []pgtype.UUID
	for _, c := range completed {
		doneIDs = append(doneIDs, c.ID)
	}
	if len(doneIDs) == 0 {
		return out, nil
	}
	sharedRows, err := q.ListSharedStandingSessions(ctx, doneIDs)
	if err != nil {
		return nil, err
	}
	shared := uuidSet(sharedRows)
	for _, c := range completed {
		if !c.FinalizedAt.Valid {
			continue
		}
		out = append(out, finishedSessionDTO{
			ID: c.ID.String(), Title: c.Title, ClubName: c.ClubName, FinishedAt: httpapi.ToIso(c.FinalizedAt.Time), Published: shared[c.ID],
		})
	}
	// Newest first by the ISO instant the wire shows (millisecond precision).
	sort.SliceStable(out, func(i, j int) bool { return out[i].FinishedAt > out[j].FinishedAt })
	return out, nil
}

// ---- GET /api/me/sessions/{sessionId}/share ----

type shareFaceDTO struct {
	Name    string  `json:"name"`
	Picture *string `json:"picture"`
}

type shareGameDTO struct {
	Partners  []shareFaceDTO `json:"partners"`
	Opponents []shareFaceDTO `json:"opponents"`
}

type shareDTO struct {
	Published bool                    `json:"published"`
	Position  *float64                `json:"position"`
	Games     map[string]shareGameDTO `json:"games"`
}

// readMyShareSession is readMyShareSession: the share card's saved results for one finished session of the
// player. Only games the player played are read; a guest shows a masked name and no picture, as on public pages.
func readMyShareSession(r *http.Request, q *sqlcgen.Queries, who viewer) (shareDTO, error) {
	empty := shareDTO{Games: map[string]shareGameDTO{}}
	sessionID, ok := parseUUIDString(r.PathValue("sessionId"))
	if !ok {
		return empty, nil
	}
	ctx := r.Context()
	pub, err := q.GetMyShareSessionPublication(ctx, sessionID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return empty, err
	}
	published := err == nil && pub.State == sqlcgen.PublicationStatePublished && hasSlide(pub.PublishedSlides, "standings")
	ids, err := q.ListMyClubPlayerIDs(ctx, who.ID)
	if err != nil {
		return empty, err
	}
	if ids == nil {
		ids = []pgtype.UUID{}
	}
	mine := map[string]bool{}
	for _, id := range ids {
		mine[id.String()] = true
	}
	dto := shareDTO{Published: published, Games: map[string]shareGameDTO{}}
	if published {
		dto.Position = ownStandingPosition(pub.SnapshotStandings, mine)
	}
	facts, err := q.ListMyShareFacts(ctx, sqlcgen.ListMyShareFactsParams{SessionID: sessionID, ClubPlayerIds: ids})
	if err != nil {
		return empty, err
	}
	entryRows, err := q.ListSessionEntries(ctx, []pgtype.UUID{sessionID})
	if err != nil {
		return empty, err
	}
	byID := make(map[pgtype.UUID]shareFaceDTO, len(entryRows))
	for _, e := range entryRows {
		switch {
		case !e.PlayerID.Valid || !e.HasRtrID:
			byID[e.ID] = shareFaceDTO{Name: publicreads.MaskPublicName(e.NameSnapshot)}
		case e.ProfileVisibility.Valid && e.ProfileVisibility.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate:
			byID[e.ID] = shareFaceDTO{Name: publicreads.MaskPublicName(e.NameSnapshot), Picture: textPtr(e.AvatarRef)}
		default:
			byID[e.ID] = shareFaceDTO{Name: e.NameSnapshot, Picture: textPtr(e.AvatarRef)}
		}
	}
	// An entry the session does not list shows the masked empty name, as the TypeScript's fallback does.
	faces := func(entries []pgtype.UUID) []shareFaceDTO {
		out := make([]shareFaceDTO, 0, len(entries))
		for _, id := range entries {
			f, ok := byID[id]
			if !ok {
				f = shareFaceDTO{Name: publicreads.MaskPublicName("")}
			}
			out = append(out, f)
		}
		return out
	}
	for _, f := range facts {
		dto.Games[f.MatchID.String()] = shareGameDTO{Partners: faces(f.PartnerEntryIds), Opponents: faces(f.OpponentEntryIds)}
	}
	return dto, nil
}

func hasSlide(slides []string, want string) bool {
	for _, s := range slides {
		if s == want {
			return true
		}
	}
	return false
}

// ownStandingPosition is the position of the first standing row that names one of the player's saved players,
// when the saved standings are an array and that position is a number; otherwise nil.
func ownStandingPosition(raw []byte, mine map[string]bool) *float64 {
	var rows []json.RawMessage
	if json.Unmarshal(sessionresult.SharePositions(raw), &rows) != nil {
		return nil // not an array (or no snapshot)
	}
	for _, row := range rows {
		var v map[string]json.RawMessage
		if json.Unmarshal(row, &v) != nil {
			continue
		}
		var id string
		if json.Unmarshal(v["clubPlayerId"], &id) != nil || !mine[id] {
			continue
		}
		// The first matching row decides, whatever its position holds.
		var pos any
		if json.Unmarshal(v["position"], &pos) != nil {
			return nil
		}
		n, isNumber := pos.(float64)
		if !isNumber {
			return nil
		}
		return &n
	}
	return nil
}

func (s *server) myShareSession() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		return readMyShareSession(r, q, who)
	})
}
