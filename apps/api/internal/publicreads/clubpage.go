package publicreads

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/collate"
	"golang.org/x/text/language"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// GET /api/clubs/{clubId}: the public club page (P-CLUB-PAGE, P-CLUB-MEMBERS). A port of readClubPage in
// packages/db/src/player/club-page.ts as Queue calls it: readClubPage(clubId, null).
//
// SCOPE: Go serves the page for NO viewer only. Player's route reads the Player sign-in cookie to pick a
// viewer (their own row unmasked, signed-in players seeing names, signedIn and viewerIsMember set), and Go
// cannot verify a sign-in until the go-sign-in track. So this handler reads no cookie and has no viewer path:
// every member name is masked, signedIn and viewerIsMember are false. Player's viewer-aware variant stays on
// its Route Handler until go-sign-in.

type clubPages struct {
	pool *pgxpool.Pool
	log  *slog.Logger
	now  func() time.Time
}

type clubPageDTO struct {
	Club           clubPageClub      `json:"club"`
	SignedIn       bool              `json:"signedIn"`
	ViewerIsMember bool              `json:"viewerIsMember"`
	Members        []clubPageMember  `json:"members"`
	Sessions       []clubPageSession `json:"sessions"`
}

type clubPageClub struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Initials utf16String `json:"initials"`
	LogoURL  *string     `json:"logoUrl"`
	City     string      `json:"city"`
}

// clubPageMember is a masked member: no player id, nickname or level, and a key that is only their place in the list
// (B-55); the picture and banner stay.
type clubPageMember struct {
	Key            string  `json:"key"`
	PlayerID       *string `json:"playerId"`
	Name           string  `json:"name"`
	Nickname       *string `json:"nickname"`
	Picture        *string `json:"picture"`
	Level          *string `json:"level"`
	IsYou          bool    `json:"isYou"`
	Masked         bool    `json:"masked"`
	BannerKey      string  `json:"bannerKey"`
	BannerImageURL *string `json:"bannerImageUrl"`
}

type clubPageSession struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	StartsAt int64   `json:"startsAt"`
	EndsAt   int64   `json:"endsAt"`
	Status   string  `json:"status"`
	Slug     *string `json:"slug"`
}

// sessionPageRetention is SESSION_PAGE_RETENTION_DAYS: a done session keeps its public page for 90 days.
const sessionPageRetentionMs = 90 * 24 * 60 * 60 * 1000

// playingLevels is PLAYING_LEVELS: skill_levels is seeded so that the id is the index.
var playingLevels = [...]string{
	"beginner_low", "beginner_mid", "beginner_high",
	"intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

// levelCode is levelCodeFor: an id outside the nine levels (and the query's -1 for "never assessed") is no level.
func levelCode(id int16) *string {
	if id < 0 || int(id) >= len(playingLevels) {
		return nil
	}
	return &playingLevels[id]
}

// newNameComparer is a.localeCompare(b) for the masked member names: the root collation, as ICU gives Node
// (lower case before upper case, accents and punctuation as ICU orders them). A Collator is not safe to share
// between goroutines, so each request builds its own.
func newNameComparer() func(a, b string) int {
	return collate.New(language.Und).CompareString
}

// clubSessionStatus is clubSessionStatus in clubPage.rules.ts; cancelled and invalid have no status.
func clubSessionStatus(state sqlcgen.QueueSessionState) (string, bool) {
	switch state {
	case sqlcgen.QueueSessionStateActive:
		return "live", true
	case sqlcgen.QueueSessionStatePrepared:
		return "scheduled", true
	case sqlcgen.QueueSessionStateFinalizing, sqlcgen.QueueSessionStateCompleted:
		return "done", true
	}
	return "", false
}

func (c *clubPages) page(w http.ResponseWriter, r *http.Request) {
	b, ok := parseUUID(r.PathValue("clubId"))
	if !ok {
		notFound(w)
		return
	}
	id := pgtype.UUID{Bytes: b, Valid: true}
	var page clubPageDTO
	found := false
	err := readTx(r.Context(), c.pool, func(q *sqlcgen.Queries) error {
		club, err := q.GetClubPageClub(r.Context(), id)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("reading club: %w", err)
		}
		found = true
		rows, err := q.ListClubPageMembers(r.Context(), id)
		if err != nil {
			return fmt.Errorf("listing members: %w", err)
		}
		sessions, err := q.ListClubPageSessions(r.Context(), id)
		if err != nil {
			return fmt.Errorf("listing sessions: %w", err)
		}
		shown, err := q.ListShownProfileBanners(r.Context())
		if err != nil {
			return fmt.Errorf("reading shown banners: %w", err)
		}
		page = clubPageDTO{
			Club: clubPageClub{
				ID: club.ID.String(), Name: club.Name, Initials: clubInitials(club.Name),
				LogoURL: textPtr(club.LogoRef), City: club.City,
			},
			Members:  maskedMembers(rows, shown),
			Sessions: clubSessions(sessions, c.now()),
		}
		return nil
	})
	if err != nil {
		failRead(w, r, c.log, "club page read failed", err)
		return
	}
	if !found {
		notFound(w)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Page clubPageDTO `json:"page"`
	}{page}, httpapi.Private)
}

// maskedMembers is the members of readClubPage for a null viewer, sorted by the masked name. Members that share
// a masked name are common and the TypeScript leaves their order to the database; here they stay in club player
// id order (the query's order, and the sort is stable).
func maskedMembers(rows []sqlcgen.ListClubPageMembersRow, shown []sqlcgen.ListShownProfileBannersRow) []clubPageMember {
	out := make([]clubPageMember, 0, len(rows))
	for _, row := range rows {
		name := row.FullName
		if name == "" {
			name = row.DisplayName
		}
		key, image := resolveBanner(row.BannerRowID, row.BannerImage, shown)
		out = append(out, clubPageMember{
			Name: maskPublicName(name), Picture: textPtr(row.AvatarRef),
			Masked: true, BannerKey: key, BannerImageURL: image,
		})
	}
	compare := newNameComparer()
	sort.SliceStable(out, func(i, j int) bool { return compare(out[i].Name, out[j].Name) < 0 })
	for i := range out {
		out[i].Key = fmt.Sprintf("masked-%d", i) // no stable member key (B-55)
	}
	return out
}

// clubSessions lists the club's sessions soonest first. A page is gone (no slug) when its publication was
// deleted, or when the session is done and ended more than 90 days before now.
func clubSessions(rows []sqlcgen.ListClubPageSessionsRow, now time.Time) []clubPageSession {
	keptSince := now.UnixMilli() - sessionPageRetentionMs // Date.now() is whole milliseconds
	out := make([]clubPageSession, 0, len(rows))
	for _, s := range rows {
		status, ok := clubSessionStatus(s.State)
		if !ok {
			continue
		}
		endsAt := s.ScheduledEndAt.Time.UnixMilli()
		gone := s.PublicationDeleted || (status == "done" && endsAt < keptSince)
		slug := &s.PublicSlug
		if gone {
			slug = nil
		}
		out = append(out, clubPageSession{
			ID: s.ID.String(), Title: s.Title, StartsAt: s.ScheduledStartAt.Time.UnixMilli(), EndsAt: endsAt, Status: status, Slug: slug,
		})
	}
	return out
}
