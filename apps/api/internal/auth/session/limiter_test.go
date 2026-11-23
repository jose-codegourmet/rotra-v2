package session_test

import (
	"crypto/ed25519"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

func limited(err error) (*session.RateLimitedError, bool) {
	var rl *session.RateLimitedError
	if errors.Is(err, session.ErrRateLimited) && errors.As(err, &rl) {
		return rl, true
	}
	return nil, false
}

func attempt(login, ip string) session.SignInAttempt {
	return session.SignInAttempt{Audience: store.AudienceClub, LoginKey: login, IP: ip}
}

func TestWrongPasswordsLockOneAccountNotOthers(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	a := attempt("smash-club", "203.0.113.1")
	for i := 1; i <= 5; i++ {
		if err := l.BeginSignIn(e.ctx, a); err != nil {
			t.Fatalf("attempt %d is allowed: %v", i, err)
		}
		if err := l.RecordWrongPassword(e.ctx, a); err != nil {
			t.Fatal(err)
		}
	}
	rl, ok := limited(l.BeginSignIn(e.ctx, a))
	if !ok {
		t.Fatal("after 5 wrong passwords the 6th attempt is refused, even before checking the password")
	}
	mustEqual(t, "retry-after at the window start", rl.RetryAfterSeconds(), 900)
	e.clk.Advance(5 * time.Minute)
	rl, _ = limited(l.BeginSignIn(e.ctx, a))
	mustEqual(t, "retry-after five minutes in", rl.RetryAfterSeconds(), 600)

	// The same account written differently is the same account.
	if _, ok := limited(l.BeginSignIn(e.ctx, attempt("  SMASH-Club ", "203.0.113.2"))); !ok {
		t.Fatal("case and spaces do not make a new account")
	}
	// Another audience, another account, and another IP are not affected.
	p := a
	p.Audience = store.AudiencePlayer
	if err := l.BeginSignIn(e.ctx, p); err != nil {
		t.Fatalf("same key, other audience: %v", err)
	}
	if err := l.BeginSignIn(e.ctx, attempt("other-club", "203.0.113.1")); err != nil {
		t.Fatalf("another account: %v", err)
	}
	e.clk.Advance(10 * time.Minute) // the next 15 minute window
	if err := l.BeginSignIn(e.ctx, a); err != nil {
		t.Fatalf("a new window starts clean: %v", err)
	}
}

func TestSuccessfulSignInsDoNotCountAgainstTheAccount(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	for i := 0; i < 20; i++ { // a club's helpers signing in on their own phones
		a := attempt("busy-club", "203.0.113.1")
		dev := uuid.New()
		a.DeviceID = &dev
		if err := l.BeginSignIn(e.ctx, a); err != nil {
			t.Fatalf("sign-in %d: %v", i, err)
		}
	}
}

func TestAFullVenueOnOneIPIsNotLimited(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	for i := 0; i < 30; i++ { // 30 sign-ins from one IP in 15 minutes (R4)
		dev := uuid.New()
		a := session.SignInAttempt{Audience: store.AudiencePlayer, LoginKey: uniq("player", i) + "@example.test", DeviceID: &dev, IP: "198.51.100.20"}
		if err := l.BeginSignIn(e.ctx, a); err != nil {
			t.Fatalf("sign-in %d of a venue night: %v", i, err)
		}
		e.clk.Advance(20 * time.Second)
	}
	// The generous limit still exists: 100 per 15 minutes per IP.
	e.clk.Set(base.Add(15 * time.Minute))
	for i := 0; i < 100; i++ {
		dev := uuid.New()
		if err := l.BeginSignIn(e.ctx, session.SignInAttempt{Audience: store.AudiencePlayer, LoginKey: uniq("p", i), DeviceID: &dev, IP: "198.51.100.21"}); err != nil {
			t.Fatalf("attempt %d of 100: %v", i, err)
		}
	}
	if _, ok := limited(l.BeginSignIn(e.ctx, session.SignInAttempt{Audience: store.AudiencePlayer, LoginKey: "one-more", IP: "198.51.100.21"})); !ok {
		t.Fatal("the 101st attempt from one IP is limited")
	}
}

func TestDeviceLimitIsNeverTheOnlyDimension(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.Limits.IPAttempts = config.AuthLimit{Max: 15, Window: 15 * time.Minute} })
	l := e.svc.Limiter()
	dev := uuid.New()
	for i := 0; i < 10; i++ {
		a := attempt(uniq("c", i), "10.1.0."+string(rune('0'+i)))
		a.DeviceID = &dev
		if err := l.BeginSignIn(e.ctx, a); err != nil {
			t.Fatalf("attempt %d from one device: %v", i, err)
		}
	}
	a := attempt("c11", "10.1.0.9")
	a.DeviceID = &dev
	if _, ok := limited(l.BeginSignIn(e.ctx, a)); !ok {
		t.Fatal("the 11th attempt from one device is limited, whatever the IP")
	}
	// A fresh device id each time does not dodge the IP limit.
	for i := 0; i < 15; i++ {
		d := uuid.New()
		a := attempt(uniq("x", i), "10.2.0.1")
		a.DeviceID = &d
		if err := l.BeginSignIn(e.ctx, a); err != nil {
			t.Fatalf("attempt %d: %v", i, err)
		}
	}
	d := uuid.New()
	a = attempt("x16", "10.2.0.1")
	a.DeviceID = &d
	if _, ok := limited(l.BeginSignIn(e.ctx, a)); !ok {
		t.Fatal("rotating device ids must not escape the per-IP limit")
	}
}

func TestClaimAndResetRequestLimitsPerIP(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	for i := 0; i < 30; i++ {
		if err := l.CheckClaim(e.ctx, "203.0.113.7"); err != nil {
			t.Fatalf("claim %d: %v", i, err)
		}
		if err := l.CheckResetRequest(e.ctx, "203.0.113.7"); err != nil {
			t.Fatalf("reset request %d (counted apart from claims): %v", i, err)
		}
	}
	rl, ok := limited(l.CheckClaim(e.ctx, "203.0.113.7"))
	if !ok || rl.RetryAfterSeconds() != 3600 {
		t.Fatalf("the 31st claim in an hour is limited for the rest of the hour: %v", rl)
	}
	if _, ok := limited(l.CheckResetRequest(e.ctx, "203.0.113.7")); !ok {
		t.Fatal("the 31st reset request too")
	}
	if err := l.CheckClaim(e.ctx, "203.0.113.8"); err != nil {
		t.Fatalf("another IP: %v", err)
	}
	e.clk.Advance(time.Hour)
	if err := l.CheckClaim(e.ctx, "203.0.113.7"); err != nil {
		t.Fatalf("the next hour: %v", err)
	}
}

func TestRetryAfterIsTheRestOfTheWindow(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.Limits.IPAttempts = config.AuthLimit{Max: 1, Window: 15 * time.Minute} })
	l := e.svc.Limiter()
	e.clk.Set(base.Add(14*time.Minute + 59*time.Second))
	if err := l.BeginSignIn(e.ctx, attempt("a", "192.0.2.1")); err != nil {
		t.Fatal(err)
	}
	rl, ok := limited(l.BeginSignIn(e.ctx, attempt("b", "192.0.2.1")))
	if !ok || rl.RetryAfterSeconds() != 1 {
		t.Fatalf("one second left: %+v", rl)
	}
}

func TestLoginSubjectIsAKeyedHashNotTheEmail(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	const login = "secret.person@example.test"
	a := session.SignInAttempt{Audience: store.AudiencePlayer, LoginKey: login, IP: "192.0.2.1"}
	if err := l.RecordWrongPassword(e.ctx, a); err != nil {
		t.Fatal(err)
	}
	var subject string
	if err := e.pool.QueryRow(e.ctx, `SELECT subject FROM auth_rate_limits WHERE scope = 'login'`).Scan(&subject); err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9a-f]{64}$`).MatchString(subject) || strings.Contains(subject, "secret") || subject != l.LoginSubject(store.AudiencePlayer, login) {
		t.Fatalf("stored subject %q", subject)
	}
	if e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE subject LIKE '%secret%' OR subject LIKE '%example%'`) != 0 {
		t.Fatal("the table must never hold a reversible login")
	}
	if l.LoginSubject(store.AudienceClub, login) == subject {
		t.Fatal("the audience is part of the subject")
	}
	if l.LoginSubject(store.AudiencePlayer, " SECRET.person@example.test") != subject {
		t.Fatal("the key is normalized first")
	}

	mk := func(key ed25519.PrivateKey) *session.Limiter {
		lim, err := session.NewLimiter(e.st, e.tuning.Limits, key, e.clk.Now, nil)
		if err != nil {
			t.Fatal(err)
		}
		return lim
	}
	if mk(e.key).LoginSubject(store.AudiencePlayer, login) != subject {
		t.Fatal("the same signing key gives the same subject across restarts")
	}
	other, _ := pass.GenerateKey(nil)
	if mk(other).LoginSubject(store.AudiencePlayer, login) == subject {
		t.Fatal("another signing key gives another subject")
	}
	noKey := mk(nil)
	if s := noKey.LoginSubject(store.AudiencePlayer, login); s == subject || s != noKey.LoginSubject(store.AudiencePlayer, login) {
		t.Fatal("with no signing key a random per-process key is used, stable within the process")
	}
}

func TestFailedSignInStillCountsWhenTheSignInTransactionRollsBack(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	boom := errors.New("sign-in failed")
	err := e.st.InTx(e.ctx, func(q *store.Queries) error {
		if err := l.BeginSignIn(e.ctx, attempt("brute", "192.0.2.50")); err != nil {
			return err
		}
		if err := l.RecordWrongPassword(e.ctx, attempt("brute", "192.0.2.50")); err != nil {
			return err
		}
		return boom
	})
	if !errors.Is(err, boom) {
		t.Fatal(err)
	}
	mustEqual(t, "login counter", e.count(t, `SELECT coalesce(sum(attempts), 0) FROM auth_rate_limits WHERE scope = 'login'`), 1)
	mustEqual(t, "ip counter", e.count(t, `SELECT coalesce(sum(attempts), 0) FROM auth_rate_limits WHERE scope = 'ip'`), 1)
}

func TestExpiredWindowsArePrunedInlineWithoutKillingLiveOnes(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	const ip = "203.0.113.30"
	if err := l.CheckClaim(e.ctx, ip); err != nil { // an hour window starting 12:00
		t.Fatal(err)
	}
	if err := l.BeginSignIn(e.ctx, attempt("a", ip)); err != nil { // a 15 minute window starting 12:00
		t.Fatal(err)
	}
	e.clk.Advance(20 * time.Minute)
	if err := l.BeginSignIn(e.ctx, attempt("a", ip)); err != nil { // first attempt of a new window prunes
		t.Fatal(err)
	}
	if err := l.CheckClaim(e.ctx, ip); err != nil {
		t.Fatal(err)
	}
	n, _ := e.st.AttemptCount(e.ctx, store.ScopeIP, ip, store.ActionClaim, base)
	mustEqual(t, "the claim window of the hour is still live and was kept", n, 2)

	e.clk.Set(base.Add(2 * time.Hour))
	if err := l.BeginSignIn(e.ctx, attempt("a", ip)); err != nil {
		t.Fatal(err)
	}
	mustEqual(t, "ip rows left: only the new sign-in window", e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE scope = 'ip' AND subject = $1`, ip), 1)
}

func TestRateLimitedEventIsWrittenOncePerExcess(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.Limits.IPAttempts = config.AuthLimit{Max: 3, Window: 15 * time.Minute} })
	l := e.svc.Limiter()
	for i := 0; i < 8; i++ {
		_ = l.BeginSignIn(e.ctx, attempt("a", "192.0.2.77"))
	}
	mustEqual(t, "rate_limited events for one flood", e.events(t, store.EventRateLimited), 1)
	mustEqual(t, "the event holds the ip, no login", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'rate_limited' AND ip = '192.0.2.77' AND identity_id IS NULL AND audience = 'club'`), 1)
}

func TestAccountLockWritesOneEvent(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	for i := 0; i < 8; i++ {
		_ = l.RecordWrongPassword(e.ctx, attempt("victim", "192.0.2.78"))
	}
	mustEqual(t, "rate_limited events", e.events(t, store.EventRateLimited), 1)
}

func TestMissingIPStillCounts(t *testing.T) {
	e := newEnv(t)
	if err := e.svc.Limiter().BeginSignIn(e.ctx, attempt("a", "")); err != nil {
		t.Fatal(err)
	}
	mustEqual(t, "unknown ip bucket", e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE scope = 'ip' AND subject = 'unknown'`), 1)
}

// R4: the counted IP is the trusted one from the proxy guard. A faked X-Forwarded-For without the proxy
// secret changes nothing; with the secret it is honoured.
func TestFakedForwardedForWithoutTheProxySecretDoesNotChangeTheCountedIP(t *testing.T) {
	e := newEnv(t)
	l := e.svc.Limiter()
	const secret = "test-proxy-secret"
	h := httpapi.ProxyGuard(secret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := l.BeginSignIn(r.Context(), attempt("a", httpapi.ClientIPFrom(r.Context()))); err != nil {
			t.Errorf("unexpected: %v", err)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	call := func(withSecret bool, xff string) {
		r := httptest.NewRequest(http.MethodGet, "/healthz", nil) // reachable without the secret
		r.RemoteAddr = "192.0.2.200:4444"
		r.Header.Set("X-Forwarded-For", xff)
		r.Header.Set("X-Real-IP", xff)
		if withSecret {
			r.Header.Set(httpapi.ProxySecretHeader, secret)
		}
		h.ServeHTTP(httptest.NewRecorder(), r)
	}
	for i := 0; i < 3; i++ {
		call(false, uniqueFakeIP(i)) // a different fake address every time
	}
	mustEqual(t, "all three counted under the connection's address", e.count(t, `SELECT coalesce(sum(attempts), 0) FROM auth_rate_limits WHERE scope = 'ip' AND subject = '192.0.2.200'`), 3)
	mustEqual(t, "no fake address was counted", e.count(t, `SELECT count(*) FROM auth_rate_limits WHERE scope = 'ip' AND subject LIKE '10.99.%'`), 0)
	call(true, "198.51.100.99")
	mustEqual(t, "with the secret the forwarded address is the client", e.count(t, `SELECT coalesce(sum(attempts), 0) FROM auth_rate_limits WHERE scope = 'ip' AND subject = '198.51.100.99'`), 1)
}

func uniqueFakeIP(i int) string { return "10.99.0." + string(rune('1'+i)) }

func TestNewLimiterValidates(t *testing.T) {
	e := newEnv(t)
	if _, err := session.NewLimiter(nil, e.tuning.Limits, e.key, e.clk.Now, nil); err == nil {
		t.Error("no store")
	}
	bad := e.tuning.Limits
	bad.IPAttempts = config.AuthLimit{}
	if _, err := session.NewLimiter(e.st, bad, e.key, e.clk.Now, nil); err == nil {
		t.Error("a zero limit")
	}
	if _, err := session.NewLimiter(e.st, e.tuning.Limits, e.key, nil, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Errorf("a nil clock means the real clock: %v", err)
	}
}

func TestRateLimitedErrorRoundsRetryAfterUp(t *testing.T) {
	for in, want := range map[time.Duration]int{0: 1, time.Millisecond: 1, time.Second: 1, 1500 * time.Millisecond: 2, 15 * time.Minute: 900} {
		e := &session.RateLimitedError{RetryAfter: in}
		mustEqual(t, in.String(), e.RetryAfterSeconds(), want)
		if !errors.Is(e, session.ErrRateLimited) || !strings.Contains(e.Error(), "retry in") {
			t.Fatal("errors.Is must match the sentinel and the text says when to retry")
		}
	}
}

func TestGoogleTripLimitHasItsOwnCounterApartFromPasswordSignIn(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) {
		c.Limits.GoogleTripIP = config.AuthLimit{Max: 3, Window: 15 * time.Minute}
		c.Limits.IPAttempts = config.AuthLimit{Max: 3, Window: 15 * time.Minute}
	})
	l := e.svc.Limiter()
	for i := 0; i < 3; i++ {
		if err := l.CheckGoogleTrip(e.ctx, "203.0.113.9"); err != nil {
			t.Fatalf("trip %d: %v", i, err)
		}
	}
	if rl, ok := limited(l.CheckGoogleTrip(e.ctx, "203.0.113.9")); !ok || rl.RetryAfterSeconds() != 900 {
		t.Fatalf("the 4th trip in 15 minutes is limited: %v", rl)
	}
	// Used up, it leaves the password sign-in of the same IP (every app's) untouched.
	if _, ok := limited(l.BeginSignIn(e.ctx, attempt("x", "203.0.113.9"))); ok {
		t.Fatal("Google trips must not use up password sign-in")
	}
	if err := l.CheckGoogleTrip(e.ctx, "203.0.113.10"); err != nil {
		t.Fatalf("another IP: %v", err)
	}
}
