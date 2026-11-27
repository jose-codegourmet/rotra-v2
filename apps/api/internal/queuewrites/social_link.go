package queuewrites

import (
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/sociallink"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

// socialLink is NormalizedSocialLink: the provider, the entry key (e.g. facebook.com/jun.bautista) and the link as typed.
type socialLink = sociallink.Link

// normalizeSocialLink is normalizeSocialLink (#1019); see package sociallink.
func normalizeSocialLink(typed string) (socialLink, bool) { return sociallink.Normalize(typed) }

// socialLinkKey is normalizeSocialLink(...).key, "" when it is no link.
func socialLinkKey(typed string) string {
	link, _ := normalizeSocialLink(typed)
	return link.Key
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

const (
	socialLinkError = "Enter a Facebook, Instagram, YouTube or LinkedIn profile link, or leave it empty."
)

// resolveSocialKey is resolveSocialKey (#1019): the open shared entry whose key the link is, else (create) a new entry with a new RTR ID.
// Never a registered player. The email typed with it joins a new entry only when nobody on ROTRA has that email yet. It takes the link
// lock first.
func (t *txn) resolveSocialKey(key string, at pgtype.Timestamptz, create bool, email string) (*emailResolution, error) {
	if err := t.q.LockSocialKey(t.ctx, key); err != nil {
		return nil, err
	}
	open, err := t.q.GetOpenSharedEntryBySocialKey(t.ctx, pgtype.Text{String: key, Valid: true})
	if err == nil {
		return &emailResolution{email: open.Email.String, entryID: open.ID, rtrID: open.RtrID}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if !create {
		return nil, nil
	}
	free := ""
	if email != "" {
		if err := t.q.LockEmailAddress(t.ctx, email); err != nil {
			return nil, err
		}
		registered, err := t.registeredPlayerByEmail(email)
		if err != nil {
			return nil, err
		}
		taken := registered.Valid
		if !taken {
			if _, err := t.q.GetOpenSharedEntryByEmail(t.ctx, pgtype.Text{String: email, Valid: true}); err == nil {
				taken = true
			} else if !errors.Is(err, pgx.ErrNoRows) {
				return nil, err
			}
		}
		if !taken {
			free = email
		}
	}
	id, rtr, err := t.createSharedEntryWith(free, key, at)
	if err != nil {
		return nil, err
	}
	return &emailResolution{email: free, entryID: id, rtrID: rtr, created: true}, nil
}

// keepClubLink writes the link into this club's own details for the record (its preset fields).
func (t *txn) keepClubLink(clubPlayer pgtype.UUID, link socialLink, now pgtype.Timestamptz) error {
	stored, err := t.q.GetClubPlayerPresetFields(t.ctx, clubPlayer)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	own := signedin.OwnDetailsOf(stored)
	links := map[string]string{}
	for _, p := range socialProviders {
		links[p] = own.Links[p]
	}
	links[link.Provider] = link.URL
	var recorded any
	if own.RecordedAt != "" {
		recorded = own.RecordedAt
	}
	raw, err := json.Marshal(map[string]any{
		"version": ownDetailsVersion, "playingStyle": own.PlayingStyle, "experienceMonths": own.Months,
		"experienceRecordedAt": recorded, "socialLinks": links,
	})
	if err != nil {
		return err
	}
	return t.q.UpsertClubPlayerOwnDetails(t.ctx, sqlcgen.UpsertClubPlayerOwnDetailsParams{ClubPlayerID: clubPlayer, ClubID: t.club, PresetFields: raw, Now: now})
}
