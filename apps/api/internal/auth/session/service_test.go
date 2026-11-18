package session_test

import (
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

func TestNewValidatesItsDependencies(t *testing.T) {
	e := newEnv(t)
	good := session.Deps{Store: e.st, Signer: e.signer, Verifier: e.verifier, Hasher: e.hasher, Tuning: e.tuning, SigningKey: e.key, Clock: e.clk.Now}
	if _, err := session.New(good); err != nil {
		t.Fatal(err)
	}
	for name, mut := range map[string]func(*session.Deps){
		"no store":       func(d *session.Deps) { d.Store = nil },
		"no signer":      func(d *session.Deps) { d.Signer = nil },
		"no verifier":    func(d *session.Deps) { d.Verifier = nil },
		"no hasher":      func(d *session.Deps) { d.Hasher = nil },
		"negative grace": func(d *session.Deps) { d.Tuning.RefreshGrace = -time.Second },
		"negative ttl":   func(d *session.Deps) { d.Tuning.RevocationCacheTTL = -time.Second },
		"a zero limit":   func(d *session.Deps) { d.Tuning.Limits.LoginFailures = config.AuthLimit{} },
		"a zero window":  func(d *session.Deps) { d.Tuning.Limits.ClaimIP = config.AuthLimit{Max: 1} },
		"signing key is not the signer's key": func(d *session.Deps) {
			other, _ := pass.GenerateKey(nil)
			d.SigningKey = other
		},
	} {
		d := good
		mut(&d)
		if _, err := session.New(d); err == nil {
			t.Errorf("%s: want an error", name)
		}
	}
}

func TestServiceExposesItsParts(t *testing.T) {
	e := newEnv(t)
	if e.svc.Hasher() != e.hasher || e.svc.Limiter() == nil || e.svc.Authenticator() == nil {
		t.Fatal("phase 3 builds credential sign-in on these")
	}
}

func TestNilClockMeansTheRealClockAndNilLoggerIsFine(t *testing.T) {
	e := newEnv(t)
	svc, err := session.New(session.Deps{Store: e.st, Signer: e.signer, Verifier: e.verifier, Hasher: e.hasher, Tuning: e.tuning})
	if err != nil {
		t.Fatal(err)
	}
	club := e.newClub(t, "realclock")
	iss, err := svc.Issue(e.ctx, session.IssueInput{Identity: club.ident, AccountID: club.accountID})
	if err != nil {
		t.Fatal(err)
	}
	if d := time.Since(iss.Session.CreatedAt); d < -time.Minute || d > time.Minute {
		t.Fatalf("created %v ago", d)
	}
}

func TestRefreshLifetimeHelpers(t *testing.T) {
	mustEqual(t, "club", session.RefreshLifetime("club"), 30*24*time.Hour)
	mustEqual(t, "player", session.RefreshLifetime("player"), 30*24*time.Hour)
	mustEqual(t, "admin", session.RefreshLifetime("admin"), 12*time.Hour)
	if !session.ExtendsOnUse("club") || !session.ExtendsOnUse("player") || session.ExtendsOnUse("admin") {
		t.Fatal("club and player extend, admin does not")
	}
}
