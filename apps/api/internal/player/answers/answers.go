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

// shotLabels is SHOT_LABELS, in the order of the listed shots: the names the no-repeat check compares against.
var shotLabels = []string{"Netting", "Smash", "Jump smash", "Drop", "Slice", "Clear", "Drive", "Lift", "Net kill", "Push", "Block", "Backhand clear"}

const (
	maxOwnShots      = 6
	maxOwnShotLength = 24
)

// Input is what the Route Handler shapes from the body before the service checks it: the ids and texts as sent.
type Input struct {
	PlayStyle           *string
	Shots               []string
	ShotsOther          []string
	FavoritePlayer      *string
	FavoritePlayerOther string
}

// clean is clean(): trimmed, runs of whitespace one space.
func clean(text string) string {
	var b strings.Builder
	space := false
	for _, r := range text {
		if isSpace(r) {
			space = true
			continue
		}
		if space && b.Len() > 0 {
			b.WriteByte(' ')
		}
		space = false
		b.WriteRune(r)
	}
	return b.String()
}

func utf16Len(s string) int {
	n := 0
	for _, r := range s {
		n++
		if r > 0xffff {
			n++
		}
	}
	return n
}

// Normalize is normalizeOnboardingAnswers: the first problem as a message, or the cleaned answers: unknown ids rejected, listed shots
// deduplicated and put in list order, own shots trimmed (at most 6, 24 characters each, no repeat of the list or of each other in any
// case), and the favourite's typed name kept only for Others.
func Normalize(in Input) (Answers, string) {
	if in.PlayStyle != nil && !slices.Contains(courtPositions, *in.PlayStyle) {
		return Answers{}, "Choose where you play from the list."
	}
	for _, shot := range in.Shots {
		if !slices.Contains(shotIDs, shot) {
			return Answers{}, "Choose shots from the list."
		}
	}
	if in.FavoritePlayer != nil && !slices.Contains(favoritePlayers, *in.FavoritePlayer) {
		return Answers{}, "Choose a favorite player from the list."
	}
	if len(in.ShotsOther) > maxOwnShots {
		return Answers{}, "You can add up to 6 of your own."
	}
	taken := map[string]bool{}
	for _, label := range shotLabels {
		taken[strings.ToLower(label)] = true
	}
	own := []string{}
	for _, raw := range in.ShotsOther {
		shot := clean(raw)
		switch {
		case shot == "":
			return Answers{}, "Type a shot first."
		case utf16Len(shot) > maxOwnShotLength:
			return Answers{}, "Keep it to 24 characters or fewer."
		case taken[strings.ToLower(shot)]:
			return Answers{}, "That shot is already on the list."
		}
		taken[strings.ToLower(shot)] = true
		own = append(own, shot)
	}
	out := Answers{PlayStyle: in.PlayStyle, Shots: []string{}, ShotsOther: own, FavoritePlayer: in.FavoritePlayer}
	for _, id := range shotIDs {
		if slices.Contains(in.Shots, id) {
			out.Shots = append(out.Shots, id)
		}
	}
	if in.FavoritePlayer != nil && *in.FavoritePlayer == "other" {
		out.FavoritePlayerOther = clean(in.FavoritePlayerOther)
	}
	return out, ""
}

// Merge is mergeDetails with the five getting-to-know keys: the stored details (an object; anything else reads as empty) with the answers
// laid over them, so keys saved by other screens (playingStyle) survive.
func Merge(details []byte, a Answers) ([]byte, error) {
	stored := map[string]json.RawMessage{}
	if json.Unmarshal(details, &stored) != nil || stored == nil {
		stored = map[string]json.RawMessage{}
	}
	set := func(key string, v any) error {
		b, err := json.Marshal(v)
		if err != nil {
			return err
		}
		stored[key] = b
		return nil
	}
	for key, v := range map[string]any{
		"court_position": a.PlayStyle, "skills": a.Shots, "skills_other": a.ShotsOther,
		"favorite_player": a.FavoritePlayer, "favorite_player_other": a.FavoritePlayerOther,
	} {
		if err := set(key, v); err != nil {
			return nil, err
		}
	}
	return json.Marshal(stored)
}
