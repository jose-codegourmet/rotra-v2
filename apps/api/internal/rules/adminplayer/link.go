package adminplayer

import (
	"strconv"
	"strings"

	"golang.org/x/text/unicode/norm"
)

// Provider is one of the four profile link providers (packages/schema/src/social-link.ts).
type Provider struct {
	Key, Label, Example, FieldLabel string
	Hosts                           []string
}

// Providers are the four providers in the order the form saves them, with the Admin form's own example links
// (admin-player.ts ADMIN_LINK_EXAMPLE) and the hosts of the shared rule.
var Providers = []Provider{
	{"facebook", "Facebook", "https://facebook.com/name", "Facebook link", []string{"facebook.com", "fb.com"}},
	{"instagram", "Instagram", "https://instagram.com/name", "Instagram link", []string{"instagram.com"}},
	{"youtube", "YouTube", "https://youtube.com/@channel", "YouTube link", []string{"youtube.com", "youtu.be"}},
	{"linkedin", "LinkedIn", "https://linkedin.com/in/name", "LinkedIn link", []string{"linkedin.com"}},
}

// LinkMessage is the Admin form's message for a link that is not the provider's.
func (p Provider) LinkMessage() string {
	return "Use a " + p.Label + " link, like " + p.Example + "."
}

// MatchesProvider is matchesProvider in social-link.ts: `new URL(value)` must parse, the protocol must be http or
// https, and the host must be one of the provider's or a subdomain of it. JavaScript's URL parser (WHATWG) is read here
// as far as a host is concerned: tabs and line breaks are dropped, the scheme is http or https, any number of slashes
// or backslashes may follow it (so "https:facebook.com" is a link), the authority runs to the first / \ ? or #, what
// precedes the last @ is credentials, a port is up to five digits within 65535, and the host is percent-decoded, mapped
// to its compatibility form and lower cased. A host that is still not ASCII is not matched (the standard turns it into
// punycode, which is never a provider's host).
func MatchesProvider(value string, hosts []string) bool {
	host, ok := urlHost(value)
	if !ok {
		return false
	}
	for _, h := range hosts {
		if host == h || strings.HasSuffix(host, "."+h) {
			return true
		}
	}
	return false
}

func urlHost(input string) (string, bool) {
	s := strings.Map(func(r rune) rune {
		if r == '\t' || r == '\n' || r == '\r' {
			return -1
		}
		return r
	}, input)
	s = strings.TrimFunc(s, func(r rune) bool { return r <= 0x20 })
	colon := strings.IndexByte(s, ':')
	if colon < 1 {
		return "", false
	}
	scheme := strings.ToLower(s[:colon])
	if scheme != "http" && scheme != "https" {
		return "", false
	}
	rest := strings.TrimLeft(s[colon+1:], `/\`)
	end := strings.IndexAny(rest, `/\?#`)
	authority := rest
	if end >= 0 {
		authority = rest[:end]
	}
	if at := strings.LastIndexByte(authority, '@'); at >= 0 {
		authority = authority[at+1:]
	}
	hostPart := authority
	if strings.HasPrefix(authority, "[") { // an IPv6 address is never a provider host
		return "", false
	}
	if c := strings.LastIndexByte(authority, ':'); c >= 0 {
		hostPart = authority[:c]
		port := authority[c+1:]
		if port != "" {
			if n, err := strconv.ParseUint(port, 10, 32); err != nil || n > 65535 || strings.TrimLeft(port, "0123456789") != "" {
				return "", false
			}
		}
	}
	decoded, ok := percentDecode(hostPart)
	if !ok {
		return "", false
	}
	// The standard maps the host with UTS 46 before it checks it; the compatibility form of Unicode (fullwidth letters,
	// circled letters, and so on) and the ideographic full stops cover what a person can type that lands on ASCII.
	decoded = norm.NFKC.String(strings.NewReplacer("。", ".", "｡", ".").Replace(strings.ToValidUTF8(decoded, "\uFFFD")))
	if decoded == "" {
		return "", false
	}
	for _, r := range decoded {
		if r > 0x7e || r <= 0x20 || strings.ContainsRune(`#%/:<>?@[\]^|`, r) {
			return "", false
		}
	}
	return strings.ToLower(decoded), true
}

func percentDecode(s string) (string, bool) {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] != '%' {
			b.WriteByte(s[i])
			continue
		}
		if i+2 >= len(s) {
			// a % that is not followed by two hex digits stays a % (and is then a forbidden host character)
			b.WriteByte('%')
			continue
		}
		n, err := strconv.ParseUint(s[i+1:i+3], 16, 8)
		if err != nil {
			b.WriteByte('%')
			continue
		}
		b.WriteByte(byte(n))
		i += 2
	}
	return b.String(), true
}
