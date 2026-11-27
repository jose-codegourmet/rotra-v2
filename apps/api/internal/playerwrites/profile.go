package playerwrites

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/answers"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The profile: PATCH /api/me/profile, POST /api/me/profile-banner and POST /api/me/stats-visibility. Ports of the Route Handlers
// in apps/player/src/app/api/me/{profile,profile-banner,stats-visibility}/route.ts and of updateMyProfile, setMyProfileBanner and
// setStatsVisibility in packages/db/src/player/profile.ts. The three answer the player's own profile card (the public profile
// with its banner and the owner-only Admin change note, no leaderboard places) read on the transaction, and the account's
// revision read after the commit.

func (s *server) registerProfile(rt *signedin.Router) {
	rt.Handle("PATCH /api/me/profile", store.AudiencePlayer, s.player(s.patchProfile))
	rt.Handle("POST /api/me/profile-banner", store.AudiencePlayer, s.player(s.setBanner))
	rt.Handle("POST /api/me/stats-visibility", store.AudiencePlayer, s.player(s.setStatsVisibility))
	rt.Handle("POST /api/me/gender", store.AudiencePlayer, s.player(s.setGender))
	rt.Handle("POST /api/me/onboarding-answers", store.AudiencePlayer, s.player(s.saveAnswers))
}

// profileAnswer is `{ profile, revision }`.
type profileAnswer struct {
	Profile  any    `json:"profile"`
	Revision string `json:"revision"`
}

// answerProfile reads the revision after the commit and shapes the answer.
func (s *server) answerProfile(ctx context.Context, id pgtype.UUID, card any) (writes.Result, error) {
	account, err := s.account(ctx, id)
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: profileAnswer{Profile: card, Revision: account.Revision}}, nil
}

// socialProviders are the four links, in the order the service writes them (SOCIAL in the Route Handler), with the words of
// the message a link the table refuses is answered with.
var socialProviders = []struct{ key, label, example string }{
	{"facebook", "Facebook", "https://facebook.com/yourname"},
	{"instagram", "Instagram", "https://instagram.com/yourname"},
	{"youtube", "YouTube", "https://youtube.com/@yourchannel"},
	{"linkedin", "LinkedIn", "https://linkedin.com/in/yourname"},
}

// maxExperience is the largest the 32-bit experience_months column holds.
const maxExperience = math.MaxInt32

// whole is Number.isInteger.
func whole(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) && v == math.Trunc(v) }

// patchProfile is P-EDIT-PROFILE save under the loaded revision. Contacts are never accepted here, and the picture is kept
// (a stale revision is still a conflict). The order is the TypeScript's: the JSON body, the name, the experience, then in one
// transaction the player's lock, the revision, the writes and the card.
//
// A multipart body is the picture upload (updatePlayerAvatar), which belongs to the pictures track: Go answers 503 for it.
func (s *server) patchProfile(r *http.Request, p session.Principal) (writes.Result, error) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		return writes.Result{}, writes.Fail(httpapi.ErrUnavailable, nil)
	}
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	expected := body.Text("expectedRevision")
	fullName := fields.JSTrim(body.Text("fullName"))
	if fullName == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"fullName": "Enter your full name."})
	}
	// A nickname that is empty or blank is none.
	nickname := fields.JSTrim(body.Text("nickname"))
	style := fields.JSTrim(body.Text("playingStyle"))
	years, yearsGiven := body.NumberOrNull("experienceYears")
	months, monthsGiven := body.NumberOrNull("experienceMonths")
	y, m := 0.0, 0.0
	if yearsGiven {
		y = years
	}
	if monthsGiven {
		m = months
	}
	if !whole(y) || !whole(m) || y < 0 || m < 0 || m > 11 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"experience": "Enter years and months of experience."})
	}
	// Every provider is always named: a link that is not sent (or is not text) removes the stored one.
	linksIn := body.Object("socialLinks")
	links := make([]string, len(socialProviders))
	for i, sp := range socialProviders {
		links[i] = fields.JSTrim(linksIn.Text(sp.key))
	}
	var experience *int32
	overflow := false
	if yearsGiven || monthsGiven {
		total := y*12 + m
		if total > maxExperience {
			overflow = true
		} else {
			v := int32(total)
			experience = &v
		}
	}

	id := self(p)
	var card any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		cur, err := q.LockPlayerProfile(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		if err := writes.RequireRevision(cur.Revision, expected); err != nil {
			return err
		}
		// What the table or the column refuses is a crash (a 500) in the TypeScript, after the revision check. Go answers
		// `invalid` before it writes anything (see the track's deviations log).
		if err := refused(fullName, nickname, style, links, overflow); err != nil {
			return err
		}
		now := s.at()
		if err := s.writeProfile(ctx, q, id, cur, fullName, nickname, style, experience, links, now); err != nil {
			return err
		}
		card, err = publicreads.ReadOwnProfileCard(ctx, q, id, now)
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return s.answerProfile(r.Context(), id, card)
}

// refused is what the database would refuse after the revision passed: a character Postgres cannot store, a link that does
// not start with https:// (player_social_links_url_check), an experience beyond the column.
func refused(fullName, nickname, style string, links []string, overflow bool) error {
	for _, text := range []string{fullName, nickname, style} {
		if strings.ContainsRune(text, 0) {
			return writes.Fail(httpapi.ErrInvalid, nil)
		}
	}
	if overflow {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"experience": "Enter years and months of experience."})
	}
	for i, link := range links {
		if link != "" && (!strings.HasPrefix(link, "https://") || strings.ContainsRune(link, 0)) {
			sp := socialProviders[i]
			return writes.Fail(httpapi.ErrInvalid, map[string]string{sp.key: "Enter a full " + sp.label + " link, like " + sp.example + "."})
		}
	}
	return nil
}

// writeProfile writes the details and the four links of one save, in the service's order.
func (s *server) writeProfile(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, cur sqlcgen.LockPlayerProfileRow, fullName, nickname, style string, experience *int32, links []string, now time.Time) error {
	var months *int32
	if cur.ExperienceMonths.Valid {
		months = &cur.ExperienceMonths.Int32
	}
	var recorded *time.Time
	if cur.ExperienceRecordedAt.Valid {
		t := cur.ExperienceRecordedAt.Time
		recorded = &t
	}
	change := profile.ExperienceChange(experience, profile.CurrentExperienceMonths(months, recorded, now), now)
	if change.Keep {
		change.Months, change.RecordedAt = months, recorded
	}
	details, err := json.Marshal(map[string]string{"playingStyle": style})
	if err != nil {
		return err
	}
	params := sqlcgen.UpdatePlayerDetailsParams{FullName: fullName, PersonalDetails: details, Now: pgtype.Timestamptz{Time: now, Valid: true}, ID: id}
	if nickname != "" {
		params.Nickname = pgtype.Text{String: nickname, Valid: true}
	}
	if change.Months != nil {
		params.ExperienceMonths = pgtype.Int4{Int32: *change.Months, Valid: true}
	}
	if change.RecordedAt != nil {
		params.ExperienceRecordedAt = pgtype.Timestamptz{Time: *change.RecordedAt, Valid: true}
	}
	if _, err := q.UpdatePlayerDetails(ctx, params); err != nil {
		return err
	}
	for i, sp := range socialProviders {
		provider := sqlcgen.SocialProvider(sp.key)
		if links[i] == "" {
			if err := q.DeletePlayerSocialLink(ctx, sqlcgen.DeletePlayerSocialLinkParams{PlayerID: id, Provider: provider}); err != nil {
				return err
			}
			continue
		}
		linkID, err := uuid.NewV7() // Prisma's uuid(7) default
		if err != nil {
			return err
		}
		if err := q.UpsertPlayerSocialLink(ctx, sqlcgen.UpsertPlayerSocialLinkParams{
			ID: pgtype.UUID{Bytes: linkID, Valid: true}, PlayerID: id, Provider: provider, Url: links[i], Now: pgtype.Timestamptz{Time: now, Valid: true},
		}); err != nil {
			return err
		}
	}
	return nil
}

// bannerID is BANNER_ID: a library word of 1 to 24 lower case letters, or a lower case UUID.
var bannerID = regexp.MustCompile(`^([a-z]{1,24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$`)

// bannerNotPickable is PROFILE_BANNER_NOT_PICKABLE.
const bannerNotPickable = "Choose a banner."

// setBanner is Edit profile › Name › Banner: `{ bannerId, expectedRevision }`, applied at once under the loaded revision. Only a
// shown, not deleted banner can be newly picked; keeping the current one is allowed even when it is hidden, whatever revision
// was sent.
func (s *server) setBanner(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	banner := body.Text("bannerId")
	if banner == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	id := self(p)
	var card any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		cur, err := q.LockPlayerBanner(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		if !cur.BannerID.Valid || cur.BannerID.String != banner {
			if err := writes.RequireRevision(cur.Revision, expected); err != nil {
				return err
			}
			pickable := false
			if bannerID.MatchString(banner) {
				if pickable, err = q.IsProfileBannerPickable(ctx, banner); err != nil {
					return err
				}
			}
			if !pickable {
				return writes.Fail(httpapi.ErrConflict, map[string]string{"banner": bannerNotPickable})
			}
			if err := q.SetPlayerBanner(ctx, sqlcgen.SetPlayerBannerParams{BannerID: pgtype.Text{String: banner, Valid: true}, Now: s.stamp(), ID: id}); err != nil {
				return err
			}
		}
		card, err = publicreads.ReadOwnProfileCard(ctx, q, id, s.at())
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return s.answerProfile(r.Context(), id, card)
}

// flag is the route's switch reader: a missing key is no value, anything but a boolean is `invalid`.
func flag(body writes.Body, key string) (pgtype.Bool, error) {
	if !body.Has(key) {
		return pgtype.Bool{}, nil
	}
	v, ok := body.Bool(key)
	if !ok {
		return pgtype.Bool{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	return pgtype.Bool{Bool: v, Valid: true}, nil
}

// setStatsVisibility is P-PROFILE-PRIVACY › Stats on your profile: `{ showProfileStats?, showWeeklyPerformance?, expectedRevision }`,
// at least one switch, under the loaded account revision. A switch left out keeps its value; nothing changed is not a write.
// Like the other switches it takes no row lock.
func (s *server) setStatsVisibility(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	stats, err := flag(body, "showProfileStats")
	if err != nil {
		return writes.Result{}, err
	}
	weekly, err := flag(body, "showWeeklyPerformance")
	if err != nil {
		return writes.Result{}, err
	}
	if !stats.Valid && !weekly.Valid {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	id := self(p)
	var card any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := q.GetPlayerPrivacy(ctx, id)
		if err != nil {
			return err
		}
		// Only what changes is written.
		if stats.Valid && stats.Bool == row.ShowProfileStats {
			stats = pgtype.Bool{}
		}
		if weekly.Valid && weekly.Bool == row.ShowWeeklyPerformance {
			weekly = pgtype.Bool{}
		}
		if stats.Valid || weekly.Valid {
			if err := writes.RequireRevision(row.Revision, expected); err != nil {
				return err
			}
			if err := q.SetPlayerStatsVisibility(ctx, sqlcgen.SetPlayerStatsVisibilityParams{ShowProfileStats: stats, ShowWeeklyPerformance: weekly, Now: s.stamp(), ID: id}); err != nil {
				return err
			}
		}
		card, err = publicreads.ReadOwnProfileCard(ctx, q, id, s.at())
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return s.answerProfile(r.Context(), id, card)
}

// setGender is P-EDIT-PROFILE › Name › Gender: `{ gender: 'male' | 'female' | null, expectedRevision }` under the account revision the
// screen loaded (D-2026-11-19-01). The player's own gender only. Setting the same value again is not a write. It takes no row lock.
func (s *server) setGender(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	gender := sqlcgen.NullPlayerGender{}
	switch v := body["gender"].(type) {
	case nil:
		if _, given := body["gender"]; !given {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"gender": "Choose Male or Female."})
		}
	case string:
		if v != "male" && v != "female" {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"gender": "Choose Male or Female."})
		}
		gender = sqlcgen.NullPlayerGender{PlayerGender: sqlcgen.PlayerGender(v), Valid: true}
	default:
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"gender": "Choose Male or Female."})
	}
	expected := body.Text("expectedRevision")
	id := self(p)
	var card any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := q.GetPlayerGenderState(ctx, id)
		if err != nil {
			return err
		}
		if gender != row.Gender {
			if err := writes.RequireRevision(row.Revision, expected); err != nil {
				return err
			}
			if err := q.SetPlayerGender(ctx, sqlcgen.SetPlayerGenderParams{Gender: gender, Now: s.stamp(), ID: id}); err != nil {
				return err
			}
		}
		card, err = publicreads.ReadOwnProfileCard(ctx, q, id, s.at())
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return s.answerProfile(r.Context(), id, card)
}

// answersOf is answersOf in the Route Handler: the body's `answers`, shaped only; the service checks the ids, lengths and repeats. A
// play style or favourite player must be null or text, the two shot lists lists of text; anything else is one message.
func answersOf(body writes.Body) (answers.Input, error) {
	bad := writes.Fail(httpapi.ErrInvalid, map[string]string{"answers": "Check your answers and try again."})
	input, _ := body["answers"].(map[string]any)
	nullable := func(key string) (*string, error) {
		switch v := input[key].(type) {
		case string:
			return &v, nil
		case nil:
			if _, given := input[key]; given {
				return nil, nil
			}
		}
		return nil, bad
	}
	list := func(key string) ([]string, error) {
		raw, ok := input[key].([]any)
		if !ok {
			return nil, bad
		}
		out := make([]string, 0, len(raw))
		for _, v := range raw {
			t, ok := v.(string)
			if !ok {
				return nil, bad
			}
			out = append(out, t)
		}
		return out, nil
	}
	var in answers.Input
	var err error
	if in.PlayStyle, err = nullable("playStyle"); err != nil {
		return in, err
	}
	if in.Shots, err = list("shots"); err != nil {
		return in, err
	}
	if in.ShotsOther, err = list("shotsOther"); err != nil {
		return in, err
	}
	if in.FavoritePlayer, err = nullable("favoritePlayer"); err != nil {
		return in, err
	}
	in.FavoritePlayerOther, _ = input["favoritePlayerOther"].(string)
	return in, nil
}

// saveAnswers is P-EDIT-PROFILE › Playing style and P-ONBOARD steps 2 to 4: `{ answers, expectedRevision }` under the account revision the
// screen loaded (D-2026-11-19-11). The player's own getting-to-know answers, checked and merged into personal_details (other keys such as
// playingStyle stay). Saved answers that are unchanged are not a write.
func (s *server) saveAnswers(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	input, err := answersOf(body)
	if err != nil {
		return writes.Result{}, err
	}
	next, problem := answers.Normalize(input)
	if problem != "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"answers": problem})
	}
	expected := body.Text("expectedRevision")
	id := self(p)
	var card any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := q.LockPlayerDetails(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		if !reflect.DeepEqual(answers.Of(row.PersonalDetails), next) {
			if err := writes.RequireRevision(row.Revision, expected); err != nil {
				return err
			}
			merged, err := answers.Merge(row.PersonalDetails, next)
			if err != nil {
				return err
			}
			if err := q.SetPlayerAnswers(ctx, sqlcgen.SetPlayerAnswersParams{Details: merged, Now: s.stamp(), ID: id}); err != nil {
				return err
			}
		}
		card, err = publicreads.ReadOwnProfileCard(ctx, q, id, s.at())
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return s.answerProfile(r.Context(), id, card)
}
