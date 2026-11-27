package publicreads

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The signed-in reads that share the leaderboard, profile and history code of this package: the Player's own place
// (GET /api/leaderboard/me), their own profile (GET /api/me/profile) and the year's game stats of a player by RTR
// ID (GET /api/rtr-ids/{rtrId}/stats). They are routed by internal/signedin; the reading is here.

// Errors the signed-in layer maps to its own: an invalid period parameter, and a profile that does not exist.
var (
	ErrInvalidPeriod   = errors.New("invalid leaderboard period")
	ErrProfileNotFound = errProfileNotFound
	ErrStatsNotFound   = errors.New("no stats for this RTR ID")
)

// ReadMyLeaderboard is the body of GET /api/leaderboard/me. With a period parameter it is the full standing; without
// one it is only the place, and only inside the top 50.
func ReadMyLeaderboard(ctx context.Context, q *sqlcgen.Queries, period string, present bool, now time.Time, id pgtype.UUID) (any, error) {
	p, ok := parsePeriod(period, present)
	if !ok {
		return nil, ErrInvalidPeriod
	}
	b, err := readBoard(ctx, q, p, now.UnixMilli())
	if err != nil {
		return nil, err
	}
	standing := b.ownPosition(id)
	if present {
		return map[string]any{"standing": standing}, nil
	}
	// Places are shared (1, 1, 2), so a place number under 50 can still be past the cut: only a standing with no cutoff comparison is on
	// the public list.
	if _, pastCut := standing["cutoffWins"]; pastCut {
		return map[string]any{"position": nil}, nil
	}
	return map[string]any{"position": standing["position"]}, nil
}

// ownProfile is the profile with the owner-only Admin change note (P-EDIT-PROFILE).
type ownProfile struct {
	profileWithPlaces
	AdminChangeNote string `json:"adminChangeNote,omitempty"`
}

// ReadMyProfile is readMyProfile: the signed-in player's own profile, unmasked, with the reason of the latest Admin
// edit made while the profile was claimed.
func ReadMyProfile(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, now time.Time) (any, error) {
	p := &players{now: func() time.Time { return now }}
	var out ownProfile
	if err := p.readPublicProfile(ctx, q, id, id.String(), viewerRef{id: id, ok: true}, &out.profileWithPlaces); err != nil {
		return nil, err
	}
	note, err := adminChangeNote(ctx, q, id)
	out.AdminChangeNote = note
	return out, err
}

// ownCard is the profile a write answers with: the public profile with its banner and the owner-only Admin change note,
// and no leaderboard places (ownProfile(db, profileWithBanner(...)) in the TypeScript).
type ownCard struct {
	profileDTO
	AdminChangeNote string `json:"adminChangeNote,omitempty"`
}

// ReadOwnProfileCard is the profile card the Player's own writes (profile, banner, stats switches) answer with, read on the
// caller's transaction. A player with no RTR ID has no profile card: the TypeScript answers null there (publicProfileDto),
// not an error, so this does too.
func ReadOwnProfileCard(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, now time.Time) (any, error) {
	p := &players{now: func() time.Time { return now }}
	dto, err := p.loadProfile(ctx, q, id, id.String(), viewerRef{id: id, ok: true}, maskAlwaysPrivate)
	if errors.Is(err, errProfileNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	note, err := adminChangeNote(ctx, q, id)
	return ownCard{profileDTO: dto, AdminChangeNote: note}, err
}

// adminChangeNote is adminChangeNoteOf: the reason of the latest Admin edit of a claimed profile, or "".
func adminChangeNote(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) (string, error) {
	metadata, err := q.GetAdminChangeReason(ctx, id)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("reading the Admin change note: %w", err)
	}
	var meta struct {
		Reason json.RawMessage `json:"reason"`
	}
	var reason string
	if json.Unmarshal(metadata, &meta) == nil && json.Unmarshal(meta.Reason, &reason) == nil {
		return reason, nil
	}
	return "", nil
}

// yearStats is RecentGameStats.
type yearStats struct {
	Games   int `json:"games"`
	Wins    int `json:"wins"`
	Losses  int `json:"losses"`
	WinRate int `json:"winRate"`
}

// ReadStatsByRTR is the body of GET /api/rtr-ids/{rtrId}/stats: the Latest stats of the Queue session page's profile
// card. A player who turned off Show my profile stats reads as { hidden: true } for everyone but themself. An
// unclaimed player (D-2026-11-16-04) has the games of every club record under their shared entry.
func ReadStatsByRTR(ctx context.Context, q *sqlcgen.Queries, rtrID string, viewer pgtype.UUID, now time.Time) (any, error) {
	key := rtrLookupKey(rtrID)
	target, err := q.GetStatsTarget(ctx, key)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("reading the player behind the RTR ID: %w", err)
	}
	found := err == nil
	if found && target.PlayerID != viewer && !target.ShowProfileStats {
		return map[string]any{"stats": map[string]bool{"hidden": true}}, nil
	}
	var sessions []historySession
	if found && target.IsClaimed {
		facts, err := q.ListPlayerFacts(ctx, target.PlayerID)
		if err != nil {
			return nil, fmt.Errorf("listing facts: %w", err)
		}
		if sessions, err = readHistory(ctx, q, historyFactsOf(facts), viewerRef{}, true); err != nil {
			return nil, err
		}
	} else {
		records, err := q.ListOpenSharedEntryRecords(ctx, key)
		if err != nil {
			return nil, fmt.Errorf("reading the shared entry: %w", err)
		}
		if len(records) == 0 {
			return nil, ErrStatsNotFound
		}
		for _, rec := range records {
			if !rec.ID.Valid {
				continue
			}
			facts, err := q.ListClubPlayerFacts(ctx, sqlcgen.ListClubPlayerFactsParams{ClubID: rec.ClubID, ClubPlayerID: rec.ID})
			if err != nil {
				return nil, fmt.Errorf("listing club facts: %w", err)
			}
			more, err := readHistory(ctx, q, clubHistoryFactsOf(facts), viewerRef{}, false)
			if err != nil {
				return nil, err
			}
			sessions = append(sessions, more...)
		}
	}
	return map[string]any{"stats": yearGameStats(sessions, now.UnixMilli())}, nil
}

// yearGameStats is yearGameStats: games, wins, losses and win rate of the official history that finished this
// calendar year (Asia/Manila), up to now. Nil without games.
func yearGameStats(sessions []historySession, nowMs int64) *yearStats {
	start := periodStart(periodYear, nowMs)
	games, wins := 0, 0
	for _, s := range sessions {
		if s.FinishedAt == nil {
			continue
		}
		at, err := time.Parse(time.RFC3339Nano, *s.FinishedAt)
		if err != nil || at.UnixMilli() < start || at.UnixMilli() > nowMs {
			continue
		}
		for _, g := range s.Games {
			games++
			if g.Result == "won" {
				wins++
			}
		}
	}
	if games == 0 {
		return nil
	}
	return &yearStats{Games: games, Wins: wins, Losses: games - wins, WinRate: int(math.Round(float64(wins) / float64(games) * 100))}
}
