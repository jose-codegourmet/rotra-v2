// Package answers is the getting-to-know answers kept in players.personal_details (D-2026-11-19-11) and the derived account
// verification result (D-2026-11-23-07): the two things a profile card shows beside the name.
package answers

import (
	"encoding/json"
	"slices"
	"strings"
)

var (
	courtPositions  = []string{"front", "back", "all"}
	shotIDs         = []string{"netting", "smash", "jump", "drop", "slice", "clear", "drive", "lift", "netkill", "push", "block", "backhand"}
	favoritePlayers = []string{"lindan", "lcw", "axelsen", "momota", "taufik", "chenlong", "marin", "tty", "anseyoung", "other"}
)

// Answers is OnboardingAnswers on the wire: the court position, the listed shots, the free-text shots, the favourite player and
// the name typed with "other".
type Answers struct {
	PlayStyle           *string  `json:"playStyle"`
	Shots               []string `json:"shots"`
	ShotsOther          []string `json:"shotsOther"`
	FavoritePlayer      *string  `json:"favoritePlayer"`
	FavoritePlayerOther string   `json:"favoritePlayerOther"`
}

// Empty is EMPTY_ANSWERS: what a masked profile shows.
func Empty() Answers {
	return Answers{Shots: []string{}, ShotsOther: []string{}}
}

// stringsOf is strings(value): the text entries of a JSON array; anything else is none.
func stringsOf(raw json.RawMessage) []string {
	var list []any
	if json.Unmarshal(raw, &list) != nil {
		return nil
	}
	var out []string
	for _, v := range list {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func textOf(raw json.RawMessage) (string, bool) {
	var s string
	if json.Unmarshal(raw, &s) != nil {
		return "", false
	}
	return s, true
}

// Of is gettingToKnowAnswers: `court_position`, `skills`, `skills_other`, `favorite_player` and `favorite_player_other` of the
// stored details, using the app's ids. Unknown ids read as not answered.
func Of(details []byte) Answers {
	out := Empty()
	var stored map[string]json.RawMessage
	if json.Unmarshal(details, &stored) != nil {
		return out
	}
	if position, ok := textOf(stored["court_position"]); ok && slices.Contains(courtPositions, position) {
		out.PlayStyle = &position
	}
	skills := stringsOf(stored["skills"])
	for _, id := range shotIDs {
		if slices.Contains(skills, id) {
			out.Shots = append(out.Shots, id)
		}
	}
	if other := stringsOf(stored["skills_other"]); other != nil {
		out.ShotsOther = other
	}
	if favorite, ok := textOf(stored["favorite_player"]); ok && slices.Contains(favoritePlayers, favorite) {
		out.FavoritePlayer = &favorite
		if favorite == "other" {
			if name, ok := textOf(stored["favorite_player_other"]); ok {
				out.FavoritePlayerOther = name
			}
		}
	}
	return out
}

// normalizeEmail is normalizeGoogleEmail: trimmed and lower case.
func normalizeEmail(s string) string { return strings.ToLower(strings.TrimFunc(s, isSpace)) }

func isSpace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', 0x00a0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff:
		return true
	}
	return r >= 0x2000 && r <= 0x200a
}

// Verification is deriveAccountVerification(...) without the display fields: whether the account is verified, whether Admin did it,
// and how many of the three checks (a connected Google email, a phone on file, a ROTRA email that is the Google one) pass.
func Verification(googleEmail, email, phone string, override bool) (verified, byAdmin bool, steps int) {
	google := normalizeEmail(googleEmail)
	for _, ok := range []bool{google != "", strings.TrimFunc(phone, isSpace) != "", google != "" && normalizeEmail(email) == google} {
		if ok {
			steps++
		}
	}
	return override || steps == 3, override, steps
}

// Verified is deriveAccountVerification(...).verified: the Admin override, or all three checks: a connected Google email, a phone on
// file, and a ROTRA email that is the Google one.
func Verified(googleEmail, email, phone string, override bool) bool {
	google := normalizeEmail(googleEmail)
	return override || (google != "" && strings.TrimFunc(phone, isSpace) != "" && normalizeEmail(email) == google)
}
