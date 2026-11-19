package adminwrites

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Edit player: PATCH /api/players/{playerId} (A-PLAYER Edit). Port of apps/admin/src/app/api/players/[playerId]/route.ts
// PATCH and saveAdminPlayer in packages/db/src/admin/player-edit.ts, with its parts: the profile and phone
// (player-edit-core.ts, players_edit_core.go), the RTR ID and the unclaimed person's shared entry (player-rtr-id.ts,
// players_edit_rtr.go), the email (player-edit-email.ts) and the password (players_edit_email.go). The reads it decides
// on and answers with are signedin's.
//
// The save is not one transaction, as in the TypeScript: the profile, the RTR ID, the email and the password each commit
// on their own, and one that fails after the profile saved is a warning on an answer that is still 200 (the answer names
// what was saved). What the provider did in the TypeScript (Supabase Auth) the sign-in identity does here; see
// players_edit_email.go.

// Warnings the answer carries (the service's own words).
const (
	warnRtrID          = "RTR ID change could not be applied. Reload and retry."
	warnEmailApplied   = "Email change could not be applied. Check for an active request or a duplicate email, then retry."
	warnEmailUnsure    = "Email change could not be confirmed. Retry the email change before signing in with it."
	warnPasswordUnsure = "Password change could not be confirmed. Check before giving a password to the player."
	msgNotRegistered   = "Only registered players can be edited here."
)

// editAnswer is the body of a save: the player's directory row, what was saved, the message and the warnings.
type editAnswer struct {
	Player      signedin.AdminPlayer `json:"player"`
	Changed     []string             `json:"changed"`
	PasswordSet bool                 `json:"passwordSet"`
	Message     string               `json:"message"`
	Warnings    []string             `json:"warnings"`
}

// formObject is `{ ...values }`: the fields of an object, and nothing for anything else (a string, a number, an array and
// the other values spread into no field that the form reads).
func formObject(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

// toEdit is the loaded form of a player as the rules read it.
func toEdit(e *signedin.AdminPlayerEdit) adminplayer.Edit {
	return adminplayer.Edit{
		Picture: e.Picture, Name: e.Name, Nickname: e.Nickname, PlayingStyle: e.PlayingStyle,
		ExperienceYears: e.ExperienceYears, ExperienceMonths: e.ExperienceMonths,
		Facebook: e.SocialLinks.Facebook, Instagram: e.SocialLinks.Instagram, Youtube: e.SocialLinks.Youtube, Linkedin: e.SocialLinks.Linkedin,
		ProfilePrivate: e.ProfilePrivate, PhoneHidden: e.PhoneHidden, Phone: e.Phone, Email: e.Email, RtrID: e.RtrID,
		Claimed: e.Claimed, HasAccount: e.HasAccount,
	}
}

func revisionOf(e *signedin.AdminPlayerEdit) (int64, error) {
	return strconv.ParseInt(e.Revision, 10, 64)
}

func invalid(fieldName, message string) error {
	return writes.Fail(httpapi.ErrInvalid, map[string]string{fieldName: message})
}

// editPlayer is the PATCH handler. The order is the TypeScript's: the JSON body; the player ID (the Route Handler crashes
// on one Postgres cannot read, and here it is `not_found`); an unclaimed person's shared entry, which has its own save;
// otherwise the loaded player (`not_found`); the RTR ID the registration place and date make (`invalid` on
// `registrationDate`, a reason for it, and `conflict` when the RTR ID is held); the profile and phone; the RTR ID; the
// email; the password. A body whose `values` is not an object crashes the Route Handler for a registered player
// (`values` absent or null); here that is `invalid` with no fields.
func (s *server) editPlayer(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	typed := r.PathValue("playerId")
	revision := body.Text("revision")
	rawValues := body["values"]
	id, ok := pgUUID(typed)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	ctx := r.Context()
	q := sqlcgen.New(s.pool)
	switch _, err := q.FindSharedEntryID(ctx, id); {
	case err == nil:
		return s.editSharedEntry(ctx, p, id, typed, revision, rawValues)
	case !errors.Is(err, pgx.ErrNoRows):
		return writes.Result{}, err
	}
	operationID := uuid.NewString()
	before, found, err := signedin.ReadAdminPlayerEdit(ctx, q, id, typed, s.now)
	if err != nil {
		return writes.Result{}, err
	}
	if !found {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	form := formObject(rawValues)
	var plan *adminplayer.RtrPlan
	if before.Claimed {
		if rawValues == nil {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil) // the TypeScript throws on `values.registrationPlace`
		}
		var planned bool
		if plan, planned = adminplayer.PlanRtrID(before.RtrID, form["registrationPlace"], form["registrationDate"]); !planned {
			return writes.Result{}, invalid("registrationDate", adminplayer.DateError)
		}
	}
	if plan != nil {
		reason, ok := form["reason"].(string)
		if !ok {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil) // `values.reason.trim()` throws
		}
		if fields.JSTrim(reason) == "" {
			return writes.Result{}, invalid("reason", adminplayer.MsgReasonRequired)
		}
		held, err := q.RtrIDIsHeld(ctx, plan.RtrID)
		if err != nil {
			return writes.Result{}, err
		}
		if held.Bool {
			return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"registrationDate": adminplayer.MsgRtrIDTaken})
		}
	}
	core, err := s.saveCore(ctx, p, id, typed, revision, form, operationID)
	if err != nil {
		return writes.Result{}, err
	}
	saved := append([]string{}, core.coreChanged...)
	warnings := []string{}
	reason := fields.JSTrim(form["reason"].(string)) // the form is valid by now: the reason is text
	name := fields.JSTrim(form["name"].(string))
	if plan != nil {
		err := s.saveRegisteredRtrID(ctx, p, id, typed, plan, reason, name, operationID)
		switch {
		case err == nil:
			saved = append(saved, adminplayer.FieldRtrID)
		case len(core.coreChanged) == 0:
			// Nothing was saved yet: a taken RTR ID refuses the whole save.
			return writes.Result{}, err
		default:
			var se *writes.Error
			if errors.As(err, &se) && se.Fields["registrationDate"] != "" {
				warnings = append(warnings, se.Fields["registrationDate"])
			} else {
				warnings = append(warnings, warnRtrID)
			}
		}
	}
	if contains(core.changed, adminplayer.FieldEmail) {
		confirmed, err := s.saveEmail(ctx, p, id, typed, fields.JSTrim(form["email"].(string)), reason, core.revision, operationID)
		switch {
		case err != nil:
			warnings = append(warnings, warnEmailApplied)
		case confirmed:
			saved = append(saved, adminplayer.FieldEmail)
		default:
			warnings = append(warnings, warnEmailUnsure)
		}
	}
	if contains(core.changed, adminplayer.FieldPass) {
		if err := s.savePassword(ctx, p, id, typed, form["password"].(string), reason, name, operationID); err != nil {
			s.log.Warn("admin password change not applied", "error", err.Error())
			warnings = append(warnings, warnPasswordUnsure)
		} else {
			saved = append(saved, adminplayer.FieldPass)
		}
	}
	rows, err := signedin.ReadAdminPlayerDirectory(ctx, q, id, s.now)
	if err != nil {
		return writes.Result{}, err
	}
	if len(rows) == 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return writes.Result{Body: editAnswer{
		Player: rows[0], Changed: saved, PasswordSet: contains(saved, adminplayer.FieldPass),
		Message: adminplayer.SavedMessage(rows[0].Name, saved), Warnings: warnings,
	}}, nil
}

func contains(list []string, item string) bool {
	for _, x := range list {
		if x == item {
			return true
		}
	}
	return false
}

// editSharedEntry is saveAdminSharedEntry: an unclaimed person saved with an email (`playerId` is the shared entry). The
// entry holds only the email and the RTR ID, so those are what Admin changes here; each club keeps its own name,
// nickname and details. The form is not validated (the TypeScript has no schema here); a form that is no object, or
// whose text fields are not text, crashes the Route Handler and is `invalid` here.
func (s *server) editSharedEntry(ctx context.Context, p session.Principal, id pgtype.UUID, typed, revision string, rawValues any) (writes.Result, error) {
	q := sqlcgen.New(s.pool)
	edit, found, err := signedin.ReadAdminPlayerEdit(ctx, q, id, typed, s.now)
	if err != nil {
		return writes.Result{}, err
	}
	if !found {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	stored, err := revisionOf(edit)
	if err != nil {
		return writes.Result{}, err
	}
	if err := writes.RequireRevision(stored, revision); err != nil {
		return writes.Result{}, err
	}
	form := formObject(rawValues)
	changed, crashed := adminplayer.ChangedFields(toEdit(edit), form)
	if crashed {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	for _, c := range changed {
		if c != adminplayer.FieldEmail {
			return writes.Result{}, invalid("player", msgNotRegistered)
		}
	}
	plan, planned := adminplayer.PlanRtrID(edit.RtrID, form["registrationPlace"], form["registrationDate"])
	if !planned {
		return writes.Result{}, invalid("registrationDate", adminplayer.DateError)
	}
	if plan != nil {
		held, err := q.RtrIDIsHeld(ctx, plan.RtrID)
		if err != nil {
			return writes.Result{}, err
		}
		if held.Bool {
			return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"registrationDate": adminplayer.MsgRtrIDTaken})
		}
	}
	saved := append([]string{}, changed...)
	if plan != nil {
		saved = append(saved, adminplayer.FieldRtrID)
	}
	respond := func(changed []string) (writes.Result, error) {
		rows, err := signedin.ReadAdminPlayerDirectory(ctx, q, id, s.now)
		if err != nil {
			return writes.Result{}, err
		}
		if len(rows) == 0 {
			return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
		}
		return writes.Result{Body: editAnswer{Player: rows[0], Changed: changed, Message: adminplayer.SavedMessage(rows[0].Name, changed), Warnings: []string{}}}, nil
	}
	if len(saved) == 0 {
		return respond([]string{})
	}
	reasonText, ok := form["reason"].(string)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil) // `values.reason.trim()` throws
	}
	reason := fields.JSTrim(reasonText)
	if reason == "" {
		return writes.Result{}, invalid("reason", adminplayer.MsgReasonRequired)
	}
	email := ""
	if contains(changed, adminplayer.FieldEmail) {
		if email = entryEmail(form["email"].(string)); email == "" {
			return writes.Result{}, invalid("email", "Enter an email address, like name@example.com.")
		}
	}
	err = writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := q.LockOpenSharedEntry(ctx, id); errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		} else if err != nil {
			return err
		}
		stored, err := q.GetSharedEntryRevision(ctx, id)
		if err != nil {
			return err
		}
		if err := writes.RequireRevision(stored, revision); err != nil {
			return err
		}
		now := s.stamp()
		if email != "" {
			if err := q.LockEmailAddress(ctx, email); err != nil {
				return err
			}
			taken, err := q.EmailIsTakenForEntry(ctx, sqlcgen.EmailIsTakenForEntryParams{Email: pgtype.Text{String: email, Valid: true}, EntryID: id})
			if err != nil {
				return err
			}
			if taken.Bool {
				return invalid("email", emailLinked)
			}
			if err := q.SetSharedEntryEmail(ctx, sqlcgen.SetSharedEntryEmailParams{Email: pgtype.Text{String: email, Valid: true}, Now: now, ID: id}); err != nil {
				return err
			}
		}
		if plan != nil {
			if err := s.applyRtrIDChange(ctx, q, plan, now); err != nil {
				return err
			}
		} else if err := q.BumpSharedEntryRevision(ctx, sqlcgen.BumpSharedEntryRevisionParams{Now: now, ID: id}); err != nil {
			return err
		}
		metadata := map[string]any{"after": map[string]any{"name": edit.Name, "nickname": edit.Nickname}, "changed": saved, "reason": reason}
		if plan != nil {
			metadata["rtrId"] = plan.RtrID // after the change no row holds the old string
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{Action: "player.profile_updated", TargetType: "player", TargetID: uuid.UUID(id.Bytes).String(), Metadata: metadata})
	})
	if err != nil {
		return writes.Result{}, err
	}
	return respond(saved)
}

// entryEmail is normalizeEmail in shared-entry.ts: trimmed and lower case, one @ with something on both sides and no
// white space; "" when it is not one.
func entryEmail(typed string) string {
	email := strings.ToLower(fields.JSTrim(typed))
	local, domain, ok := strings.Cut(email, "@")
	if !ok || local == "" || domain == "" || strings.ContainsRune(domain, '@') || strings.ContainsFunc(email, fields.IsJSSpace) {
		return ""
	}
	return email
}
