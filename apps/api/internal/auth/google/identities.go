package google

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// IdentityCard is one club's version of an unclaimed person (UnclaimedIdentities.records in unclaimed-identities.ts). Club
// pictures are not stored in real mode, so picture is null (initials).
type IdentityCard struct {
	ID           string   `json:"id"`
	ClubID       string   `json:"clubId"`
	ClubName     string   `json:"clubName"`
	ClubInitials string   `json:"clubInitials"`
	ClubLogoURL  *string  `json:"clubLogoUrl"`
	Name         string   `json:"name"`
	Nickname     *string  `json:"nickname"`
	Picture      *string  `json:"picture"`
	Level        *string  `json:"level"`
	LevelLabel   *string  `json:"levelLabel"`
	MaskedPhone  *string  `json:"maskedPhone"`
	PlayingSince *string  `json:"playingSince"`
	PlayingStyle *string  `json:"playingStyle"`
	Links        []string `json:"links"`
	Saved        string   `json:"saved"`
	Games        int64    `json:"games"`
	Sessions     int64    `json:"sessions"`
}

// Identities is the identity cards for a verified email.
type Identities struct {
	Email   string         `json:"email"`
	RTRID   string         `json:"rtrId"`
	Records []IdentityCard `json:"records"`
}

// manila is Asia/Manila, which has no daylight saving time.
var manila = time.FixedZone("PST", 8*3600)

// playingLevels is PLAYING_LEVELS: skill_levels is seeded so that the id is the index.
var playingLevels = [...]string{
	"beginner_low", "beginner_mid", "beginner_high",
	"intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

var linkNames = [...]struct{ key, name string }{{"facebook", "Facebook"}, {"instagram", "Instagram"}, {"youtube", "YouTube"}, {"linkedin", "LinkedIn"}}

// unclaimedFor is readUnclaimedIdentities (D-2026-11-16-04): the identity cards for an email Google verified, one per club whose
// current record points to the open shared entry with that email, the first club that saved them first. Nil when no club saved it.
// Call only with an email the person proved is theirs (the Google email the callback verified), never a typed one.
func (h *Handlers) unclaimedFor(ctx context.Context, typed string) (any, error) {
	cards, err := h.identityCards(ctx, typed, h.now())
	if err != nil || cards == nil {
		return nil, err // a typed nil *Identities must not become a non-nil any
	}
	return cards, nil
}

func (h *Handlers) identityCards(ctx context.Context, typed string, now time.Time) (*Identities, error) {
	email, ok := identity.NormalizeEmail(typed)
	if !ok {
		return nil, nil
	}
	q := sqlcgen.New(h.pool)
	entry, err := q.GetOpenSharedEntryByEmail(ctx, pgText(email))
	if errNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	rows, err := q.ListUnclaimedIdentityRecords(ctx, entry.ID)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	out := &Identities{Email: email, RTRID: entry.RtrID, Records: make([]IdentityCard, 0, len(rows))}
	for _, r := range rows {
		own := readOwnDetails(r.PresetFields)
		card := IdentityCard{
			ID: uuidOf(r.ID).String(), ClubID: uuidOf(r.ClubID).String(), ClubName: r.ClubName, ClubInitials: initials(r.ClubName),
			ClubLogoURL: textPtr(r.LogoRef), Name: r.DisplayName, Nickname: textPtr(r.Nickname), Links: []string{},
			Saved: r.AddedAt.Time.In(manila).Format("Jan 2, 2006"), Games: r.Games, Sessions: r.Sessions,
		}
		if r.SkillLevelID >= 0 && int(r.SkillLevelID) < len(playingLevels) {
			level := playingLevels[r.SkillLevelID]
			card.Level, card.LevelLabel = &level, ptr(levelLabel(level))
		}
		if r.PhoneE164.Valid {
			card.MaskedPhone = ptr(fields.MaskPhone(r.PhoneE164.String))
		}
		if months := profile.CurrentExperienceMonths(own.months, own.recordedAt, now); months != nil {
			card.PlayingSince = ptr(now.UTC().AddDate(0, -int(*months), 0).In(manila).Format("January 2006"))
		}
		if own.style != "" {
			card.PlayingStyle = ptr(own.style)
		}
		for _, l := range linkNames {
			if own.links[l.key] != "" {
				card.Links = append(card.Links, l.name)
			}
		}
		out.Records = append(out.Records, card)
	}
	return out, nil
}

// ownDetails is readOwnDetails: the club's own details of a person, as stored; anything missing or malformed reads as not entered.
type ownDetails struct {
	style      string
	months     *int32
	recordedAt *time.Time
	links      map[string]string
}

func readOwnDetails(stored []byte) ownDetails {
	d := ownDetails{links: map[string]string{}}
	var raw map[string]json.RawMessage
	if json.Unmarshal(stored, &raw) != nil {
		return d
	}
	_ = json.Unmarshal(raw["playingStyle"], &d.style)
	var m json.Number
	if json.Unmarshal(raw["experienceMonths"], &m) == nil {
		if n, err := m.Int64(); err == nil {
			v := int32(n)
			d.months = &v
		}
	}
	var at string
	if json.Unmarshal(raw["experienceRecordedAt"], &at) == nil && at != "" {
		if t, err := time.Parse(time.RFC3339Nano, at); err == nil {
			d.recordedAt = &t
		}
	}
	var links map[string]json.RawMessage
	if json.Unmarshal(raw["socialLinks"], &links) == nil {
		for _, l := range linkNames {
			var s string
			_ = json.Unmarshal(links[l.key], &s)
			d.links[l.key] = s
		}
	}
	return d
}

func initials(name string) string {
	var b strings.Builder
	for i, w := range strings.Fields(name) {
		if i == 2 {
			break
		}
		b.WriteString(strings.ToUpper(string([]rune(w)[:1])))
	}
	return b.String()
}

// levelLabel is levelLabel in sessionRoster.rules.ts: each word of the code, capitalised.
func levelLabel(level string) string {
	words := strings.Split(level, "_")
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}
