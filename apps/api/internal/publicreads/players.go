package publicreads

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The public player pages: GET /api/players/{playerId}, GET /api/rtr-ids/{rtrId}, and (in their own files)
// /rank, /games and /clubs. Ports of apps/player/src/app/api/{players,rtr-ids}/** and
// packages/db/src/player/{profile,player-clubs,projections}.ts. Stored data only: nothing here calculates a rank.

type players struct {
	pool *pgxpool.Pool
	log  *slog.Logger
	now  func() time.Time
}

func (p *players) fail(w http.ResponseWriter, r *http.Request, err error) {
	failRead(w, r, p.log, "player page read failed", err)
}

func notFound(w http.ResponseWriter) { httpapi.WriteError(w, httpapi.ErrNotFound, nil) }

// uuidParam is the {playerId} segment as a database ID. Anything that is not a UUID can name no player.
func uuidParam(r *http.Request) (pgtype.UUID, bool) {
	b, ok := parseUUID(r.PathValue("playerId"))
	return pgtype.UUID{Bytes: b, Valid: ok}, ok
}

// ---- GET /api/players/{playerId}: the public profile ----

// socialLinks is the four providers, each a URL or the empty string.
type socialLinks struct {
	Facebook  string `json:"facebook"`
	Instagram string `json:"instagram"`
	Youtube   string `json:"youtube"`
	Linkedin  string `json:"linkedin"`
}

// profileDTO is PlayerProfile on the wire. Contacts, account and claim fields never appear.
type profileDTO struct {
	PlayerID              string      `json:"playerId"`
	RtrID                 string      `json:"rtrId"`
	FullName              string      `json:"fullName"`
	Nickname              *string     `json:"nickname"`
	Picture               *string     `json:"picture"`
	BannerID              *string     `json:"bannerId"`
	ProfileVisibility     string      `json:"profileVisibility"`
	ShowProfileStats      bool        `json:"showProfileStats"`
	ShowWeeklyPerformance bool        `json:"showWeeklyPerformance"`
	PlayingStyle          string      `json:"playingStyle"`
	ExperienceYears       *int64      `json:"experienceYears"`
	ExperienceMonths      *int64      `json:"experienceMonths"`
	SocialLinks           socialLinks `json:"socialLinks"`
	BannerKey             string      `json:"bannerKey"`
	BannerImageURL        *string     `json:"bannerImageUrl"`
}

func (p *players) profile(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		notFound(w)
		return
	}
	dto, found, err := p.readProfile(r.Context(), id)
	if err != nil {
		p.fail(w, r, err)
		return
	}
	if !found {
		notFound(w)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Profile profileDTO `json:"profile"`
	}{dto}, httpapi.Public)
}

// readProfile is readPublicProfile: only a player with a permanent RTR ID is found. An always-private
// profile leaves with the name masked and no nickname, style, experience or links; the picture and
// the banner stay public.
func (p *players) readProfile(ctx context.Context, id pgtype.UUID) (dto profileDTO, found bool, err error) {
	err = readTx(ctx, p.pool, func(q *sqlcgen.Queries) error {
		row, err := q.GetPublicProfile(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("reading profile: %w", err)
		}
		found = true
		var shown []sqlcgen.ListShownProfileBannersRow
		if !row.BannerRowID.Valid {
			if shown, err = q.ListShownProfileBanners(ctx); err != nil {
				return fmt.Errorf("reading shown banners: %w", err)
			}
		}
		links, err := q.ListPlayerSocialLinks(ctx, id)
		if err != nil {
			return fmt.Errorf("reading social links: %w", err)
		}
		dto = profileFrom(row, links, shown, p.now())
		return nil
	})
	return dto, found, err
}

func profileFrom(row sqlcgen.GetPublicProfileRow, links []sqlcgen.ListPlayerSocialLinksRow, shown []sqlcgen.ListShownProfileBannersRow, now time.Time) profileDTO {
	masked := row.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate
	dto := profileDTO{
		PlayerID:              row.ID.String(),
		RtrID:                 row.RtrID,
		FullName:              row.FullName,
		Nickname:              textPtr(row.Nickname),
		Picture:               textPtr(row.AvatarRef),
		BannerID:              textPtr(row.BannerID),
		ProfileVisibility:     string(row.ProfileVisibility),
		ShowProfileStats:      row.ShowProfileStats,
		ShowWeeklyPerformance: row.ShowWeeklyPerformance,
	}
	dto.BannerKey, dto.BannerImageURL = resolveBanner(row.BannerRowID, row.BannerImage, shown)
	if masked {
		dto.FullName, dto.Nickname = maskPublicName(row.FullName), nil
		return dto // no style, no experience, no links
	}
	dto.PlayingStyle = playingStyleOf(row.PersonalDetails)
	if months, ok := currentExperienceMonths(row.ExperienceMonths, row.ExperienceRecordedAt, now); ok {
		years, rest := months/12, months%12
		dto.ExperienceYears, dto.ExperienceMonths = &years, &rest
	}
	for _, l := range links {
		switch l.Provider {
		case sqlcgen.SocialProviderFacebook:
			dto.SocialLinks.Facebook = l.Url
		case sqlcgen.SocialProviderInstagram:
			dto.SocialLinks.Instagram = l.Url
		case sqlcgen.SocialProviderYoutube:
			dto.SocialLinks.Youtube = l.Url
		case sqlcgen.SocialProviderLinkedin:
			dto.SocialLinks.Linkedin = l.Url
		}
	}
	return dto
}

// playingStyleOf is playingStyle(): the string at personal_details.playingStyle, else empty.
func playingStyleOf(details []byte) string {
	var v map[string]json.RawMessage
	if json.Unmarshal(details, &v) != nil {
		return "" // not JSON, null, or not an object (an array reads as no style)
	}
	var style string
	if json.Unmarshal(v["playingStyle"], &style) != nil {
		return ""
	}
	return style
}

// currentExperienceMonths is the TypeScript function of the same name: the stored months are a snapshot taken
// at recordedAt, so the count keeps going by whole calendar months (UTC), never backwards.
func currentExperienceMonths(months pgtype.Int4, recordedAt pgtype.Timestamptz, now time.Time) (int64, bool) {
	if !months.Valid {
		return 0, false
	}
	if !recordedAt.Valid {
		return int64(months.Int32), true
	}
	rec, now := recordedAt.Time.UTC(), now.UTC()
	elapsed := (now.Year()-rec.Year())*12 + int(now.Month()) - int(rec.Month())
	return int64(months.Int32) + int64(max(0, elapsed)), true
}

// ---- GET /api/rtr-ids/{rtrId}: find a player by RTR ID ----

// rtrUpper holds the JavaScript upper-casing that Go's simple case mapping lacks and that gives plain
// letters. RTR IDs are ASCII (a database check), so these are the only expansions that can reach a match.
var rtrUpper = strings.NewReplacer(
	"\U000000df", "SS", "\U0000fb00", "FF", "\U0000fb01", "FI", "\U0000fb02", "FL",
	"\U0000fb03", "FFI", "\U0000fb04", "FFL", "\U0000fb05", "ST", "\U0000fb06", "ST",
)

// rtrLookupKey is rtrId.trim().toUpperCase().
func rtrLookupKey(s string) string { return strings.ToUpper(rtrUpper.Replace(jsTrim(s))) }

// findByRTR answers { playerId } for an RTR ID. The lookup does not look at the profile's visibility: every
// player with an RTR ID is found, exactly as findPublicProfileByRtrId does today.
func (p *players) findByRTR(w http.ResponseWriter, r *http.Request) {
	key := rtrLookupKey(r.PathValue("rtrId"))
	var playerID pgtype.UUID
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) (err error) {
		playerID, err = q.FindPlayerIDByRTR(r.Context(), key)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		p.fail(w, r, fmt.Errorf("finding by RTR ID: %w", err))
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		PlayerID string `json:"playerId"`
	}{playerID.String()}, httpapi.Public)
}
