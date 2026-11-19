package adminwrites

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The profile and phone part of an Admin edit (saveAdminPlayerCore in packages/db/src/admin/player-edit-core.ts): the
// fields the player's own row and contact hold, saved in one transaction under the player's loaded revision.

const (
	msgCharacter     = "Choose a character."
	msgPictureChoose = "Choose a profile picture."
	msgImage         = "That image could not be read."
	msgPhoneActive   = "Resolve the active phone change first."
	msgPhoneEnter    = "Enter a phone number."
	msgPlaceChoose   = "Choose a place."
	msgPlayerChanged = "This player changed since you opened the form. Reload before editing."
)

// coreFields are the changed fields the core saves (CORE_FIELDS): the profile, the phone and the links. The email, the RTR
// ID and the password are saved by their own steps.
var coreFields = map[string]bool{
	adminplayer.FieldPicture: true, "name": true, "nickname": true, "playing style": true, "experience": true,
	"private profile": true, "phone privacy": true, adminplayer.FieldPhone: true,
	"Facebook link": true, "Instagram link": true, "YouTube link": true, "LinkedIn link": true,
}

// coreResult is what the core reports: every field that differs, the ones it saved, and the revision the next step runs
// under (the one it saved, or the one it was given when it saved nothing).
type coreResult struct {
	changed, coreChanged []string
	revision             string
}

// saveCore is saveAdminPlayerCore. The order is the TypeScript's: the loaded player must be registered (`invalid` on
// `player`); the revision (`conflict`, or `invalid` on `revision` for text that is no whole number); the form without its
// picture; what changed, from the form as sent; the form again with the picture if it changed; the reason when anything
// changed; and, when something the core saves changed, one transaction. A photo to upload is checked here, and the upload
// itself is not Go's (the pictures track): a readable photo is `unavailable`.
func (s *server) saveCore(ctx context.Context, p session.Principal, id pgtype.UUID, typed, revision string, form map[string]any, operationID string) (coreResult, error) {
	q := sqlcgen.New(s.pool)
	loaded, found, err := signedin.ReadAdminPlayerEdit(ctx, q, id, typed, s.now)
	if err != nil {
		return coreResult{}, err
	}
	if !found {
		return coreResult{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if !loaded.Claimed {
		return coreResult{}, invalid("player", msgNotRegistered)
	}
	stored, err := revisionOf(loaded)
	if err != nil {
		return coreResult{}, err
	}
	if err := writes.RequireRevision(stored, revision); err != nil {
		return coreResult{}, err
	}
	edit := toEdit(loaded)
	if _, bad := adminplayer.ParseEdit(edit, form, false); bad != nil {
		return coreResult{}, writes.Fail(httpapi.ErrInvalid, bad)
	}
	changed, _ := adminplayer.ChangedFields(edit, form)
	values, bad := adminplayer.ParseEdit(edit, form, contains(changed, adminplayer.FieldPicture))
	if bad != nil {
		return coreResult{}, writes.Fail(httpapi.ErrInvalid, bad)
	}
	if len(changed) > 0 && values.Reason == "" {
		return coreResult{}, invalid("reason", adminplayer.MsgReasonRequired)
	}
	var coreChanged []string
	for _, c := range changed {
		if coreFields[c] {
			coreChanged = append(coreChanged, c)
		}
	}
	if len(coreChanged) == 0 {
		return coreResult{changed: changed, revision: revision}, nil
	}
	// The picture the form will save: the new one when it changed, else the loaded one (which is not written then).
	picture := edit.Picture
	if contains(changed, adminplayer.FieldPicture) {
		picture = values.Picture
	}
	if contains(coreChanged, adminplayer.FieldPicture) && picture != nil && strings.HasPrefix(*picture, "data:image/") {
		if !adminplayer.ImageReadable(*picture) {
			return coreResult{}, invalid("picture", msgImage)
		}
		// The photo is a good one, and storing it is the pictures track's: Go has no storage client.
		return coreResult{}, writes.Fail(httpapi.ErrUnavailable, nil)
	}
	var newRevision int64
	err = writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		var err error
		newRevision, err = s.coreTx(ctx, q, p, id, revision, edit, values, coreChanged, picture, operationID)
		return err
	})
	if err != nil {
		return coreResult{}, err
	}
	return coreResult{changed: changed, coreChanged: coreChanged, revision: httpapi.ToDecimalString(newRevision)}, nil
}

// coreTx is the transaction of the core. It locks the player, re-checks the revision under the lock, checks the picture
// and the phone against the database, and writes the profile, the phone, the links and the audit event.
func (s *server) coreTx(ctx context.Context, q *sqlcgen.Queries, p session.Principal, id pgtype.UUID, revision string, edit adminplayer.Edit, values adminplayer.Values, coreChanged []string, picture *string, operationID string) (int64, error) {
	if _, err := q.LockPlayerRevision(ctx, id); errors.Is(err, pgx.ErrNoRows) {
		return 0, writes.Fail(httpapi.ErrNotFound, nil)
	} else if err != nil {
		return 0, err
	}
	player, err := q.GetPlayerForEdit(ctx, id)
	if err != nil {
		return 0, err
	}
	if err := writes.RequireRevision(player.Revision, revision); err != nil {
		return 0, err
	}
	now := s.stamp()
	update := sqlcgen.UpdatePlayerFromEditParams{FullName: values.Name, Nickname: optionalText(values.Nickname), Visibility: sqlcgen.ProfileVisibilityPublic, PersonalDetails: []byte(`{}`), Now: now, ID: id}
	if contains(coreChanged, adminplayer.FieldPicture) {
		previous := player.AvatarPreviousRef
		if picture != nil && strings.HasPrefix(*picture, "character:") && !sameText(previous, *picture) {
			if _, err := q.GetShownCharacter(ctx, strings.TrimPrefix(*picture, "character:")); errors.Is(err, pgx.ErrNoRows) {
				return 0, invalid("picture", msgCharacter)
			} else if err != nil {
				return 0, err
			}
		}
		if picture != nil && strings.HasPrefix(*picture, "https://") && !sameText(previous, *picture) && !sameText(player.AvatarRef, *picture) {
			return 0, invalid("picture", msgPictureChoose)
		}
		update.SetAvatar = true
		if picture != nil {
			update.AvatarRef = pgtype.Text{String: *picture, Valid: true}
		}
		update.AvatarPreviousRef = player.AvatarRef
	}
	if contains(coreChanged, adminplayer.FieldPhone) {
		if err := s.savePhone(ctx, q, p, id, player, values, now); err != nil {
			return 0, err
		}
	}
	if contains(coreChanged, "playing style") {
		details, err := json.Marshal(map[string]string{"playingStyle": values.PlayingStyle})
		if err != nil {
			return 0, err
		}
		update.SetStyle, update.PersonalDetails = true, details
	}
	if contains(coreChanged, "experience") {
		var months *int32
		if total, none := adminplayer.ExperienceMonths(values.ExperienceYears, values.ExperienceMonths); !none {
			months = &total
		}
		var shown *int32
		if player.ExperienceMonths.Valid {
			shown = &player.ExperienceMonths.Int32
		}
		var recorded *time.Time
		if player.ExperienceRecordedAt.Valid {
			recorded = &player.ExperienceRecordedAt.Time
		}
		clock := now.Time
		change := profile.ExperienceChange(months, profile.CurrentExperienceMonths(shown, recorded, clock), clock)
		if !change.Keep {
			update.SetExperience = true
			if change.Months != nil {
				update.ExperienceMonths = pgtype.Int4{Int32: *change.Months, Valid: true}
				update.ExperienceRecordedAt = pgtype.Timestamptz{Time: *change.RecordedAt, Valid: true}
			}
		}
	}
	if contains(coreChanged, "private profile") {
		update.SetVisibility = true
		switch {
		case !values.ProfilePrivate:
			update.Visibility = sqlcgen.ProfileVisibilityPublic
		case player.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate:
			update.Visibility = sqlcgen.ProfileVisibilityAlwaysPrivate
		default:
			update.Visibility = sqlcgen.ProfileVisibilityPrivate
		}
	}
	if contains(coreChanged, "phone privacy") {
		update.SetPhonePrivacy, update.HidePhone = true, values.PhoneHidden
	}
	revisionNow, err := q.UpdatePlayerFromEdit(ctx, update)
	if err != nil {
		return 0, err
	}
	for _, prov := range adminplayer.Providers {
		if !contains(coreChanged, prov.FieldLabel) {
			continue
		}
		link := values.Links[prov.Key]
		provider := sqlcgen.SocialProvider(prov.Key)
		if link == "" {
			if err := q.DeletePlayerSocialLink(ctx, sqlcgen.DeletePlayerSocialLinkParams{PlayerID: id, Provider: provider}); err != nil {
				return 0, err
			}
			continue
		}
		// The table accepts only a link that starts with https:// (a CHECK); the form accepts http and other spellings of
		// the scheme, and the Route Handler then crashes on the check.
		if !strings.HasPrefix(link, "https://") {
			return 0, invalid(prov.Key, prov.LinkMessage())
		}
		linkID, err := newUUID()
		if err != nil {
			return 0, err
		}
		if err := q.UpsertPlayerSocialLink(ctx, sqlcgen.UpsertPlayerSocialLinkParams{ID: linkID, PlayerID: id, Provider: provider, Url: link, Now: now}); err != nil {
			return 0, err
		}
	}
	nickname := any(nil)
	if values.Nickname != "" {
		nickname = values.Nickname
	}
	var beforeNickname any
	if player.Nickname.Valid {
		beforeNickname = player.Nickname.String
	}
	err = s.recordAudit(ctx, q, p.AccountID, auditEvent{
		Action: "player.profile_updated", TargetType: "player", TargetID: uuid.UUID(id.Bytes).String(),
		Metadata: map[string]any{
			"before":  map[string]any{"name": player.FullName, "nickname": beforeNickname},
			"after":   map[string]any{"name": values.Name, "nickname": nickname},
			"changed": coreChanged, "reason": values.Reason, "operationId": operationID,
		},
	})
	return revisionNow, err
}

// savePhone is the phone part of the core: a change in flight stops it, the number must be the contact's to change and
// no other player's, the pending phone requests are superseded (rejected, each with its event), and the contact and the
// account move to the new number.
func (s *server) savePhone(ctx context.Context, q *sqlcgen.Queries, p session.Principal, id pgtype.UUID, player sqlcgen.GetPlayerForEditRow, values adminplayer.Values, now pgtype.Timestamptz) error {
	if _, err := q.FindInFlightRequest(ctx, sqlcgen.FindInFlightRequestParams{PlayerID: id, Field: sqlcgen.NullContactChangeField{ContactChangeField: sqlcgen.ContactChangeFieldPhone, Valid: true}}); err == nil {
		return writes.Fail(httpapi.ErrConflict, map[string]string{"phone": msgPhoneActive})
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if _, err := q.GetPrivateContactOfPlayer(ctx, id); errors.Is(err, pgx.ErrNoRows) {
		return invalid("phone", msgPhoneEnter)
	} else if err != nil {
		return err
	}
	if values.Phone == "" {
		return invalid("phone", msgPhoneEnter)
	}
	if owner, err := q.GetContactPlayerByPhone(ctx, values.Phone); err == nil {
		if owner != id {
			return invalid("phone", phoneLinked)
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err := s.supersedeRequests(ctx, q, p, id, sqlcgen.ContactChangeFieldPhone, now); err != nil {
		return err
	}
	version, err := q.SetContactPhone(ctx, sqlcgen.SetContactPhoneParams{Phone: values.Phone, Now: now, PlayerID: id})
	if err != nil {
		return err
	}
	return q.SyncAccountContactVersion(ctx, sqlcgen.SyncAccountContactVersionParams{Version: version, Now: now, PlayerID: id})
}

// supersedeRequests rejects each pending request of the field with the note "Superseded by an Admin edit" and records the
// event. The order (the TypeScript has none) is the oldest request first.
func (s *server) supersedeRequests(ctx context.Context, q *sqlcgen.Queries, p session.Principal, id pgtype.UUID, field sqlcgen.ContactChangeField, now pgtype.Timestamptz) error {
	pending, err := q.ListPendingContactRequests(ctx, sqlcgen.ListPendingContactRequestsParams{PlayerID: id, Field: field})
	if err != nil {
		return err
	}
	for _, request := range pending {
		if err := q.SupersedeContactRequest(ctx, sqlcgen.SupersedeContactRequestParams{AdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, Now: now, ID: request}); err != nil {
			return err
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.contact_change_rejected", TargetType: "player", TargetID: uuid.UUID(id.Bytes).String(),
			Metadata: map[string]any{"requestId": uuid.UUID(request.Bytes).String(), "field": string(field), "superseded": true},
		}); err != nil {
			return err
		}
	}
	return nil
}

func optionalText(s string) pgtype.Text { return pgtype.Text{String: s, Valid: s != ""} }

// sameText is `picture !== previous` negated, where the stored value may be null.
func sameText(stored pgtype.Text, v string) bool { return stored.Valid && stored.String == v }
