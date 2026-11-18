package claim_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

// holdThen locks a row the way another transaction would (lockSQL), starts the request, waits until the request is
// blocked on that lock, runs change in the same transaction and commits. The request then continues on the
// changed rows: this is how a change between the pre-check and the lock is exercised deterministically.
func (e *env) holdThen(t *testing.T, lockSQL string, change func(tx pgx.Tx), request func() *httptest.ResponseRecorder) *httptest.ResponseRecorder {
	t.Helper()
	ctx := context.Background()
	tx, err := e.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, lockSQL); err != nil {
		t.Fatal(err)
	}
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- request() }()
	deadline := time.Now().Add(20 * time.Second)
	for {
		var n int
		if err := e.pool.QueryRow(ctx, `SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("the request never blocked on the lock")
		}
		time.Sleep(20 * time.Millisecond)
	}
	change(tx)
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	return <-done
}

func exec(t *testing.T, tx pgx.Tx, sql string, args ...any) {
	t.Helper()
	if _, err := tx.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

// A club record changed while the claim waited for its row (after the player and contact were written): the claim
// sees it and refuses, and nothing is left behind. (The link itself cannot change in the meantime: the claim holds
// its row lock.)
func TestRecordChangedWhileWaitingIsRefused(t *testing.T) {
	cases := map[string]struct {
		change func(tx pgx.Tx, rec string)
		status int
		code   string
		fields map[string]string
	}{
		"removed": {func(tx pgx.Tx, rec string) {
			exec(t, tx, `UPDATE club_players SET removed_at = now() WHERE id = $1`, rec)
		},
			403, "forbidden", fields1("link", msgExpired)},
		"registered through another path": {func(tx pgx.Tx, rec string) {
			exec(t, tx, `INSERT INTO players (id, full_name, updated_at) VALUES ('00000000-0000-4000-8000-0000000000aa', 'Other', now())`)
			exec(t, tx, `UPDATE club_players SET player_id = '00000000-0000-4000-8000-0000000000aa' WHERE id = $1`, rec)
		}, 403, "forbidden", fields1("link", msgRegistered)},
		"phone on file changed": {func(tx pgx.Tx, rec string) {
			exec(t, tx, `UPDATE club_player_private_inputs SET phone_e164 = '+639175550188' WHERE club_player_id = $1`, rec)
		}, 409, "conflict", nil},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			token, rec := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
			players, contacts := e.count(t, `SELECT count(*) FROM players`), e.count(t, `SELECT count(*) FROM player_private_contacts`)
			w := e.holdThen(t, `SELECT id FROM club_players WHERE id = '`+rec.String()+`' FOR UPDATE`,
				func(tx pgx.Tx) { c.change(tx, rec.String()) },
				func() *httptest.ResponseRecorder { return e.post(token, claimBody(nil)) })
			if w.Code != c.status {
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
			wantErr(t, w, c.status, c.code, c.fields)
			if len(w.Result().Cookies()) != 0 {
				t.Fatal("no cookies")
			}
			extraPlayers := 0
			if name == "registered through another path" {
				extraPlayers = 1
			}
			if got := e.count(t, `SELECT count(*) FROM players`); got != players+extraPlayers || e.count(t, `SELECT count(*) FROM player_private_contacts`) != contacts ||
				e.count(t, `SELECT count(*) FROM auth_identities`) != 0 || e.count(t, `SELECT count(*) FROM player_id_allocations`) != 0 {
				t.Fatal("the refused claim left rows behind")
			}
		})
	}
}

// The same for a player's link: the profile changed while the claim waited for the player row.
func TestPlayerChangedWhileWaitingIsRefused(t *testing.T) {
	cases := map[string]struct {
		change func(tx pgx.Tx, id string)
		status int
		code   string
		fields map[string]string
	}{
		"claimed meanwhile": {func(tx pgx.Tx, id string) {
			exec(t, tx, `UPDATE players SET profile_state = 'claimed' WHERE id = $1`, id)
		},
			403, "forbidden", fields1("link", msgRegistered)},
		"phone on file changed": {func(tx pgx.Tx, id string) {
			exec(t, tx, `UPDATE player_private_contacts SET phone_e164 = '+639175550177' WHERE player_id = $1`, id)
		}, 409, "conflict", nil},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			token, id := e.playerLink(t, e.club(t, "Club"), playerOpts{phone: phoneA, email: "staged@club.test"})
			w := e.holdThen(t, `SELECT id FROM players WHERE id = '`+id.String()+`' FOR UPDATE`,
				func(tx pgx.Tx) { c.change(tx, id.String()) },
				func() *httptest.ResponseRecorder { return e.post(token, claimBody(nil)) })
			wantErr(t, w, c.status, c.code, c.fields)
			var email string
			if err := e.pool.QueryRow(e.ctx, `SELECT email FROM player_private_contacts WHERE player_id = $1`, id).Scan(&email); err != nil || email != "staged@club.test" {
				t.Fatalf("the refused claim changed the contact: %q %v", email, err)
			}
			if e.count(t, `SELECT count(*) FROM auth_identities`) != 0 || e.count(t, `SELECT count(*) FROM player_accounts`) != 0 {
				t.Fatal("rows left behind")
			}
		})
	}
}

// A link that disappears between the read and the lock is the expired-link refusal.
func TestLinkRevokedWhileWaitingForItsLock(t *testing.T) {
	e := newEnv(t)
	token, rec := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	w := e.holdThen(t, `SELECT id FROM club_player_claim_links WHERE club_player_id = '`+rec.String()+`' FOR UPDATE`,
		func(tx pgx.Tx) {
			exec(t, tx, `UPDATE club_player_claim_links SET state = 'revoked', revoked_at = now() WHERE club_player_id = $1`, rec)
		},
		func() *httptest.ResponseRecorder { return e.post(token, claimBody(nil)) })
	wantErr(t, w, http.StatusForbidden, "forbidden", fields1("link", msgExpired))
}

// Unexpected failures are the handler's 500, with nothing written and nothing about the cause on the wire.
func TestUnexpectedFailuresAreInternalErrors(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	e.exec(t, `CREATE FUNCTION no_players() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'players are down'; END $$`)
	e.exec(t, `CREATE TRIGGER no_players BEFORE INSERT ON players FOR EACH ROW EXECUTE FUNCTION no_players()`)
	w := e.post(token, claimBody(nil))
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	wantJSON(t, w, obj{"error": obj{"code": "internal", "message": "Something went wrong."}})
	if e.count(t, `SELECT count(*) FROM club_player_claim_links WHERE state = 'active'`) != 1 {
		t.Fatal("the link must stay usable")
	}
	// reads fail the same way
	e.exec(t, `ALTER TABLE club_player_claim_links RENAME TO club_player_claim_links_gone`)
	if w := e.get(newToken()); w.Code != http.StatusInternalServerError {
		t.Fatalf("read: %d %s", w.Code, w.Body.String())
	}
	if w := e.post(newToken(), claimBody(nil)); w.Code != http.StatusInternalServerError {
		t.Fatalf("pre-check: %d %s", w.Code, w.Body.String())
	}
}

// A stored hash nobody can read is refused like a wrong password.
func TestRetryWithAnUnreadableStoredHash(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	e.mustClaim(t, token, claimBody(nil))
	e.exec(t, `UPDATE auth_identities SET password_hash = 'not-a-hash'`)
	wantErr(t, e.post(token, claimBody(nil)), http.StatusUnprocessableEntity, "invalid", fields1("email", msgCredentials))
}

func TestRegisterNeedsItsDependencies(t *testing.T) {
	e := newEnv(t)
	if _, err := claimRegister(e, func(d *claimDeps) { d.Pool = nil }); err == nil {
		t.Fatal("a pool is required")
	}
	if _, err := claimRegister(e, func(d *claimDeps) { d.ReadLimiter = nil }); err == nil {
		t.Fatal("a read limiter is required")
	}
	if _, err := claimRegister(e, func(d *claimDeps) { d.Clock, d.Logger = nil, nil }); err != nil {
		t.Fatalf("a clock and a logger are optional: %v", err)
	}
}
