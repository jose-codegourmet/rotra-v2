package store_test

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestAttemptCountReadsWithoutCounting(t *testing.T) {
	e := newEnv(t)
	if n, err := e.s.AttemptCount(e.ctx, store.ScopeLogin, "club:x", store.ActionSignIn, base); err != nil || n != 0 {
		t.Fatalf("no row reads 0: %d %v", n, err)
	}
	for i := 0; i < 3; i++ {
		if _, err := e.s.UpsertAttempt(e.ctx, store.ScopeLogin, "club:x", store.ActionSignIn, base); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 2; i++ { // reading twice does not change the count
		if n, err := e.s.AttemptCount(e.ctx, store.ScopeLogin, "club:x", store.ActionSignIn, base); err != nil || n != 3 {
			t.Fatalf("read %d: got %d %v", i, n, err)
		}
	}
	if n, _ := e.s.AttemptCount(e.ctx, store.ScopeLogin, "club:x", store.ActionSignIn, base.Add(time.Minute)); n != 0 {
		t.Fatalf("another window reads 0, got %d", n)
	}
}

func TestRevokeAllSessionsWritesOneEventEach(t *testing.T) {
	e := newEnv(t)
	_, _, s1 := e.clubSession(t, "all-1", 90)
	_, _, s2 := e.clubSession(t, "all-2", 91)
	_, s3 := e.playerSession(t, "all-3@example.test", 92, base)
	if ok, err := e.s.RevokeSession(e.ctx, s3.ID, store.ReasonSignOut, base); err != nil || !ok {
		t.Fatalf("pre-revoke: %v %v", ok, err)
	}
	at := base.Add(time.Hour)
	n, err := e.s.RevokeAllSessions(e.ctx, store.ReasonSignedOutByAdmin, at)
	if err != nil || n != 2 {
		t.Fatalf("revoked %d, %v", n, err)
	}
	for _, id := range []string{s1.ID.String(), s2.ID.String()} {
		var reason string
		var events int
		if err := e.pool.QueryRow(e.ctx, `SELECT s.revoke_reason, (SELECT count(*) FROM auth_events WHERE session_id = s.id AND event = 'session_revoked' AND occurred_at = $2)
		  FROM auth_sessions s WHERE s.id = $1`, id, at).Scan(&reason, &events); err != nil {
			t.Fatal(err)
		}
		if reason != string(store.ReasonSignedOutByAdmin) || events != 1 {
			t.Fatalf("session %s: reason %q events %d", id, reason, events)
		}
	}
	got, _ := e.s.GetSession(e.ctx, s3.ID)
	if got.RevokeReason != store.ReasonSignOut {
		t.Fatalf("an already revoked session keeps its first reason, got %q", got.RevokeReason)
	}
	if n, err := e.s.RevokeAllSessions(e.ctx, store.ReasonSignedOutByAdmin, at); err != nil || n != 0 {
		t.Fatalf("second run revokes nothing: %d %v", n, err)
	}
}

// InTxWith hands the function the transaction itself, so another domain's sqlc queries run in the same
// transaction as the auth tables: committed together, rolled back together.
func TestInTxWithSharesOneTransaction(t *testing.T) {
	e := newEnv(t)
	var id uuid.UUID
	err := e.s.InTxWith(e.ctx, func(tx pgx.Tx, q *store.Queries) error {
		ident, err := q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: "tx@example.test", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base})
		if err != nil {
			return err
		}
		id = ident.ID
		// the raw transaction sees the row the Queries wrote
		var n int
		if err := tx.QueryRow(e.ctx, `SELECT count(*) FROM auth_identities WHERE id = $1`, id).Scan(&n); err != nil || n != 1 {
			t.Fatalf("same transaction: %d %v", n, err)
		}
		// and nobody else does yet
		if _, err := e.s.GetIdentityByID(e.ctx, id); !errors.Is(err, store.ErrNotFound) {
			t.Fatalf("uncommitted row visible: %v", err)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.s.GetIdentityByID(e.ctx, id); err != nil {
		t.Fatalf("committed: %v", err)
	}
	boom := errors.New("boom")
	var rolled uuid.UUID
	err = e.s.InTxWith(e.ctx, func(tx pgx.Tx, q *store.Queries) error {
		ident, err := q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: "tx2@example.test", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base})
		rolled = ident.ID
		if err != nil {
			return err
		}
		return boom
	})
	if !errors.Is(err, boom) {
		t.Fatalf("%v", err)
	}
	if _, err := e.s.GetIdentityByID(e.ctx, rolled); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("rolled back: %v", err)
	}
}
