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
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/answers"
)

// The public profile of an unclaimed person a club saved (a shared entry, D-2026-11-16-04, D-2026-11-23-05): readEntryProfile
// in packages/db/src/player/profile.ts. It has no players row, so its id is the entry's. The profile shows the name,
// nickname, picture and details of the club that saved them first, their RTR ID and "saved by" that club. It is public
// while exactly one club has them, and for signed-in viewers only with more. No rank, banner choice or leaderboard place.

// entryProfile reads the profile of an open shared entry. A person nobody holds any more is not found.
func (p *players) entryProfile(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, v viewerRef) (profileDTO, error) {
	savers, err := q.ListEntrySavers(ctx, id)
	if err != nil {
		return profileDTO{}, fmt.Errorf("reading entry savers: %w", err)
	}
	if len(savers) == 0 {
		return profileDTO{}, errProfileNotFound
	}
	if len(savers) > 1 && !v.ok {
		return profileDTO{}, errProfileSignIn
	}
	first := savers[0]
	shown, err := q.ListShownProfileBanners(ctx)
	if err != nil {
		return profileDTO{}, fmt.Errorf("reading shown banners: %w", err)
	}
	own := readOwnDetails(first.PresetFields)
	rtr, club := first.RtrID, first.ClubName
	dto := profileDTO{
		PlayerID:              id.String(),
		RtrID:                 &rtr,
		FullName:              first.DisplayName,
		Nickname:              textPtr(first.Nickname),
		Picture:               textPtr(first.AvatarRef),
		ProfileVisibility:     string(sqlcgen.ProfileVisibilityPublic),
		ShowProfileStats:      true,
		ShowWeeklyPerformance: true,
		PlayingStyle:          own.playingStyle,
		Answers:               answers.Empty(), // a club-saved person has no getting-to-know answers
		SocialLinks:           own.links,
	}
	if len(savers) == 1 {
		dto.UnclaimedSavedBy = &club
	}
	dto.BannerKey, dto.BannerImageURL = resolveBanner(pgtype.Text{}, pgtype.Text{}, shown)
	if own.months != nil {
		months := *own.months
		if own.recorded != nil {
			now := p.now().UTC()
			rec := own.recorded.UTC()
			elapsed := (now.Year()-rec.Year())*12 + int(now.Month()) - int(rec.Month())
			months += int64(max(0, elapsed))
		}
		years, rest := months/12, months%12
		dto.ExperienceYears, dto.ExperienceMonths = &years, &rest
	}
	return dto, nil
}

// ownDetails is readOwnDetails: what a club entered about its own person besides the name, nickname and level. Anything
// missing or malformed reads as not entered.
type ownDetails struct {
	playingStyle string
	months       *int64
	recorded     *time.Time
	links        socialLinks
}

func readOwnDetails(stored []byte) ownDetails {
	var out ownDetails
	var raw map[string]json.RawMessage
	if json.Unmarshal(stored, &raw) != nil {
		return out // not an object (null, an array) reads as nothing entered
	}
	text := func(m map[string]json.RawMessage, key string) string {
		var s string
		if json.Unmarshal(m[key], &s) != nil {
			return ""
		}
		return s
	}
	out.playingStyle = text(raw, "playingStyle")
	var months float64
	if json.Unmarshal(raw["experienceMonths"], &months) == nil && months == math.Trunc(months) {
		m := int64(months)
		out.months = &m
	}
	if at := text(raw, "experienceRecordedAt"); at != "" {
		if t, err := time.Parse(time.RFC3339Nano, at); err == nil {
			out.recorded = &t
		}
	}
	var links map[string]json.RawMessage
	if json.Unmarshal(raw["socialLinks"], &links) != nil {
		return out
	}
	out.links = socialLinks{Facebook: text(links, "facebook"), Instagram: text(links, "instagram"), Youtube: text(links, "youtube"), Linkedin: text(links, "linkedin")}
	return out
}

// entryOpen reports whether id names an open shared entry (not claimed, not retired).
func entryOpen(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) (bool, error) {
	open, err := q.EntryIsOpen(ctx, id)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, fmt.Errorf("reading entry: %w", err)
	}
	return open, nil
}
