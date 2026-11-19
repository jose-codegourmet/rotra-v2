package profile

import (
	"math"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Input is what the registration and Edit profile forms send, before any rule is applied.
type Input struct {
	FullName     string
	Nickname     string
	PlayingStyle string
	// ExperienceYears and ExperienceMonths are nil when the body had null or nothing. A value that was not a JSON
	// number is a pointer to NaN (intOrNull in service/request.ts), which is never a valid count.
	ExperienceYears  *float64
	ExperienceMonths *float64
	// Links is keyed by provider name. A provider that is absent is left alone by Save; an empty link removes it.
	Links map[string]string
}

// Details is Input after the rules: trimmed, bounded, and ready to save.
type Details struct {
	FullName string
	// Nickname is empty for none.
	Nickname     string
	PlayingStyle string
	// ExperienceMonths is the total, nil for none.
	ExperienceMonths *int32
	// Links holds only the providers the input named; an empty value removes the link.
	Links map[string]string
}

// FieldError is the first problem found: the field key the forms read and its message.
type FieldError struct {
	Field   string
	Message string
}

// Providers are the four supported profile links, with the prototype's hosts and example links
// (packages/schema/src/social-link.ts).
var providers = []struct {
	key, label, example string
	hosts               []string
}{
	{"facebook", "Facebook", "https://facebook.com/yourname", []string{"facebook.com", "fb.com"}},
	{"instagram", "Instagram", "https://instagram.com/yourname", []string{"instagram.com"}},
	{"youtube", "YouTube", "https://youtube.com/@yourchannel", []string{"youtube.com", "youtu.be"}},
	{"linkedin", "LinkedIn", "https://linkedin.com/in/yourname", []string{"linkedin.com"}},
}

const (
	maxFullName     = 60
	maxNickname     = 24
	maxPlayingStyle = 280
	maxYears        = 80

	msgFullNameEmpty   = "Enter your full name."                               // profile.ts
	msgFullNameLong    = "Keep your name to 60 characters or fewer."           // personal-details.ts
	msgNicknameLong    = "Keep your nickname to 24 characters or fewer."       // personal-details.ts
	msgPlayingStyle    = "Keep your playing style to 280 characters or fewer." // wording of the two above; the schema has no message
	msgExperience      = "Enter years and months of experience."               // profile.ts
	msgUnsupportedText = "Check the details and try again."                    // errors.ts `invalid`: a character Postgres cannot store
)

// Parse applies the profile rules and reports the first problem only, as the Route Handlers throw. The order is
// the form's: name, nickname, playing style, experience, then the links.
//
// The rules are updateMyProfile's (a name is required; years and months are whole, months 0-11) and the
// @rotra/schema field limits (60, 24 and 280 characters counted in code points as zod 4 counts them, years 0-80,
// links on the provider's host). Two TypeScript gaps that would be a database error (a 500) are closed here: a
// link must start with https:// (the table CHECK), and text may not hold a NUL character.
func Parse(in Input) (Details, *FieldError) {
	var d Details
	d.FullName = fields.JSTrim(in.FullName)
	switch {
	case d.FullName == "":
		return d, &FieldError{"fullName", msgFullNameEmpty}
	case CodePoints(d.FullName) > maxFullName:
		return d, &FieldError{"fullName", msgFullNameLong}
	case hasNUL(d.FullName):
		return d, &FieldError{"fullName", msgUnsupportedText}
	}
	d.Nickname = fields.JSTrim(in.Nickname)
	switch {
	case CodePoints(d.Nickname) > maxNickname:
		return d, &FieldError{"nickname", msgNicknameLong}
	case hasNUL(d.Nickname):
		return d, &FieldError{"nickname", msgUnsupportedText}
	}
	d.PlayingStyle = fields.JSTrim(in.PlayingStyle)
	switch {
	case CodePoints(d.PlayingStyle) > maxPlayingStyle:
		return d, &FieldError{"playingStyle", msgPlayingStyle}
	case hasNUL(d.PlayingStyle):
		return d, &FieldError{"playingStyle", msgUnsupportedText}
	}
	months, ok := experienceMonths(in.ExperienceYears, in.ExperienceMonths)
	if !ok {
		return d, &FieldError{"experience", msgExperience}
	}
	d.ExperienceMonths = months
	for _, p := range providers {
		raw, present := in.Links[p.key]
		if !present {
			continue
		}
		link := fields.JSTrim(raw)
		if link != "" && !matchesProvider(link, p.hosts) {
			return d, &FieldError{p.key, "Enter a full " + p.label + " link, like " + p.example + "."}
		}
		if d.Links == nil {
			d.Links = map[string]string{}
		}
		d.Links[p.key] = link
	}
	return d, nil
}

// CodePoints is a string's length the way zod 4 counts it for min and max: in code points, a surrogate pair once
// (zod 4.6.7, codePointLength in v4/core/util.js; zod 3 counted UTF-16 units).
func CodePoints(s string) int { return utf8.RuneCountInString(s) }

func hasNUL(s string) bool { return strings.ContainsRune(s, 0) }

func isInteger(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) && v == math.Trunc(v) }

// experienceMonths is updateMyProfile's experience check: missing counts as 0 when the other is given, both
// missing is no experience, and each must be a whole number (months 0-11; years 0-80 from the schema, which also
// keeps the total inside the column).
func experienceMonths(years, months *float64) (*int32, bool) {
	if years == nil && months == nil {
		return nil, true
	}
	y, m := 0.0, 0.0
	if years != nil {
		y = *years
	}
	if months != nil {
		m = *months
	}
	if !isInteger(y) || !isInteger(m) || y < 0 || m < 0 || m > 11 || y > maxYears {
		return nil, false
	}
	total := int32(y)*12 + int32(m)
	return &total, true
}

// matchesProvider is matchesProvider in social-link.ts, with the table's extra rule: an https:// link (lower
// case, as the CHECK is) whose host is the provider's or a subdomain of it. JavaScript's URL lowercases the host,
// url.Parse does not, so it is lowered here. A link with userinfo, a control character or a space is refused.
func matchesProvider(link string, hosts []string) bool { return matchesHost(link, hosts, false) }

// FormLinkOK is socialLinkField in social-link.ts as the registration form applies it: an http or https link whose host is
// the provider's or a subdomain of it (provider is facebook, instagram, youtube or linkedin). An empty link is the caller's to
// accept. Parse is stricter (https only, as the table's CHECK is): a link that passes here and not there is the form's 422
// where the TypeScript saved the account and then failed with a 500.
func FormLinkOK(provider, link string) bool {
	for _, p := range providers {
		if p.key == provider {
			return matchesHost(link, p.hosts, true)
		}
	}
	return false
}

func matchesHost(link string, hosts []string, allowHTTP bool) bool {
	scheme := "https"
	hasPrefix := func(p string) bool { return len(link) >= len(p) && link[:len(p)] == p }
	if allowHTTP { // new URL() lower-cases the scheme
		hasPrefix = func(p string) bool { return len(link) >= len(p) && strings.EqualFold(link[:len(p)], p) }
	}
	if !hasPrefix("https://") {
		if !allowHTTP || !hasPrefix("http://") {
			return false
		}
		scheme = "http"
	}
	if strings.ContainsFunc(link, func(r rune) bool {
		return r <= ' ' || r == 0x7f || fields.IsJSSpace(r) || r == utf8.RuneError
	}) {
		return false
	}
	u, err := url.Parse(link)
	if err != nil || u.User != nil || u.Scheme != scheme {
		return false
	}
	host := strings.ToLower(u.Hostname())
	for _, h := range hosts {
		if host == h || strings.HasSuffix(host, "."+h) {
			return true
		}
	}
	return false
}
