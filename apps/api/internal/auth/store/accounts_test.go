package store_test

import (
	"errors"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestClubAccountBySubject(t *testing.T) {
	e := newEnv(t)
	okSub, offSub, pendingSub, supaSub := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	disabled := base.Add(time.Hour)
	okClub := e.club(t, &okSub, true, nil)
	e.club(t, &offSub, true, &disabled)
	e.club(t, &pendingSub, false, nil)
	// An account still on the old provider is not found through the rotra link.
	supaClub := e.club(t, &supaSub, true, nil)
	e.exec(t, `UPDATE club_accounts SET auth_provider = 'supabase' WHERE club_id = $1`, supaClub)

	got, err := e.s.ClubAccountBySubject(e.ctx, okSub)
	if err != nil || got.ClubID != okClub || !got.CanSignIn() || got.Username == "" {
		t.Fatalf("ok club: %+v %v", got, err)
	}
	if off, _ := e.s.ClubAccountBySubject(e.ctx, offSub); off.CanSignIn() || off.DisabledAt == nil || !sameTime(*off.DisabledAt, disabled) {
		t.Fatalf("disabled club must not sign in: %+v", off)
	}
	if pend, _ := e.s.ClubAccountBySubject(e.ctx, pendingSub); pend.CanSignIn() || pend.ProvisionedAt != nil {
		t.Fatalf("unprovisioned club must not sign in: %+v", pend)
	}
	if _, err := e.s.ClubAccountBySubject(e.ctx, supaSub); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("supabase-linked account: %v", err)
	}
	if _, err := e.s.ClubAccountBySubject(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown subject: %v", err)
	}
}

func (e *env) player(t *testing.T, subject uuid.UUID, disabled *time.Time) uuid.UUID {
	t.Helper()
	id := uuid.New()
	// A claimed account needs both contacts, checked at commit, so all three rows go in one transaction.
	tx, err := e.pool.Begin(e.ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(e.ctx) }()
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO players (id, full_name, updated_at) VALUES ($1, 'Test Player', now())`, []any{id}},
		{`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ($1, $2, $3, now())`,
			[]any{id, "+63917" + strconv.Itoa(1000000+int(id[0])*10000+int(id[1])), id.String() + "@example.test"}},
		{`INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, disabled_at, updated_at)
		  VALUES ($1, 'rotra', $2, $3, 1, $4, now())`, []any{id, subject, base, disabled}},
	} {
		if _, err := tx.Exec(e.ctx, q.sql, q.args...); err != nil {
			t.Fatalf("seed player: %v", err)
		}
	}
	if err := tx.Commit(e.ctx); err != nil {
		t.Fatalf("seed player commit: %v", err)
	}
	return id
}

func TestPlayerAccountBySubject(t *testing.T) {
	e := newEnv(t)
	okSub, offSub := uuid.New(), uuid.New()
	disabled := base.Add(time.Hour)
	okPlayer := e.player(t, okSub, nil)
	e.player(t, offSub, &disabled)
	got, err := e.s.PlayerAccountBySubject(e.ctx, okSub)
	if err != nil || got.PlayerID != okPlayer || !got.CanSignIn() {
		t.Fatalf("ok player: %+v %v", got, err)
	}
	if off, _ := e.s.PlayerAccountBySubject(e.ctx, offSub); off.CanSignIn() || off.DisabledAt == nil {
		t.Fatalf("disabled player must not sign in: %+v", off)
	}
	if _, err := e.s.PlayerAccountBySubject(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown subject: %v", err)
	}
}

func TestAdminAccountBySubject(t *testing.T) {
	e := newEnv(t)
	okSub, offSub := uuid.New(), uuid.New()
	okID, offID := uuid.New(), uuid.New()
	e.exec(t, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
	  ($1, 'rotra', $2, true, 'Owner', now()), ($3, 'rotra', $4, false, 'Former', now())`, okID, okSub, offID, offSub)
	got, err := e.s.AdminAccountBySubject(e.ctx, okSub)
	if err != nil || got.ID != okID || got.DisplayName != "Owner" || !got.CanSignIn() {
		t.Fatalf("active admin: %+v %v", got, err)
	}
	if off, _ := e.s.AdminAccountBySubject(e.ctx, offSub); off.ID != offID || off.CanSignIn() {
		t.Fatalf("inactive admin must not sign in: %+v", off)
	}
	if _, err := e.s.AdminAccountBySubject(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown subject: %v", err)
	}
}
