// Package sociallink is normalizeSocialLink (packages/schema/src/social-link.ts, #1019): a social link is an entry key for an unclaimed
// player, like an email. Two links that normalize to the same key are one person while unclaimed. Registered players are never matched
// by a link.
package sociallink

import (
	"net/url"
	"regexp"
	"strings"
)

// Providers are the four profile link providers, in the order the service writes them.
var Providers = []string{"facebook", "instagram", "youtube", "linkedin"}

// hosts is SOCIAL_PROVIDERS: per provider, the hosts of its site; the first is the key's host.
var hosts = map[string][]string{
	"facebook":  {"facebook.com", "fb.com"},
	"instagram": {"instagram.com"},
	"youtube":   {"youtube.com", "youtu.be"},
	"linkedin":  {"linkedin.com"},
}

var (
	hasScheme   = regexp.MustCompile(`(?i)^https?://`)
	wwwPrefix   = regexp.MustCompile(`^(www\.|m\.|mobile\.)`)
	trailingBar = regexp.MustCompile(`/+$`)
)

// Link is NormalizedSocialLink: the provider, the entry key (e.g. facebook.com/jun.bautista) and the link as typed (trimmed, with https://
// added when the scheme was left out).
type Link struct{ Provider, Key, URL string }

// Normalize is normalizeSocialLink: the scheme may be left out; www., m. and mobile. and the provider's other hosts become its site; the
// query, hash and trailing slash are dropped; lower case. A bare site with no profile path is not a link (false).
func Normalize(typed string) (Link, bool) {
	value := strings.TrimSpace(typed)
	if value == "" {
		return Link{}, false
	}
	if !hasScheme.MatchString(value) {
		value = "https://" + value
	}
	u, err := url.Parse(value)
	if err != nil || u.Hostname() == "" {
		return Link{}, false
	}
	host := wwwPrefix.ReplaceAllString(strings.ToLower(u.Hostname()), "")
	path := strings.ToLower(trailingBar.ReplaceAllString(u.EscapedPath(), ""))
	if path == "" {
		return Link{}, false
	}
	for _, provider := range Providers {
		for _, h := range hosts[provider] {
			if h == host {
				return Link{Provider: provider, Key: hosts[provider][0] + path, URL: value}, true
			}
		}
	}
	return Link{}, false
}
