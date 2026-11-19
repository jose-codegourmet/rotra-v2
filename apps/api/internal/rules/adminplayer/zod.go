package adminplayer

import (
	"encoding/json"
	"regexp"
	"unicode/utf8"
)

// What Zod 4.6.7 says when a value is not what the schema wants (its English locale). The Route Handlers answer with
// these messages as they are, so they are kept word for word.
const (
	msgInvalidInput = "Invalid input"
	msgEmailFormat  = "Invalid email address"
)

// receivedType is how Zod names what it was given: JSON has no NaN or bigint, so these are the names of its JSON types.
func receivedType(v any, present bool) string {
	if !present {
		return "undefined"
	}
	switch v.(type) {
	case nil:
		return "null"
	case string:
		return "string"
	case bool:
		return "boolean"
	case json.Number, float64:
		return "number"
	case []any:
		return "array"
	}
	return "object"
}

// typeMessage is the message of a value of the wrong type.
func typeMessage(expected string, v any, present bool) string {
	return "Invalid input: expected " + expected + ", received " + receivedType(v, present)
}

// tooBig is the message of a string over its maximum. Zod counts code points, not UTF-16 units.
func tooBig(max int) string {
	return "Too big: expected string to have <=" + itoa(max) + " characters"
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

// codePoints is how long Zod thinks a string is.
func codePoints(s string) int { return utf8.RuneCountInString(s) }

// emailRE is z.email() in Zod 4.6.7 (the default pattern): the local part is dot-separated runs of letters, digits and
// _'+-, the domain has at least one dot, and the last label is two or more letters.
var emailRE = regexp.MustCompile(`^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`)

// IsEmail is z.email() on an already trimmed value.
func IsEmail(s string) bool { return emailRE.MatchString(s) }

// field reads a key of a decoded JSON object.
func field(obj map[string]any, key string) (v any, present bool) {
	v, present = obj[key]
	return v, present
}
