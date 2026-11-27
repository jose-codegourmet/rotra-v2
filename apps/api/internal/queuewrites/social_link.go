package queuewrites

import (
	"errors"
	"net/url"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// socialHosts is SOCIAL_PROVIDERS (packages/schema/src/social-link.ts): per provider, the hosts of its site; the first is the key's host.
var socialHosts = map[string][]string{
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

// socialLinkKey is normalizeSocialLink(...).key (#1019): the scheme may be left out; www., m. and mobile. and the provider's other hosts become
// its site; the query, hash and trailing slash are dropped; lower case. A bare site with no profile path is not a link ("" here).
func socialLinkKey(typed string) string {
	value := strings.TrimSpace(typed)
	if value == "" {
		return ""
	}
	if !hasScheme.MatchString(value) {
		value = "https://" + value
	}
	u, err := url.Parse(value)
	if err != nil || u.Hostname() == "" {
		return ""
	}
	host := wwwPrefix.ReplaceAllString(strings.ToLower(u.Hostname()), "")
	path := strings.ToLower(trailingBar.ReplaceAllString(u.EscapedPath(), ""))
	if path == "" {
		return ""
	}
	for _, provider := range socialProviders {
		for _, h := range socialHosts[provider] {
			if h == host {
				return socialHosts[provider][0] + path
			}
		}
	}
	return ""
}

// socialLinkKeys is socialLinkKeys: the entry keys of the profile links, in provider order (empty and malformed links are skipped).
func socialLinkKeys(links map[string]string) []string {
	var keys []string
	for _, provider := range socialProviders {
		if key := socialLinkKey(links[provider]); key != "" {
			keys = append(keys, key)
		}
	}
	return keys
}

// followClubLinks is followClubLinks (#1019, decisions 6 and 8): Edit details saved this club's profile links for its unclaimed record and the
// entry's key follows them. A key no longer among the links is dropped, and the first link no other open entry holds becomes the key when the
// entry has none. With no email and no key left, this club's record goes back to being a guest (true): it stops pointing at the entry, which
// is retired when no other club has the person.
func (t *txn) followClubLinks(clubPlayer, entryID pgtype.UUID, links map[string]string) (bool, error) {
	entry, err := t.q.GetSharedEntryForLinks(t.ctx, entryID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if entry.ClaimedPlayerID.Valid || entry.RetiredAt.Valid {
		return false, nil
	}
	keys := socialLinkKeys(links)
	key := ""
	for _, k := range keys {
		if entry.SocialKey.Valid && entry.SocialKey.String == k {
			key = k
			break
		}
	}
	if key == "" {
		for _, candidate := range keys {
			if err := t.q.LockSocialKey(t.ctx, candidate); err != nil {
				return false, err
			}
			holder, err := t.q.FindOpenEntryBySocialKey(t.ctx, pgtype.Text{String: candidate, Valid: true})
			if errors.Is(err, pgx.ErrNoRows) || (err == nil && holder == entry.ID) {
				key = candidate
				break
			}
			if err != nil {
				return false, err
			}
		}
	}
	if key != "" || entry.Email.Valid {
		if (key != "") != entry.SocialKey.Valid || (key != "" && key != entry.SocialKey.String) {
			next := pgtype.Text{String: key, Valid: key != ""}
			if err := t.q.SetSharedEntrySocialKey(t.ctx, sqlcgen.SetSharedEntrySocialKeyParams{Key: next, Now: t.stamp(), ID: entry.ID}); err != nil {
				return false, err
			}
		}
		return false, nil
	}
	others, err := t.q.CountOtherLiveRecordsOfEntry(t.ctx, sqlcgen.CountOtherLiveRecordsOfEntryParams{EntryID: entry.ID, ExceptID: clubPlayer})
	if err != nil {
		return false, err
	}
	if err := t.q.DetachClubPlayerFromEntry(t.ctx, sqlcgen.DetachClubPlayerFromEntryParams{Now: t.stamp(), ClubID: t.club, ID: clubPlayer}); err != nil {
		return false, err
	}
	if others == 0 {
		if err := t.retireEntryIfOrphan(entry.ID); err != nil {
			return false, err
		}
	}
	return true, nil
}
