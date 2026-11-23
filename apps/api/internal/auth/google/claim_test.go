package google_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func claimBody(over obj) obj {
	b := obj{"fullName": "Gary Guest", "nickname": "G", "playingStyle": "", "experienceYears": nil, "experienceMonths": nil, "socialLinks": obj{"facebook": "", "instagram": "", "youtube": "", "linkedin": ""}, "phone": "0917 555 0302"}
	for k, v := range over {
		b[k] = v
	}
	return b
}

// holdGoogle runs a registration-link trip so the browser holds the Google account for the claim form.
func holdGoogle(t *testing.T, b *browser, email string) {
	t.Helper()
	b.trip(t, "claim", "claim", "/claim/x", claims{"email": email, "name": "Gary G"})
	wantOutcome(t, readOutcome(t, b), obj{"outcome": "new-account"})
}

func TestAGuestsLinkIsClaimedWithGoogleAndNeverNeedsAPassword(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, rec := e.recordLink(t, club, recordOpts{})
	b := e.browser()
	holdGoogle(t, b, "gary@example.test")

	w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	got := decode(t, w)
	if got["outcome"] != "claimed" || got["firstName"] != "G" || !strings.HasPrefix(got["rtrId"].(string), "RTR-PH-CEB-") {
		t.Fatalf("%s", w.Body.String())
	}
	playerID := got["playerId"].(string)
	if got["session"].(obj)["account"].(obj)["id"] != playerID {
		t.Fatalf("%s", w.Body.String())
	}
	if !b.has(accessCookie()) {
		t.Fatal("the player is signed in")
	}
	// The Google email is the confirmed ROTRA email and the connected Google; the login has no password.
	var google, rotra, loginKey, hash string
	if err := e.pool.QueryRow(e.ctx, `SELECT a.google_email, c.email, i.login_key, i.password_hash FROM player_accounts a
	  JOIN player_private_contacts c ON c.player_id = a.player_id JOIN auth_identities i ON i.id = a.auth_subject WHERE a.player_id = $1`, playerID).Scan(&google, &rotra, &loginKey, &hash); err != nil {
		t.Fatal(err)
	}
	if google != "gary@example.test" || rotra != "gary@example.test" || loginKey != "gary@example.test" || hash != "" {
		t.Fatalf("google %q rotra %q login %q hash %q", google, rotra, loginKey, hash)
	}
	if e.count(t, `SELECT count(*) FROM club_players WHERE id = $1 AND player_id = $2`, rec, playerID) != 1 {
		t.Fatal("the club's record became the player's")
	}
	if e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'consumed'`) != 1 {
		t.Fatal("the link is used")
	}
	if b.has("rotra-player-google-held") {
		t.Fatal("the held Google account is gone once it is used")
	}
	// The same player signs in with Google from now on, and the password route refuses the login.
	again := e.browser()
	again.trip(t, "login", "login", "/me", claims{"email": "gary@example.test"})
	if !again.has(accessCookie()) {
		t.Fatal("the Google that claimed the profile signs it in")
	}
	pw := e.browser().do(t, req{method: "POST", path: "/api/auth/sign-in", body: obj{"identifier": "gary@example.test", "password": "correct horse battery"}})
	if pw.Code != http.StatusUnauthorized {
		t.Fatalf("a login made with Google has no password: %d", pw.Code)
	}
}

func TestAClaimWithGoogleNeedsTheHeldAccountAndTheLinkKeepsItsOwnRules(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{})

	// Nothing held: the same failure as any lost trip, and nothing is created.
	if w := e.browser().do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)}); w.Code != http.StatusUnprocessableEntity || !strings.Contains(w.Body.String(), "Couldn't finish with Google") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	// A guest has no phone on file: the person types their own, and a bad one is refused before anything is written.
	b := e.browser()
	holdGoogle(t, b, "gary@example.test")
	for name, body := range map[string]any{
		"bad phone":      claimBody(obj{"phone": "12345"}),
		"no phone":       claimBody(obj{"phone": ""}),
		"not an object":  `[]`,
		"no name":        claimBody(obj{"fullName": ""}),
		"bad experience": claimBody(obj{"experienceYears": "x"}),
	} {
		w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: body})
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: %d %s", name, w.Code, w.Body.String())
		}
		if e.count(t, `SELECT count(*) FROM player_accounts`) != 0 || !b.has("rotra-player-google-held") {
			t.Fatalf("%s: a refused claim must create nothing and keep the held account for the retry", name)
		}
	}
	// An unknown, used or expired link is the claim's own refusal.
	if w := b.do(t, req{method: "POST", path: "/api/claim/nope/google", body: claimBody(nil)}); w.Code != http.StatusForbidden {
		t.Fatalf("unknown link: %d %s", w.Code, w.Body.String())
	}
}

func TestAClaimWithAGoogleThatAnAccountAlreadyHasIsTaken(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{})
	b := e.browser()
	holdGoogle(t, b, "gary@example.test")
	e.player(t, playerOpts{email: "other@example.test", google: "gary@example.test"}) // won meanwhile
	w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"outcome":"taken"`) || !strings.Contains(w.Body.String(), "gary@example.test") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if b.has("rotra-player-google-held") || b.has(accessCookie()) || e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'consumed'`) != 0 {
		t.Fatal("taken drops the held account, signs nobody in and uses no link")
	}
	// The trip itself found the Google on an account (claim intent): the form is told the same, with nothing held.
	c := e.browser()
	c.trip(t, "claim", "claim", "/claim/x", claims{"email": "gary@example.test"})
	if w := c.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)}); !strings.Contains(w.Body.String(), `"outcome":"taken"`) {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}

func TestAReplayAfterTheClaimWorkedSignsNobodyInAndMakesNothing(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{})
	b := e.browser()
	holdGoogle(t, b, "gary@example.test")
	held := b.cookies["rotra-player-google-held"].Value
	if w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)}); w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	// A second tab that still carries the held cookie: that Google is on an account now (claimWithGoogle answers taken).
	b2 := e.browser()
	b2.cookies["rotra-player-google-held"] = &http.Cookie{Name: "rotra-player-google-held", Value: held}
	w := b2.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"outcome":"taken"`) || b2.has(accessCookie()) {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if e.count(t, `SELECT count(*) FROM player_accounts`) != 1 {
		t.Fatal("a replay must not make another account")
	}
}

func TestAnotherGoogleOnAUsedLinkIsAPlainFailureNotAPasswordMismatch(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{})
	first := e.browser()
	holdGoogle(t, first, "gary@example.test")
	if w := first.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)}); w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	second := e.browser()
	holdGoogle(t, second, "someone.else@example.test")
	w := second.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if w.Code != http.StatusUnprocessableEntity || !strings.Contains(w.Body.String(), "Couldn't finish with Google") || strings.Contains(w.Body.String(), "password") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if second.has(accessCookie()) || e.count(t, `SELECT count(*) FROM player_accounts`) != 1 {
		t.Fatal("the second Google got nothing from a used link")
	}
}

func TestAClaimOfARecordWithAPhoneOnFileKeepsThatPhone(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{name: "Rita Record", phone: "+639175550401"})
	b := e.browser()
	holdGoogle(t, b, "rita@example.test")
	w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(obj{"phone": "", "fullName": "Rita Record"})})
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if e.count(t, `SELECT count(*) FROM player_private_contacts WHERE phone_e164 = '+639175550401' AND email = 'rita@example.test'`) != 1 {
		t.Fatal("the phone on file is kept and the Google email is the ROTRA email")
	}
}

func TestAClaimLimitsThePerAddressAttempts(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	b := e.browser()
	var last int
	for i := 0; i < 40 && last != http.StatusTooManyRequests; i++ {
		last = b.do(t, req{method: "POST", path: "/api/claim/" + uuid.NewString() + "/google", body: claimBody(nil)}).Code
	}
	if last != http.StatusTooManyRequests {
		t.Fatalf("no limit after 40 attempts from one address (last %d)", last)
	}
}

// A later trip that decides something else must not leave the earlier held Google account usable: the claim would otherwise be made
// with an account the player did not just pick.
func TestAStaleHeldGoogleAccountDoesNotSurviveALaterTrip(t *testing.T) {
	e := newEnv(t)
	e.flag(t, true)
	e.player(t, playerOpts{email: "taken@example.test", google: "taken@example.test"})
	club := e.club(t, "Lahug Smash Club")
	token, _ := e.recordLink(t, club, recordOpts{})
	b := e.browser()
	holdGoogle(t, b, "first@example.test")
	if !b.has("rotra-player-google-held") {
		t.Fatal("the first trip holds its Google account")
	}
	b.trip(t, "claim", "claim", "/claim/x", claims{"email": "taken@example.test"})
	if b.has("rotra-player-google-held") {
		t.Fatal("a trip that decided taken leaves nothing held")
	}
	// The result of that trip says taken; it is not a held account to claim with.
	w := b.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if got := decode(t, w); got["outcome"] != "taken" || got["email"] != "taken@example.test" {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	if e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'consumed'`) != 0 {
		t.Fatal("nothing was claimed")
	}
	// Same for a login trip that found no account: no held account is left behind either.
	b2 := e.browser()
	holdGoogle(t, b2, "second@example.test")
	b2.trip(t, "login", "login", "/login", claims{"email": "nobody@example.test"})
	if b2.has("rotra-player-google-held") {
		t.Fatal("a not-connected trip leaves nothing held")
	}
	w = b2.do(t, req{method: "POST", path: "/api/claim/" + token + "/google", body: claimBody(nil)})
	if w.Code != http.StatusUnprocessableEntity || !strings.Contains(w.Body.String(), "Couldn't finish with Google") {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}
