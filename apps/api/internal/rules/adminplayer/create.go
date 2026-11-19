package adminplayer

import (
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Places is the enum of adminPlayerCreateSchema: the founding city codes Add player accepts.
var Places = []string{"CEB", "MNL", "DVO", "ILO", "BCD", "TAG"}

const (
	msgNameRequired = "Enter a name."
	msgPlace        = `Invalid option: expected one of "CEB"|"MNL"|"DVO"|"ILO"|"BCD"|"TAG"`
)

// Create is what adminPlayerCreateSchema makes of a body: the name and nickname trimmed, the phone in E.164 or "", the
// email trimmed or "".
type Create struct {
	Name, Nickname, Phone, Email, Place, ClubID string
	AllowDuplicate                              bool
}

// ParseCreate is adminPlayerCreateSchema.safeParse on a decoded JSON object. The second result holds the first message
// of each field that failed, keyed by the field (the route keeps the first issue of each), or is nil when all is well.
// The schema is not strict: other keys are ignored.
func ParseCreate(body map[string]any) (Create, map[string]string) {
	var out Create
	bad := map[string]string{}

	// name: a string, trimmed, one to 60 characters.
	if v, ok := field(body, "name"); !isString(v) {
		bad["name"] = typeMessage("string", v, ok)
	} else {
		out.Name = fields.JSTrim(v.(string))
		switch n := codePoints(out.Name); {
		case n < 1:
			bad["name"] = msgNameRequired
		case n > 60:
			bad["name"] = tooBig(60)
		}
	}
	// nickname: a string, trimmed, at most 60 characters.
	if v, ok := field(body, "nickname"); !isString(v) {
		bad["nickname"] = typeMessage("string", v, ok)
	} else {
		out.Nickname = fields.JSTrim(v.(string))
		if codePoints(out.Nickname) > 60 {
			bad["nickname"] = tooBig(60)
		}
	}
	// phone: "" as it is, or a Philippine mobile (a union: both ways failing is "Invalid input").
	v, _ := field(body, "phone")
	if s, ok := v.(string); !ok {
		bad["phone"] = msgInvalidInput
	} else if s != "" {
		if e164, ok := fields.ParsePHMobile(s); ok {
			out.Phone = e164
		} else {
			bad["phone"] = msgInvalidInput
		}
	}
	// email: "" as it is, or a trimmed email. A string that is no email fails only the email branch of the union, and
	// Zod then reports that branch's own message; a value that is no string fails both.
	v, _ = field(body, "email")
	if s, ok := v.(string); !ok {
		bad["email"] = msgInvalidInput
	} else if s != "" {
		if t := fields.JSTrim(s); IsEmail(t) {
			out.Email = t
		} else {
			bad["email"] = msgEmailFormat
		}
	}
	// place: one of the six city codes.
	if s, _ := field(body, "place"); !oneOf(s, Places) {
		bad["place"] = msgPlace
	} else {
		out.Place = s.(string)
	}
	// clubId: a string, as it is.
	if v, ok := field(body, "clubId"); !isString(v) {
		bad["clubId"] = typeMessage("string", v, ok)
	} else {
		out.ClubID = v.(string)
	}
	// allowDuplicate: a boolean. Add player ignores it.
	if v, ok := field(body, "allowDuplicate"); !isBool(v) {
		bad["allowDuplicate"] = typeMessage("boolean", v, ok)
	} else {
		out.AllowDuplicate = v.(bool)
	}
	if len(bad) == 0 {
		return out, nil
	}
	return Create{}, bad
}

func isString(v any) bool { _, ok := v.(string); return ok }
func isBool(v any) bool   { _, ok := v.(bool); return ok }

func oneOf(v any, list []string) bool {
	s, ok := v.(string)
	if !ok {
		return false
	}
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}
