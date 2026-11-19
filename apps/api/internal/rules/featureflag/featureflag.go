// Package featureflag holds the Add flag rules of packages/data/src/feature-flag/featureFlag.rules.ts: pure
// functions with no database, HTTP, clock or randomness (Go-only, bucket 2).
package featureflag

import (
	"unicode/utf16"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Limits and copy of the rules. The words are the form's (AddFlagForm, rotra-admin.html flagErrors).
const (
	NameMax        = 50
	DescriptionMin = 10
	NameTaken      = "A flag with this name already exists."
	KeyTaken       = "That key is already used."
)

// Input is what the Add flag form sends.
type Input struct {
	Name, Key, Description string
	On                     bool
}

// Identity is a stored flag's name and key.
type Identity struct{ Name, Key string }

// Trim is trimFeatureFlagInput: the text fields without their surrounding white space, as they are stored.
func Trim(in Input) Input {
	return Input{Name: fields.JSTrim(in.Name), Key: fields.JSTrim(in.Key), Description: fields.JSTrim(in.Description), On: in.On}
}

// keyOK is /^[a-z][a-z0-9_]{2,39}$/: 3 to 40 lowercase letters, numbers and underscores, starting with a letter.
func keyOK(key string) bool {
	if len(key) < 3 || len(key) > 40 {
		return false
	}
	for i := 0; i < len(key); i++ {
		c := key[i]
		switch {
		case c >= 'a' && c <= 'z':
		case i > 0 && (c >= '0' && c <= '9' || c == '_'):
		default:
			return false
		}
	}
	return true
}

// utf16Len is String.length: UTF-16 code units, so a letter outside the basic plane counts twice.
func utf16Len(s string) int { return len(utf16.Encode([]rune(s))) }

// Errors is addFeatureFlagErrors: format first, then uniqueness against existing. Names match ignoring case and
// accents; keys match exactly. It expects trimmed input. The map is empty when the input is fine.
func Errors(in Input, existing []Identity) map[string]string {
	errs := map[string]string{}
	switch {
	case in.Name == "":
		errs["name"] = "Enter a name."
	case utf16Len(in.Name) > NameMax:
		errs["name"] = "Keep the name under 50 characters."
	case nameTaken(in.Name, existing):
		errs["name"] = NameTaken
	}
	switch {
	case in.Key == "":
		errs["key"] = "Enter a key."
	case !keyOK(in.Key):
		errs["key"] = "Use 3 to 40 lowercase letters, numbers and underscores, starting with a letter."
	case keyTaken(in.Key, existing):
		errs["key"] = KeyTaken
	}
	if utf16Len(in.Description) < DescriptionMin {
		errs["description"] = "Describe what the flag does, so it is clear when to use it."
	}
	return errs
}

func nameTaken(name string, existing []Identity) bool {
	want := club.PlainIdentity(name)
	for _, e := range existing {
		if club.PlainIdentity(e.Name) == want {
			return true
		}
	}
	return false
}

func keyTaken(key string, existing []Identity) bool {
	for _, e := range existing {
		if e.Key == key {
			return true
		}
	}
	return false
}
