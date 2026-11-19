package contactchange

import (
	"regexp"
	"sort"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/phone"
)

// The fields a request can change, and the statuses it moves through (the enums of the table).
const (
	FieldPhone = "phone"
	FieldEmail = "email"

	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusApplying = "applying"
	StatusFailed   = "failed"
	StatusApplied  = "applied"
	StatusRejected = "rejected"
)

// The copy of the services (contact-change.ts and the Admin screen).
const (
	MsgPhone      = "Enter a Philippine mobile number, like 0917 555 0142."
	MsgEmail      = "Enter an email address, like name@example.com."
	MsgReason     = "Enter a reason."
	MsgOpen       = "A contact change is already open."
	MsgDecided    = "This request has already been decided."
	MsgNotWaiting = "This request is not waiting for a retry."
	MsgNotReady   = "Approve this request before applying it."
	MsgAdminEmail = "Resolve the Admin email change first."
	MsgContacts   = "The player’s contacts changed since this request."
	MsgUsed       = "This contact is used by another player."
)

// Word is CONTACT_FIELD_WORD: the word for a field inside a sentence.
func Word(field string) string {
	if field == FieldPhone {
		return "phone number"
	}
	return "email"
}

// SameWord is the refusal when the new contact is the one the player has (the owner enters it, so it names the player).
func SameWord(field string, owner bool) string {
	if owner {
		return "That's already this player's " + Word(field) + "."
	}
	return "That's already your " + Word(field) + "."
}

// TakenWord is the refusal when the new contact belongs to another profile.
func TakenWord(field string, owner bool) string {
	if owner {
		return "That " + Word(field) + " belongs to another ROTRA profile."
	}
	return "That " + Word(field) + " belongs to another ROTRA profile. Contact ROTRA for help."
}

var e164 = regexp.MustCompile(`^\+[1-9][0-9]{7,14}$`)

// hasJSSpace tests for JavaScript's \s: the characters String.prototype.trim removes.
func hasJSSpace(s string) bool {
	return strings.IndexFunc(s, fields.IsJSSpace) >= 0
}

// Normalize is normalize() of contact-change.ts: the value as the table keeps it (trimmed; an email in lower case), or
// the message of the field when it is not a contact. A phone must already be E.164: the display forms are the client's.
func Normalize(field, value string) (string, string) {
	v := fields.JSTrim(value)
	if field == FieldPhone {
		if !e164.MatchString(v) {
			return "", MsgPhone
		}
		return v, ""
	}
	lower := publicreads.JSToLower(v)
	// The pattern is ^[^@\s]+@[^@\s]+$ in JavaScript: one @, text on both sides, no character \s names. Go's \s is narrower, so it is tested by hand.
	at := strings.IndexByte(lower, '@')
	if at <= 0 || at == len(lower)-1 || strings.Count(lower, "@") != 1 || hasJSSpace(lower) {
		return "", MsgEmail
	}
	return lower, ""
}

// Holder is a player identity with the contacts it signs in with now (any phone format). A contact that is not set is "".
type Holder struct {
	ID, FullName, RtrID string
	Phone, Email        string
}

// Contact is the holder's contact of the field.
func (h Holder) Contact(field string) string {
	if field == FieldPhone {
		return h.Phone
	}
	return h.Email
}

// Request is a request as the checks read it (CheckedRequest). RequestedAt is milliseconds.
type Request struct {
	ID, PlayerID string
	Field        string
	From, To     string
	Status       string
	RequestedAt  int64
}

// Check is one pre-approval check, in the order the Admin screen lists them. Only the fields of its kind are set.
type Check struct {
	Kind           string       `json:"kind"`
	OK             bool         `json:"ok"`
	OtherPlayer    *CheckPlayer `json:"otherPlayer,omitempty"`
	NewerRequestID *string      `json:"newerRequestId,omitempty"`
	SentAt         *int64       `json:"sentAt,omitempty"`
	CurrentValue   *string      `json:"currentValue,omitempty"`
}

// CheckPlayer names another player by name and RTR ID only, never by a contact.
type CheckPlayer struct {
	ID       string `json:"id"`
	FullName string `json:"fullName"`
	RtrID    string `json:"rtrId"`
}

// inFlight is approved but not applied yet: the provider operation may still be running.
func inFlight(status string) bool { return status == StatusApproved || status == StatusApplying }

var (
	phoneChars  = regexp.MustCompile(`^\+?[0-9 -]+$`)
	phoneNumber = regexp.MustCompile(`^(?:0|\+?63)9[0-9]{9}$`)
	spaceDash   = strings.NewReplacer(" ", "", "-", "")
)

// NormalizeContact is normalizeContact: phones compare as E.164 whatever their display form; emails ignore case. "" is
// not set.
func NormalizeContact(field, value string) string {
	trimmed := fields.JSTrim(value)
	if trimmed == "" {
		return ""
	}
	if field == FieldEmail {
		return publicreads.JSToLower(trimmed)
	}
	if phoneChars.MatchString(trimmed) {
		compact := spaceDash.Replace(trimmed)
		if phoneNumber.MatchString(compact) {
			if strings.HasPrefix(compact, "0") {
				return "+63" + compact[1:]
			}
			return "+" + strings.TrimPrefix(compact, "+")
		}
	}
	return spaceDash.Replace(trimmed)
}

// ChecksFor are the four pre-approval checks: the requested contact is not another player's, no newer open request for
// the same field, the current contact still matches the request, and no other change for this player is being applied.
func ChecksFor(req Request, holders []Holder, requests []Request) []Check {
	field := req.Field
	wanted := NormalizeContact(field, req.To)
	var other *Holder
	for i := range holders {
		if holders[i].ID != req.PlayerID && NormalizeContact(field, holders[i].Contact(field)) == wanted {
			other = &holders[i]
			break
		}
	}
	var open []Request
	for _, e := range requests {
		if e.ID != req.ID && e.PlayerID == req.PlayerID && e.Field == field && e.RequestedAt > req.RequestedAt &&
			(e.Status == StatusPending || inFlight(e.Status)) {
			open = append(open, e)
		}
	}
	// Newest first; a stable sort keeps the stored order of requests sent at the same time.
	sort.SliceStable(open, func(i, j int) bool { return open[i].RequestedAt > open[j].RequestedAt })
	current := ""
	for _, h := range holders {
		if h.ID == req.PlayerID {
			current = h.Contact(field)
			break
		}
	}
	unchanged := NormalizeContact(field, current) == NormalizeContact(field, req.From)
	busy := false
	for _, e := range requests {
		if e.ID != req.ID && e.PlayerID == req.PlayerID && inFlight(e.Status) {
			busy = true
		}
	}
	checks := make([]Check, 0, 4)
	if other != nil {
		checks = append(checks, Check{Kind: "linked-elsewhere", OtherPlayer: &CheckPlayer{ID: other.ID, FullName: other.FullName, RtrID: other.RtrID}})
	} else {
		checks = append(checks, Check{Kind: "linked-elsewhere", OK: true})
	}
	if len(open) > 0 {
		id, at := open[0].ID, open[0].RequestedAt
		checks = append(checks, Check{Kind: "newer-request", NewerRequestID: &id, SentAt: &at})
	} else {
		checks = append(checks, Check{Kind: "newer-request", OK: true})
	}
	if unchanged {
		checks = append(checks, Check{Kind: "original-changed", OK: true})
	} else {
		value := current
		if field == FieldPhone && current != "" {
			value = phone.FormatForDisplay(current)
		}
		checks = append(checks, Check{Kind: "original-changed", CurrentValue: &value})
	}
	return append(checks, Check{Kind: "in-progress", OK: !busy})
}
