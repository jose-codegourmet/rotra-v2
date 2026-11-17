package claim_test

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// The copy of packages/db/src/player/claim.ts and account-access.ts, and of the claim route.
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
	msgPassShort    = "Use at least 6 characters."
)

func fields1(k, v string) map[string]string { return map[string]string{k: v} }

// Only the Player app submits a claim: any other app, or none, is the catalog's 404 and is not counted against the
// claim budget.
func TestPostNeedsThePlayerApp(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: "+639175550142"})
	ip := "203.0.113.5"
	for _, app := range []string{"club", "admin", "Player", ""} {
		w := e.post(token, claimBody(nil), fromIP(ip), func(r *req) {
			r.app, r.noApp = app, app == ""
		})
		wantErr(t, w, http.StatusNotFound, "not_found", nil)
	}
	if n := e.count(t, `SELECT coalesce(sum(attempts), 0) FROM auth_rate_limits WHERE action = 'claim'`); n != 0 {
		t.Fatalf("refused requests were counted: %d", n)
	}
	if w := e.post(token, claimBody(nil), func(r *req) { r.noSecret = true }); w.Code != http.StatusNotFound {
		t.Fatalf("no proxy secret: %d", w.Code)
	}
}

// R4: claims per IP, 30 per hour; the 31st is a 429 with Retry-After. A good request counts one, whatever it
// answers.
func TestPostIsRateLimitedPerIP(t *testing.T) {
	e := newEnv(t)
	ip := "203.0.113.7"
	for i := 0; i < 30; i++ {
		if w := e.post(newToken(), claimBody(nil), fromIP(ip)); w.Code != http.StatusForbidden {
			t.Fatalf("request %d: %d %s", i, w.Code, w.Body.String())
		}
	}
	w := e.post(newToken(), claimBody(nil), fromIP(ip))
	if w.Code != http.StatusTooManyRequests || w.Header().Get("Retry-After") == "" {
		t.Fatalf("%d %v", w.Code, w.Header())
	}
	wantJSON(t, w, obj{"error": obj{"code": "rate_limited", "message": "Too many requests. Try again in a minute."}})
	// another IP is untouched
	if w := e.post(newToken(), claimBody(nil), fromIP("203.0.113.8")); w.Code != http.StatusForbidden {
		t.Fatalf("%d", w.Code)
	}
	// and the window ends
	e.clk.Advance(time.Hour)
	if w := e.post(newToken(), claimBody(nil), fromIP(ip)); w.Code != http.StatusForbidden {
		t.Fatalf("after the window: %d", w.Code)
	}
}

// readJsonBody (service/request.ts): anything that is not a JSON object is a plain `invalid`, without fields.
func TestPostBodyMustBeAnObject(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: "+639175550142"})
	for name, body := range map[string]string{
		"empty": "", "text": "nope", "array": "[]", "null": "null", "number": "5", "string": `"s"`, "true": "true",
		"too large": `{"fullName":"` + strings.Repeat("a", 20<<10) + `"}`,
	} {
		w := e.post(token, body)
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
			continue
		}
		wantErr(t, w, http.StatusUnprocessableEntity, "invalid", nil)
	}
	// {} is an object: it gets as far as the email
	wantErr(t, e.post(token, "{}"), http.StatusUnprocessableEntity, "invalid", fields1("email", msgEmailInvalid))
}

// The route checks a typed phone only when there is one, and with its own copy.
func TestPostTypedPhone(t *testing.T) {
	e := newEnv(t)
	for _, phone := range []string{"12345", "+1 917 555 0142", "abc", "9175550142", "0917555014", "0917 555 0142 x"} {
		w := e.post(newToken(), claimBody(obj{"phone": phone}))
		wantErr(t, w, http.StatusUnprocessableEntity, "invalid", fields1("phone", msgPhoneRoute))
	}
	// blank (or not text at all) is no phone: the request goes on to the link, which is unknown
	for _, phone := range []any{"", "   \t", nil, 12345, true} {
		wantErr(t, e.post(newToken(), claimBody(obj{"phone": phone})), http.StatusForbidden, "forbidden", fields1("link", msgExpired))
	}
	// a good one in any of the accepted spellings
	for _, phone := range []string{"0917 555 0142", "+63 917 555 0142", "639175550142", " 0917-555-0142 "} {
		wantErr(t, e.post(newToken(), claimBody(obj{"phone": phone})), http.StatusForbidden, "forbidden", fields1("link", msgExpired))
	}
}

func TestPostEmail(t *testing.T) {
	e := newEnv(t)
	for name, email := range map[string]any{
		"missing": nil, "blank": "   ", "no at": "ana.example.com", "number": 5, "two ats": "a@b@c", "inner space": "an a@example.com",
		"no name": "@example.com", "no domain": "ana@", "too long": strings.Repeat("a", 250) + "@b.co",
	} {
		w := e.post(newToken(), claimBody(obj{"email": email}))
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
			continue
		}
		wantErr(t, w, http.StatusUnprocessableEntity, "invalid", fields1("email", msgEmailInvalid))
	}
	// goes on to the link (unknown): trimmed, any case
	wantErr(t, e.post(newToken(), claimBody(obj{"email": "  Ana@Example.COM "})), http.StatusForbidden, "forbidden", fields1("link", msgExpired))
}

// An empty password is the TypeScript message; the policy is Supabase's minimum of six characters and nothing else.
func TestPostPassword(t *testing.T) {
	e := newEnv(t)
	for name, pw := range map[string]any{"missing": nil, "empty": "", "number": 123456} {
		wantErr(t, e.post(newToken(), claimBody(obj{"password": pw})), http.StatusUnprocessableEntity, "invalid", fields1("password", msgPassEmpty))
		_ = name
	}
	for _, pw := range []string{"1", "12345", "ééééé"} {
		wantErr(t, e.post(newToken(), claimBody(obj{"password": pw})), http.StatusUnprocessableEntity, "invalid", fields1("password", msgPassShort))
	}
	wantErr(t, e.post(newToken(), claimBody(obj{"password": strings.Repeat("a", 1025)})), http.StatusUnprocessableEntity, "invalid", fields1("password", "Use 1024 characters or fewer."))
	// six spaces and six characters pass; so does 1024
	for _, pw := range []string{"      ", "abcdef", strings.Repeat("a", 1024)} {
		wantErr(t, e.post(newToken(), claimBody(obj{"password": pw})), http.StatusForbidden, "forbidden", fields1("link", msgExpired))
	}
}

// The order the TypeScript answered in: body, typed phone, email, password, then the link, then the details.
func TestPostPrecedence(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	expired, _ := e.recordLink(t, club, recordOpts{phone: "+639175550142", expires: time.Second})
	revoked, _ := e.recordLink(t, club, recordOpts{phone: "+639175550143", state: "revoked"})
	e.clk.Advance(time.Minute)
	bad := obj{"phone": "1", "email": "nope", "password": ""}
	wantErr(t, e.post(newToken(), claimBody(bad)), http.StatusUnprocessableEntity, "invalid", fields1("phone", msgPhoneRoute))
	bad["phone"] = ""
	wantErr(t, e.post(newToken(), claimBody(bad)), http.StatusUnprocessableEntity, "invalid", fields1("email", msgEmailInvalid))
	bad["email"] = "a@b.co"
	wantErr(t, e.post(newToken(), claimBody(bad)), http.StatusUnprocessableEntity, "invalid", fields1("password", msgPassEmpty))
	// an unknown, revoked or expired link is 403 even when the details are no good
	badDetails := obj{"fullName": " ", "experienceYears": -4}
	for name, token := range map[string]string{"unknown": newToken(), "revoked": revoked, "expired": expired} {
		w := e.post(token, claimBody(badDetails))
		if w.Code != http.StatusForbidden {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
			continue
		}
		wantErr(t, w, http.StatusForbidden, "forbidden", fields1("link", msgExpired))
	}
}

// The branch checks of completeClaim and completeRecordClaim, each in its order, for both kinds of link.
func TestPostLinkBranchErrors(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	otherPhone := "+639175550199"
	// a registered player owns this phone and this email
	e.exec(t, `INSERT INTO players (id, full_name, profile_state, updated_at) VALUES ($1, 'Owner', 'claimed', now())`, uuid.MustParse("00000000-0000-4000-8000-000000000001"))
	e.exec(t, `INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, 'taken@example.com', now())`, uuid.MustParse("00000000-0000-4000-8000-000000000001"), otherPhone)
	ident := e.identityOnly(t, "login-only@example.com")
	_ = ident
	rec := func(o recordOpts) string { tok, _ := e.recordLink(t, club, o); return tok }
	ply := func(o playerOpts) string { tok, _ := e.playerLink(t, club, o); return tok }
	linked := e.playerOnly(t)
	type c struct {
		name   string
		token  string
		body   obj
		status int
		code   string
		fields map[string]string
	}
	cases := []c{
		// record link
		{"record expired", rec(recordOpts{phone: e.phone(), expires: -time.Minute}), nil, 403, "forbidden", fields1("link", msgExpired)},
		{"record removed", rec(recordOpts{phone: e.phone(), removed: true}), nil, 403, "forbidden", fields1("link", msgExpired)},
		{"record already registered", rec(recordOpts{phone: e.phone(), linkedTo: linked}), nil, 403, "forbidden", fields1("link", msgRegistered)},
		{"record consumed but not linked", rec(recordOpts{phone: e.phone(), state: "consumed"}), nil, 403, "forbidden", fields1("link", msgExpired)},
		{"record no phone anywhere", rec(recordOpts{}), nil, 422, "invalid", fields1("phone", msgNeedsPhone)},
		{"record intake without a phone", rec(recordOpts{email: "x@y.co"}), nil, 422, "invalid", fields1("phone", msgNeedsPhone)},
		{"record phone taken", rec(recordOpts{phone: otherPhone}), nil, 409, "conflict", fields1("phone", msgPhoneTaken)},
		{"record typed phone taken", rec(recordOpts{}), obj{"phone": "0917 555 0199"}, 409, "conflict", fields1("phone", msgPhoneTaken)},
		{"record email taken by a contact", rec(recordOpts{phone: e.phone()}), obj{"email": "Taken@Example.com"}, 409, "conflict", fields1("email", msgEmailTaken)},
		{"record email taken by a login", rec(recordOpts{phone: e.phone()}), obj{"email": "login-only@example.com"}, 409, "conflict", fields1("email", msgEmailTaken)},
		// player link
		{"player expired", ply(playerOpts{phone: e.phone(), expires: -time.Minute}), nil, 403, "forbidden", fields1("link", msgExpired)},
		{"player already registered", ply(playerOpts{phone: e.phone(), claimed: true}), nil, 403, "forbidden", fields1("link", msgRegistered)},
		{"player without an RTR ID", ply(playerOpts{phone: e.phone(), noAllocation: true}), nil, 422, "invalid", fields1("link", msgExpired)},
		{"player no contact, no phone", ply(playerOpts{}), nil, 422, "invalid", fields1("phone", msgNeedsPhone)},
		{"player no contact, typed phone taken", ply(playerOpts{}), obj{"phone": "09175550199"}, 409, "conflict", fields1("phone", msgPhoneTaken)},
		{"player email taken by another", ply(playerOpts{phone: e.phone()}), obj{"email": "taken@example.com"}, 409, "conflict", fields1("email", msgEmailTaken)},
		{"player email taken by a login", ply(playerOpts{phone: e.phone()}), obj{"email": "login-only@example.com"}, 409, "conflict", fields1("email", msgEmailTaken)},
		{"player staged account, link still active", ply(playerOpts{phone: e.phone(), withAccount: true}), nil, 409, "conflict", nil},
	}
	// every case gets its own phone-free expectations; a record's expired link needs the clock past nothing:
	// negative expiry is "already past" for the check, but the table requires expires_at > issued_at, so those
	// two links are made with a short life and the clock moves on
	e.clk.Advance(0)
	for _, tc := range cases {
		body := obj{}
		for k, v := range tc.body {
			body[k] = v
		}
		w := e.post(tc.token, claimBody(body))
		if w.Code != tc.status {
			t.Errorf("%s: %d %s", tc.name, w.Code, w.Body.String())
			continue
		}
		wantErr(t, w, tc.status, tc.code, tc.fields)
	}
	if n := e.count(t, `SELECT count(*) FROM auth_identities WHERE login_key = 'ana@example.com'`); n != 0 {
		t.Fatalf("a refused claim created an identity")
	}
}

// Details that fail the profile rules are refused before anything is written: the TypeScript saved them after the
// claim and could leave a claimed profile behind an error. The link stays usable.
func TestPostInvalidDetailsWriteNothing(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	recToken, rec := e.recordLink(t, club, recordOpts{phone: "+639175550142"})
	plyToken, ply := e.playerLink(t, club, playerOpts{phone: "+639175550143", email: "staged@club.test"})
	snapshot := func() []int {
		return []int{
			e.count(t, `SELECT count(*) FROM players`), e.count(t, `SELECT count(*) FROM player_private_contacts`),
			e.count(t, `SELECT count(*) FROM player_accounts`), e.count(t, `SELECT count(*) FROM auth_identities`),
			e.count(t, `SELECT count(*) FROM player_id_allocations`), e.count(t, `SELECT coalesce(sum(last_sequence), 0) FROM player_id_counters`),
			e.count(t, `SELECT count(*) FROM auth_sessions`), e.count(t, `SELECT count(*) FROM player_social_links`),
			e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'active'`),
			e.count(t, `SELECT count(*) FROM player_claim_links WHERE state = 'active'`),
		}
	}
	before := snapshot()
	long := strings.Repeat("a", 61)
	for name, tc := range map[string]struct {
		over  obj
		field string
		msg   string
	}{
		"blank name":    {obj{"fullName": "  "}, "fullName", "Enter your full name."},
		"long name":     {obj{"fullName": long}, "fullName", "Keep your name to 60 characters or fewer."},
		"long nickname": {obj{"nickname": strings.Repeat("n", 25)}, "nickname", "Keep your nickname to 24 characters or fewer."},
		"months":        {obj{"experienceYears": 1, "experienceMonths": 12}, "experience", "Enter years and months of experience."},
		"text years":    {obj{"experienceYears": "3"}, "experience", "Enter years and months of experience."},
		"fraction":      {obj{"experienceMonths": 1.5}, "experience", "Enter years and months of experience."},
		"http link":     {obj{"socialLinks": obj{"facebook": "http://facebook.com/a"}}, "facebook", "Enter a full Facebook link, like https://facebook.com/yourname."},
		"wrong host":    {obj{"socialLinks": obj{"youtube": "https://vimeo.com/a"}}, "youtube", "Enter a full YouTube link, like https://youtube.com/@yourchannel."},
		"NUL in a name": {obj{"fullName": "Ana\u0000"}, "fullName", "Check the details and try again."},
	} {
		for _, token := range []string{recToken, plyToken} {
			wantErr(t, e.post(token, claimBody(tc.over)), http.StatusUnprocessableEntity, "invalid", fields1(tc.field, tc.msg))
		}
		if got := snapshot(); !equalInts(got, before) {
			t.Fatalf("%s wrote something: %v -> %v", name, before, got)
		}
	}
	_, _ = rec, ply
	// the staged contact and the record are untouched, and the links still work
	var email string
	if err := e.pool.QueryRow(e.ctx, `SELECT email FROM player_private_contacts WHERE player_id = $1`, ply).Scan(&email); err != nil || email != "staged@club.test" {
		t.Fatalf("%q %v", email, err)
	}
	if w := e.post(recToken, claimBody(nil)); w.Code != http.StatusOK {
		t.Fatalf("the link still works: %d %s", w.Code, w.Body.String())
	}
}

// phone is a fresh Philippine mobile number in E.164.
func (e *env) phone() string { return fmt.Sprintf("+63918%07d", e.seq.Add(1)) }

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// identityOnly makes a player sign-in identity with no player behind it (an email in use as a login key).
func (e *env) identityOnly(t testing.TB, email string) uuid.UUID {
	t.Helper()
	ident, err := e.st.InsertIdentity(e.ctx, storeNewIdentity(email))
	if err != nil {
		t.Fatal(err)
	}
	return ident.ID
}
