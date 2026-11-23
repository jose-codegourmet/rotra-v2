package signin_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// The Player app's navigation hint for the Google deadline gate (D-2026-11-16-01) is kept in step with the account on the
// password sign-in and on the session read, as syncGoogleGateHint does: the hook sets or clears its cookie before the body.
func TestPlayerSessionHookRunsOnPlayerSignInAndSessionReadOnly(t *testing.T) {
	e := newEnv(t)
	var calls []uuid.UUID
	e.hook = func(w http.ResponseWriter, _ *http.Request, id uuid.UUID) {
		calls = append(calls, id)
		http.SetCookie(w, &http.Cookie{Name: "hint", Value: "1", Path: "/"})
	}
	p := e.newPlayer(t, "pat@example.test", "Pat Reyes")
	w := e.signIn("player", cred("pat@example.test", goodPass))
	if w.Code != http.StatusOK || len(calls) != 1 || calls[0] != p.accountID {
		t.Fatalf("sign-in: %d calls %v", w.Code, calls)
	}
	if got := w.Result().Cookies(); !hasCookie(got, "hint") || !hasCookie(got, "rotra-player-access") {
		t.Fatalf("the hint is set with the session's cookies: %v", got)
	}
	read := e.getSession(store.AudiencePlayer, w.Result().Cookies()...)
	if read.Code != http.StatusOK || len(calls) != 2 || calls[1] != p.accountID || !hasCookie(read.Result().Cookies(), "hint") {
		t.Fatalf("session read: %d calls %v cookies %v", read.Code, calls, read.Result().Cookies())
	}
	// Nothing runs for a wrong password, for a signed-out read, or for the other apps.
	e.signIn("player", cred("pat@example.test", "wrong password here"))
	e.getSession(store.AudiencePlayer)
	club := e.newClub(t, "smash", "Smash Club")
	_ = club
	e.signIn("club", cred("smash", goodPass))
	if len(calls) != 2 {
		t.Fatalf("the hook ran %d times", len(calls))
	}
}

func hasCookie(cs []*http.Cookie, name string) bool {
	for _, c := range cs {
		if c.Name == name {
			return true
		}
	}
	return false
}
