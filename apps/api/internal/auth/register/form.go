package register

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The registration form as registrationRequestSchema validates it (packages/schema/src/registration.ts and the schemas it
// builds on). Zod reports every problem, keyed by the last segment of the path, and the TypeScript route keeps the last
// message per key: this is the same, with zod 4's own wording for the problems no schema of ours words.

const (
	msgFullNameEmpty = "Enter your full name."
	msgFullNameLong  = "Keep your name to 60 characters or fewer."
	msgNicknameLong  = "Keep your nickname to 24 characters or fewer."
	msgStyleLong     = "Too big: expected string to have <=280 characters" // zod's own: playingStyleField has no message
	msgYears         = "Enter whole years from 0 to 80."
	msgMonths        = "Enter months from 0 to 11."
	msgEmail         = "Invalid email address" // zod's own
	msgPhone         = "Enter a Philippine mobile number."
	msgPassword      = "Enter your password."
	msgAttempt       = "Invalid string: must match pattern /^[a-f0-9]{64}$/" // zod's own
)

var (
	attemptRE = regexp.MustCompile(`^[a-f0-9]{64}$`)
	// emailRE is the pattern z.email() uses by default (zod 4.6.7, regexes.email).
	emailRE  = regexp.MustCompile(`^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`)
	digitsRE = regexp.MustCompile(`^\d+$`)
)

// form is what a valid body holds: the staging attempt and what registerGuest is called with.
type form struct {
	attempt  string
	email    string // trimmed and lower case
	phone    string // E.164
	password string
	details  profile.Input
}

// providers are the links the form carries, in the schema's order, with the text of their refusal.
var linkProviders = []struct{ key, label, example string }{
	{"facebook", "Facebook", "https://facebook.com/yourname"},
	{"instagram", "Instagram", "https://instagram.com/yourname"},
	{"youtube", "YouTube", "https://youtube.com/@yourchannel"},
	{"linkedin", "LinkedIn", "https://linkedin.com/in/yourname"},
}

// parseForm validates the body. fields is nil when it is valid.
func parseForm(b writes.Body) (form, map[string]string) {
	issues := map[string]string{}
	var f form

	if s, ok := stringField(b, "attempt", issues, "attempt"); ok {
		if !attemptRE.MatchString(s) {
			issues["attempt"] = msgAttempt
		}
		f.attempt = s
	}

	raw, present := b["values"]
	v, isObject := raw.(map[string]any)
	if !isObject {
		issues["values"] = notA("object", raw, present)
		return f, issues
	}
	vals := writes.Body(v)

	if s, ok := stringField(vals, "fullName", issues, "fullName"); ok {
		s = fields.JSTrim(s)
		switch {
		case s == "":
			issues["fullName"] = msgFullNameEmpty
		case profile.CodePoints(s) > 60:
			issues["fullName"] = msgFullNameLong
		}
		f.details.FullName = s
	}
	if s, ok := stringField(vals, "nickname", issues, "nickname"); ok {
		s = fields.JSTrim(s)
		if profile.CodePoints(s) > 24 {
			issues["nickname"] = msgNicknameLong
		}
		f.details.Nickname = s
	}
	if s, ok := stringField(vals, "playingStyle", issues, "playingStyle"); ok {
		s = fields.JSTrim(s)
		if profile.CodePoints(s) > 280 {
			issues["playingStyle"] = msgStyleLong
		}
		f.details.PlayingStyle = s
	}
	f.details.ExperienceYears = wholeNumber(vals, "experienceYears", 80, msgYears, issues)
	f.details.ExperienceMonths = wholeNumber(vals, "experienceMonths", 11, msgMonths, issues)

	f.details.Links = map[string]string{}
	for _, p := range linkProviders {
		s, ok := stringField(vals, p.key, issues, p.key)
		if !ok {
			continue
		}
		s = fields.JSTrim(s)
		if s != "" && !profile.FormLinkOK(p.key, s) {
			issues[p.key] = "Enter a full " + p.label + " link, like " + p.example + "."
		}
		f.details.Links[p.key] = s
	}

	if s, ok := stringField(vals, "email", issues, "email"); ok {
		s = fields.JSTrim(s)
		if !emailRE.MatchString(s) {
			issues["email"] = msgEmail
		}
		f.email = publicreads.JSToLower(s)
	}
	if s, ok := stringField(vals, "phone", issues, "phone"); ok {
		e164, valid := fields.ParsePHMobile(s)
		if !valid {
			issues["phone"] = msgPhone
		}
		f.phone = e164
	}
	if s, ok := stringField(vals, "password", issues, "password"); ok {
		if s == "" {
			issues["password"] = msgPassword
		}
		f.password = s
	}
	// cityCode is optional text the route ignores; only its type is checked.
	if raw, has := vals["cityCode"]; has {
		if _, isString := raw.(string); !isString {
			issues["cityCode"] = notA("string", raw, true)
		}
	}
	if len(issues) > 0 {
		return f, issues
	}
	return f, nil
}

// stringField reads a field that must be text. A field that is not records zod's invalid_type message under key.
func stringField(b writes.Body, name string, issues map[string]string, key string) (string, bool) {
	raw, present := b[name]
	s, ok := raw.(string)
	if !ok {
		issues[key] = notA("string", raw, present)
		return "", false
	}
	return s, true
}

// wholeNumber is wholeNumberText plus the route's conversion: blank is no value, otherwise the digits as a number. The text
// is trimmed; it must be digits only and at most max (a refusal reads message).
func wholeNumber(b writes.Body, name string, max int, message string, issues map[string]string) *float64 {
	s, ok := stringField(b, name, issues, name)
	if !ok {
		return nil
	}
	s = fields.JSTrim(s)
	if s == "" {
		return nil
	}
	n, err := strconv.ParseFloat(s, 64)
	if !digitsRE.MatchString(s) || err != nil || n > float64(max) {
		issues[name] = message
		return nil
	}
	return &n
}

// notA is zod 4's invalid_type message: what was expected and what JSON type arrived.
func notA(expected string, v any, present bool) string {
	return fmt.Sprintf("Invalid input: expected %s, received %s", expected, jsType(v, present))
}

func jsType(v any, present bool) string {
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
	case json.Number:
		return "number"
	case []any:
		return "array"
	default:
		return "object"
	}
}
