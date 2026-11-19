package claim

import (
	"encoding/json"
	"io"
	"math"
	"net/http"
	"strings"
	"unicode"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// maxBody is far more than a claim needs (a few short fields); a larger body is refused as invalid.
const maxBody = 16 << 10

// The copy of the Route Handler and the services it calls (claim.ts, account-access.ts, the claim route).
const (
	msgExpired      = "The registration link has expired or was replaced."
	msgNeedsPhone   = "Add your mobile number to finish registering."
	msgPhoneTaken   = "This number belongs to another ROTRA profile. Ask the club or ROTRA for help."
	msgEmailTaken   = "This email is already used by another player."
	msgRegistered   = "This profile is already registered."
	msgCredentials  = "That email and password don't match. Check them and try again."
	msgPhoneRoute   = "Enter a Philippine mobile number, like 0917 555 0142."
	msgEmailInvalid = "Enter an email address, like name@example.com."
	msgPassEmpty    = "Enter a password."
)

// problem is a refusal in the Route Handlers' vocabulary: a ServiceError code and its field messages.
type problem struct {
	code   httpapi.ErrorCode
	fields map[string]string
}

func refuse(code httpapi.ErrorCode, field, message string) *problem {
	return &problem{code: code, fields: map[string]string{field: message}}
}

// submission is the request after the checks that need no database.
type submission struct {
	// email is trimmed and lower case, as the login key and the contact email are.
	email    string
	password string
	// phone is the typed phone as E.164, "" when none was typed.
	phone string
	input profile.Input
	// onRefusal, when set, sees every refusal before it is answered; true means it answered. Only the guest registration
	// sets it (a taken email is its "account-match").
	onRefusal func(w http.ResponseWriter, p *problem) bool
}

// write answers a refusal, unless onRefusal did.
func (s submission) write(w http.ResponseWriter, p *problem) {
	if s.onRefusal != nil && s.onRefusal(w, p) {
		return
	}
	writeProblem(w, p)
}

// readObject is readJsonBody (service/request.ts): the body must be a JSON object, or the answer is a plain
// `invalid`. A body over maxBody is refused the same way.
func readObject(r *http.Request) (map[string]any, bool) {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBody))
	if err != nil {
		return nil, false
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, false
	}
	m, ok := v.(map[string]any)
	return m, ok && m != nil
}

// str is text() in request.ts: a string as it came, anything else is ”.
func str(v any) string {
	s, _ := v.(string)
	return s
}

// intOrNull is intOrNull in request.ts: nothing is nil, a JSON number is itself and anything else is NaN (which
// the profile rules refuse).
func intOrNull(v any) *float64 {
	switch n := v.(type) {
	case nil:
		return nil
	case float64:
		return &n
	}
	nan := nan()
	return &nan
}

// parse applies the claim route's own checks, in its order: the typed phone, then the email, then the password
// (registerFromClaim). The profile details come later, after the link has been read.
func parse(body map[string]any) (submission, *problem) {
	var s submission
	if typed := fields.JSTrim(str(body["phone"])); typed != "" {
		phone, ok := fields.ParsePHMobile(typed)
		if !ok {
			return s, refuse(httpapi.ErrInvalid, "phone", msgPhoneRoute)
		}
		s.phone = phone
	}
	s.email = strings.ToLower(fields.JSTrim(str(body["email"])))
	if !validEmail(s.email) {
		return s, refuse(httpapi.ErrInvalid, "email", msgEmailInvalid)
	}
	s.password = str(body["password"])
	if s.password == "" {
		return s, refuse(httpapi.ErrInvalid, "password", msgPassEmpty)
	}
	if err := password.Validate(s.password); err != nil {
		return s, refuse(httpapi.ErrInvalid, "password", password.Message(err))
	}
	links, _ := body["socialLinks"].(map[string]any) // not an object: every link reads ''
	s.input = profile.Input{
		FullName: str(body["fullName"]), Nickname: str(body["nickname"]), PlayingStyle: str(body["playingStyle"]),
		ExperienceYears: intOrNull(body["experienceYears"]), ExperienceMonths: intOrNull(body["experienceMonths"]),
		Links: map[string]string{},
	}
	for _, p := range []string{"facebook", "instagram", "youtube", "linkedin"} {
		s.input.Links[p] = str(links[p])
	}
	return s, nil
}

// validEmail is what the table's CHECK accepts (one @ with something on both sides and no white space; the
// TypeScript only looked for an @, so a value like a@b@c was a database error), and at most 254 characters.
func validEmail(email string) bool {
	if len(email) > 254 || strings.Count(email, "@") != 1 {
		return false
	}
	if strings.ContainsFunc(email, func(r rune) bool { return r == 0 || unicode.IsSpace(r) || fields.IsJSSpace(r) }) {
		return false
	}
	local, domain, _ := strings.Cut(email, "@")
	return local != "" && domain != ""
}

func nan() float64 { return math.NaN() }
