package publicreads

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/answers"
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
	// approved are the rank algorithm versions /rank may show (#247).
	approved []string
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

// ---- GET /api/players/{playerId}: the profile for this viewer ----

// socialLinks is the four providers, each a URL or the empty string.
type socialLinks struct {
	Facebook  string `json:"facebook"`
	Instagram string `json:"instagram"`
	Youtube   string `json:"youtube"`
	Linkedin  string `json:"linkedin"`
}

// profileDTO is PlayerProfile on the wire. Contacts, account and claim fields never appear. A masked profile
// (./masking.go) has no RTR ID, and only an unclaimed player carries the club that saved them.
type profileDTO struct {
	PlayerID              string  `json:"playerId"`
	RtrID                 *string `json:"rtrId,omitempty"`
	FullName              string  `json:"fullName"`
	Nickname              *string `json:"nickname"`
	Picture               *string `json:"picture"`
	BannerID              *string `json:"bannerId"`
	ProfileVisibility     string  `json:"profileVisibility"`
	UnclaimedSavedBy      *string `json:"unclaimedSavedBy,omitempty"`
	ShowProfileStats      bool    `json:"showProfileStats"`
	ShowWeeklyPerformance bool    `json:"showWeeklyPerformance"`
	PlayingStyle          string  `json:"playingStyle"`
	Gender                *string `json:"gender"`
	Verified              *bool   `json:"verified,omitempty"`
	answers.Answers
	ExperienceYears  *int64      `json:"experienceYears"`
	ExperienceMonths *int64      `json:"experienceMonths"`
	SocialLinks      socialLinks `json:"socialLinks"`
	BannerKey        string      `json:"bannerKey"`
	BannerImageURL   *string     `json:"bannerImageUrl"`
}

// profileWithPlaces is the profile page read: the profile and the lists the player is in the top 50 of.
type profileWithPlaces struct {
	profileDTO
	LeaderboardPlaces []place `json:"leaderboardPlaces"`
}

// How a profile read refuses a viewer, as the ServiceError codes of loadProfile in the TypeScript.
var (
	errProfileNotFound  = errors.New("profile not found")
	errProfileForbidden = errors.New("profile forbidden")
	errProfileSignIn    = errors.New("profile needs a signed-in viewer")
)

// alwaysPrivateMode is loadProfile's alwaysPrivate argument: refuse an always-private profile (Compare, the RTR ID
// lookup) or let the masked profile through (the profile page).
type alwaysPrivateMode int

const (
	refuseAlwaysPrivate alwaysPrivateMode = iota
	maskAlwaysPrivate
)

func (p *players) profile(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		notFound(w)
		return
	}
	var body struct {
		Profile profileWithPlaces `json:"profile"`
	}
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		return p.readPublicProfile(r.Context(), q, id, r.PathValue("playerId"), viewerOf(r), &body.Profile)
	})
	if p.refused(w, err) {
		return
	}
	if err != nil {
		p.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
}

// refused answers a profile read that the viewer may not see, with the status of the TypeScript ServiceError.
func (p *players) refused(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, errProfileNotFound):
		notFound(w)
	case errors.Is(err, errProfileForbidden):
		httpapi.WriteError(w, httpapi.ErrForbidden, nil)
	case errors.Is(err, errProfileSignIn):
		httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
	default:
		return false
	}
	return true
}

// readPublicProfile is readPublicProfile: the profile page read. An always-private profile answers masked for
// everyone but the owner (B-63), with no leaderboard places.
//
// raw is the player ID as the caller wrote it. The TypeScript compares and keys by that string, so an upper-case ID
// is never the viewer's own and finds no places: the quirk is kept (it is pinned by the profile_upper cases).
func (p *players) readPublicProfile(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, raw string, v viewerRef, out *profileWithPlaces) error {
	dto, err := p.loadProfile(ctx, q, id, raw, v, maskAlwaysPrivate)
	if err != nil {
		return err
	}
	out.profileDTO, out.LeaderboardPlaces = dto, []place{}
	if dto.ProfileVisibility == string(sqlcgen.ProfileVisibilityAlwaysPrivate) && (!v.ok || v.id.String() != raw) {
		return nil
	}
	b, err := readBoard(ctx, q, periodYear, p.now().UnixMilli())
	if err != nil {
		return err
	}
	if raw == id.String() {
		out.LeaderboardPlaces = b.places(id)[raw]
	}
	return nil
}

// loadProfile is loadProfile: the profile for this viewer. A private profile, or an unclaimed one saved by more than
// one club, needs a signed-in viewer. Always private: forbidden to everyone but the owner, or the masked profile.
func (p *players) loadProfile(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, raw string, v viewerRef, mode alwaysPrivateMode) (profileDTO, error) {
	row, err := q.GetPublicProfile(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		// An unclaimed person a club saved with an email or a social link is a shared entry, not a players row.
		return p.entryProfile(ctx, q, id, v)
	}
	if err != nil {
		return profileDTO{}, fmt.Errorf("reading profile: %w", err)
	}
	savers, err := q.ListUnclaimedSavers(ctx, id)
	if err != nil {
		return profileDTO{}, fmt.Errorf("reading saving clubs: %w", err)
	}
	own := v.ok && v.id.String() == raw
	singleClub := row.IsUnclaimed && len(savers) == 1
	if !own && !singleClub {
		hidden := row.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate
		if hidden && mode == refuseAlwaysPrivate {
			return profileDTO{}, errProfileForbidden
		}
		if !v.ok && (row.IsUnclaimed || (!hidden && row.ProfileVisibility == sqlcgen.ProfileVisibilityPrivate)) {
			return profileDTO{}, errProfileSignIn
		}
	}
	var shown []sqlcgen.ListShownProfileBannersRow
	if !row.BannerRowID.Valid {
		if shown, err = q.ListShownProfileBanners(ctx); err != nil {
			return profileDTO{}, fmt.Errorf("reading shown banners: %w", err)
		}
	}
	links, err := q.ListPlayerSocialLinks(ctx, id)
	if err != nil {
		return profileDTO{}, fmt.Errorf("reading social links: %w", err)
	}
	return profileFrom(row, links, shown, savers, v, p.now()), nil
}

// profileFrom is publicProfileDto with the banner of profileWithBanner. The effective visibility of an unclaimed
// player saved by one club is public (D-2026-11-16-04): they appear under that club's name and nickname.
func profileFrom(row sqlcgen.GetPublicProfileRow, links []sqlcgen.ListPlayerSocialLinksRow, shown []sqlcgen.ListShownProfileBannersRow,
	savers []sqlcgen.ListUnclaimedSaversRow, v viewerRef, now time.Time) profileDTO {
	visibility := row.ProfileVisibility
	var saver *sqlcgen.ListUnclaimedSaversRow
	if len(savers) == 1 {
		saver, visibility = &savers[0], sqlcgen.ProfileVisibilityPublic
	}
	masked := isMasked(visibility, v, row.ID)
	dto := profileDTO{
		PlayerID:              row.ID.String(),
		FullName:              row.FullName,
		Nickname:              textPtr(row.Nickname),
		Picture:               textPtr(row.AvatarRef),
		BannerID:              textPtr(row.BannerID),
		ProfileVisibility:     string(visibility),
		ShowProfileStats:      row.ShowProfileStats,
		ShowWeeklyPerformance: row.ShowWeeklyPerformance,
		Answers:               answers.Empty(),
	}
	dto.BannerKey, dto.BannerImageURL = resolveBanner(row.BannerRowID, row.BannerImage, shown)
	if masked {
		dto.FullName, dto.Nickname = maskPublicName(row.FullName), nil
		return dto // no RTR ID, no style, no experience, no links
	}
	rtr := row.RtrID
	dto.RtrID = &rtr
	// Public (D-2026-11-19-01): an always-private profile hides it with the name. Null is not added.
	if row.Gender.Valid {
		g := string(row.Gender.PlayerGender)
		dto.Gender = &g
	}
	// D-2026-11-23-07: the result only; absent for an unclaimed player, who has no account.
	if row.HasAccount {
		v := answers.Verified(row.GoogleEmail.String, row.ContactEmail.String, row.ContactPhone.String, row.VerifiedOverride)
		dto.Verified = &v
	}
	if saver != nil {
		dto.FullName, dto.Nickname = saver.DisplayName, textPtr(saver.Nickname)
		club := saver.ClubName
		dto.UnclaimedSavedBy = &club
	}
	dto.PlayingStyle = playingStyleOf(row.PersonalDetails)
	dto.Answers = answers.Of(row.PersonalDetails)
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

// findByRTR answers { playerId } for an RTR ID (findPublicProfileByRtrId). It answers 404, the same as for an
// unknown ID, whenever the profile read would refuse this viewer (a private profile or an unclaimed one under
// several clubs for a visitor, an always-private one for anyone but the owner, B-53 and B-63), and for a player
// hidden from Player Information, for every caller (B-53).
func (p *players) findByRTR(w http.ResponseWriter, r *http.Request) {
	key := rtrLookupKey(r.PathValue("rtrId"))
	var playerID pgtype.UUID
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		found, err := q.FindPlayerIDByRTR(r.Context(), key)
		if errors.Is(err, pgx.ErrNoRows) {
			// An unclaimed person a club saved is found by their RTR ID too. Unlike a player, a refusal here stays a refusal.
			entry, err := q.FindOpenEntryByRTR(r.Context(), key)
			if err != nil {
				return err
			}
			if _, err := p.entryProfile(r.Context(), q, entry, viewerOf(r)); err != nil {
				return err
			}
			playerID = entry
			return nil
		}
		if err != nil {
			return err
		}
		if found.HiddenFromDirectory {
			return errProfileNotFound
		}
		playerID = found.PlayerID
		if _, err := p.loadProfile(r.Context(), q, playerID, playerID.String(), viewerOf(r), refuseAlwaysPrivate); err != nil {
			if errors.Is(err, errProfileForbidden) || errors.Is(err, errProfileSignIn) {
				return errProfileNotFound
			}
			return err
		}
		return nil
	})
	if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, errProfileNotFound) {
		notFound(w)
		return
	}
	if p.refused(w, err) {
		return
	}
	if err != nil {
		p.fail(w, r, fmt.Errorf("finding by RTR ID: %w", err))
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		PlayerID string `json:"playerId"`
	}{playerID.String()}, httpapi.Private)
}
