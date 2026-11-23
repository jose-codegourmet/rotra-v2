package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// The Google deadline gate's navigation hint (syncGoogleGateHint): set while the player has no Google, the deadline has passed and
// the flag is on; cleared otherwise; before the deadline it reads nothing.
func TestPlayerGateHintFollowsTheAccount(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("%q: %v", sql, err)
		}
	}
	player := func(google any) uuid.UUID {
		id, subject := uuid.New(), uuid.New()
		exec(`INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision) VALUES ($1, 'player', $2, 'x', 'argon2id', now(), now(), now(), 1)`, subject, subject.String()+"@example.test")
		exec(`INSERT INTO players (id, full_name, profile_state, updated_at) VALUES ($1, 'Pat', 'claimed', now())`, id)
		exec(`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`, id, "+63917"+phoneDigits(id), id.String()+"@c.example.test")
		exec(`INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES ($1, 'rotra', $2, now(), 1, $3, $4, now())`, id, subject, google, nilIfNil(google))
		return id
	}
	flag := func(on bool) {
		exec(`INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'g', 't', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, on)
	}
	before := time.Date(2026, 12, 31, 12, 0, 0, 0, time.UTC)                  // the deadline day is not over until midnight in Manila
	after := time.Date(2027, 1, 1, 0, 0, 0, 0, time.FixedZone("PHT", 8*3600)) // the first moment past it
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	run := func(now time.Time, id uuid.UUID, hint bool) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/api/auth/session", nil)
		r.Header.Set("X-Forwarded-Proto", "https")
		if hint {
			r.AddCookie(&http.Cookie{Name: google.GateCookie, Value: "1"})
		}
		w := httptest.NewRecorder()
		playerGateHint(pool, log, func() time.Time { return now })(w, r, id)
		return w
	}
	gate := func(w *httptest.ResponseRecorder) *http.Cookie {
		for _, c := range w.Result().Cookies() {
			if c.Name == google.GateCookie {
				return c
			}
		}
		return nil
	}

	noGoogle, connected := player(nil), player("g@example.test")
	flag(true)
	if c := gate(run(after, noGoogle, false)); c == nil || c.Value != "1" || !c.HttpOnly || !c.Secure || c.MaxAge != 86400 || c.Path != "/" {
		t.Fatalf("after the deadline a player with no Google gets the hint: %+v", c)
	}
	if c := gate(run(after, connected, true)); c == nil || c.MaxAge >= 0 {
		t.Fatalf("a player with Google loses a leftover hint: %+v", c)
	}
	if c := gate(run(after, connected, false)); c != nil {
		t.Fatalf("and there is nothing to clear when there is none: %+v", c)
	}
	if c := gate(run(before, noGoogle, true)); c == nil || c.MaxAge >= 0 {
		t.Fatalf("before the deadline only a leftover hint is cleared: %+v", c)
	}
	if c := gate(run(before, noGoogle, false)); c != nil {
		t.Fatalf("before the deadline nothing is set: %+v", c)
	}
	flag(false)
	if c := gate(run(after, noGoogle, true)); c == nil || c.MaxAge >= 0 {
		t.Fatalf("with the flag off the gate never runs, and a leftover hint is cleared: %+v", c)
	}
}

func nilIfNil(v any) any {
	if v == nil {
		return nil
	}
	return time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
}

// phoneDigits makes seven digits from an id, so each player has its own number.
func phoneDigits(id uuid.UUID) string {
	n := uint32(id[0])<<24 | uint32(id[1])<<16 | uint32(id[2])<<8 | uint32(id[3])
	return fmt.Sprintf("%07d", n%10_000_000)
}
