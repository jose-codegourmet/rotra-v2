package adminplayer

import (
	"strings"
	"unicode/utf16"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Messages of the Edit form (packages/schema/src/admin-player.ts: the prototype's own copy).
const (
	MsgReasonRequired     = "Say why you are making this change."
	MsgRegistrationDate   = "Enter the registration date."
	MsgSignsInWithEmail   = "A registered player signs in with email. Enter one."
	MsgRtrIDTaken         = "Another player already has this RTR ID. Choose another place or date."
	msgPicture            = "Choose a profile picture."
	msgFullNameRequired   = "Enter the full name."
	msgNameTooLong        = "Keep the name under 60 characters."
	msgNicknameTooLong    = "Keep the nickname under 30 characters."
	msgYears              = "Use a whole number of years."
	msgMonths             = "Use 0 to 11 months."
	msgPhone              = "Enter the full phone number, like +63 917 555 0142."
	msgEmail              = "Enter an email like name@example.com."
	msgPassword           = "Use at least 8 characters, or leave it empty to keep the current password."
	maxPlayingStyleLength = 280
	maxReasonLength       = 300
)

// Edit is what the Edit form was loaded with (readAdminPlayerEdit): the player as Admin sees it.
type Edit struct {
	Picture                                *string
	Name                                   string
	Nickname                               *string
	PlayingStyle                           string
	ExperienceYears, ExperienceMonths      *int64
	Facebook, Instagram, Youtube, Linkedin string
	ProfilePrivate, PhoneHidden            bool
	Phone, Email                           *string
	RtrID                                  *string
	Claimed, HasAccount                    bool
}

// link is the saved link of a provider.
func (e Edit) link(key string) string {
	switch key {
	case "facebook":
		return e.Facebook
	case "instagram":
		return e.Instagram
	case "youtube":
		return e.Youtube
	}
	return e.Linkedin
}

// Values is the form after adminPlayerEditSchema: trimmed, the phone in E.164, nothing else changed.
type Values struct {
	// Picture is nil for none (initials).
	Picture                             *string
	Name, Nickname, PlayingStyle        string
	ExperienceYears, ExperienceMonths   string
	Links                               map[string]string
	ProfilePrivate, PhoneHidden         bool
	Phone, Email, Password, Reason      string
	RegistrationPlace, RegistrationDate *string
}

func u16(s string) int { return len(utf16.Encode([]rune(s))) }

// wholeUpTo is /^\d+$/ and Number(v) <= max on an already trimmed value, or "" (experienceYearsField, ...MonthsField).
func wholeUpTo(v string, max int) bool {
	if v == "" {
		return true
	}
	n := 0
	for i := 0; i < len(v); i++ {
		if v[i] < '0' || v[i] > '9' {
			return false
		}
		if n <= max {
			n = n*10 + int(v[i]-'0')
		}
	}
	return n <= max
}

// ParseEdit is adminPlayerEditSchemaFor(player).safeParse(values) for a registered player. withPicture says whether the
// picture is part of the form: the route first validates the form with the picture set to none, and the picture itself
// only when it changed. The second result holds the message of each field that failed, keyed as the route keys it: the
// route builds its fields with Object.fromEntries, so the last message of a field wins (the name that is empty says it is
// too long). It is nil when the form is valid.
//
// What Zod does is kept: a value of the wrong type is one message and stops that field; a rule that fails does not stop
// the next one; the rules that depend on the player (a registration date, an email) run only when no field was of the
// wrong type.
func ParseEdit(player Edit, form map[string]any, withPicture bool) (Values, map[string]string) {
	bad := map[string]string{}
	typeBad := false
	out := Values{Links: map[string]string{}}
	text := func(key string) (string, bool) {
		v, present := field(form, key)
		s, ok := v.(string)
		if !ok {
			bad[key] = typeMessage("string", v, present)
			typeBad = true
		}
		return s, ok
	}
	flag := func(key string) (bool, bool) {
		v, present := field(form, key)
		b, ok := v.(bool)
		if !ok {
			bad[key] = typeMessage("boolean", v, present)
			typeBad = true
		}
		return b, ok
	}

	// picture: none, or a reference to a library character, an upload or an https photo.
	if withPicture {
		v, present := field(form, "picture")
		switch x := v.(type) {
		case nil:
			if present { // null is none
				out.Picture = nil
			} else {
				bad["picture"] = typeMessage("string", v, present)
				typeBad = true
			}
		case string:
			if !strings.HasPrefix(x, "character:") && !strings.HasPrefix(x, "data:image/") && !strings.HasPrefix(x, "https://") {
				bad["picture"] = msgPicture
			}
			out.Picture = &x
		default:
			bad["picture"] = typeMessage("string", v, present)
			typeBad = true
		}
	}
	if s, ok := text("name"); ok {
		out.Name = fields.JSTrim(s)
		if codePoints(out.Name) < 1 {
			bad["name"] = msgFullNameRequired
		}
		if n := codePoints(out.Name); n < 1 || n > 60 { // the refine runs after the min rule and replaces its message
			bad["name"] = msgNameTooLong
		}
	}
	if s, ok := text("nickname"); ok {
		out.Nickname = fields.JSTrim(s)
		if codePoints(out.Nickname) > 30 {
			bad["nickname"] = msgNicknameTooLong
		}
	}
	if s, ok := text("playingStyle"); ok {
		out.PlayingStyle = fields.JSTrim(s)
		if codePoints(out.PlayingStyle) > maxPlayingStyleLength {
			bad["playingStyle"] = tooBig(maxPlayingStyleLength)
		}
	}
	if s, ok := text("experienceYears"); ok {
		out.ExperienceYears = fields.JSTrim(s)
		if !wholeUpTo(out.ExperienceYears, 80) {
			bad["experienceYears"] = msgYears
		}
	}
	if s, ok := text("experienceMonths"); ok {
		out.ExperienceMonths = fields.JSTrim(s)
		if !wholeUpTo(out.ExperienceMonths, 11) {
			bad["experienceMonths"] = msgMonths
		}
	}
	for _, p := range Providers {
		if s, ok := text(p.Key); ok {
			link := fields.JSTrim(s)
			out.Links[p.Key] = link
			if link != "" && !MatchesProvider(link, p.Hosts) {
				bad[p.Key] = p.LinkMessage()
			}
		}
	}
	out.ProfilePrivate, _ = flag("profilePrivate")
	out.PhoneHidden, _ = flag("phoneHidden")
	if s, ok := text("phone"); ok {
		phone := fields.JSTrim(s)
		if e164, parsed := fields.ParsePHMobile(phone); phone == "" {
			out.Phone = ""
		} else if parsed {
			out.Phone = e164
		} else {
			bad["phone"] = msgPhone
		}
	}
	if s, ok := text("email"); ok {
		out.Email = fields.JSTrim(s)
		if out.Email != "" && !IsEmail(out.Email) {
			bad["email"] = msgEmail
		}
	}
	if s, ok := text("password"); ok {
		out.Password = s
		if s != "" && u16(s) < 8 {
			bad["password"] = msgPassword
		}
	}
	if s, ok := text("reason"); ok {
		out.Reason = fields.JSTrim(s)
		if codePoints(out.Reason) > maxReasonLength {
			bad["reason"] = tooBig(maxReasonLength)
		}
	}
	for _, key := range []string{"registrationPlace", "registrationDate"} {
		v, present := field(form, key)
		if !present {
			continue
		}
		s, ok := v.(string)
		if !ok {
			bad[key] = typeMessage("string", v, present)
			typeBad = true
			continue
		}
		if key == "registrationPlace" {
			out.RegistrationPlace = &s
		} else {
			out.RegistrationDate = &s
		}
	}
	// The rules that depend on the player (superRefine) do not run after a field of the wrong type.
	if !typeBad {
		if player.RtrID != nil && *player.RtrID != "" && out.RegistrationDate != nil && fields.JSTrim(*out.RegistrationDate) == "" {
			bad["registrationDate"] = MsgRegistrationDate
		}
		if player.Claimed && player.HasAccount && out.Email == "" {
			bad["email"] = MsgSignsInWithEmail
		}
	}
	if len(bad) > 0 {
		return Values{}, bad
	}
	return out, nil
}

// Changed fields, as the Activity log and the message name them.
const (
	FieldPicture = "profile picture"
	FieldRtrID   = "RTR ID"
	FieldEmail   = "email"
	FieldPhone   = "phone"
	FieldPass    = "password"
)

// ChangedFields is adminPlayerChangedFields: what differs between the loaded player and the form as it was sent (not as
// it was parsed): the picture first, the password last, experience once for years and months. A typed password always
// counts. crashed is true when the TypeScript would throw (a text field that is no text): the Route Handler answers 500
// there, and the route answers `invalid`.
func ChangedFields(edit Edit, form map[string]any) (changed []string, crashed bool) {
	add := func(field string, differs bool) {
		if !differs {
			return
		}
		for _, c := range changed {
			if c == field {
				return
			}
		}
		changed = append(changed, field)
	}
	str := func(key string) string {
		v, ok := form[key].(string)
		if !ok {
			crashed = true
		}
		return v
	}
	// picture: (values.picture ?? null) !== (edit.picture ?? null)
	switch v := form["picture"].(type) {
	case nil:
		add(FieldPicture, edit.Picture != nil)
	case string:
		add(FieldPicture, edit.Picture == nil || *edit.Picture != v)
	default:
		add(FieldPicture, true)
	}
	add("name", fields.JSTrim(str("name")) != edit.Name)
	nick := ""
	if edit.Nickname != nil {
		nick = *edit.Nickname
	}
	add("nickname", fields.JSTrim(str("nickname")) != nick)
	add("playing style", fields.JSTrim(str("playingStyle")) != edit.PlayingStyle)
	years, months := str("experienceYears"), str("experienceMonths")
	add("experience", !sameWhole(years, edit.ExperienceYears) || !sameWhole(months, edit.ExperienceMonths))
	add("private profile", formBool(form, "profilePrivate") != edit.ProfilePrivate || !formIsBool(form, "profilePrivate"))
	add("phone privacy", formBool(form, "phoneHidden") != edit.PhoneHidden || !formIsBool(form, "phoneHidden"))
	typed := ""
	if v, ok := form["phone"].(string); ok {
		typed = v
	} else if _, present := form["phone"]; present && form["phone"] != nil {
		crashed = true
	}
	stored := ""
	if edit.Phone != nil {
		stored = *edit.Phone
	}
	add(FieldPhone, phoneOf(typed) != phoneOf(stored))
	email := ""
	if edit.Email != nil {
		email = *edit.Email
	}
	add(FieldEmail, fields.JSTrim(str("email")) != email)
	for _, p := range Providers {
		add(p.FieldLabel, fields.JSTrim(str(p.Key)) != edit.link(p.Key))
	}
	pw, ok := form["password"].(string)
	add(FieldPass, !ok || pw != "")
	return changed, crashed
}

func formIsBool(form map[string]any, key string) bool { _, ok := form[key].(bool); return ok }
func formBool(form map[string]any, key string) bool   { b, _ := form[key].(bool); return b }

// sameWhole is wholeOrNull(value) !== shown, negated: ” is none, digits are a number, anything else never equals one.
func sameWhole(value string, shown *int64) bool {
	t := fields.JSTrim(value)
	if t == "" {
		return shown == nil
	}
	if shown == nil || strings.Trim(t, "0123456789") != "" {
		return false
	}
	n := int64(0)
	for i := 0; i < len(t); i++ {
		n = n*10 + int64(t[i]-'0')
		if n > 1<<40 {
			return false
		}
	}
	return n == *shown
}

// phoneOf is phoneOf in adminPlayer.rules.ts: phones compare as E.164 whatever their typed form.
func phoneOf(value string) string {
	t := fields.JSTrim(value)
	if t == "" {
		return ""
	}
	if e164, ok := fields.ParsePHMobile(t); ok {
		return e164
	}
	return t
}

// SavedMessage is adminPlayerSavedMessage: the toast after a save. It never mentions the password itself.
func SavedMessage(name string, changed []string) string {
	if len(changed) == 0 {
		return "Nothing changed."
	}
	msg := "Saved " + name + ": " + strings.Join(changed, ", ") + "."
	for _, c := range changed {
		if c == FieldPass {
			msg += " Give the new password to the player yourself."
			break
		}
	}
	return msg
}

// ExperienceMonths is the total the form's years and months make (the form is valid, so both are ” or whole numbers):
// none when both are empty.
func ExperienceMonths(years, months string) (total int32, none bool) {
	if years == "" && months == "" {
		return 0, true
	}
	n := func(s string) int32 {
		v := int32(0)
		for i := 0; i < len(s); i++ {
			v = v*10 + int32(s[i]-'0')
		}
		return v
	}
	return n(years)*12 + n(months), false
}
